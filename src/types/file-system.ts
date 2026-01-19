/**
 * 파일 시스템 타입
 */

import type { FilePath, Timestamp } from './common';

/**
 * 파일 트리 노드
 */
export interface FileTreeNode {
  name: string;
  path: FilePath;
  isDirectory: boolean;
  children?: FileTreeNode[];
  hasChildren?: boolean;
}

/**
 * 파일 저장 결과
 */
export interface SaveFileResult {
  success: boolean;
  filePath?: FilePath;
  error?: string;
  canceled?: boolean;
}

/**
 * 파일 작업 결과
 */
export interface FileOperationResult {
  success: boolean;
  error?: string;
}

/**
 * 이름 변경/이동 결과
 */
export interface RenameResult {
  success: boolean;
  oldPath?: FilePath;
  newPath?: FilePath;
  error?: string;
}

/**
 * 폴더 자식 로드 결과
 */
export interface LoadFolderChildrenResult {
  success: boolean;
  children: FileTreeNode[];
  error?: string;
}
