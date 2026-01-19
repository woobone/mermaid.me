/**
 * Resizer 컴포넌트 Props 타입
 */

export type ResizerDirection = 'horizontal' | 'vertical';

export interface ResizerProps {
  direction: ResizerDirection;
  onResize: (clientX: number) => void;
}

export interface TerminalResizerProps {
  onResize: (clientY: number) => void;
}
