import React, { ReactElement, RefObject } from 'react';
import MermaidPreview from './MermaidPreview';
import MarkdownPreview from './MarkdownPreview';
import type { FileType } from '../../../types';

interface PreviewPanelProps {
  diagramRef?: RefObject<HTMLDivElement | null>;
  content: string;
  fileType: FileType;
  currentFilePath: string | null;
  fullWidth?: boolean;
}

/**
 * 통합 프리뷰 패널 - 파일 타입에 따라 다른 프리뷰 렌더링
 */
const PreviewPanel = ({ diagramRef, content, fileType, currentFilePath, fullWidth = false }: PreviewPanelProps): ReactElement => {

  // Mermaid 파일
  if (fileType === 'mermaid' && diagramRef) {
    return (
      <MermaidPreview
        diagramRef={diagramRef}
        content={content}
        currentFilePath={currentFilePath}
      />
    );
  }

  // Markdown 파일
  if (fileType === 'markdown') {
    return (
      <MarkdownPreview
        content={content}
        currentFilePath={currentFilePath}
      />
    );
  }

  // 기본 텍스트 파일
  return (
    <div className="preview-panel text-preview" style={{ flex: 1 }}>
      <div className="preview-header">
        <h3>Text Preview</h3>
      </div>
      <div className="text-content" style={{ padding: '20px', overflow: 'auto' }}>
        <pre>{content}</pre>
      </div>
    </div>
  );
};

export default PreviewPanel;
