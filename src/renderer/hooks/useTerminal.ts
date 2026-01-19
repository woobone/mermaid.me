/**
 * ============================================================================
 * useTerminal Hook - 터미널 상태 관리
 * ============================================================================
 *
 * 역할: 터미널 패널 표시/숨김 및 높이 상태 관리
 *
 * 기능:
 * - 터미널 표시/숨김 토글
 * - 터미널 높이 조절
 * - 높이 설정 저장/복원
 * ============================================================================
 */

import { useState, useEffect, useCallback } from 'react';

const DEFAULT_TERMINAL_HEIGHT = 200;
const MIN_TERMINAL_HEIGHT = 100;
const MAX_TERMINAL_HEIGHT_RATIO = 0.7; // 화면의 70%

/**
 * useTerminal 반환 타입
 */
export interface UseTerminalReturn {
  isTerminalVisible: boolean;
  terminalHeight: number;
  terminalLoaded: boolean;
  toggleTerminal: () => void;
  openTerminal: () => void;
  closeTerminal: () => void;
  handleTerminalResize: (deltaY: number) => void;
  handleTerminalResizeByPosition: (clientY: number) => void;
}

/**
 * 터미널 상태 관리 Hook
 * @returns 터미널 상태 및 핸들러
 */
export const useTerminal = (): UseTerminalReturn => {
  const [isTerminalVisible, setIsTerminalVisible] = useState<boolean>(false);
  const [terminalHeight, setTerminalHeight] = useState<number>(DEFAULT_TERMINAL_HEIGHT);
  const [terminalLoaded, setTerminalLoaded] = useState<boolean>(false);

  // 초기 설정 로드
  useEffect(() => {
    if (!window.electronAPI) return;

    const loadTerminalSettings = async () => {
      try {
        const layoutSettings = await window.electronAPI.getLayoutSettings();
        if (layoutSettings && layoutSettings.terminalHeight) {
          setTerminalHeight(layoutSettings.terminalHeight);
        }
        // 터미널 표시 상태는 저장하지 않음 (항상 닫힌 상태로 시작)
        setTerminalLoaded(true);
      } catch (error) {
        console.error('Failed to load terminal settings:', error);
        setTerminalLoaded(true);
      }
    };

    loadTerminalSettings();
  }, []);

  // 터미널 토글
  const toggleTerminal = useCallback((): void => {
    setIsTerminalVisible(prev => !prev);
  }, []);

  // 터미널 열기
  const openTerminal = useCallback((): void => {
    setIsTerminalVisible(true);
  }, []);

  // 터미널 닫기
  const closeTerminal = useCallback((): void => {
    setIsTerminalVisible(false);
  }, []);

  // 터미널 높이 조절 핸들러
  const handleTerminalResize = useCallback((deltaY: number): void => {
    setTerminalHeight(prevHeight => {
      // 최대 높이 계산 (화면의 70%)
      const maxHeight = window.innerHeight * MAX_TERMINAL_HEIGHT_RATIO;
      // 새 높이 계산 (deltaY가 음수면 높이 증가)
      const newHeight = Math.max(
        MIN_TERMINAL_HEIGHT,
        Math.min(maxHeight, prevHeight - deltaY)
      );

      // 설정 저장
      if (window.electronAPI) {
        window.electronAPI.getLayoutSettings().then(settings => {
          window.electronAPI.saveLayoutSettings({
            ...settings,
            terminalHeight: newHeight
          });
        });
      }

      return newHeight;
    });
  }, []);

  // 절대 위치 기반 높이 조절 (Resizer용)
  const handleTerminalResizeByPosition = useCallback((clientY: number): void => {
    // 창 아래쪽에서부터의 높이 계산
    const newHeight = window.innerHeight - clientY;
    const maxHeight = window.innerHeight * MAX_TERMINAL_HEIGHT_RATIO;
    const clampedHeight = Math.max(
      MIN_TERMINAL_HEIGHT,
      Math.min(maxHeight, newHeight)
    );

    setTerminalHeight(clampedHeight);

    // 설정 저장
    if (window.electronAPI) {
      window.electronAPI.getLayoutSettings().then(settings => {
        window.electronAPI.saveLayoutSettings({
          ...settings,
          terminalHeight: clampedHeight
        });
      });
    }
  }, []);

  return {
    isTerminalVisible,
    terminalHeight,
    terminalLoaded,
    toggleTerminal,
    openTerminal,
    closeTerminal,
    handleTerminalResize,
    handleTerminalResizeByPosition
  };
};

export default useTerminal;
