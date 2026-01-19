/**
 * 에디터/탭 타입
 */

import type { FilePath, Nullable } from './common';

/**
 * 파일 타입
 */
export type FileType = 'mermaid' | 'markdown' | 'text';

/**
 * 에디터 언어
 */
export type EditorLanguage = 'markdown' | 'text' | 'plaintext';

/**
 * 탭
 */
export interface Tab {
  id: number;
  diagramCode: string;
  filePath: Nullable<FilePath>;
  fileType: FileType;
  isModified: boolean;
}

/**
 * 탭 상태
 */
export interface TabState {
  tabs: Tab[];
  activeTabId: Nullable<number>;
}

/**
 * 탭 업데이트
 */
export type TabUpdate = Partial<Omit<Tab, 'id'>>;

/**
 * 내보내기 타입
 */
export type ExportType = 'png' | 'pdf' | 'svg';

/**
 * 내보내기 결과
 */
export interface ExportResult {
  success: boolean;
  filePath?: FilePath;
  needsConversion?: boolean;
  canceled?: boolean;
  error?: string;
}
