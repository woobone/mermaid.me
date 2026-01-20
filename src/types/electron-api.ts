/**
 * Electron API 타입
 */

import type { IpcInvokeChannels } from './ipc-channels';
import type { FileTreeNode } from './file-system';
import type { WorkspaceData, RecentFile, RecentFolder, Bookmark, LayoutSettings } from './workspace';
import type { TabState, ExportResult } from './editor';
import type { TerminalCreateOptions, TerminalStateData, TerminalOutput, TerminalExit } from './terminal';
import type { ThemeSettings, Theme } from './theme';

/**
 * Electron API 인터페이스
 */
export interface ElectronAPI {
  // ===== 파일 작업 =====
  saveFile(content: string, filePath?: string): Promise<IpcInvokeChannels['save-file']['result']>;
  readFile(filePath: string): Promise<string>;

  // ===== 폴더 작업 =====
  openFolder(): Promise<string | null>;
  openFolderByPath(folderPath: string): Promise<{ success: boolean; folderPath?: string; error?: string }>;
  getLastFolder(): Promise<WorkspaceData | null>;
  loadFolderChildren(folderPath: string): Promise<{ success: boolean; children: FileTreeNode[] }>;
  stopWatchingFolder(folderPath: string): Promise<{ success: boolean }>;

  // ===== 최근 파일/폴더 =====
  getRecentFiles(): Promise<RecentFile[]>;
  getRecentFolders(): Promise<RecentFolder[]>;
  openRecentFolder(folderPath: string): Promise<{ success: boolean }>;

  // ===== 북마크 =====
  getBookmarks(): Promise<Bookmark[]>;
  addBookmark(folderPath: string): Promise<{ success: boolean; bookmarks?: Bookmark[] }>;
  removeBookmark(folderPath: string): Promise<{ success: boolean; bookmarks?: Bookmark[] }>;
  openBookmarkedFolder(folderPath: string): Promise<{ success: boolean }>;

  // ===== 파일/폴더 생성/삭제 =====
  createFolder(folderPath: string): Promise<{ success: boolean; error?: string }>;
  createFile(filePath: string): Promise<{ success: boolean; error?: string }>;
  deleteItem(itemPath: string, isDirectory: boolean): Promise<{ success: boolean; error?: string }>;
  renameItem(oldPath: string, newName: string, isDirectory: boolean): Promise<IpcInvokeChannels['rename-item']['result']>;
  moveItem(sourcePath: string, targetPath: string, isDirectory: boolean): Promise<IpcInvokeChannels['move-item']['result']>;

  // ===== 내보내기 =====
  exportDiagram(svgData: string, exportType: string, fileName: string): Promise<ExportResult>;
  saveExportedFile(filePath: string, buffer: Uint8Array): Promise<{ success: boolean; error?: string }>;
  printToPDF(htmlContent: string, fileName: string): Promise<{ success: boolean; canceled?: boolean; filePath?: string; error?: string }>;

  // ===== 탭/레이아웃 =====
  saveTabState(state: TabState): Promise<{ success: boolean }>;
  getTabState(): Promise<TabState | null>;
  saveLayoutSettings(settings: LayoutSettings): Promise<{ success: boolean }>;
  getLayoutSettings(): Promise<LayoutSettings | null>;

  // ===== 테마 =====
  getThemeSettings(): Promise<ThemeSettings>;
  saveThemeSettings(settings: ThemeSettings): Promise<{ success: boolean; error?: string }>;
  getSystemTheme(): Promise<Theme>;

  // ===== 파일 감시 =====
  watchFile(filePath: string): Promise<{ success: boolean }>;
  unwatchFile(filePath: string): Promise<{ success: boolean }>;
  updateFileModTime(filePath: string): Promise<{ success: boolean }>;

  // ===== 터미널 =====
  terminalCreate(options: TerminalCreateOptions): Promise<{ success: boolean; id: string; error?: string }>;
  terminalInput(id: string, data: string): void;
  terminalResize(id: string, cols: number, rows: number): void;
  terminalKill(id: string): Promise<{ success: boolean; error?: string }>;
  terminalKillAll(): Promise<{ success: boolean; error?: string }>;
  terminalSaveState(workspace: string, state: TerminalStateData): Promise<{ success: boolean; error?: string }>;
  terminalGetState(workspace: string): Promise<TerminalStateData | null>;

  // ===== 이벤트 리스너 =====
  onFolderOpened(callback: (event: unknown, data: WorkspaceData) => void): void;
  onFolderChildrenUpdated(callback: (event: unknown, folderPath: string, children: FileTreeNode[]) => void): void;
  onRecentFilesUpdated(callback: (event: unknown, files: RecentFile[]) => void): void;
  onRecentFoldersUpdated(callback: (event: unknown, folders: RecentFolder[]) => void): void;
  onFileDeleted(callback: (event: unknown, filePath: string) => void): void;
  onFileRenamed(callback: (event: unknown, oldPath: string, newPath: string) => void): void;
  onFileMoved(callback: (event: unknown, oldPath: string, newPath: string) => void): void;
  onFileChangedExternally(callback: (event: unknown, filePath: string) => void): void;
  onSystemThemeChanged(callback: (event: unknown, theme: Theme) => void): void;
  onTerminalOutput(callback: (data: TerminalOutput) => void): void;
  onTerminalExit(callback: (data: TerminalExit) => void): void;
  onMenuNew(callback: (event: unknown) => void): void;
  onMenuOpen(callback: (event: unknown, content: string, filePath: string) => void): void;
  onMenuSave(callback: (event: unknown) => void): void;
  onMenuExportPNG(callback: (event: unknown) => void): void;
  onMenuExportPDF(callback: (event: unknown) => void): void;
  onMenuExportSVG(callback: (event: unknown) => void): void;

  // ===== 리스너 제거 =====
  removeTerminalListeners(): void;
  removeAllListeners(channel: string): void;
}

/**
 * Window 전역 타입 확장
 */
declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}

export {};
