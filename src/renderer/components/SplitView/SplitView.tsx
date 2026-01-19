import React, { ReactNode, ReactElement } from 'react';
import Resizer from '../Resizer';
import './SplitView.css';

interface SplitViewProps {
  left: ReactNode;
  right: ReactNode;
  leftWidth: number;
  onResize: (clientX: number) => void;
}

/**
 * SplitView - 좌우 분할 레이아웃 컴포넌트
 *
 * @param left - 왼쪽 패널에 렌더링할 컴포넌트
 * @param right - 오른쪽 패널에 렌더링할 컴포넌트
 * @param leftWidth - 왼쪽 패널 너비 (px)
 * @param onResize - 리사이즈 콜백 (clientX) => void
 */
function SplitView({ left, right, leftWidth, onResize }: SplitViewProps): ReactElement {
  return (
    <div className="split-view">
      <div className="split-view-left" style={{ width: `${leftWidth}px` }}>
        {left}
      </div>

      <Resizer direction="vertical" onResize={onResize} />

      <div className="split-view-right">
        {right}
      </div>
    </div>
  );
}

export default SplitView;
