/**
 * 터미널 타입
 */

import type { FolderPath } from './common';

/**
 * 터미널 생성 옵션
 */
export interface TerminalCreateOptions {
  id?: string;
  cols: number;
  rows: number;
  cwd?: FolderPath;
}

/**
 * 터미널 출력
 */
export interface TerminalOutput {
  id: string;
  data: string;
}

/**
 * 터미널 종료
 */
export interface TerminalExit {
  id: string;
  exitCode: number;
  signal?: string;
}

/**
 * 터미널 정보
 */
export interface TerminalInfo {
  id: string;
  name: string;
  cwd: FolderPath;
  scrollback?: string;
}

/**
 * 터미널 상태 데이터
 */
export interface TerminalStateData {
  terminals: TerminalInfo[];
  activeIndex: number;
  nextTerminalNumber: number;
}

/**
 * 터미널 리사이즈
 */
export interface TerminalResize {
  id: string;
  cols: number;
  rows: number;
}
