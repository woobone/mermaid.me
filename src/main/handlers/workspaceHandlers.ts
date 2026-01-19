/**
 * 워크스페이스 관련 IPC 핸들러
 * 폴더 열기, 최근 파일/폴더, 탭 상태 관리
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import type Store from 'electron-store';
import type { RecentFile, RecentFolder, TabState, WorkspaceData, StoreSchema, RecentFilesByFolder, TabStatesByFolder } from '../../types';

const { buildFileTree } = require('../utils/fileTreeBuilder');
const fileWatcher = require('../services/fileWatcher');

interface FileTreeResult {
  children: unknown[];
  [key: string]: unknown;
}

/**
 * 워크스페이스 핸들러 등록
 */
export function registerWorkspaceHandlers(
  getMainWindow: () => BrowserWindow | null,
  store: Store<StoreSchema>
): void {
  /**
   * 공통 폴더 열기 로직
   */
  async function openFolderCommon(folderPath: string, updateRecentList = true): Promise<{ success: boolean; folderPath?: string; error?: string }> {
    try {
      const normalizedPath = path.normalize(folderPath);
      console.log('[openFolderCommon] Opening folder:', normalizedPath);

      // 폴더 존재 확인
      await fs.access(normalizedPath);
      const fileTree = await buildFileTree(normalizedPath);

      // 이전 폴더 감시 중단
      fileWatcher.stopWatchingAll();

      // 마지막 열린 폴더로 저장
      store.set('lastOpenedFolder', normalizedPath);

      // 새 폴더 감시 시작
      fileWatcher.startWatchingFolder(normalizedPath);

      // 최근 폴더 목록에 추가
      if (updateRecentList) {
        addToRecentFolders(normalizedPath, store, getMainWindow());
      }

      // 폴더별 최근 파일 목록 가져오기
      const recentFilesByFolder = store.get('recentFilesByFolder', {}) as RecentFilesByFolder;
      const recentFiles = recentFilesByFolder[normalizedPath] || [];

      // 폴더별 탭 상태 가져오기
      const tabStatesByFolder = store.get('tabStatesByFolder', {}) as TabStatesByFolder;
      const tabState = tabStatesByFolder[normalizedPath] || null;

      console.log('[openFolderCommon] Workspace data ready:', {
        folder: normalizedPath,
        recentFiles: recentFiles.length,
        tabs: tabState?.tabs?.length || 0
      });

      // 렌더러에 이벤트 전송
      const currentWindow = getMainWindow();
      if (currentWindow) {
        currentWindow.webContents.send('folder-opened', {
          folderPath: normalizedPath,
          fileTree,
          recentFiles,
          tabState
        });
      }

      return { success: true, folderPath: normalizedPath };
    } catch (error) {
      console.error('Error opening folder:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  }

  /**
   * 폴더 열기 다이얼로그
   */
  ipcMain.handle('open-folder', async (): Promise<string | null> => {
    try {
      const mainWindow = getMainWindow();
      if (!mainWindow) return null;

      const result = await dialog.showOpenDialog(mainWindow, {
        properties: ['openDirectory']
      });

      if (result.canceled) return null;

      const folderPath = result.filePaths[0];
      await openFolderCommon(folderPath);
      return folderPath;
    } catch (error) {
      console.error('Error in open-folder:', error);
      return null;
    }
  });

  /**
   * 경로로 폴더 직접 열기 (다이얼로그 없이)
   */
  ipcMain.handle('open-folder-by-path', async (_event, folderPath: string): Promise<{ success: boolean; folderPath?: string; error?: string }> => {
    return openFolderCommon(folderPath);
  });

  /**
   * 최근 폴더 열기
   */
  ipcMain.handle('open-recent-folder', async (_event, folderPath: string): Promise<{ success: boolean; folderPath?: string; error?: string }> => {
    return openFolderCommon(folderPath);
  });

  /**
   * 북마크된 폴더 열기
   */
  ipcMain.handle('open-bookmarked-folder', async (_event, folderPath: string): Promise<{ success: boolean; folderPath?: string; error?: string }> => {
    return openFolderCommon(folderPath);
  });

  /**
   * 마지막 열린 폴더 복원
   */
  ipcMain.handle('get-last-folder', async (): Promise<WorkspaceData | null> => {
    try {
      let folderPath = store.get('lastOpenedFolder');
      if (!folderPath) return null;

      folderPath = path.normalize(folderPath);

      // 폴더 존재 확인
      try {
        await fs.access(folderPath);
        const fileTree = await buildFileTree(folderPath);

        store.set('lastOpenedFolder', folderPath);
        fileWatcher.startWatchingFolder(folderPath);

        const recentFilesByFolder = store.get('recentFilesByFolder', {}) as RecentFilesByFolder;
        const recentFiles = recentFilesByFolder[folderPath] || [];

        const tabStatesByFolder = store.get('tabStatesByFolder', {}) as TabStatesByFolder;
        const tabState = tabStatesByFolder[folderPath] || null;

        return {
          folderPath,
          fileTree,
          recentFiles,
          tabState
        };
      } catch {
        // 폴더가 삭제되었으면 저장된 경로 제거
        store.delete('lastOpenedFolder');
        return null;
      }
    } catch (error) {
      console.error('Error getting last folder:', error);
      return null;
    }
  });

  /**
   * 최근 파일 목록 가져오기
   */
  ipcMain.handle('get-recent-files', async (): Promise<RecentFile[]> => {
    try {
      let currentFolder = store.get('lastOpenedFolder', null);
      if (!currentFolder) return [];

      currentFolder = path.normalize(currentFolder);
      const recentFilesByFolder = store.get('recentFilesByFolder', {}) as RecentFilesByFolder;
      const recentFiles = recentFilesByFolder[currentFolder] || [];

      // 존재하는 파일만 필터링
      const existingFiles: RecentFile[] = [];
      for (const file of recentFiles) {
        try {
          await fs.access(file.path);
          existingFiles.push(file);
        } catch {
          // 파일이 삭제됨
        }
      }
      return existingFiles;
    } catch (error) {
      console.error('Error getting recent files:', error);
      return [];
    }
  });

  /**
   * 최근 폴더 목록 가져오기
   */
  ipcMain.handle('get-recent-folders', async (): Promise<RecentFolder[]> => {
    try {
      const recentFolders = store.get('recentFolders', []);

      // 존재하는 폴더만 필터링
      const existingFolders: RecentFolder[] = [];
      for (const folder of recentFolders) {
        try {
          await fs.access(folder.path);
          existingFolders.push(folder);
        } catch {
          // 폴더가 삭제됨
        }
      }
      return existingFolders;
    } catch (error) {
      console.error('Error getting recent folders:', error);
      return [];
    }
  });

  /**
   * 탭 상태 저장
   */
  ipcMain.handle('save-tab-state', async (_event, state: TabState): Promise<{ success: boolean; error?: string }> => {
    try {
      const currentFolder = store.get('lastOpenedFolder', null);

      if (!currentFolder) {
        store.set('tabState', state);
        return { success: true };
      }

      const tabStatesByFolder = store.get('tabStatesByFolder', {}) as TabStatesByFolder;
      tabStatesByFolder[currentFolder] = state;
      store.set('tabStatesByFolder', tabStatesByFolder);

      return { success: true };
    } catch (error) {
      console.error('Error saving tab state:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * 탭 상태 불러오기
   */
  ipcMain.handle('get-tab-state', async (): Promise<TabState | null> => {
    try {
      const currentFolder = store.get('lastOpenedFolder', null);

      if (!currentFolder) {
        return store.get('tabState') || null;
      }

      const tabStatesByFolder = store.get('tabStatesByFolder', {}) as TabStatesByFolder;
      return tabStatesByFolder[currentFolder] || null;
    } catch (error) {
      console.error('Error getting tab state:', error);
      return null;
    }
  });
}

/**
 * 폴더를 최근 폴더 목록에 추가
 */
function addToRecentFolders(
  folderPath: string,
  store: Store<StoreSchema>,
  mainWindow: BrowserWindow | null
): void {
  try {
    const recentFolders = store.get('recentFolders', []);
    const folderName = path.basename(folderPath);

    // 중복 제거 후 맨 앞에 추가
    const filtered = recentFolders.filter((f: RecentFolder) => f.path !== folderPath);
    filtered.unshift({
      path: folderPath,
      name: folderName,
      timestamp: Date.now()
    });

    // 최대 15개만 유지
    const updated = filtered.slice(0, 15);
    store.set('recentFolders', updated);

    // 렌더러에 업데이트 알림
    if (mainWindow) {
      mainWindow.webContents.send('recent-folders-updated', updated);
    }
  } catch (error) {
    console.error('Error adding to recent folders:', error);
  }
}

module.exports = {
  registerWorkspaceHandlers
};
