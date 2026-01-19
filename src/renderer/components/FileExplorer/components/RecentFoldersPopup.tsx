import React, { ReactElement } from 'react';
import type { RecentFolder } from '../../../../types';

interface RecentFoldersPopupProps {
  show: boolean;
  recentFolders: RecentFolder[];
  onClose: () => void;
  onOpenFolder: (folderPath: string) => void;
  onOpenNewFolder: () => void;
}

/**
 * 최근 폴더 팝업 컴포넌트
 * 최근 열었던 폴더 목록 표시
 */
const RecentFoldersPopup = ({
  show,
  recentFolders,
  onClose,
  onOpenFolder,
  onOpenNewFolder
}: RecentFoldersPopupProps): ReactElement | null => {
  if (!show) return null;

  return (
    <>
      <div className="popup-overlay" onClick={onClose} />
      <div className="recent-folders-popup">
        <div className="popup-header">
          <span className="popup-title">최근 폴더 목록</span>
          <button
            className="popup-close-btn"
            onClick={onClose}
            title="Close"
          >
            ✕
          </button>
        </div>
        <div className="popup-content">
          {recentFolders.length === 0 ? (
            <div className="no-recent-folders">
              최근 폴더가 없습니다
            </div>
          ) : (
            <div className="recent-folders-list">
              {recentFolders.map((folder) => (
                <div
                  key={folder.path}
                  className="recent-folder-item"
                  onClick={() => onOpenFolder(folder.path)}
                  title={folder.path}
                >
                  <span className="icon">📁</span>
                  <div className="folder-info">
                    <span className="folder-name">{folder.name}</span>
                    <span className="folder-path">{folder.path}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <div className="popup-footer">
            <button
              className="new-folder-btn"
              onClick={onOpenNewFolder}
              title="Open New Folder"
            >
              새 폴더 열기
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default RecentFoldersPopup;
