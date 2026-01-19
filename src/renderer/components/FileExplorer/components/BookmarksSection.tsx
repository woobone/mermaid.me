import React, { ReactElement } from 'react';
import type { Bookmark } from '../../../../types';

interface BookmarksSectionProps {
  bookmarks: Bookmark[];
  onOpenBookmark: (folderPath: string) => void;
}

/**
 * 북마크 섹션 컴포넌트
 * 즐겨찾기 폴더 목록 표시
 */
const BookmarksSection = ({ bookmarks, onOpenBookmark }: BookmarksSectionProps): ReactElement | null => {
  if (bookmarks.length === 0) return null;

  return (
    <div className="bookmarks-section">
      <div className="section-title">BOOKMARKS</div>
      <div className="bookmarks-list">
        {bookmarks.map((bookmark) => (
          <div
            key={bookmark.path}
            className="bookmark-item"
            onClick={() => onOpenBookmark(bookmark.path)}
            title={bookmark.path}
          >
            <span className="icon">📁</span>
            <span className="name">{bookmark.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default BookmarksSection;
