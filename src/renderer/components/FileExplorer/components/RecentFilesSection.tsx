import React, { useState, ReactElement } from 'react';
import type { RecentFile } from '../../../../types';

interface RecentFilesSectionProps {
  recentFiles: RecentFile[];
  onFileClick: (filePath: string, fileName: string) => void;
}

/**
 * 최근 파일 섹션 컴포넌트
 * 최근 열었던 파일 목록 표시
 */
const RecentFilesSection = ({ recentFiles, onFileClick }: RecentFilesSectionProps): ReactElement | null => {
  const [showRecentFiles, setShowRecentFiles] = useState<boolean>(false);

  if (recentFiles.length === 0) return null;

  return (
    <div className="recent-files-section">
      <div
        className="section-title collapsible"
        onClick={() => setShowRecentFiles(!showRecentFiles)}
      >
        <span className={`chevron ${showRecentFiles ? 'expanded' : ''}`}>▶</span>
        RECENT FILES
      </div>
      {showRecentFiles && (
        <div className="recent-files-list">
          {recentFiles.map((file) => (
            <div
              key={file.path}
              className="recent-file-item"
              onClick={() => onFileClick(file.path, file.name)}
              title={file.path}
            >
              <span className="icon">📊</span>
              <span className="name">{file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default RecentFilesSection;
