import React, { useState, useEffect, ReactElement } from 'react';
import { useTabScrolling } from '../hooks/useTabScrolling';
import type { Tab } from '../../types';
import './TabView.css';

interface ContextMenuState {
  x: number;
  y: number;
  tabId: number;
}

type ContextMenuAction = 'close' | 'closeOthers' | 'closeToRight' | 'closeAll';

interface TabViewProps {
  tabs: Tab[];
  activeTabId: number | null;
  onTabSelect: (tabId: number) => void;
  onTabClose: (tabId: number) => void;
  onTabNew: () => void;
  onTabReorder: (draggedIndex: number, targetIndex: number) => void;
  onCloseAllTabs: () => void;
  onCloseOtherTabs: (tabId: number) => void;
  onCloseTabsToRight: (tabId: number) => void;
}

const TabView = ({ tabs, activeTabId, onTabSelect, onTabClose, onTabNew, onTabReorder, onCloseAllTabs, onCloseOtherTabs, onCloseTabsToRight }: TabViewProps): ReactElement => {
  const [draggedTabId, setDraggedTabId] = useState<number | null>(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);

  // 탭 스크롤 훅 사용
  const {
    scrollContainerRef: tabViewInnerRef,
    canScrollLeft,
    canScrollRight,
    scrollTabs,
    checkScrollButtons,
    handleWheel
  } = useTabScrolling(activeTabId, tabs.length);

  const handleTabClick = (tabId: number): void => {
    onTabSelect(tabId);
  };

  const handleCloseClick = (e: React.MouseEvent, tabId: number): void => {
    e.stopPropagation();
    onTabClose(tabId);
  };

  const handleNewTabClick = (): void => {
    onTabNew();
  };

  const getTabTitle = (tab: Tab): string => {
    if (!tab.filePath) {
      return 'Untitled';
    }
    return tab.filePath.split('/').pop() || 'Untitled';
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, tabId: number): void => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>, targetTabId: number): void => {
    e.preventDefault();
    if (draggedTabId === null || draggedTabId === targetTabId) return;

    const draggedIndex = tabs.findIndex(tab => tab.id === draggedTabId);
    const targetIndex = tabs.findIndex(tab => tab.id === targetTabId);

    if (draggedIndex !== -1 && targetIndex !== -1) {
      onTabReorder(draggedIndex, targetIndex);
    }
  };

  const handleDragEnd = (): void => {
    setDraggedTabId(null);
  };

  // Context menu handlers
  const handleContextMenu = (e: React.MouseEvent, tabId: number): void => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      tabId: tabId
    });
  };

  const handleCloseContextMenu = (): void => {
    setContextMenu(null);
  };

  const handleContextMenuAction = (action: ContextMenuAction): void => {
    if (!contextMenu) return;

    switch (action) {
      case 'close':
        onTabClose(contextMenu.tabId);
        break;
      case 'closeOthers':
        onCloseOtherTabs(contextMenu.tabId);
        break;
      case 'closeToRight':
        onCloseTabsToRight(contextMenu.tabId);
        break;
      case 'closeAll':
        onCloseAllTabs();
        break;
    }
    setContextMenu(null);
  };

  // Close context menu when clicking outside
  useEffect(() => {
    if (contextMenu) {
      document.addEventListener('click', handleCloseContextMenu);
      return () => document.removeEventListener('click', handleCloseContextMenu);
    }
  }, [contextMenu]);

  return (
    <div className="tab-view">
      {/* 좌측 스크롤 버튼 */}
      <button
        className={`tab-scroll-btn left ${canScrollLeft ? 'visible' : ''}`}
        onClick={() => scrollTabs('left')}
        title="Scroll left"
      >
        ◀
      </button>

      {/* 실제 탭 영역 (스크롤 가능) */}
      <div
        className="tab-view-inner"
        ref={tabViewInnerRef}
        onScroll={checkScrollButtons}
        onWheel={handleWheel}
      >
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className={`tab-item ${tab.id === activeTabId ? 'active' : ''} ${tab.isModified ? 'modified' : ''} ${draggedTabId === tab.id ? 'dragging' : ''}`}
            onClick={() => handleTabClick(tab.id)}
            onContextMenu={(e) => handleContextMenu(e, tab.id)}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDragEnd={handleDragEnd}
            title={tab.filePath || 'Untitled'}
          >
            <span className="tab-icon">📊</span>
            <span className="tab-title">{getTabTitle(tab)}</span>
            {tab.isModified && <span className="modified-indicator">●</span>}
            <button
              className="tab-close"
              onClick={(e) => handleCloseClick(e, tab.id)}
              title="Close"
            >
              ×
            </button>
          </div>
        ))}
      </div>

      {/* 우측 스크롤 버튼 */}
      <button
        className={`tab-scroll-btn right ${canScrollRight ? 'visible' : ''}`}
        onClick={() => scrollTabs('right')}
        title="Scroll right"
      >
        ▶
      </button>

      {/* 새 탭 버튼 */}
      <button
        className="tab-new-btn"
        onClick={handleNewTabClick}
        title="New Tab"
      >
        +
      </button>

      {contextMenu && (
        <div
          className="tab-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div className="context-menu-item" onClick={() => handleContextMenuAction('close')}>
            탭 닫기
          </div>
          <div className="context-menu-item" onClick={() => handleContextMenuAction('closeOthers')}>
            다른 탭 모두 닫기
          </div>
          <div className="context-menu-item" onClick={() => handleContextMenuAction('closeToRight')}>
            오른쪽 탭 모두 닫기
          </div>
          <div className="context-menu-divider"></div>
          <div className="context-menu-item" onClick={() => handleContextMenuAction('closeAll')}>
            모든 탭 닫기
          </div>
        </div>
      )}
    </div>
  );
};

export default TabView;
