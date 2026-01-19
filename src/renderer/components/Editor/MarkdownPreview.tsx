import React, { useState, ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkFrontmatter from 'remark-frontmatter';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize from 'rehype-sanitize';
import CodeBlock from './CodeBlock';
import { exportMarkdownToPDF, printMarkdownPreview } from '../../utils/markdownExporter';
import './MarkdownPreview.css';
import type { Element, Text } from 'hast';

type ToastType = 'success' | 'error' | 'info';

interface ToastState {
  message: string;
  type: ToastType;
}

interface MarkdownPreviewProps {
  content: string;
  currentFilePath: string | null;
}

/**
 * Markdown 미리보기 컴포넌트
 */
const MarkdownPreview = ({ content, currentFilePath }: MarkdownPreviewProps): ReactElement => {
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [toast, setToast] = useState<ToastState | null>(null);

  // 토스트 메시지 표시
  const showToast = (message: string, type: ToastType = 'info'): void => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // 파일명 추출
  const getFileName = (): string => {
    if (currentFilePath) {
      return currentFilePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'document';
    }
    return 'document';
  };

  // 프린트 (브라우저 프린트 대화상자)
  const handlePrint = (): void => {
    const element = document.querySelector('.markdown-content') as HTMLElement;
    if (element) {
      printMarkdownPreview(element);
    }
  };

  // PDF 내보내기
  const handleExportPDF = async (): Promise<void> => {
    if (isExporting) return;

    const element = document.querySelector('.markdown-content') as HTMLElement;
    if (!element) {
      showToast('No content to export', 'error');
      return;
    }

    setIsExporting(true);
    try {
      const result = await exportMarkdownToPDF(element, getFileName(), showToast);
      if (result?.success) {
        showToast(`PDF exported: ${result.pageCount} pages`, 'success');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Export failed: ${errorMessage}`, 'error');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="preview-panel markdown-preview">
      {/* Toast 메시지 */}
      {toast && (
        <div className={`markdown-toast markdown-toast-${toast.type}`}>
          {toast.message}
        </div>
      )}

      <div className="preview-header">
        <h3>Markdown Preview</h3>
        <div className="export-buttons">
          <button
            className="export-btn"
            onClick={handleExportPDF}
            disabled={isExporting}
            title="Export as PDF"
          >
            {isExporting ? '⏳ Exporting...' : '📄 PDF'}
          </button>
          <button
            className="export-btn"
            onClick={handlePrint}
            title="Print"
          >
            🖨️ Print
          </button>
        </div>
      </div>

      <div className="markdown-content">
        <ReactMarkdown
          remarkPlugins={[remarkFrontmatter, remarkGfm]}
          rehypePlugins={[rehypeRaw, rehypeSanitize]}
          components={{
            // pre 태그: 블록 코드를 CodeBlock으로 변환
            pre({ node, children }) {
              // children에서 code 요소 추출
              const firstChild = node?.children?.[0];
              // type guard: Element인지 확인
              if (firstChild && 'tagName' in firstChild && firstChild.tagName === 'code') {
                const codeElement = firstChild as Element;
                const classNames = codeElement.properties?.className;
                const className = Array.isArray(classNames) ? String(classNames[0] || '') : '';
                const match = /language-(\w+)/.exec(className);
                const language = match ? match[1] : '';
                const textNode = codeElement.children?.[0];
                const code = textNode && 'value' in textNode ? (textNode as Text).value : '';

                return (
                  <CodeBlock language={language}>
                    {code}
                  </CodeBlock>
                );
              }
              // fallback
              return <pre>{children}</pre>;
            },
            // code 태그: 인라인 코드만 처리 (블록은 pre에서 처리)
            code({ node, className, children, ...props }) {
              // className이 있으면 블록 코드 (pre 내부) - 여기서는 처리하지 않음
              // pre 컴포넌트에서 이미 처리되므로 인라인만 처리
              return (
                <code className="inline-code" {...props}>
                  {children}
                </code>
              );
            }
          }}
        >
          {content || '# Empty Document\n\nStart typing...'}
        </ReactMarkdown>
      </div>
    </div>
  );
};

export default MarkdownPreview;
