/**
 * 테마 타입
 */

/**
 * 테마
 */
export type Theme = 'light' | 'dark';

/**
 * 테마 모드
 */
export type ThemeMode = 'light' | 'dark' | 'auto';

/**
 * 다이어그램 테마
 */
export type DiagramTheme = 'default' | 'dark';

/**
 * 테마 설정
 */
export interface ThemeSettings {
  mode: ThemeMode;
  lastManualMode: Theme;
  followSystem: boolean;
}
