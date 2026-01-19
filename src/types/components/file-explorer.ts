/**
 * FileExplorer 컴포넌트 Props 타입
 */

import type { FilePath, FolderPath } from '../common';
import type { FileTreeNode } from '../file-system';
import type { RecentFile, RecentFolder, Bookmark } from '../workspace';

export interface FileExplorerProps {
  onFileSelect: (content: string, filePath: FilePath) => void;
  onToggleExplorer: () => void;
  onWorkspaceChange?: (folderPath: FolderPath) => void;
}

export interface FileTreeProps {
  tree: FileTreeNode;
  level?: number;
  expandedFolders: Set<string>;
  loadedFolders: Map<string, FileTreeNode[]>;
  selectedPath: string | null;
  renamingNode: RenamingNodeState | null;
  onToggleFolder: (folderPath: string, e: React.MouseEvent) => void;
  onFileClick: (filePath: string) => void;
  onContextMenu: (e: React.MouseEvent, node: FileTreeNode) => void;
  onRenameChange: (value: string) => void;
  onRenameSubmit: () => void;
  onRenameCancel: () => void;
  onDragStart: (e: React.DragEvent, node: FileTreeNode) => void;
  onDragOver: (e: React.DragEvent, node: FileTreeNode) => void;
  onDrop: (e: React.DragEvent, targetNode: FileTreeNode) => void;
}

export interface ContextMenuState {
  x: number;
  y: number;
  node: FileTreeNode;
}

export interface CreatingItemState {
  parentPath: string;
  type: 'file' | 'folder';
  name: string;
}

export interface DeleteConfirmState {
  node: FileTreeNode;
}

export interface RenamingNodeState {
  path: string;
  name: string;
  isDirectory: boolean;
}

export interface BookmarksSectionProps {
  bookmarks: Bookmark[];
  onBookmarkClick: (folderPath: string) => void;
  onRemoveBookmark: (folderPath: string) => void;
}

export interface RecentFilesSectionProps {
  recentFiles: RecentFile[];
  onFileClick: (filePath: string) => void;
}

export interface RecentFoldersPopupProps {
  isOpen: boolean;
  recentFolders: RecentFolder[];
  onFolderClick: (folderPath: string) => void;
  onClose: () => void;
}

export interface ContextMenuProps {
  x: number;
  y: number;
  node: FileTreeNode;
  onClose: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRename: () => void;
  onDelete: () => void;
}

export interface DeleteConfirmDialogProps {
  node: FileTreeNode;
  onConfirm: () => void;
  onCancel: () => void;
}

export interface InlineEditProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}
