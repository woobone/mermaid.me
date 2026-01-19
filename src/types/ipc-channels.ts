/**
 * IPC 채널 타입
 */

import type {
  SaveFileResult,
  FileOperationResult,
  RenameResult,
  LoadFolderChildrenResult,
  FileTreeNode,
} from './file-system';
import type {
  WorkspaceData,
  RecentFile,
  RecentFolder,
  Bookmark,
  LayoutSettings,
} from './workspace';
import type { TabState, ExportResult } from './editor';
import type {
  TerminalCreateOptions,
  TerminalStateData,
} from './terminal';
import type { ThemeSettings, Theme } from './theme';

/**
 * IPC Invoke 채널 정의
 */
export interface IpcInvokeChannels {
  // 파일 시스템
  'save-file': {
    params: [content: string, filePath?: string];
    result: SaveFileResult;
  };
  'read-file': {
    params: [filePath: string];
    result: string;
  };
  'create-folder': {
    params: [folderPath: string];
    result: FileOperationResult;
  };
  'create-file': {
    params: [filePath: string];
    result: FileOperationResult;
  };
  'delete-item': {
    params: [itemPath: string, isDirectory: boolean];
    result: FileOperationResult;
  };
  'rename-item': {
    params: [oldPath: string, newName: string, isDirectory: boolean];
    result: RenameResult;
  };
  'move-item': {
    params: [sourcePath: string, targetPath: string, isDirectory: boolean];
    result: RenameResult;
  };
  'load-folder-children': {
    params: [folderPath: string];
    result: LoadFolderChildrenResult;
  };
  'stop-watching-folder': {
    params: [folderPath: string];
    result: { success: boolean };
  };

  // 워크스페이스
  'open-folder': {
    params: [];
    result: string | null;
  };
  'open-folder-by-path': {
    params: [folderPath: string];
    result: { success: boolean; folderPath?: string; error?: string };
  };
  'open-recent-folder': {
    params: [folderPath: string];
    result: { success: boolean; folderPath?: string; error?: string };
  };
  'open-bookmarked-folder': {
    params: [folderPath: string];
    result: { success: boolean; folderPath?: string; error?: string };
  };
  'get-last-folder': {
    params: [];
    result: WorkspaceData | null;
  };
  'get-recent-files': {
    params: [];
    result: RecentFile[];
  };
  'get-recent-folders': {
    params: [];
    result: RecentFolder[];
  };

  // 탭/레이아웃
  'save-tab-state': {
    params: [state: TabState];
    result: { success: boolean };
  };
  'get-tab-state': {
    params: [];
    result: TabState | null;
  };
  'save-layout-settings': {
    params: [settings: LayoutSettings];
    result: { success: boolean; error?: string };
  };
  'get-layout-settings': {
    params: [];
    result: LayoutSettings | null;
  };

  // 북마크
  'get-bookmarks': {
    params: [];
    result: Bookmark[];
  };
  'add-bookmark': {
    params: [folderPath: string];
    result: { success: boolean; bookmarks?: Bookmark[]; message?: string; error?: string };
  };
  'remove-bookmark': {
    params: [folderPath: string];
    result: { success: boolean; bookmarks?: Bookmark[]; error?: string };
  };

  // 내보내기
  'export-diagram': {
    params: [svgData: string, exportType: string, fileName: string];
    result: ExportResult;
  };
  'save-exported-file': {
    params: [filePath: string, buffer: Uint8Array];
    result: { success: boolean; error?: string };
  };

  // 테마
  'get-theme-settings': {
    params: [];
    result: ThemeSettings;
  };
  'save-theme-settings': {
    params: [settings: ThemeSettings];
    result: { success: boolean; error?: string };
  };
  'get-system-theme': {
    params: [];
    result: Theme;
  };

  // 터미널
  'terminal:create': {
    params: [options: TerminalCreateOptions];
    result: { success: boolean; id: string; error?: string };
  };
  'terminal:kill': {
    params: [{ id: string }];
    result: { success: boolean; error?: string };
  };
  'terminal:kill-all': {
    params: [];
    result: { success: boolean; error?: string };
  };
  'terminal:save-state': {
    params: [workspace: string, state: TerminalStateData];
    result: { success: boolean; error?: string };
  };
  'terminal:get-state': {
    params: [workspace: string];
    result: TerminalStateData | null;
  };

  // 파일 감시
  'watch-file': {
    params: [filePath: string];
    result: { success: boolean };
  };
  'unwatch-file': {
    params: [filePath: string];
    result: { success: boolean };
  };
  'update-file-mod-time': {
    params: [filePath: string];
    result: { success: boolean };
  };
}

/**
 * IPC Send 채널 정의 (Main → Renderer)
 */
export interface IpcSendChannels {
  'folder-opened': WorkspaceData;
  'folder-updated': [folderPath: string, tree: FileTreeNode];
  'folder-children-updated': [folderPath: string, children: FileTreeNode[]];
  'recent-files-updated': RecentFile[];
  'recent-folders-updated': RecentFolder[];
  'file-deleted': string;
  'file-renamed': [oldPath: string, newPath: string];
  'file-moved': [oldPath: string, newPath: string];
  'file-changed-externally': string;
  'system-theme-changed': Theme;
  'terminal:output': { id: string; data: string };
  'terminal:exit': { id: string; exitCode: number; signal?: string };
  'menu-new': void;
  'menu-open': [content: string, filePath: string];
  'menu-save': void;
  'menu-export-png': void;
  'menu-export-pdf': void;
  'menu-export-svg': void;
}
