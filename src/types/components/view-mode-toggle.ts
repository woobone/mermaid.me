/**
 * ViewModeToggle 컴포넌트 Props 타입
 */

import type { ViewMode } from '../workspace';

export interface ViewModeToggleProps {
  currentMode: ViewMode;
  onModeChange: (mode: ViewMode) => void;
}
