import React, { useEffect, useRef, useState, ReactElement } from 'react';
import mermaid from 'mermaid';
import { mermaidConfig } from '../../constants/mermaidConfig';
import { copyToClipboard } from '../../utils/diagramExporter';

type CopyStatus = 'success' | 'error' | null;

interface MermaidBlockProps {
  code: string;
  showHeader?: boolean;
}

/**
 * Markdown 내부의 Mermaid 코드 블록 렌더링
 * @param code - Mermaid 코드
 * @param showHeader - 헤더(래퍼 + 복사 버튼) 표시 여부 (기본값: true)
 */
const MermaidBlock = ({ code, showHeader = true }: MermaidBlockProps): ReactElement => {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);
  const [isHovered, setIsHovered] = useState<boolean>(false);

  useEffect(() => {
    // Mermaid 설정 초기화
    mermaid.initialize({
      ...mermaidConfig,
      startOnLoad: false,
      // Markdown 내 다이어그램을 위한 추가 설정
      flowchart: {
        ...mermaidConfig.flowchart,
        useMaxWidth: true,  // 컨테이너 너비에 맞춤
      },
      sequence: {
        ...mermaidConfig.sequence,
        useMaxWidth: true,
      }
    });
  }, []);

  useEffect(() => {
    if (ref.current && code) {
      const renderDiagram = async (): Promise<void> => {
        try {
          const id = 'mermaid-' + Math.random().toString(36).substr(2, 9);
          const { svg } = await mermaid.render(id, code);
          if (ref.current) {
            ref.current.innerHTML = svg;
          }
          setError(null);
        } catch (err) {
          console.error('Mermaid render error:', err);
          setError(err instanceof Error ? err.message : String(err));
        }
      };

      renderDiagram();
    }
  }, [code]);

  // 클립보드에 복사 (기존 diagramExporter 함수 재사용)
  const handleCopyToClipboard = async (): Promise<void> => {
    if (!code?.trim()) {
      setCopyStatus('error');
      setTimeout(() => setCopyStatus(null), 2000);
      return;
    }

    // 성공/실패를 콜백으로 감지
    let success = false;
    const showToast = (message: string, type?: string): void => {
      if (type === 'error' || message.toLowerCase().includes('failed')) {
        success = false;
      } else {
        success = true;
      }
    };

    await copyToClipboard(code, showToast);

    setCopyStatus(success ? 'success' : 'error');
    setTimeout(() => setCopyStatus(null), 2000);
  };

  // showHeader={false}일 때: wrapper와 복사 버튼 없이 다이어그램만 렌더링
  if (!showHeader) {
    if (error) {
      return (
        <div className="mermaid-error">
          <pre>{error}</pre>
        </div>
      );
    }
    return <div ref={ref} className="mermaid-diagram" />;
  }

  // showHeader={true}일 때: 기존 동작 (wrapper + 복사 버튼)
  if (error) {
    return (
      <div className="mermaid-error">
        <pre>{error}</pre>
      </div>
    );
  }

  return (
    <div
      className="mermaid-block-wrapper"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div ref={ref} className="mermaid-block" />

      {/* 복사 버튼 - 호버 시에만 표시 */}
      <button
        className={`mermaid-copy-btn ${isHovered ? 'visible' : ''} ${copyStatus ? `copy-${copyStatus}` : ''}`}
        onClick={handleCopyToClipboard}
        title="Copy diagram to clipboard"
      >
        {copyStatus === 'success' ? '✓ Copied!' : copyStatus === 'error' ? '✗ Failed' : '📋 Copy'}
      </button>
    </div>
  );
};

export default MermaidBlock;
