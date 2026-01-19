import React, { ReactElement, MouseEvent } from 'react';
import type { FileTreeNode } from '../../../../types';

export interface ContextMenuState {
  x: number;
  y: number;
  targetPath: string;
  targetNode: FileTreeNode;
}

interface ContextMenuProps {
  contextMenu: ContextMenuState | null;
  onCreateFolder: () => void;
  onCreateFile: () => void;
  onRename: () => void;
  onDelete: () => void;
  onClose: () => void;
}

/**
 * 컨텍스트 메뉴 컴포넌트
 * 파일/폴더 우클릭 시 표시되는 메뉴
 */
const ContextMenu = ({ contextMenu, onCreateFolder, onCreateFile, onRename, onDelete, onClose }: ContextMenuProps): ReactElement | null => {
  if (!contextMenu) return null;

  const handleItemClick = (action: () => void): void => {
    action();
    onClose();
  };

  return (
    <div
      className="context-menu"
      style={{
        position: 'fixed',
        top: contextMenu.y,
        left: contextMenu.x,
        zIndex: 1000
      }}
      onClick={(e: MouseEvent) => e.stopPropagation()}
    >
      {contextMenu.targetNode.isDirectory && (
        <>
          <div className="context-menu-item" onClick={() => handleItemClick(onCreateFolder)}>
            📁 새 폴더
          </div>
          <div className="context-menu-item" onClick={() => handleItemClick(onCreateFile)}>
            📄 새 파일
          </div>
          <div className="context-menu-divider"></div>
        </>
      )}
      <div className="context-menu-item" onClick={() => handleItemClick(onRename)}>
        ✏️ 이름 바꾸기
      </div>
      <div className="context-menu-divider"></div>
      <div className="context-menu-item delete" onClick={() => handleItemClick(onDelete)}>
        🗑️ 삭제
      </div>
    </div>
  );
};

export default ContextMenu;
