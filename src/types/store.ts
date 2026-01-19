/**
 * Electron Store 스키마 타입
 */

import type { TabState } from './editor';
import type { RecentFile, RecentFolder, Bookmark, LayoutSettings } from './workspace';
import type { ThemeSettings } from './theme';
import type { TerminalStateData } from './terminal';

/**
 * 폴더별 최근 파일 맵
 */
export interface RecentFilesByFolder {
  [folderPath: string]: RecentFile[];
}

/**
 * 폴더별 탭 상태 맵
 */
export interface TabStatesByFolder {
  [folderPath: string]: TabState;
}

/**
 * 워크스페이스별 터미널 상태 맵
 */
export interface TerminalStatesByWorkspace {
  [workspace: string]: TerminalStateData;
}

/**
 * Electron Store 통합 스키마
 */
export interface StoreSchema {
  // 워크스페이스 관련
  lastOpenedFolder: string | null;
  recentFilesByFolder: RecentFilesByFolder;
  tabStatesByFolder: TabStatesByFolder;
  recentFolders: RecentFolder[];
  tabState: TabState | null;

  // 설정 관련
  folderBookmarks: Bookmark[];
  layoutSettings: LayoutSettings | null;

  // 테마 관련
  themeSettings: ThemeSettings;

  // 터미널 관련
  terminalStatesByWorkspace: TerminalStatesByWorkspace;

  // 확장을 위한 인덱스 시그니처
  [key: string]: unknown;
}
