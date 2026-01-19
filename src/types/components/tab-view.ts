/**
 * TabView 컴포넌트 Props 타입
 */

import type { Tab } from '../editor';

export interface TabViewProps {
  tabs: Tab[];
  activeTabId: number | null;
  onTabSelect: (tabId: number) => void;
  onTabClose: (tabId: number) => void;
  onTabNew: () => void;
  onTabReorder: (draggedIndex: number, targetIndex: number) => void;
  onCloseAllTabs: () => void;
  onCloseOtherTabs: (keepTabId: number) => void;
  onCloseTabsToRight: (fromTabId: number) => void;
}
