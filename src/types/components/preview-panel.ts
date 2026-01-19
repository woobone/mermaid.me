/**
 * PreviewPanel 컴포넌트 Props 타입
 */

import type { RefObject } from 'react';
import type { FileType } from '../editor';
import type { FilePath, Nullable } from '../common';

export interface PreviewPanelProps {
  diagramRef: RefObject<HTMLDivElement | null>;
  content: string;
  fileType: FileType;
  currentFilePath?: Nullable<FilePath>;
  fullWidth?: boolean;
}

export interface MermaidPreviewProps {
  diagramRef: RefObject<HTMLDivElement | null>;
  content: string;
  currentFilePath?: Nullable<FilePath>;
}

export interface MarkdownPreviewProps {
  content: string;
  currentFilePath?: Nullable<FilePath>;
}
