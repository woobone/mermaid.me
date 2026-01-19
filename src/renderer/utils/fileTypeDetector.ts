import type { FileType } from '../../types';

/**
 * Monaco Editor 언어 모드 타입
 */
export type EditorLanguage = 'markdown' | 'text' | 'plaintext';

/**
 * 파일 확장자로 파일 타입 감지
 * @param filePath - 파일 경로
 * @returns 'mermaid' | 'markdown' | 'text'
 */
export const getFileType = (filePath: string | null): FileType => {
  if (!filePath) return 'mermaid'; // 기본값

  const ext = filePath.split('.').pop()?.toLowerCase() || '';

  if (['mmd', 'mermaid'].includes(ext)) {
    return 'mermaid';
  }

  if (['md', 'markdown'].includes(ext)) {
    return 'markdown';
  }

  return 'text';
};

/**
 * 파일 타입에 따른 언어 모드 반환 (Monaco Editor용)
 * @param fileType - 파일 타입
 * @returns Monaco Editor 언어 모드
 */
export const getEditorLanguage = (fileType: FileType): EditorLanguage => {
  switch (fileType) {
    case 'markdown':
      return 'markdown';
    case 'mermaid':
      return 'text';
    default:
      return 'plaintext';
  }
};
