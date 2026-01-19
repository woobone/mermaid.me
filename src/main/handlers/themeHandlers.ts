/**
 * 테마 관련 IPC 핸들러
 * - 테마 설정 저장/로드
 * - 시스템 테마 감지
 * - 테마 변경 이벤트
 */

import { ipcMain, nativeTheme, BrowserWindow } from 'electron';
import type Store from 'electron-store';
import type { ThemeSettings, Theme, StoreSchema } from '../../types';

/**
 * 테마 핸들러 등록
 */
export function registerThemeHandlers(
  getMainWindow: () => BrowserWindow | null,
  store: Store<StoreSchema>
): void {
  /**
   * 테마 설정 가져오기
   */
  ipcMain.handle('get-theme-settings', async (): Promise<ThemeSettings> => {
    const settings = store.get('themeSettings', {
      mode: 'light' as const,
      lastManualMode: 'light' as const,
      followSystem: false
    });
    return settings;
  });

  /**
   * 테마 설정 저장
   */
  ipcMain.handle('save-theme-settings', async (_event, settings: ThemeSettings): Promise<{ success: boolean; error?: string }> => {
    try {
      store.set('themeSettings', settings);
      return { success: true };
    } catch (error) {
      console.error('Error saving theme settings:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * 시스템 테마 가져오기
   */
  ipcMain.handle('get-system-theme', async (): Promise<Theme> => {
    return nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
  });

  /**
   * 시스템 테마 변경 이벤트 리스너
   */
  nativeTheme.on('updated', () => {
    const systemTheme: Theme = nativeTheme.shouldUseDarkColors ? 'dark' : 'light';
    const mainWindow = getMainWindow();

    // 렌더러 프로세스에 시스템 테마 변경 알림
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send('system-theme-changed', systemTheme);
    }
  });
}

module.exports = { registerThemeHandlers };
