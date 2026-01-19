/**
 * Hook 반환 타입
 */

import type { RefObject } from 'react';
import type { Tab, TabUpdate, FileType } from './editor';
import type { ViewMode, LayoutSettings } from './workspace';
import type { Theme, ThemeMode } from './theme';
import type { FilePath, Nullable } from './common';

/**
 * useTabManager 반환 타입
 */
export interface UseTabManagerReturn {
  tabs: Tab[];
  activeTabId: Nullable<number>;
  activeTab: Tab | undefined;
  diagramCode: string;
  currentFilePath: Nullable<FilePath>;
  fileType: FileType;
  updateActiveTab: (updates: TabUpdate) => void;
  handleEditorChange: (value: string) => void;
  handleFileSelect: (content: string, filePath: FilePath) => void;
  handleTabSelect: (tabId: number) => void;
  handleTabClose: (tabId: number) => void;
  handleTabNew: () => void;
  handleTabReorder: (draggedIndex: number, targetIndex: number) => void;
  handleCloseAllTabs: () => void;
  handleCloseOtherTabs: (keepTabId: number) => void;
  handleCloseTabsToRight: (fromTabId: number) => void;
}

/**
 * useLayoutSettings 반환 타입
 */
export interface UseLayoutSettingsReturn {
  explorerWidth: number;
  editorWidth: number;
  viewMode: ViewMode;
  layoutLoaded: boolean;
  handleExplorerResize: (clientX: number) => void;
  handleEditorResize: (clientX: number) => void;
  handleViewModeChange: (mode: ViewMode) => void;
}

/**
 * useTheme 반환 타입
 */
export interface UseThemeReturn {
  theme: Theme;
  mode: ThemeMode;
  followSystem: boolean;
  toggleTheme: () => Promise<void>;
  setAutoMode: () => Promise<void>;
  setThemeMode: (themeName: Theme) => Promise<void>;
  isLight: boolean;
  isDark: boolean;
  isAuto: boolean;
}

/**
 * useDiagramRenderer 파라미터
 */
export interface UseDiagramRendererParams {
  diagramCode: string;
}

/**
 * useDiagramRenderer 반환 타입
 */
export interface UseDiagramRendererReturn {
  diagramRef: RefObject<HTMLDivElement | null>;
  error: string | null;
}

/**
 * useTerminal 반환 타입
 */
export interface UseTerminalReturn {
  isTerminalVisible: boolean;
  terminalHeight: number;
  terminalLoaded: boolean;
  toggleTerminal: () => void;
  openTerminal: () => void;
  closeTerminal: () => void;
  handleTerminalResize: (deltaY: number) => void;
  handleTerminalResizeByPosition: (clientY: number) => void;
}

/**
 * useKeyboardShortcuts 파라미터
 */
export interface UseKeyboardShortcutsParams {
  tabs: Tab[];
  activeTabId: Nullable<number>;
  handleTabClose: (tabId: number) => void;
  handleTabNew: () => void;
  setActiveTabId: (tabId: number) => void;
  toggleTerminal?: () => void;
}

/**
 * useMenuHandlers 파라미터
 */
export interface UseMenuHandlersParams {
  diagramCode: string;
  currentFilePath: Nullable<FilePath>;
  fileType: FileType;
  updateActiveTab: (updates: TabUpdate) => void;
  handleTabNew: () => void;
  handleFileSelect: (content: string, filePath: FilePath) => void;
  diagramRef: RefObject<HTMLDivElement | null>;
}

/**
 * useTabScrolling 파라미터
 */
export interface UseTabScrollingParams {
  tabsCount: number;
}

/**
 * useTabScrolling 반환 타입
 */
export interface UseTabScrollingReturn {
  tabsContainerRef: RefObject<HTMLDivElement | null>;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  scrollLeft: () => void;
  scrollRight: () => void;
}
