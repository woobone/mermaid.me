/**
 * ============================================================================
 * Electron Preload 스크립트 (안전한 API 브릿지)
 * ============================================================================
 *
 * 역할: 메인 프로세스와 렌더러 프로세스를 안전하게 연결하는 브릿지
 *
 * 보안 모델:
 * - 렌더러 프로세스는 Node.js API에 직접 접근 불가 (보안상 위험)
 * - preload 스크립트만 특권 API에 접근 가능
 * - contextBridge로 안전한 API만 렌더러에 노출
 *
 * 주요 플러그인/모듈:
 * - contextBridge: 렌더러에 안전하게 API 노출
 * - ipcRenderer: 메인 프로세스와 통신 (IPC - Inter-Process Communication)
 *
 * 통신 방식:
 * 1. 렌더러 → 메인: ipcRenderer.invoke() - 요청/응답 패턴
 * 2. 메인 → 렌더러: ipcRenderer.on() - 이벤트 수신
 * ============================================================================
 */

import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';
import type {
  SaveFileResult,
  FileOperationResult,
  RenameResult,
  WorkspaceData,
  RecentFile,
  RecentFolder,
  Bookmark,
  TabState,
  LayoutSettings,
  ThemeSettings,
  Theme,
  ExportResult,
  TerminalCreateOptions,
  TerminalOutput,
  TerminalExit,
  TerminalStateData
} from '../types';

// IPC 이벤트 콜백 타입 정의
type IpcCallback<T extends unknown[] = unknown[]> = (event: IpcRendererEvent, ...args: T) => void;
type SimpleCallback<T = unknown> = (data: T) => void;

/**
 * ElectronAPI 인터페이스 정의
 * 렌더러에 노출되는 모든 API의 타입 정의
 */
interface ElectronAPI {
  // 파일 작업 API
  saveFile: (content: string, filePath?: string) => Promise<SaveFileResult>;
  readFile: (filePath: string) => Promise<string>;

  // 폴더 작업 API
  openFolder: () => Promise<string | null>;
  openFolderByPath: (folderPath: string) => Promise<{ success: boolean; folderPath?: string; error?: string }>;
  getLastFolder: () => Promise<WorkspaceData | null>;
  loadFolderChildren: (folderPath: string) => Promise<{ success: boolean; children: unknown[]; error?: string }>;
  stopWatchingFolder: (folderPath: string) => Promise<{ success: boolean; error?: string }>;
  onFolderOpened: (callback: IpcCallback) => void;
  onFolderUpdated: (callback: IpcCallback) => void;
  onFolderChildrenUpdated: (callback: IpcCallback) => void;

  // 최근 파일 API
  getRecentFiles: () => Promise<RecentFile[]>;
  onRecentFilesUpdated: (callback: IpcCallback) => void;
  getRecentFolders: () => Promise<RecentFolder[]>;
  openRecentFolder: (folderPath: string) => Promise<{ success: boolean; folderPath?: string; error?: string }>;
  onRecentFoldersUpdated: (callback: IpcCallback) => void;

  // 다이어그램 내보내기 API
  exportDiagram: (svgData: string, exportType: string, fileName: string) => Promise<ExportResult>;
  saveExportedFile: (filePath: string, buffer: Uint8Array) => Promise<{ success: boolean; error?: string }>;

  // 메뉴 이벤트 API
  onMenuNew: (callback: IpcCallback) => void;
  onMenuOpen: (callback: IpcCallback) => void;
  onMenuSave: (callback: IpcCallback) => void;
  onMenuExportPNG: (callback: IpcCallback) => void;
  onMenuExportPDF: (callback: IpcCallback) => void;
  onMenuExportSVG: (callback: IpcCallback) => void;

  // 탭 상태 API
  saveTabState: (state: TabState) => Promise<{ success: boolean; error?: string }>;
  getTabState: () => Promise<TabState | null>;

  // 레이아웃 설정 API
  saveLayoutSettings: (settings: LayoutSettings) => Promise<{ success: boolean; error?: string }>;
  getLayoutSettings: () => Promise<LayoutSettings | null>;

  // 북마크 API
  getBookmarks: () => Promise<Bookmark[]>;
  addBookmark: (folderPath: string) => Promise<{ success: boolean; bookmarks?: Bookmark[]; message?: string; error?: string }>;
  removeBookmark: (folderPath: string) => Promise<{ success: boolean; bookmarks?: Bookmark[]; error?: string }>;
  openBookmarkedFolder: (folderPath: string) => Promise<{ success: boolean; folderPath?: string; error?: string }>;

  // 폴더 및 파일 생성 API
  createFolder: (folderPath: string) => Promise<FileOperationResult>;
  createFile: (filePath: string) => Promise<FileOperationResult>;
  deleteItem: (itemPath: string, isDirectory: boolean) => Promise<FileOperationResult>;
  onFileDeleted: (callback: IpcCallback) => void;
  renameItem: (oldPath: string, newName: string, isDirectory: boolean) => Promise<RenameResult>;
  moveItem: (sourcePath: string, targetPath: string, isDirectory: boolean) => Promise<RenameResult>;
  onFileRenamed: (callback: IpcCallback) => void;
  onFileMoved: (callback: IpcCallback) => void;

  // 테마 API
  getThemeSettings: () => Promise<ThemeSettings>;
  saveThemeSettings: (settings: ThemeSettings) => Promise<{ success: boolean; error?: string }>;
  getSystemTheme: () => Promise<Theme>;
  onSystemThemeChanged: (callback: IpcCallback) => void;

  // 파일 감시 API
  watchFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  unwatchFile: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  updateFileModTime: (filePath: string) => Promise<{ success: boolean; error?: string }>;
  onFileChangedExternally: (callback: IpcCallback) => void;

  // 터미널 API
  terminalCreate: (options: TerminalCreateOptions) => Promise<{ success: boolean; id: string; error?: string }>;
  terminalInput: (id: string, data: string) => void;
  terminalResize: (id: string, cols: number, rows: number) => void;
  terminalKill: (id: string) => Promise<{ success: boolean; error?: string }>;
  terminalKillAll: () => Promise<{ success: boolean; error?: string }>;
  onTerminalOutput: (callback: SimpleCallback<TerminalOutput>) => void;
  onTerminalExit: (callback: SimpleCallback<TerminalExit>) => void;
  removeTerminalListeners: () => void;
  terminalSaveState: (workspace: string, state: TerminalStateData) => Promise<{ success: boolean; error?: string }>;
  terminalGetState: (workspace: string) => Promise<TerminalStateData | null>;

  // 이벤트 리스너 정리
  removeAllListeners: (channel: string) => void;
}

/**
 * contextBridge.exposeInMainWorld()
 *
 * 렌더러 프로세스(React)의 window 객체에 'electronAPI'를 추가합니다.
 *
 * 렌더러에서 사용법:
 * - window.electronAPI.saveFile(content, path)
 * - window.electronAPI.openFolder()
 *
 * 보안:
 * - 직접 Node.js API 노출 금지 (보안 취약)
 * - 필요한 기능만 제한적으로 노출
 * - 모든 통신은 IPC를 통해 안전하게 처리
 */
const electronAPI: ElectronAPI = {

  // ==========================================================================
  // 파일 작업 API
  // ==========================================================================

  /**
   * 파일 저장
   *
   * 플러그인: ipcRenderer.invoke (메인 프로세스의 save-file 핸들러 호출)
   *
   * @param content - 저장할 파일 내용
   * @param filePath - 파일 경로 (선택)
   * @returns Promise<SaveFileResult> { success, filePath, error }
   */
  saveFile: (content: string, filePath?: string): Promise<SaveFileResult> =>
    ipcRenderer.invoke('save-file', content, filePath),

  /**
   * 파일 읽기
   *
   * 플러그인: ipcRenderer.invoke (메인 프로세스의 read-file 핸들러 호출)
   *
   * @param filePath - 읽을 파일 경로
   * @returns Promise<string> 파일 내용
   */
  readFile: (filePath: string): Promise<string> =>
    ipcRenderer.invoke('read-file', filePath),

  // ==========================================================================
  // 폴더 작업 API
  // ==========================================================================

  /**
   * 폴더 열기 다이얼로그 표시
   */
  openFolder: (): Promise<string | null> =>
    ipcRenderer.invoke('open-folder'),

  /**
   * 경로로 폴더 직접 열기 (다이얼로그 없이)
   */
  openFolderByPath: (folderPath: string): Promise<{ success: boolean; folderPath?: string; error?: string }> =>
    ipcRenderer.invoke('open-folder-by-path', folderPath),

  /**
   * 마지막 열린 폴더 가져오기 (앱 시작 시 복원)
   */
  getLastFolder: (): Promise<WorkspaceData | null> =>
    ipcRenderer.invoke('get-last-folder'),

  /**
   * 폴더 자식 로드 (Lazy Loading)
   */
  loadFolderChildren: (folderPath: string): Promise<{ success: boolean; children: unknown[]; error?: string }> =>
    ipcRenderer.invoke('load-folder-children', folderPath),

  /**
   * 폴더 감시 중단 (Lazy Loading)
   */
  stopWatchingFolder: (folderPath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('stop-watching-folder', folderPath),

  /**
   * 폴더 열림 이벤트 수신
   */
  onFolderOpened: (callback: IpcCallback): void => {
    ipcRenderer.on('folder-opened', callback);
  },

  /**
   * 폴더 업데이트 이벤트 수신
   */
  onFolderUpdated: (callback: IpcCallback): void => {
    ipcRenderer.on('folder-updated', callback);
  },

  /**
   * 폴더 자식 업데이트 이벤트 수신 (Lazy Loading)
   */
  onFolderChildrenUpdated: (callback: IpcCallback): void => {
    ipcRenderer.on('folder-children-updated', callback);
  },

  // ==========================================================================
  // 최근 파일 API
  // ==========================================================================

  /**
   * 최근 열린 파일 목록 가져오기
   */
  getRecentFiles: (): Promise<RecentFile[]> =>
    ipcRenderer.invoke('get-recent-files'),

  /**
   * 최근 파일 업데이트 이벤트 수신
   */
  onRecentFilesUpdated: (callback: IpcCallback): void => {
    ipcRenderer.on('recent-files-updated', callback);
  },

  /**
   * 최근 열린 폴더 목록 가져오기
   */
  getRecentFolders: (): Promise<RecentFolder[]> =>
    ipcRenderer.invoke('get-recent-folders'),

  /**
   * 최근 폴더에서 특정 폴더 열기
   */
  openRecentFolder: (folderPath: string): Promise<{ success: boolean; folderPath?: string; error?: string }> =>
    ipcRenderer.invoke('open-recent-folder', folderPath),

  /**
   * 최근 폴더 업데이트 이벤트 수신
   */
  onRecentFoldersUpdated: (callback: IpcCallback): void => {
    ipcRenderer.on('recent-folders-updated', callback);
  },

  // ==========================================================================
  // 다이어그램 내보내기 API
  // ==========================================================================

  /**
   * 다이어그램을 이미지/PDF로 내보내기
   */
  exportDiagram: (svgData: string, exportType: string, fileName: string): Promise<ExportResult> =>
    ipcRenderer.invoke('export-diagram', svgData, exportType, fileName),

  /**
   * 변환된 파일 저장 (PNG/PDF)
   */
  saveExportedFile: (filePath: string, buffer: Uint8Array): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-exported-file', filePath, buffer),

  // ==========================================================================
  // 메뉴 이벤트 API
  // ==========================================================================

  /**
   * 메뉴에서 'New' 클릭 시 이벤트 수신
   */
  onMenuNew: (callback: IpcCallback): void => {
    ipcRenderer.on('menu-new', callback);
  },

  /**
   * 메뉴에서 'Open' 클릭 시 이벤트 수신
   */
  onMenuOpen: (callback: IpcCallback): void => {
    ipcRenderer.on('menu-open', callback);
  },

  /**
   * 메뉴에서 'Save' 클릭 시 이벤트 수신
   */
  onMenuSave: (callback: IpcCallback): void => {
    ipcRenderer.on('menu-save', callback);
  },

  /**
   * 메뉴에서 'Export as PNG' 클릭 시 이벤트 수신
   */
  onMenuExportPNG: (callback: IpcCallback): void => {
    ipcRenderer.on('menu-export-png', callback);
  },

  /**
   * 메뉴에서 'Export as PDF' 클릭 시 이벤트 수신
   */
  onMenuExportPDF: (callback: IpcCallback): void => {
    ipcRenderer.on('menu-export-pdf', callback);
  },

  /**
   * 메뉴에서 'Export as SVG' 클릭 시 이벤트 수신
   */
  onMenuExportSVG: (callback: IpcCallback): void => {
    ipcRenderer.on('menu-export-svg', callback);
  },

  // ==========================================================================
  // 탭 상태 API
  // ==========================================================================

  /**
   * 탭 상태 저장 (앱 재시작 시 복원)
   */
  saveTabState: (state: TabState): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-tab-state', state),

  /**
   * 저장된 탭 상태 불러오기
   */
  getTabState: (): Promise<TabState | null> =>
    ipcRenderer.invoke('get-tab-state'),

  // ==========================================================================
  // 레이아웃 설정 API
  // ==========================================================================

  /**
   * 레이아웃 설정 저장 (리사이저 위치 복원)
   */
  saveLayoutSettings: (settings: LayoutSettings): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-layout-settings', settings),

  /**
   * 저장된 레이아웃 설정 불러오기
   */
  getLayoutSettings: (): Promise<LayoutSettings | null> =>
    ipcRenderer.invoke('get-layout-settings'),

  // ==========================================================================
  // 북마크 API
  // ==========================================================================

  /**
   * 북마크 목록 가져오기
   */
  getBookmarks: (): Promise<Bookmark[]> =>
    ipcRenderer.invoke('get-bookmarks'),

  /**
   * 북마크 추가
   */
  addBookmark: (folderPath: string): Promise<{ success: boolean; bookmarks?: Bookmark[]; message?: string; error?: string }> =>
    ipcRenderer.invoke('add-bookmark', folderPath),

  /**
   * 북마크 제거
   */
  removeBookmark: (folderPath: string): Promise<{ success: boolean; bookmarks?: Bookmark[]; error?: string }> =>
    ipcRenderer.invoke('remove-bookmark', folderPath),

  /**
   * 북마크된 폴더 열기
   */
  openBookmarkedFolder: (folderPath: string): Promise<{ success: boolean; folderPath?: string; error?: string }> =>
    ipcRenderer.invoke('open-bookmarked-folder', folderPath),

  // ==========================================================================
  // 폴더 및 파일 생성 API
  // ==========================================================================

  /**
   * 새 폴더 생성
   */
  createFolder: (folderPath: string): Promise<FileOperationResult> =>
    ipcRenderer.invoke('create-folder', folderPath),

  /**
   * 새 파일 생성
   */
  createFile: (filePath: string): Promise<FileOperationResult> =>
    ipcRenderer.invoke('create-file', filePath),

  /**
   * 파일 또는 폴더 삭제
   */
  deleteItem: (itemPath: string, isDirectory: boolean): Promise<FileOperationResult> =>
    ipcRenderer.invoke('delete-item', itemPath, isDirectory),

  /**
   * 파일 삭제 이벤트 수신
   */
  onFileDeleted: (callback: IpcCallback): void => {
    ipcRenderer.on('file-deleted', callback);
  },

  /**
   * 파일 또는 폴더 이름 변경
   */
  renameItem: (oldPath: string, newName: string, isDirectory: boolean): Promise<RenameResult> =>
    ipcRenderer.invoke('rename-item', oldPath, newName, isDirectory),

  /**
   * 파일 또는 폴더 이동
   */
  moveItem: (sourcePath: string, targetPath: string, isDirectory: boolean): Promise<RenameResult> =>
    ipcRenderer.invoke('move-item', sourcePath, targetPath, isDirectory),

  /**
   * 파일 이름 변경 이벤트 수신
   */
  onFileRenamed: (callback: IpcCallback): void => {
    ipcRenderer.on('file-renamed', callback);
  },

  /**
   * 파일 이동 이벤트 수신
   */
  onFileMoved: (callback: IpcCallback): void => {
    ipcRenderer.on('file-moved', callback);
  },

  // ==========================================================================
  // 테마 API
  // ==========================================================================

  /**
   * 테마 설정 가져오기
   */
  getThemeSettings: (): Promise<ThemeSettings> =>
    ipcRenderer.invoke('get-theme-settings'),

  /**
   * 테마 설정 저장
   */
  saveThemeSettings: (settings: ThemeSettings): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('save-theme-settings', settings),

  /**
   * 시스템 테마 가져오기
   */
  getSystemTheme: (): Promise<Theme> =>
    ipcRenderer.invoke('get-system-theme'),

  /**
   * 시스템 테마 변경 이벤트 수신
   */
  onSystemThemeChanged: (callback: IpcCallback): void => {
    ipcRenderer.on('system-theme-changed', callback);
  },

  // ==========================================================================
  // 파일 감시 API (외부 변경 감지)
  // ==========================================================================

  /**
   * 파일 감시 시작
   */
  watchFile: (filePath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('watch-file', filePath),

  /**
   * 파일 감시 중단
   */
  unwatchFile: (filePath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('unwatch-file', filePath),

  /**
   * 파일 저장 후 수정 시간 업데이트
   */
  updateFileModTime: (filePath: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('update-file-mod-time', filePath),

  /**
   * 파일 외부 변경 이벤트 수신
   */
  onFileChangedExternally: (callback: IpcCallback): void => {
    ipcRenderer.on('file-changed-externally', callback);
  },

  // ==========================================================================
  // 터미널 API
  // ==========================================================================

  /**
   * 새 터미널 생성
   */
  terminalCreate: (options: TerminalCreateOptions): Promise<{ success: boolean; id: string; error?: string }> =>
    ipcRenderer.invoke('terminal:create', options),

  /**
   * 터미널에 입력 전달
   */
  terminalInput: (id: string, data: string): void => {
    ipcRenderer.send('terminal:input', { id, data });
  },

  /**
   * 터미널 크기 변경
   */
  terminalResize: (id: string, cols: number, rows: number): void => {
    ipcRenderer.send('terminal:resize', { id, cols, rows });
  },

  /**
   * 터미널 종료
   */
  terminalKill: (id: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('terminal:kill', { id }),

  /**
   * 모든 터미널 종료
   */
  terminalKillAll: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('terminal:kill-all'),

  /**
   * 터미널 출력 이벤트 수신
   */
  onTerminalOutput: (callback: SimpleCallback<TerminalOutput>): void => {
    ipcRenderer.on('terminal:output', (_event: IpcRendererEvent, data: TerminalOutput) => callback(data));
  },

  /**
   * 터미널 종료 이벤트 수신
   */
  onTerminalExit: (callback: SimpleCallback<TerminalExit>): void => {
    ipcRenderer.on('terminal:exit', (_event: IpcRendererEvent, data: TerminalExit) => callback(data));
  },

  /**
   * 터미널 관련 이벤트 리스너 제거
   */
  removeTerminalListeners: (): void => {
    ipcRenderer.removeAllListeners('terminal:output');
    ipcRenderer.removeAllListeners('terminal:exit');
  },

  /**
   * 터미널 상태 저장 (워크스페이스별)
   */
  terminalSaveState: (workspace: string, state: TerminalStateData): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('terminal:save-state', { workspace, state }),

  /**
   * 터미널 상태 로드 (워크스페이스별)
   */
  terminalGetState: (workspace: string): Promise<TerminalStateData | null> =>
    ipcRenderer.invoke('terminal:get-state', { workspace }),

  // ==========================================================================
  // 이벤트 리스너 정리
  // ==========================================================================

  /**
   * 모든 이벤트 리스너 제거
   */
  removeAllListeners: (channel: string): void => {
    ipcRenderer.removeAllListeners(channel);
  }
};

// contextBridge를 통해 렌더러에 API 노출
contextBridge.exposeInMainWorld('electronAPI', electronAPI);
