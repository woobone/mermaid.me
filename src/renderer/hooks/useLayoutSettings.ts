import { useState, useEffect } from 'react';
import { VIEW_MODES, DEFAULT_VIEW_MODE, ViewModeValue } from '../constants/viewModes';
import type { LayoutSettings } from '../../types';

/**
 * useLayoutSettings 반환 타입
 */
export interface UseLayoutSettingsReturn {
  explorerWidth: number;
  editorWidth: number;
  viewMode: ViewModeValue;
  layoutLoaded: boolean;
  handleExplorerResize: (clientX: number) => void;
  handleEditorResize: (clientX: number) => void;
  handleViewModeChange: (mode: ViewModeValue) => void;
}

/**
 * 레이아웃 설정 관리 Hook
 * explorerWidth, editorWidth, viewMode 상태 및 저장 관리
 */
const COLLAPSED_EXPLORER_WIDTH = 48;

export const useLayoutSettings = (isExplorerVisible = true): UseLayoutSettingsReturn => {
  const [explorerWidth, setExplorerWidth] = useState<number>(300);
  const [editorWidth, setEditorWidth] = useState<number>(600);
  const [viewMode, setViewMode] = useState<ViewModeValue>(DEFAULT_VIEW_MODE);
  const [layoutLoaded, setLayoutLoaded] = useState<boolean>(false);

  // Load layout settings on mount
  useEffect(() => {
    if (!window.electronAPI) return;

    const loadLayout = async () => {
      try {
        const layoutSettings = await window.electronAPI.getLayoutSettings();
        if (layoutSettings) {
          if (layoutSettings.explorerWidth) {
            setExplorerWidth(layoutSettings.explorerWidth);
          }
          if (layoutSettings.editorWidth) {
            setEditorWidth(layoutSettings.editorWidth);
          }
          // viewMode 로드 (유효성 검사 포함)
          const validModes = Object.values(VIEW_MODES);
          if (layoutSettings.viewMode && validModes.includes(layoutSettings.viewMode)) {
            setViewMode(layoutSettings.viewMode);
          }
          // else: 기본값 SPLIT 유지
        }
        setLayoutLoaded(true);
      } catch (error) {
        console.error('Failed to load layout settings:', error);
        setLayoutLoaded(true);
      }
    };

    loadLayout();
  }, []);

  // 뷰 모드 변경 핸들러
  const handleViewModeChange = (mode: ViewModeValue): void => {
    setViewMode(mode);
    if (window.electronAPI) {
      window.electronAPI.saveLayoutSettings({
        explorerWidth,
        editorWidth,
        viewMode: mode
      });
    }
  };

  const handleExplorerResize = (clientX: number): void => {
    const newWidth = Math.max(200, Math.min(600, clientX));
    setExplorerWidth(newWidth);

    // Save layout settings
    if (window.electronAPI) {
      window.electronAPI.saveLayoutSettings({
        explorerWidth: newWidth,
        editorWidth,
        viewMode
      });
    }
  };

  const handleEditorResize = (clientX: number): void => {
    // 파일 탐색기가 숨겨진 경우 실제 표시되는 너비(48px)를 사용
    const actualExplorerWidth = isExplorerVisible ? explorerWidth : COLLAPSED_EXPLORER_WIDTH;
    const remainingWidth = window.innerWidth - actualExplorerWidth;
    const newEditorWidth = Math.max(300, Math.min(remainingWidth - 300, clientX - actualExplorerWidth));
    setEditorWidth(newEditorWidth);

    // Save layout settings
    if (window.electronAPI) {
      window.electronAPI.saveLayoutSettings({
        explorerWidth,
        editorWidth: newEditorWidth,
        viewMode
      });
    }
  };

  return {
    explorerWidth,
    editorWidth,
    viewMode,
    layoutLoaded,
    handleExplorerResize,
    handleEditorResize,
    handleViewModeChange
  };
};
