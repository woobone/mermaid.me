/**
 * View Mode 상수 정의
 * 에디터와 미리보기 패널의 표시 방식
 */
export const VIEW_MODES = {
  CODE: 'code',       // 코드 에디터만 표시
  PREVIEW: 'preview', // 미리보기만 표시
  SPLIT: 'split'      // 코드 + 미리보기 분할 표시
} as const;

/**
 * View Mode 타입 정의
 */
export type ViewModeValue = typeof VIEW_MODES[keyof typeof VIEW_MODES];

// 기본값: SPLIT (viewMode가 없거나 유효하지 않은 경우)
export const DEFAULT_VIEW_MODE: ViewModeValue = VIEW_MODES.SPLIT;
