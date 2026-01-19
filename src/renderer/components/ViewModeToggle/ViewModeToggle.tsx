import React, { ReactElement } from 'react';
import { VIEW_MODES, ViewModeValue } from '../../constants/viewModes';
import './ViewModeToggle.css';

interface ViewModeToggleProps {
  viewMode: ViewModeValue;
  onViewModeChange: (mode: ViewModeValue) => void;
}

/**
 * ViewModeToggle - 뷰 모드 전환 버튼 그룹
 *
 * @param viewMode - 현재 뷰 모드 ('code' | 'split' | 'preview')
 * @param onViewModeChange - 뷰 모드 변경 콜백
 */
function ViewModeToggle({ viewMode, onViewModeChange }: ViewModeToggleProps): ReactElement {
  return (
    <div className="view-mode-toggle">
      <button
        className={`view-mode-btn ${viewMode === VIEW_MODES.CODE ? 'active' : ''}`}
        onClick={() => onViewModeChange(VIEW_MODES.CODE)}
        title="Show code editor only"
      >
        Code
      </button>
      <button
        className={`view-mode-btn ${viewMode === VIEW_MODES.SPLIT ? 'active' : ''}`}
        onClick={() => onViewModeChange(VIEW_MODES.SPLIT)}
        title="Show code and preview"
      >
        Split
      </button>
      <button
        className={`view-mode-btn ${viewMode === VIEW_MODES.PREVIEW ? 'active' : ''}`}
        onClick={() => onViewModeChange(VIEW_MODES.PREVIEW)}
        title="Show preview only"
      >
        Preview
      </button>
    </div>
  );
}

export default ViewModeToggle;
