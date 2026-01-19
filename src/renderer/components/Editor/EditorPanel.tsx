import React, { useEffect, useState, ReactElement } from 'react';
import Editor from '@monaco-editor/react';
import { getEditorLanguage } from '../../utils/fileTypeDetector';
import type { FileType } from '../../../types';

type MonacoTheme = 'vs-dark' | 'vs-light';

interface EditorPanelProps {
  diagramCode: string;
  onEditorChange: (value: string) => void;
  editorWidth?: number;
  fileType?: FileType;
  fullWidth?: boolean;
}

/**
 * 에디터 패널 컴포넌트
 * Monaco Editor를 포함하는 패널
 */
const EditorPanel = ({ diagramCode, onEditorChange, editorWidth, fileType = 'mermaid', fullWidth = false }: EditorPanelProps): ReactElement => {

  const editorLanguage = getEditorLanguage(fileType);
  const [monacoTheme, setMonacoTheme] = useState<MonacoTheme>('vs-dark');

  // 앱 테마 변경 감지하여 Monaco 테마 동기화
  useEffect(() => {
    const updateMonacoTheme = (): void => {
      const appTheme = document.documentElement.getAttribute('data-theme');
      setMonacoTheme(appTheme === 'light' ? 'vs-light' : 'vs-dark');
    };

    // 초기 테마 설정
    updateMonacoTheme();

    // MutationObserver로 data-theme 속성 변경 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          updateMonacoTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, []);

  // 파일 타입에 따른 헤더 텍스트
  const getHeaderText = (): string => {
    if (fileType === 'markdown') return 'Markdown Editor';
    if (fileType === 'mermaid') return 'Mermaid Code';
    return 'Text Editor';
  };

  // 스타일 결정: fullWidth > editorWidth > 부모 크기 채우기
  const getPanelStyle = (): React.CSSProperties => {
    if (fullWidth) {
      return { flex: 1 };
    }
    if (editorWidth) {
      return { width: `${editorWidth}px` };
    }
    // SplitView 내부: 부모 컨테이너 크기를 채움
    return { flex: 1, width: '100%' };
  };

  return (
    <div
      className={`editor-panel ${fullWidth ? 'full-width' : ''}`}
      style={getPanelStyle()}
    >
      <div className="editor-header">
        <h3>{getHeaderText()}</h3>
      </div>
      <Editor
        height="100%"
        language={editorLanguage}
        value={diagramCode}
        onChange={(value) => onEditorChange(value ?? '')}
        theme={monacoTheme}
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
          // Markdown 모드일 때 추가 옵션
          ...(fileType === 'markdown' && {
            quickSuggestions: true,
            suggestOnTriggerCharacters: true
          })
        }}
      />
    </div>
  );
};

export default EditorPanel;
