import { useEffect } from 'react';
import type { Tab } from '../../types';

/**
 * 키보드 단축키 Hook
 * 탭 및 터미널 관련 키보드 단축키 처리
 */
export const useKeyboardShortcuts = (
  tabs: Tab[],
  activeTabId: number | null,
  handleTabClose: (tabId: number) => void,
  handleTabNew: () => void,
  setActiveTabId: (tabId: number) => void,
  toggleTerminal?: () => void
): void => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent): void => {
      // Ctrl+` (All) or Cmd+J (macOS) - Toggle Terminal
      if ((e.ctrlKey && e.key === '`') || (e.metaKey && e.key === 'j')) {
        e.preventDefault();
        if (toggleTerminal) {
          toggleTerminal();
        }
        return;
      }

      // Cmd+W (Mac) or Ctrl+W (Windows/Linux) - Close current tab
      if ((e.metaKey || e.ctrlKey) && e.key === 'w') {
        e.preventDefault();
        if (activeTabId !== null) {
          handleTabClose(activeTabId);
        }
      }

      // Cmd+T (Mac) or Ctrl+T (Windows/Linux) - New tab
      if ((e.metaKey || e.ctrlKey) && e.key === 't') {
        e.preventDefault();
        handleTabNew();
      }

      // Cmd+Shift+T (Mac) or Ctrl+Shift+T (Windows/Linux) - Reopen closed tab (placeholder)
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key === 't') {
        e.preventDefault();
        // TODO: Implement reopen closed tab
      }

      // Ctrl+Tab or Cmd+Option+Right - Next tab
      if ((e.ctrlKey && e.key === 'Tab') || (e.metaKey && e.altKey && e.key === 'ArrowRight')) {
        e.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        if (currentIndex !== -1 && currentIndex < tabs.length - 1) {
          setActiveTabId(tabs[currentIndex + 1].id);
        } else if (tabs.length > 0) {
          setActiveTabId(tabs[0].id);
        }
      }

      // Ctrl+Shift+Tab or Cmd+Option+Left - Previous tab
      if ((e.ctrlKey && e.shiftKey && e.key === 'Tab') || (e.metaKey && e.altKey && e.key === 'ArrowLeft')) {
        e.preventDefault();
        const currentIndex = tabs.findIndex(tab => tab.id === activeTabId);
        if (currentIndex > 0) {
          setActiveTabId(tabs[currentIndex - 1].id);
        } else if (tabs.length > 0) {
          setActiveTabId(tabs[tabs.length - 1].id);
        }
      }

      // Cmd+1-9 (Mac) or Ctrl+1-9 (Windows/Linux) - Switch to tab by index
      if ((e.metaKey || e.ctrlKey) && e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        const index = parseInt(e.key) - 1;
        if (index < tabs.length) {
          setActiveTabId(tabs[index].id);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [tabs, activeTabId, handleTabClose, handleTabNew, setActiveTabId, toggleTerminal]);
};
