import { useState, useEffect, useRef } from 'react';
import { defaultDiagram } from '../constants/defaultDiagram';
import { getFileType } from '../utils/fileTypeDetector';
import type { Tab, FileType, WorkspaceData, TabState } from '../../types';

let nextTabId = 1;

/**
 * Tab 업데이트 타입
 */
interface TabUpdates {
  diagramCode?: string;
  filePath?: string | null;
  fileType?: FileType;
  isModified?: boolean;
  title?: string;
}

/**
 * useTabManager 반환 타입
 */
export interface UseTabManagerReturn {
  tabs: Tab[];
  activeTabId: number | null;
  activeTab: Tab | undefined;
  diagramCode: string;
  currentFilePath: string | null;
  updateActiveTab: (updates: TabUpdates) => void;
  handleEditorChange: (value: string) => void;
  handleFileSelect: (content: string, filePath: string) => void;
  handleTabSelect: (tabId: number) => void;
  handleTabClose: (tabId: number) => void;
  handleTabNew: () => void;
  handleTabReorder: (draggedIndex: number, targetIndex: number) => void;
  handleCloseAllTabs: () => void;
  handleCloseOtherTabs: (keepTabId: number) => void;
  handleCloseTabsToRight: (fromTabId: number) => void;
}

/**
 * 탭 관리 Hook
 * 탭 상태 및 모든 탭 관련 작업 관리
 */
export const useTabManager = (): UseTabManagerReturn => {
  const [tabs, setTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<number | null>(null);
  const loadTabsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const activeTab = tabs.find(tab => tab.id === activeTabId);
  const diagramCode = activeTab?.diagramCode || '';
  const currentFilePath = activeTab?.filePath || null;

  // Load tabs from localStorage on mount and when folder changes
  useEffect(() => {
    if (!window.electronAPI) return;

    const loadInitialWorkspace = async () => {
      try {
        const workspaceData = await window.electronAPI.getLastFolder();
        console.log('[App] Loading initial workspace data:', workspaceData);

        if (workspaceData && workspaceData.tabState) {
          const { tabState } = workspaceData;
          if (tabState.tabs && tabState.tabs.length > 0) {
            console.log(`[App] Restoring ${tabState.tabs.length} tabs for workspace`);
            setTabs(tabState.tabs);
            setActiveTabId(tabState.activeTabId || tabState.tabs[0].id);
            nextTabId = Math.max(...tabState.tabs.map(t => t.id)) + 1;

            // 복원된 탭들의 파일 감시 시작
            tabState.tabs.forEach(tab => {
              if (tab.filePath) {
                window.electronAPI.watchFile(tab.filePath);
              }
            });
          } else {
            console.log('[App] No saved tabs for this workspace');
            setTabs([]);
            setActiveTabId(null);
          }
        } else {
          console.log('[App] No workspace data - starting with empty state');
          setTabs([]);
          setActiveTabId(null);
        }
      } catch (error) {
        console.error('[App] Failed to load initial workspace:', error);
      }
    };

    // Load initial workspace (includes tabs)
    loadInitialWorkspace();

    // Listen for folder changes - now receives all workspace data in one event
    const handleFolderOpened = (_event: unknown, workspaceData: WorkspaceData): void => {
      console.log('[App] Workspace changed - processing all updates');
      console.log('[App] - Folder:', workspaceData.folderPath);
      console.log('[App] - Tab state:', workspaceData.tabState?.tabs?.length || 0, 'tabs');

      // 기존 탭들의 파일 감시 중단
      setTabs(prevTabs => {
        prevTabs.forEach(tab => {
          if (tab.filePath) {
            window.electronAPI.unwatchFile(tab.filePath);
          }
        });
        return prevTabs;
      });

      // 열린 파일(탭) 갱신
      if (workspaceData.tabState && workspaceData.tabState.tabs && workspaceData.tabState.tabs.length > 0) {
        console.log(`[App] Restoring ${workspaceData.tabState.tabs.length} tabs for workspace`);
        setTabs(workspaceData.tabState.tabs);
        setActiveTabId(workspaceData.tabState.activeTabId || workspaceData.tabState.tabs[0].id);
        nextTabId = Math.max(...workspaceData.tabState.tabs.map(t => t.id)) + 1;

        // 복원된 탭들의 파일 감시 시작
        workspaceData.tabState.tabs.forEach(tab => {
          if (tab.filePath) {
            window.electronAPI.watchFile(tab.filePath);
          }
        });
      } else {
        console.log('[App] No saved tabs - clearing all tabs');
        setTabs([]);
        setActiveTabId(null);
      }

      console.log('[App] All workspace data updated');
    };

    // Listen for file deletion events
    const handleFileDeleted = (_event: unknown, filePath: string): void => {
      console.log('[App] File deleted:', filePath);

      // 파일 감시 중단
      window.electronAPI.unwatchFile(filePath);

      // 삭제된 파일의 탭을 찾아서 닫기
      setTabs(prevTabs => {
        const filteredTabs = prevTabs.filter(tab => tab.filePath !== filePath);
        const deletedTab = prevTabs.find(tab => tab.filePath === filePath);

        // 활성 탭이 삭제된 경우 처리
        if (deletedTab) {
          // setActiveTabId를 별도로 호출
          setActiveTabId(prevActiveId => {
            if (prevActiveId === deletedTab.id) {
              // 새로운 활성 탭 선택 (마지막 탭 또는 null)
              return filteredTabs.length > 0 ? filteredTabs[filteredTabs.length - 1].id : null;
            }
            return prevActiveId;
          });
        }

        return filteredTabs;
      });
    };

    // Listen for file renamed events
    const handleFileRenamed = (_event: unknown, oldPath: string, newPath: string): void => {
      console.log('[App] File renamed:', oldPath, '->', newPath);

      // 이름이 변경된 파일의 탭 경로 업데이트
      setTabs(prevTabs => {
        return prevTabs.map(tab => {
          if (tab.filePath === oldPath) {
            const fileName = newPath.split('/').pop() || newPath.split('\\').pop();
            return {
              ...tab,
              filePath: newPath,
              title: fileName
            };
          }
          return tab;
        });
      });
    };

    // Listen for file moved events
    const handleFileMoved = (_event: unknown, oldPath: string, newPath: string): void => {
      console.log('[App] File moved:', oldPath, '->', newPath);

      // 이동된 파일의 탭 경로 업데이트
      setTabs(prevTabs => {
        return prevTabs.map(tab => {
          if (tab.filePath === oldPath) {
            const fileName = newPath.split('/').pop() || newPath.split('\\').pop();
            return {
              ...tab,
              filePath: newPath,
              title: fileName
            };
          }
          return tab;
        });
      });
    };

    // Listen for external file changes
    const handleFileChangedExternally = async (_event: unknown, filePath: string): Promise<void> => {
      console.log('[App] File changed externally:', filePath);

      setTabs(prevTabs => {
        const targetTab = prevTabs.find(tab => tab.filePath === filePath);
        if (!targetTab) return prevTabs;

        // 사용자에게 리로드 여부 확인
        const fileName = filePath.split('/').pop();
        const shouldReload = window.confirm(
          `"${fileName}" 파일이 외부에서 변경되었습니다.\n\n다시 불러오시겠습니까?`
        );

        if (shouldReload) {
          // 파일 다시 읽기
          window.electronAPI.readFile(filePath).then(content => {
            setTabs(currentTabs =>
              currentTabs.map(tab =>
                tab.filePath === filePath
                  ? { ...tab, diagramCode: content, isModified: false }
                  : tab
              )
            );
          }).catch(error => {
            console.error('[App] Failed to reload file:', error);
          });
        }

        return prevTabs;
      });
    };

    window.electronAPI.onFolderOpened(handleFolderOpened);
    window.electronAPI.onFileDeleted(handleFileDeleted);
    window.electronAPI.onFileRenamed(handleFileRenamed);
    window.electronAPI.onFileMoved(handleFileMoved);
    window.electronAPI.onFileChangedExternally(handleFileChangedExternally);

    return () => {
      window.electronAPI.removeAllListeners('folder-opened');
      window.electronAPI.removeAllListeners('file-deleted');
      window.electronAPI.removeAllListeners('file-renamed');
      window.electronAPI.removeAllListeners('file-moved');
      window.electronAPI.removeAllListeners('file-changed-externally');
      if (loadTabsTimeoutRef.current) {
        clearTimeout(loadTabsTimeoutRef.current);
      }
    };
  }, []);  // dependency array에서 activeTabId 제거

  // Save tabs to localStorage whenever they change
  useEffect(() => {
    if (!window.electronAPI) return;

    const saveTabState = async () => {
      try {
        await window.electronAPI.saveTabState({ tabs, activeTabId });
      } catch (error) {
        console.error('Failed to save tab state:', error);
      }
    };

    // Debounce save operation
    const timeoutId = setTimeout(saveTabState, 500);
    return () => clearTimeout(timeoutId);
  }, [tabs, activeTabId]);

  const updateActiveTab = (updates: TabUpdates): void => {
    setTabs(prevTabs =>
      prevTabs.map(tab =>
        tab.id === activeTabId ? { ...tab, ...updates } : tab
      )
    );
  };

  const handleEditorChange = (value: string): void => {
    updateActiveTab({ diagramCode: value, isModified: true });
  };

  const handleFileSelect = (content: string, filePath: string): void => {
    // Check if file is already open in a tab
    const existingTab = tabs.find(tab => tab.filePath === filePath);

    if (existingTab) {
      // Switch to existing tab
      setActiveTabId(existingTab.id);
    } else {
      // Create new tab
      const fileType = getFileType(filePath);  // 파일 타입 감지
      const newTab = {
        id: nextTabId++,
        diagramCode: content,
        filePath: filePath,
        fileType: fileType,  // 추가
        isModified: false
      };
      setTabs(prevTabs => [...prevTabs, newTab]);
      setActiveTabId(newTab.id);

      // 파일 감시 시작 (외부 변경 감지)
      if (window.electronAPI) {
        window.electronAPI.watchFile(filePath);
      }
    }
  };

  const handleTabSelect = (tabId: number): void => {
    setActiveTabId(tabId);
  };

  const handleTabClose = (tabId: number): void => {
    const tabToClose = tabs.find(tab => tab.id === tabId);

    if (tabToClose?.isModified) {
      if (!window.confirm('이 탭에 저장되지 않은 변경사항이 있습니다. 닫으시겠습니까?')) {
        return;
      }
    }

    // 파일 감시 중단
    if (tabToClose?.filePath && window.electronAPI) {
      window.electronAPI.unwatchFile(tabToClose.filePath);
    }

    const newTabs = tabs.filter(tab => tab.id !== tabId);

    setTabs(newTabs);

    if (activeTabId === tabId) {
      // Switch to the last tab if closing the active tab, or null if no tabs left
      setActiveTabId(newTabs.length > 0 ? newTabs[newTabs.length - 1].id : null);
    }
  };

  const handleTabNew = (): void => {
    const newTab: Tab = {
      id: nextTabId++,
      diagramCode: defaultDiagram,
      filePath: null,
      fileType: 'mermaid',
      isModified: false
    };
    setTabs(prevTabs => [...prevTabs, newTab]);
    setActiveTabId(newTab.id);
  };

  const handleTabReorder = (draggedIndex: number, targetIndex: number): void => {
    setTabs(prevTabs => {
      const newTabs = [...prevTabs];
      const [draggedTab] = newTabs.splice(draggedIndex, 1);
      newTabs.splice(targetIndex, 0, draggedTab);
      return newTabs;
    });
  };

  const handleCloseAllTabs = (): void => {
    const hasModified = tabs.some(tab => tab.isModified);
    if (hasModified) {
      if (!window.confirm('저장되지 않은 변경사항이 있는 탭이 있습니다. 모든 탭을 닫으시겠습니까?')) {
        return;
      }
    }

    // 모든 파일 감시 중단
    if (window.electronAPI) {
      tabs.forEach(tab => {
        if (tab.filePath) {
          window.electronAPI.unwatchFile(tab.filePath);
        }
      });
    }

    setTabs([]);
    setActiveTabId(null);
  };

  const handleCloseOtherTabs = (keepTabId: number): void => {
    const hasModified = tabs.some(tab => tab.id !== keepTabId && tab.isModified);
    if (hasModified) {
      if (!window.confirm('저장되지 않은 변경사항이 있는 탭이 있습니다. 다른 탭을 모두 닫으시겠습니까?')) {
        return;
      }
    }

    // 닫히는 탭들의 파일 감시 중단
    if (window.electronAPI) {
      tabs.forEach(tab => {
        if (tab.id !== keepTabId && tab.filePath) {
          window.electronAPI.unwatchFile(tab.filePath);
        }
      });
    }

    const keepTab = tabs.find(tab => tab.id === keepTabId);
    if (keepTab) {
      setTabs([keepTab]);
      setActiveTabId(keepTabId);
    }
  };

  const handleCloseTabsToRight = (fromTabId: number): void => {
    const fromIndex = tabs.findIndex(tab => tab.id === fromTabId);
    if (fromIndex === -1 || fromIndex === tabs.length - 1) return;

    const tabsToClose = tabs.slice(fromIndex + 1);
    const hasModified = tabsToClose.some(tab => tab.isModified);
    if (hasModified) {
      if (!window.confirm('저장되지 않은 변경사항이 있는 탭이 있습니다. 오른쪽 탭을 모두 닫으시겠습니까?')) {
        return;
      }
    }

    // 닫히는 탭들의 파일 감시 중단
    if (window.electronAPI) {
      tabsToClose.forEach(tab => {
        if (tab.filePath) {
          window.electronAPI.unwatchFile(tab.filePath);
        }
      });
    }

    const newTabs = tabs.slice(0, fromIndex + 1);
    setTabs(newTabs);

    // If active tab was closed, switch to the last remaining tab
    if (!newTabs.find(tab => tab.id === activeTabId)) {
      setActiveTabId(newTabs[newTabs.length - 1].id);
    }
  };

  return {
    tabs,
    activeTabId,
    activeTab,
    diagramCode,
    currentFilePath,
    updateActiveTab,
    handleEditorChange,
    handleFileSelect,
    handleTabSelect,
    handleTabClose,
    handleTabNew,
    handleTabReorder,
    handleCloseAllTabs,
    handleCloseOtherTabs,
    handleCloseTabsToRight
  };
};
