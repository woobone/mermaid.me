import React, { useState, useEffect, ReactElement, ReactNode } from 'react';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import MermaidBlock from './MermaidBlock';
import { copyToClipboard as copyDiagramAsImage } from '../../utils/diagramExporter';
import './CodeBlock.css';

type CopyStatus = 'success' | 'error' | null;

interface CodeBlockProps {
  language?: string;
  children: ReactNode;
}

// 언어 식별자 정규화 (컴포넌트 외부에 정의)
const LANG_MAP: Record<string, string> = {
  'js': 'javascript',
  'ts': 'typescript',
  'py': 'python',
  'sh': 'bash',
  'shell': 'bash',
  'yml': 'yaml',
  'md': 'markdown',
  'c++': 'cpp',
  'cs': 'csharp',
  'htm': 'html',
};

function normalizeLanguage(lang?: string): string {
  if (!lang) return 'plaintext';
  const lower = lang.toLowerCase();
  return LANG_MAP[lower] || lower;
}

/**
 * 통합 코드 블록 컴포넌트
 * - Mermaid 코드 → 다이어그램 렌더링 + 이미지 복사
 * - 일반 코드 → 구문 하이라이팅 + 텍스트 복사
 */
function CodeBlock({ language, children }: CodeBlockProps): ReactElement {
  const [copyStatus, setCopyStatus] = useState<CopyStatus>(null);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(
    document.documentElement.getAttribute('data-theme') === 'dark'
  );

  const code = String(children).replace(/\n$/, '');
  const normalizedLang = normalizeLanguage(language);

  // 테마 변경 감지
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'data-theme') {
          setIsDarkMode(document.documentElement.getAttribute('data-theme') === 'dark');
        }
      });
    });

    observer.observe(document.documentElement, { attributes: true });
    return () => observer.disconnect();
  }, []);

  // 복사 기능 (분기 방식)
  const handleCopy = async (): Promise<void> => {
    try {
      if (normalizedLang === 'mermaid') {
        // Mermaid: 다이어그램 이미지 복사
        await copyDiagramAsImage(code, (msg: string, type?: string) => {
          if (type === 'error') throw new Error(msg);
        });
      } else {
        // 일반 코드: 텍스트 복사
        await navigator.clipboard.writeText(code);
      }
      setCopyStatus('success');
    } catch (err) {
      console.error('Copy failed:', err);
      setCopyStatus('error');
    }
    setTimeout(() => setCopyStatus(null), 2000);
  };

  // 복사 버튼 텍스트
  const getCopyButtonText = (): string => {
    if (copyStatus === 'success') return 'Copied!';
    if (copyStatus === 'error') return 'Failed';
    return 'Copy';
  };

  return (
    <div className="code-block-wrapper">
      {/* 공통 헤더 */}
      <div className="code-block-header">
        <span className="code-block-language">{normalizedLang}</span>
        <button
          className={`code-block-copy ${copyStatus ? `copy-${copyStatus}` : ''}`}
          onClick={handleCopy}
          title={normalizedLang === 'mermaid' ? 'Copy diagram as image' : 'Copy code'}
        >
          {getCopyButtonText()}
        </button>
      </div>

      {/* 본문: Previewer 분기 */}
      <div className="code-block-content">
        {normalizedLang === 'mermaid' ? (
          <MermaidBlock code={code} showHeader={false} />
        ) : (
          <SyntaxHighlighter
            language={normalizedLang}
            style={isDarkMode ? oneDark : oneLight}
            showLineNumbers={true}
            wrapLines={true}
            customStyle={{
              margin: 0,
              borderRadius: 0,
              fontSize: '14px',
            }}
          >
            {code}
          </SyntaxHighlighter>
        )}
      </div>
    </div>
  );
}

export default CodeBlock;
