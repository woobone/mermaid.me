/**
 * 설정 관련 IPC 핸들러
 * 북마크, 레이아웃 설정 등 앱 설정 관리
 */

import { ipcMain } from 'electron';
import * as path from 'path';
import type Store from 'electron-store';
import type { Bookmark, LayoutSettings, StoreSchema } from '../../types';

/**
 * 설정 핸들러 등록
 */
export function registerSettingsHandlers(store: Store<StoreSchema>): void {
  // ============================================================================
  // 북마크 관리
  // ============================================================================

  /**
   * 북마크 목록 가져오기
   */
  ipcMain.handle('get-bookmarks', async (): Promise<Bookmark[]> => {
    try {
      const bookmarks = store.get('folderBookmarks', []);
      return bookmarks;
    } catch (error) {
      console.error('Error getting bookmarks:', error);
      return [];
    }
  });

  /**
   * 북마크 추가
   */
  ipcMain.handle('add-bookmark', async (_event, folderPath: string): Promise<{ success: boolean; bookmarks?: Bookmark[]; message?: string; error?: string }> => {
    try {
      const bookmarks = store.get('folderBookmarks', []);
      const folderName = path.basename(folderPath);

      // 이미 북마크되어 있는지 확인
      if (bookmarks.some((b: Bookmark) => b.path === folderPath)) {
        return { success: false, message: 'Already bookmarked' };
      }

      bookmarks.push({
        path: folderPath,
        name: folderName,
        timestamp: Date.now()
      });

      store.set('folderBookmarks', bookmarks);
      return { success: true, bookmarks };
    } catch (error) {
      console.error('Error adding bookmark:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * 북마크 제거
   */
  ipcMain.handle('remove-bookmark', async (_event, folderPath: string): Promise<{ success: boolean; bookmarks?: Bookmark[]; error?: string }> => {
    try {
      const bookmarks = store.get('folderBookmarks', []);
      const updated = bookmarks.filter((b: Bookmark) => b.path !== folderPath);
      store.set('folderBookmarks', updated);
      return { success: true, bookmarks: updated };
    } catch (error) {
      console.error('Error removing bookmark:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // ============================================================================
  // 레이아웃 설정
  // ============================================================================

  /**
   * 레이아웃 설정 저장 (리사이저 위치 등)
   */
  ipcMain.handle('save-layout-settings', async (_event, settings: LayoutSettings): Promise<{ success: boolean; error?: string }> => {
    try {
      store.set('layoutSettings', settings);
      return { success: true };
    } catch (error) {
      console.error('Error saving layout settings:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * 레이아웃 설정 불러오기
   */
  ipcMain.handle('get-layout-settings', async (): Promise<LayoutSettings | null> => {
    try {
      const settings = store.get('layoutSettings', null);
      return settings;
    } catch (error) {
      console.error('Error getting layout settings:', error);
      return null;
    }
  });
}

module.exports = {
  registerSettingsHandlers
};
