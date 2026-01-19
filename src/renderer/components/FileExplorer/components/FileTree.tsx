import React, { ReactElement, MouseEvent, KeyboardEvent, ChangeEvent } from 'react';
import InlineEdit from './InlineEdit';
import type { FileTreeNode } from '../../../../types';

type CreatingItemType = 'folder' | 'file';

export interface CreatingItemState {
  type: CreatingItemType;
  parentPath: string;
}

interface FileTreeProps {
  node: FileTreeNode;
  level?: number;
  expandedFolders: Set<string>;
  selectedPath: string | null;
  creatingItem: CreatingItemState | null;
  renamingNode: FileTreeNode | null;
  onToggleFolder: (folderPath: string) => void;
  onFileClick: (filePath: string, fileName: string) => void;
  onContextMenu: (e: MouseEvent, node: FileTreeNode) => void;
  onConfirmNewItem: (name: string) => void;
  onCancelNewItem: () => void;
  onStartRename?: (node: FileTreeNode) => void;
  onRename: (oldPath: string, newName: string) => void;
  onCancelRename: () => void;
}

interface CreatingItemInputProps {
  level: number;
  type: CreatingItemType;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}

/**
 * 파일 트리 컴포넌트
 * 폴더 구조를 트리 형태로 표시
 */
const FileTree = ({
  node,
  level = 0,
  expandedFolders,
  selectedPath,
  creatingItem,
  renamingNode,
  onToggleFolder,
  onFileClick,
  onContextMenu,
  onConfirmNewItem,
  onCancelNewItem,
  onStartRename,
  onRename,
  onCancelRename
}: FileTreeProps): ReactElement | null => {
  if (!node) return null;

  const isExpanded = expandedFolders.has(node.path);
  const hasChildren = node.isDirectory && (node.hasChildren || (node.children && node.children.length > 0));
  const isFile = !node.isDirectory;
  const isDisabled = isFile && !isSupportedFile(node.name);
  const childCount = countChildren(node);
  const isSelected = selectedPath === node.path;
  const isCreatingInThisFolder = creatingItem && creatingItem.parentPath === node.path;
  const isRenaming = renamingNode && renamingNode.path === node.path;

  return (
    <div key={node.path} className="tree-node">
      <div
        className={`tree-item ${node.isDirectory ? 'directory' : 'file'} ${isDisabled ? 'disabled' : ''} ${isSelected ? 'selected' : ''}`}
        style={{ paddingLeft: `${level * 16 + 8}px` }}
        onClick={(e: MouseEvent<HTMLDivElement>) => {
          if (isRenaming) return;
          // 클릭 시 현재 요소에 포커스 설정 (F2 키 이벤트 수신용)
          e.currentTarget.focus();
          if (node.isDirectory) {
            onToggleFolder(node.path);
          } else if (!isDisabled) {
            onFileClick(node.path, node.name);
          }
        }}
        onContextMenu={(e: MouseEvent<HTMLDivElement>) => {
          if (!isRenaming) {
            onContextMenu(e, node);
          }
        }}
        onKeyDown={(e: KeyboardEvent<HTMLDivElement>) => {
          if (isRenaming) return;
          if (e.key === 'F2') {
            e.preventDefault();
            onStartRename && onStartRename(node);
          } else if (e.key === 'Enter') {
            if (node.isDirectory) {
              onToggleFolder(node.path);
            } else if (!isDisabled) {
              onFileClick(node.path, node.name);
            }
          } else if (e.key === ' ') {
            e.preventDefault();
            if (node.isDirectory) {
              onToggleFolder(node.path);
            }
          }
        }}
        tabIndex={0}
      >
        {node.isDirectory && (
          <span className={`chevron ${isExpanded ? 'expanded' : ''}`}>
            ▶
          </span>
        )}
        <span className="icon">{getFileIcon(node.name, node.isDirectory)}</span>
        {isRenaming ? (
          <InlineEdit node={node} onRename={onRename} onCancel={onCancelRename} />
        ) : (
          <>
            <span className="name">{node.name}</span>
            {node.isDirectory && childCount > 0 && (
              <span className="item-count">{childCount}</span>
            )}
          </>
        )}
      </div>

      {node.isDirectory && isExpanded && (
        <div className="tree-children">
          {/* Render creating item input first */}
          {isCreatingInThisFolder && (
            <CreatingItemInput
              level={level + 1}
              type={creatingItem.type}
              onConfirm={onConfirmNewItem}
              onCancel={onCancelNewItem}
            />
          )}
          {/* Render actual children */}
          {node.children && node.children.length > 0 &&
            node.children.map(child => (
              <FileTree
                key={child.path}
                node={child}
                level={level + 1}
                expandedFolders={expandedFolders}
                selectedPath={selectedPath}
                creatingItem={creatingItem}
                renamingNode={renamingNode}
                onToggleFolder={onToggleFolder}
                onFileClick={onFileClick}
                onContextMenu={onContextMenu}
                onConfirmNewItem={onConfirmNewItem}
                onCancelNewItem={onCancelNewItem}
                onStartRename={onStartRename}
                onRename={onRename}
                onCancelRename={onCancelRename}
              />
            ))
          }
        </div>
      )}
    </div>
  );
};

/**
 * 새 항목 생성 입력 필드 컴포넌트
 */
const CreatingItemInput = ({ level, type, onConfirm, onCancel }: CreatingItemInputProps): ReactElement => {
  return (
    <div
      className="tree-item creating"
      style={{ paddingLeft: `${level * 16 + 8}px` }}
    >
      <span className="icon">
        {type === 'folder' ? '📁' : '📄'}
      </span>
      <input
        type="text"
        className="inline-input"
        autoFocus
        placeholder={type === 'folder' ? '폴더 이름' : '파일 이름'}
        onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
            onConfirm((e.target as HTMLInputElement).value);
          } else if (e.key === 'Escape') {
            onCancel();
          }
        }}
        onBlur={(e: React.FocusEvent<HTMLInputElement>) => {
          if (e.target.value.trim()) {
            onConfirm(e.target.value);
          } else {
            onCancel();
          }
        }}
      />
    </div>
  );
};

// 헬퍼 함수들
function isSupportedFile(fileName: string): boolean {
  if (!fileName) return false;
  const ext = fileName.split('.').pop()?.toLowerCase();
  return ext ? ['mmd', 'mermaid', 'md', 'markdown'].includes(ext) : false;
}

function countChildren(node: FileTreeNode): number {
  if (!node || !node.children) return 0;
  return node.children.length;
}

function getFileIcon(fileName: string, isDirectory: boolean): string {
  if (isDirectory) {
    return '📁';
  }

  const ext = fileName.split('.').pop()?.toLowerCase();
  switch (ext) {
    case 'mmd':
    case 'mermaid':
      return '📊';
    case 'md':
      return '📝';
    case 'txt':
      return '📄';
    case 'js':
    case 'jsx':
      return '📜';
    case 'css':
      return '🎨';
    case 'json':
      return '⚙️';
    default:
      return '📄';
  }
}

export default FileTree;
