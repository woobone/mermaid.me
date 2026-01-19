/**
 * 공통 유틸리티 타입
 */

/**
 * 작업 결과 타입
 */
export type Result<T = void> = {
  success: true;
  data?: T;
} | {
  success: false;
  error: string;
};

/**
 * 비동기 작업 결과 타입
 */
export type AsyncResult<T = void> = Promise<Result<T>>;

/**
 * Nullable 타입
 */
export type Nullable<T> = T | null;

/**
 * 타임스탬프 (Unix ms)
 */
export type Timestamp = number;

/**
 * 파일 경로
 */
export type FilePath = string;

/**
 * 폴더 경로
 */
export type FolderPath = string;
