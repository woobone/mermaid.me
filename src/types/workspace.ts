/**
 * 워크스페이스 타입
 */

import type { FilePath, FolderPath, Timestamp } from './common';
import type { FileTreeNode } from './file-system';
import type { TabState } from './editor';

/**
 * 최근 파일
 */
export interface RecentFile {
  path: FilePath;
  name: string;
  timestamp: Timestamp;
}

/**
 * 최근 폴더
 */
export interface RecentFolder {
  path: FolderPath;
  name: string;
  timestamp: Timestamp;
}

/**
 * 북마크
 */
export interface Bookmark {
  path: FolderPath;
  name: string;
  timestamp: Timestamp;
}

/**
 * 워크스페이스 데이터
 */
export interface WorkspaceData {
  folderPath: FolderPath;
  fileTree: FileTreeNode;
  recentFiles: RecentFile[];
  tabState?: TabState | null;
}

/**
 * 레이아웃 설정
 */
export interface LayoutSettings {
  explorerWidth?: number;
  editorWidth?: number;
  viewMode?: ViewMode;
  terminalHeight?: number;
}

/**
 * 뷰 모드
 */
export type ViewMode = 'split' | 'code' | 'preview';

/**
 * 뷰 모드 상수
 */
export const VIEW_MODES = {
  SPLIT: 'split',
  CODE: 'code',
  PREVIEW: 'preview',
} as const;
