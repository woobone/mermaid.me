/**
 * TerminalPanel 컴포넌트 Props 타입
 */

import type { FolderPath, Nullable } from '../common';

export interface TerminalPanelProps {
  isVisible: boolean;
  height: number;
  onResize: (clientY: number) => void;
  workspaceFolder?: Nullable<FolderPath>;
}
