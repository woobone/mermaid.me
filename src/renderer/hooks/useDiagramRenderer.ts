import { useEffect, useRef, useState, RefObject } from 'react';
import mermaid from 'mermaid';
import { mermaidConfig } from '../constants/mermaidConfig';
import type { DiagramTheme } from '../../types';
import type { ViewModeValue } from '../constants/viewModes';

/**
 * Mermaid 다이어그램 렌더링 Hook
 * Mermaid 초기화 및 다이어그램 렌더링 관리 (테마 동기화 포함)
 * @param diagramCode - Mermaid 다이어그램 코드
 * @param viewMode - 현재 뷰 모드 (viewMode 변경 시 재렌더링 트리거)
 */
export const useDiagramRenderer = (diagramCode: string, viewMode: ViewModeValue): RefObject<HTMLDivElement | null> => {
  const diagramRef = useRef<HTMLDivElement>(null);
  const [currentTheme, setCurrentTheme] = useState<DiagramTheme>('default');
  const prevViewModeRef = useRef<ViewModeValue>(viewMode);

  // Initialize Mermaid once on mount with theme detection
  useEffect(() => {
    const appTheme = document.documentElement.getAttribute('data-theme');
    const mermaidTheme = appTheme === 'dark' ? 'dark' : 'default';

    mermaid.initialize({
      ...mermaidConfig,
      theme: mermaidTheme
    });

    setCurrentTheme(mermaidTheme);
  }, []);

  // Watch for theme changes
  useEffect(() => {
    const updateMermaidTheme = (): void => {
      const appTheme = document.documentElement.getAttribute('data-theme');
      const mermaidTheme: DiagramTheme = appTheme === 'dark' ? 'dark' : 'default';

      if (mermaidTheme !== currentTheme) {
        mermaid.initialize({
          ...mermaidConfig,
          theme: mermaidTheme
        });
        setCurrentTheme(mermaidTheme);
      }
    };

    // MutationObserver로 data-theme 속성 변경 감지
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
          updateMermaidTheme();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme']
    });

    return () => observer.disconnect();
  }, [currentTheme]);

  // Render diagram whenever code, theme, or viewMode changes
  useEffect(() => {
    const renderDiagram = async (): Promise<void> => {
      if (!diagramRef.current) return;

      try {
        const element = diagramRef.current;
        element.innerHTML = '';

        const { svg } = await mermaid.render('mermaid-diagram', diagramCode);
        element.innerHTML = svg;
      } catch (err) {
        console.error('Mermaid rendering error:', err);
        const errorMessage = err instanceof Error ? err.message : String(err);
        if (diagramRef.current) {
          diagramRef.current.innerHTML = `<div class="error">렌더링 오류: ${errorMessage}</div>`;
        }
      }
    };

    // viewMode 변경 감지: 스위칭 시 즉시 렌더링 (0ms), 그 외 300ms 디바운싱
    const isViewModeChanged = prevViewModeRef.current !== viewMode;
    prevViewModeRef.current = viewMode;

    const debounceTime = isViewModeChanged ? 0 : 300;
    const timeoutId = setTimeout(renderDiagram, debounceTime);
    return () => clearTimeout(timeoutId);
  }, [diagramCode, currentTheme, viewMode]);

  return diagramRef;
};
