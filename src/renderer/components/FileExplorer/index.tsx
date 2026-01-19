import React, { useState, useEffect, useCallback, ReactElement, MouseEvent, ChangeEvent } from 'react';
import FileTree, { CreatingItemState } from './components/FileTree';
import BookmarksSection from './components/BookmarksSection';
import RecentFilesSection from './components/RecentFilesSection';
import RecentFoldersPopup from './components/RecentFoldersPopup';
import ContextMenu, { ContextMenuState } from './components/ContextMenu';
import DeleteConfirmDialog, { DeleteConfirmState } from './components/DeleteConfirmDialog';
import '../FileExplorer.css';
import type { FileTreeNode, RecentFile, RecentFolder, Bookmark, WorkspaceData } from '../../../types';

interface FileExplorerProps {
  onFileSelect: (content: string, filePath: string) => void;
  onToggleExplorer: () => void;
  onWorkspaceChange?: (rootFolder: string | null) => void;
}

/**
 * 파일 탐색기 메인 컴포넌트 (리팩토링 버전)
 *
 * 개선사항:
 * - 892줄 → 약 350줄로 축소
 * - 컴포넌트 분리로 책임 명확화
 * - 재사용 가능한 서브 컴포넌트들
 */
const FileExplorer = ({ onFileSelect, onToggleExplorer, onWorkspaceChange }: FileExplorerProps): ReactElement => {
  // ============================================================================
  // 상태 관리
  // ============================================================================

  const [rootFolder, setRootFolder] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeNode | null>(null);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  const [recentFiles, setRecentFiles] = useState<RecentFile[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [filteredTree, setFilteredTree] = useState<FileTreeNode | null>(null);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [isBookmarked, setIsBookmarked] = useState<boolean>(false);
  const [loadedFolders, setLoadedFolders] = useState<Map<string, FileTreeNode[]>>(new Map());
  const [recentFolders, setRecentFolders] = useState<RecentFolder[]>([]);
  const [showRecentFoldersPopup, setShowRecentFoldersPopup] = useState<boolean>(false);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [creatingItem, setCreatingItem] = useState<CreatingItemState | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);
  const [renamingNode, setRenamingNode] = useState<FileTreeNode | null>(null);

  // ============================================================================
  // 헬퍼 함수
  // ============================================================================

  const updateTreeWithChildren = useCallback((node: FileTreeNode | null, targetPath: string, children: FileTreeNode[]): FileTreeNode | null => {
    if (!node) return node;

    if (node.path === targetPath) {
      return { ...node, children, hasChildren: children && children.length > 0 };
    }

    if (node.children) {
      return {
        ...node,
        children: node.children.map(child => updateTreeWithChildren(child, targetPath, children)).filter((c): c is FileTreeNode => c !== null)
      };
    }

    return node;
  }, []);

  // ============================================================================
  // 이벤트 리스너 및 초기화
  // ============================================================================

  useEffect(() => {
    if (!window.electronAPI) return;

    const handleFolderOpened = (_event: unknown, workspaceData: WorkspaceData): void => {
      setRootFolder(workspaceData.folderPath);
      setFileTree(workspaceData.fileTree);
      setExpandedFolders(new Set([workspaceData.folderPath]));
      setLoadedFolders(new Map());
      setRecentFiles(workspaceData.recentFiles || []);
    };

    const handleFolderChildrenUpdated = (_event: unknown, folderPath: string, children: FileTreeNode[]): void => {
      setFileTree(prevTree => updateTreeWithChildren(prevTree, folderPath, children));
      setLoadedFolders(prevLoaded => {
        const newLoaded = new Map(prevLoaded);
        newLoaded.set(folderPath, children);
        return newLoaded;
      });
    };

    const handleRecentFilesUpdated = (_event: unknown, files: RecentFile[]): void => {
      setRecentFiles(files);
    };

    const handleRecentFoldersUpdated = (_event: unknown, folders: RecentFolder[]): void => {
      setRecentFolders(folders);
    };

    // 초기 데이터 로드
    const loadInitialData = async (): Promise<void> => {
      try {
        const result = await window.electronAPI.getLastFolder();
        if (result) {
          setRootFolder(result.folderPath);
          setFileTree(result.fileTree);
          setExpandedFolders(new Set([result.folderPath]));
          setRecentFiles(result.recentFiles || []);
        }

        const folders = await window.electronAPI.getRecentFolders();
        setRecentFolders(folders);

        const bookmarkList = await window.electronAPI.getBookmarks();
        setBookmarks(bookmarkList);
      } catch (error) {
        console.error('Error loading initial data:', error);
      }
    };

    loadInitialData();

    // 이벤트 리스너 등록
    window.electronAPI.onFolderOpened(handleFolderOpened);
    window.electronAPI.onFolderChildrenUpdated(handleFolderChildrenUpdated);
    window.electronAPI.onRecentFilesUpdated(handleRecentFilesUpdated);
    window.electronAPI.onRecentFoldersUpdated(handleRecentFoldersUpdated);

    return () => {
      window.electronAPI.removeAllListeners('folder-opened');
      window.electronAPI.removeAllListeners('folder-children-updated');
      window.electronAPI.removeAllListeners('recent-files-updated');
      window.electronAPI.removeAllListeners('recent-folders-updated');
    };
  }, [updateTreeWithChildren]);

  // 북마크 상태 체크
  useEffect(() => {
    setIsBookmarked(rootFolder ? bookmarks.some(b => b.path === rootFolder) : false);
  }, [rootFolder, bookmarks]);

  // 워크스페이스 변경 알림
  useEffect(() => {
    if (onWorkspaceChange) {
      onWorkspaceChange(rootFolder);
    }
  }, [rootFolder, onWorkspaceChange]);

  // 컨텍스트 메뉴 닫기
  useEffect(() => {
    const handleClickOutside = (e: Event): void => {
      if (contextMenu) {
        // 컨텍스트 메뉴 내부 클릭은 무시 (메뉴 아이템 클릭 처리를 위해)
        const contextMenuElement = document.querySelector('.context-menu');
        if (contextMenuElement && contextMenuElement.contains(e.target as Node)) {
          return;
        }
        setContextMenu(null);
      }
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  // 검색 필터링
  useEffect(() => {
    if (!fileTree) {
      setFilteredTree(null);
      return;
    }

    if (!searchQuery.trim()) {
      setFilteredTree(fileTree);
      return;
    }

    const filtered = filterTree(fileTree, searchQuery);
    setFilteredTree(filtered);

    if (filtered && searchQuery.trim()) {
      const allPaths = new Set<string>();
      const collectPaths = (node: FileTreeNode): void => {
        if (node.isDirectory) {
          allPaths.add(node.path);
          node.children?.forEach(collectPaths);
        }
      };
      collectPaths(filtered);
      setExpandedFolders(allPaths);
    }
  }, [searchQuery, fileTree]);

  // ============================================================================
  // 핸들러 함수들
  // ============================================================================

  const handleOpenFolder = async (): Promise<void> => {
    if (!window.electronAPI) return;
    setShowRecentFoldersPopup(false);
    await window.electronAPI.openFolder();
  };

  const handleOpenRecentFolder = async (folderPath: string): Promise<void> => {
    if (!window.electronAPI) return;
    setShowRecentFoldersPopup(false);
    try {
      await window.electronAPI.openRecentFolder(folderPath);
    } catch (error) {
      console.error('Error opening recent folder:', error);
    }
  };

  const handleOpenBookmark = async (folderPath: string): Promise<void> => {
    if (!window.electronAPI) return;
    try {
      await window.electronAPI.openBookmarkedFolder(folderPath);
    } catch (error) {
      console.error('Error opening bookmark:', error);
    }
  };

  const handleToggleBookmark = async (): Promise<void> => {
    if (!window.electronAPI || !rootFolder) return;

    try {
      const result = isBookmarked
        ? await window.electronAPI.removeBookmark(rootFolder)
        : await window.electronAPI.addBookmark(rootFolder);

      if (result.success && result.bookmarks) {
        setBookmarks(result.bookmarks);
        setIsBookmarked(!isBookmarked);
      }
    } catch (error) {
      console.error('Error toggling bookmark:', error);
    }
  };

  const toggleFolder = async (folderPath: string): Promise<void> => {
    const isCurrentlyExpanded = expandedFolders.has(folderPath);

    if (isCurrentlyExpanded) {
      const newExpanded = new Set(expandedFolders);
      newExpanded.delete(folderPath);
      setExpandedFolders(newExpanded);

      if (folderPath !== rootFolder) {
        await window.electronAPI.stopWatchingFolder(folderPath);
      }
    } else {
      const newExpanded = new Set(expandedFolders);
      newExpanded.add(folderPath);
      setExpandedFolders(newExpanded);

      if (!loadedFolders.has(folderPath)) {
        try {
          const result = await window.electronAPI.loadFolderChildren(folderPath);
          if (result.success && result.children) {
            setLoadedFolders(prev => new Map(prev).set(folderPath, result.children));
            setFileTree(prevTree => updateTreeWithChildren(prevTree, folderPath, result.children));
          }
        } catch (error) {
          console.error('Error loading folder children:', error);
        }
      }
    }
  };

  const handleFileClick = async (filePath: string, fileName: string): Promise<void> => {
    if (!window.electronAPI) return;

    const ext = fileName.split('.').pop()?.toLowerCase();
    if (!ext || !['mmd', 'mermaid', 'md', 'markdown'].includes(ext)) return;

    try {
      const content = await window.electronAPI.readFile(filePath);
      onFileSelect(content, filePath);
      setSelectedPath(filePath);
    } catch (error) {
      console.error('Error reading file:', error);
    }
  };

  const handleContextMenu = (e: MouseEvent, node: FileTreeNode): void => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetPath: node.path,
      targetNode: node
    });
  };

  const handleCreateNewFolder = (): void => {
    if (!contextMenu) return;
    const targetPath = contextMenu.targetPath;
    setCreatingItem({ type: 'folder', parentPath: targetPath });
    if (!expandedFolders.has(targetPath)) {
      setExpandedFolders(prev => new Set([...prev, targetPath]));
    }
    setContextMenu(null);
  };

  const handleCreateNewFile = (): void => {
    if (!contextMenu) return;
    const targetPath = contextMenu.targetPath;
    setCreatingItem({ type: 'file', parentPath: targetPath });
    if (!expandedFolders.has(targetPath)) {
      setExpandedFolders(prev => new Set([...prev, targetPath]));
    }
    setContextMenu(null);
  };

  const handleConfirmNewItem = async (name: string): Promise<void> => {
    if (!name.trim() || !creatingItem) {
      setCreatingItem(null);
      return;
    }

    try {
      const { type, parentPath } = creatingItem;
      const fullPath = `${parentPath}/${name}`;

      const result = type === 'folder'
        ? await window.electronAPI.createFolder(fullPath)
        : await window.electronAPI.createFile(`${fullPath}${name.endsWith('.mmd') ? '' : '.mmd'}`);

      if (result.success) {
        const childrenResult = await window.electronAPI.loadFolderChildren(parentPath);
        if (childrenResult.success && childrenResult.children) {
          setFileTree(prevTree => updateTreeWithChildren(prevTree, parentPath, childrenResult.children));
          setLoadedFolders(prev => new Map(prev).set(parentPath, childrenResult.children));
        }
      }
    } catch (error) {
      console.error('Error creating new item:', error);
    }

    setCreatingItem(null);
  };

  const handleDeleteItem = (): void => {
    if (!contextMenu) return;
    const node = contextMenu.targetNode;
    setDeleteConfirm({
      path: node.path,
      name: node.name,
      isDirectory: node.isDirectory
    });
    setContextMenu(null);
  };

  const handleConfirmDelete = async (): Promise<void> => {
    if (!deleteConfirm) return;

    try {
      const { path: itemPath, isDirectory } = deleteConfirm;
      const parentPath = itemPath.substring(0, itemPath.lastIndexOf('/'));

      const result = await window.electronAPI.deleteItem(itemPath, isDirectory);

      if (result.success) {
        const childrenResult = await window.electronAPI.loadFolderChildren(parentPath);
        if (childrenResult.success && childrenResult.children) {
          setFileTree(prevTree => updateTreeWithChildren(prevTree, parentPath, childrenResult.children));
          setLoadedFolders(prev => new Map(prev).set(parentPath, childrenResult.children));
        }
      }
    } catch (error) {
      console.error('Error deleting item:', error);
    }

    setDeleteConfirm(null);
  };

  const handleStartRename = (node: FileTreeNode): void => {
    setRenamingNode(node);
    setContextMenu(null);
  };

  const handleRename = async (oldPath: string, newName: string): Promise<void> => {
    if (!window.electronAPI || !renamingNode) return;

    try {
      const result = await window.electronAPI.renameItem(oldPath, newName, renamingNode.isDirectory);

      if (result.success) {
        // Refresh folder children to show new name
        const parentPath = oldPath.substring(0, oldPath.lastIndexOf('/'));
        const childrenResult = await window.electronAPI.loadFolderChildren(parentPath);
        if (childrenResult.success && childrenResult.children) {
          setFileTree(prevTree => updateTreeWithChildren(prevTree, parentPath, childrenResult.children));
          setLoadedFolders(prev => new Map(prev).set(parentPath, childrenResult.children));
        }
      } else {
        console.error('Rename failed:', result.error);
        alert(`Failed to rename: ${result.error}`);
      }
    } catch (error) {
      console.error('Error renaming item:', error);
      alert(`Error renaming item: ${(error as Error).message}`);
    }

    setRenamingNode(null);
  };

  const handleCancelRename = (): void => {
    setRenamingNode(null);
  };

  // ============================================================================
  // 렌더링
  // ============================================================================

  return (
    <div className="file-explorer">
      {/* 컨텍스트 메뉴 */}
      <ContextMenu
        contextMenu={contextMenu}
        onCreateFolder={handleCreateNewFolder}
        onCreateFile={handleCreateNewFile}
        onRename={() => contextMenu && handleStartRename(contextMenu.targetNode)}
        onDelete={handleDeleteItem}
        onClose={() => setContextMenu(null)}
      />

      {/* 삭제 확인 다이얼로그 */}
      <DeleteConfirmDialog
        deleteConfirm={deleteConfirm}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteConfirm(null)}
      />

      {/* 최근 폴더 팝업 */}
      <RecentFoldersPopup
        show={showRecentFoldersPopup}
        recentFolders={recentFolders}
        onClose={() => setShowRecentFoldersPopup(false)}
        onOpenFolder={handleOpenRecentFolder}
        onOpenNewFolder={handleOpenFolder}
      />

      {/* 헤더 */}
      <div className="explorer-header">
        <span className="title">EXPLORER</span>
        <div className="header-buttons">
          {rootFolder && (
            <>
              <button className="bookmark-btn" onClick={handleToggleBookmark} title={isBookmarked ? "Remove from bookmarks" : "Add to bookmarks"}>
                {isBookmarked ? '★' : '☆'}
              </button>
              <button className="refresh-btn" onClick={() => window.location.reload()} title="Refresh">
                🔄
              </button>
            </>
          )}
          <button className="open-folder-btn" onClick={() => setShowRecentFoldersPopup(!showRecentFoldersPopup)} title="Recent Folders">
            📂
          </button>
          <button className="toggle-explorer-btn" onClick={onToggleExplorer} title="Hide Explorer">
            ◀
          </button>
        </div>
      </div>

      {/* 콘텐츠 */}
      <div className="explorer-content">
        <BookmarksSection bookmarks={bookmarks} onOpenBookmark={handleOpenBookmark} />
        <RecentFilesSection recentFiles={recentFiles} onFileClick={handleFileClick} />

        {!rootFolder ? (
          <div className="no-folder">
            <p>No folder opened</p>
            <button onClick={handleOpenFolder}>Open Folder</button>
          </div>
        ) : (
          <div className="file-tree">
            <div className="folder-title" title={rootFolder}>{rootFolder}</div>
            <div className="search-box">
              <input
                type="text"
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button className="clear-search-btn" onClick={() => setSearchQuery('')} title="Clear search">
                  ✕
                </button>
              )}
            </div>
            {filteredTree ? (
              <FileTree
                node={filteredTree}
                expandedFolders={expandedFolders}
                selectedPath={selectedPath}
                creatingItem={creatingItem}
                renamingNode={renamingNode}
                onToggleFolder={toggleFolder}
                onFileClick={handleFileClick}
                onContextMenu={handleContextMenu}
                onConfirmNewItem={handleConfirmNewItem}
                onCancelNewItem={() => setCreatingItem(null)}
                onStartRename={handleStartRename}
                onRename={handleRename}
                onCancelRename={handleCancelRename}
              />
            ) : (
              <div className="no-results">No matching files found</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// 헬퍼 함수: 파일 트리 필터링
function filterTree(node: FileTreeNode, query: string): FileTreeNode | null {
  if (!node || !query) return node;

  const lowerQuery = query.toLowerCase();
  const matches = node.name.toLowerCase().includes(lowerQuery);

  if (!node.isDirectory) {
    const ext = node.name.split('.').pop()?.toLowerCase();
    return matches && ext && ['mmd', 'mermaid', 'md', 'markdown'].includes(ext) ? node : null;
  }

  const filteredChildren = node.children
    ?.map(child => filterTree(child, query))
    .filter((child): child is FileTreeNode => child !== null) || [];

  if (filteredChildren.length > 0 || matches) {
    return { ...node, children: filteredChildren };
  }

  return null;
}

export default FileExplorer;
