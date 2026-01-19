import React, { ReactElement } from 'react';

interface EmptyStateProps {
  onCreateNew: () => void;
}

/**
 * 빈 상태 컴포넌트
 * 탭이 없을 때 표시되는 초기 화면
 */
const EmptyState = ({ onCreateNew }: EmptyStateProps): ReactElement => {
  return (
    <div className="empty-state">
      <div className="empty-state-content">
        <h2>시작하기</h2>
        <p>새 다이어그램을 만들거나 파일을 열어주세요</p>
        <button className="empty-state-btn" onClick={onCreateNew}>
          새 다이어그램 만들기
        </button>
      </div>
    </div>
  );
};

export default EmptyState;
