/**
 * useTheme Hook
 * 다크 모드 테마 관리
 *
 * 기능:
 * - 테마 토글 (light/dark)
 * - Auto 모드 (시스템 테마 따르기)
 * - 테마 설정 저장 및 복원
 * - CSS 변수 업데이트
 */

import { useState, useEffect, useCallback } from 'react';
import type { Theme, ThemeMode } from '../../types';

/**
 * useTheme 반환 타입
 */
export interface UseThemeReturn {
  theme: Theme;
  mode: ThemeMode;
  followSystem: boolean;
  toggleTheme: () => Promise<void>;
  setAutoMode: () => Promise<void>;
  setThemeMode: (themeName: Theme) => Promise<void>;
  isLight: boolean;
  isDark: boolean;
  isAuto: boolean;
}

export const useTheme = (): UseThemeReturn => {
  const [theme, setTheme] = useState<Theme>('light');
  const [mode, setMode] = useState<ThemeMode>('light');
  const [followSystem, setFollowSystem] = useState<boolean>(false);

  /**
   * 테마를 DOM에 적용
   */
  const applyTheme = useCallback((themeName: Theme): void => {
    document.documentElement.setAttribute('data-theme', themeName);
  }, []);

  /**
   * 초기 테마 설정 로드
   */
  useEffect(() => {
    const loadInitialTheme = async () => {
      if (!window.electronAPI) return;

      try {
        const settings = await window.electronAPI.getThemeSettings();

        if (settings.followSystem || settings.mode === 'auto') {
          // Auto 모드: 시스템 테마 사용
          const systemTheme = await window.electronAPI.getSystemTheme();
          setTheme(systemTheme);
          setMode('auto');
          setFollowSystem(true);
          applyTheme(systemTheme);
        } else {
          // Manual 모드: 저장된 테마 사용
          const savedTheme = settings.mode || 'light';
          setTheme(savedTheme);
          setMode(savedTheme);
          setFollowSystem(false);
          applyTheme(savedTheme);
        }
      } catch (error) {
        console.error('Error loading theme settings:', error);
        // 오류 시 기본값으로 light 테마 사용
        setTheme('light');
        setMode('light');
        applyTheme('light');
      }
    };

    loadInitialTheme();
  }, [applyTheme]);

  /**
   * 시스템 테마 변경 감지 (auto 모드일 때만)
   */
  useEffect(() => {
    if (!window.electronAPI || !followSystem) return;

    const handleSystemThemeChanged = (_event: unknown, systemTheme: Theme): void => {
      setTheme(systemTheme);
      applyTheme(systemTheme);
    };

    window.electronAPI.onSystemThemeChanged(handleSystemThemeChanged);

    return () => {
      window.electronAPI.removeAllListeners('system-theme-changed');
    };
  }, [followSystem, applyTheme]);

  /**
   * 테마 토글 (light ↔ dark)
   */
  const toggleTheme = useCallback(async () => {
    if (!window.electronAPI) return;

    const nextTheme = theme === 'light' ? 'dark' : 'light';

    try {
      setTheme(nextTheme);
      setMode(nextTheme);
      setFollowSystem(false);
      applyTheme(nextTheme);

      await window.electronAPI.saveThemeSettings({
        mode: nextTheme,
        lastManualMode: nextTheme,
        followSystem: false
      });
    } catch (error) {
      console.error('Error toggling theme:', error);
    }
  }, [theme, applyTheme]);

  /**
   * Auto 모드 설정 (시스템 테마 따르기)
   */
  const setAutoMode = useCallback(async () => {
    if (!window.electronAPI) return;

    try {
      const systemTheme = await window.electronAPI.getSystemTheme();

      setTheme(systemTheme);
      setMode('auto');
      setFollowSystem(true);
      applyTheme(systemTheme);

      await window.electronAPI.saveThemeSettings({
        mode: 'auto',
        lastManualMode: theme,
        followSystem: true
      });
    } catch (error) {
      console.error('Error setting auto mode:', error);
    }
  }, [theme, applyTheme]);

  /**
   * 특정 테마로 직접 설정
   */
  const setThemeMode = useCallback(async (themeName: Theme): Promise<void> => {
    if (!window.electronAPI) return;

    try {
      setTheme(themeName);
      setMode(themeName);
      setFollowSystem(false);
      applyTheme(themeName);

      await window.electronAPI.saveThemeSettings({
        mode: themeName,
        lastManualMode: themeName,
        followSystem: false
      });
    } catch (error) {
      console.error('Error setting theme mode:', error);
    }
  }, [applyTheme]);

  // 편의 속성
  const isLight = theme === 'light';
  const isDark = theme === 'dark';
  const isAuto = mode === 'auto';

  return {
    theme,        // 현재 적용된 테마: 'light' | 'dark'
    mode,         // 테마 모드: 'light' | 'dark' | 'auto'
    followSystem, // 시스템 테마 따르기 여부
    toggleTheme,  // 테마 토글 함수
    setAutoMode,  // Auto 모드 설정
    setThemeMode, // 특정 테마 설정
    isLight,      // Light 테마 여부
    isDark,       // Dark 테마 여부
    isAuto        // Auto 모드 여부
  };
};
