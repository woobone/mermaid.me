/**
 * 파일 시스템 관련 IPC 핸들러
 * 파일 읽기/쓰기, 폴더 생성/삭제 등 파일 시스템 작업 처리
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import * as path from 'path';
import type Store from 'electron-store';
import type { RecentFile, SaveFileResult, FileOperationResult, RenameResult, StoreSchema, RecentFilesByFolder } from '../../types';

const { buildFileTree } = require('../utils/fileTreeBuilder');
const fileWatcher = require('../services/fileWatcher');

interface FileTreeResult {
  children: unknown[];
  [key: string]: unknown;
}

/**
 * 파일 시스템 핸들러 등록
 */
export function registerFileSystemHandlers(
  getMainWindow: () => BrowserWindow | null,
  store: Store<StoreSchema>
): void {
  // 파일 감시 서비스에 메인 윈도우 설정
  const mainWindow = getMainWindow();
  if (mainWindow) {
    fileWatcher.setMainWindow(mainWindow);
  }

  /**
   * 파일 저장
   */
  ipcMain.handle('save-file', async (_event, content: string, filePath?: string): Promise<SaveFileResult> => {
    try {
      let saveFilePath = filePath;

      if (!saveFilePath) {
        const currentWindow = getMainWindow();
        if (!currentWindow) {
          return { success: false, error: 'Main window not available' };
        }

        const result = await dialog.showSaveDialog(currentWindow, {
          filters: [{ name: 'Mermaid Files', extensions: ['mmd'] }]
        });

        if (result.canceled || !result.filePath) return { success: false, canceled: true };
        saveFilePath = result.filePath;
      }

      await fs.writeFile(saveFilePath, content, 'utf-8');

      // 저장 후 파일 수정 시간 업데이트 (자체 변경으로 인한 알림 방지)
      fileWatcher.updateFileModTime(saveFilePath);

      return { success: true, filePath: saveFilePath };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * 파일 읽기
   */
  ipcMain.handle('read-file', async (_event, filePath: string): Promise<string> => {
    try {
      const content = await fs.readFile(filePath, 'utf-8');

      // 최근 파일 목록에 추가
      addToRecentFiles(filePath, store, getMainWindow());

      return content;
    } catch (error) {
      console.error('Error reading file:', error);
      throw error;
    }
  });

  /**
   * 새 폴더 생성
   */
  ipcMain.handle('create-folder', async (_event, folderPath: string): Promise<FileOperationResult> => {
    try {
      await fs.mkdir(folderPath, { recursive: false });
      console.log('Folder created:', folderPath);
      return { success: true };
    } catch (error) {
      console.error('Error creating folder:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * 새 파일 생성
   */
  ipcMain.handle('create-file', async (_event, filePath: string): Promise<FileOperationResult> => {
    try {
      // 기본 Mermaid 템플릿 내용
      const defaultContent = `graph TD
    A[Start] --> B[End]`;

      await fs.writeFile(filePath, defaultContent, 'utf8');
      console.log('File created:', filePath);
      return { success: true };
    } catch (error) {
      console.error('Error creating file:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * 파일 또는 폴더 삭제
   */
  ipcMain.handle('delete-item', async (_event, itemPath: string, isDirectory: boolean): Promise<FileOperationResult> => {
    try {
      if (isDirectory) {
        // 폴더 삭제 시 해당 폴더 내 모든 파일을 recent files에서 제거
        await removeDirectoryFromRecentFiles(itemPath, store, getMainWindow());
        await fs.rm(itemPath, { recursive: true, force: true });
      } else {
        // 파일 삭제 시 recent files에서 제거
        removeFromRecentFiles(itemPath, store, getMainWindow());
        await fs.unlink(itemPath);

        // 렌더러에 파일 삭제 이벤트 전송 (열려있는 탭 처리용)
        const currentWindow = getMainWindow();
        if (currentWindow && !currentWindow.isDestroyed()) {
          currentWindow.webContents.send('file-deleted', itemPath);
        }
      }
      console.log('Item deleted:', itemPath);
      return { success: true };
    } catch (error) {
      console.error('Error deleting item:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * 파일 또는 폴더 이름 변경
   */
  ipcMain.handle('rename-item', async (_event, oldPath: string, newName: string, isDirectory: boolean): Promise<RenameResult> => {
    try {
      const parentDir = path.dirname(oldPath);
      const newPath = path.join(parentDir, newName);

      const result = await renameItem(oldPath, newPath, isDirectory);

      if (result.success) {
        // 렌더러에 이름 변경 이벤트 전송 (탭 경로 업데이트용)
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('file-renamed', oldPath, newPath);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * 파일 또는 폴더 이동
   */
  ipcMain.handle('move-item', async (_event, sourcePath: string, targetPath: string, isDirectory: boolean): Promise<RenameResult> => {
    try {
      const result = await moveItem(sourcePath, targetPath, isDirectory);

      if (result.success) {
        // 렌더러에 이동 이벤트 전송 (탭 경로 업데이트용)
        const mainWindow = getMainWindow();
        if (mainWindow && !mainWindow.isDestroyed()) {
          mainWindow.webContents.send('file-moved', result.oldPath, result.newPath);
        }
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * Lazy Loading - 폴더 자식 로드
   */
  ipcMain.handle('load-folder-children', async (_event, folderPath: string): Promise<{ success: boolean; children: unknown[]; error?: string }> => {
    try {
      const children = await buildFileTree(folderPath) as FileTreeResult;

      // 이 폴더 감시 시작
      fileWatcher.watchDirectory(folderPath);

      return { success: true, children: children.children };
    } catch (error) {
      console.error('Error loading folder children:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, children: [], error: errorMessage };
    }
  });

  /**
   * 폴더 감시 중단
   */
  ipcMain.handle('stop-watching-folder', async (_event, folderPath: string): Promise<{ success: boolean; error?: string }> => {
    try {
      fileWatcher.stopWatchingDirectory(folderPath);
      return { success: true };
    } catch (error) {
      console.error('Error stopping folder watch:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  // ==========================================================================
  // 개별 파일 감시 핸들러 (외부 변경 감지)
  // ==========================================================================

  /**
   * 파일 감시 시작
   */
  ipcMain.handle('watch-file', async (_event, filePath: string): Promise<{ success: boolean; error?: string }> => {
    try {
      fileWatcher.watchFile(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error watching file:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * 파일 감시 중단
   */
  ipcMain.handle('unwatch-file', async (_event, filePath: string): Promise<{ success: boolean; error?: string }> => {
    try {
      fileWatcher.unwatchFile(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error unwatching file:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * 파일 수정 시간 업데이트
   */
  ipcMain.handle('update-file-mod-time', async (_event, filePath: string): Promise<{ success: boolean; error?: string }> => {
    try {
      fileWatcher.updateFileModTime(filePath);
      return { success: true };
    } catch (error) {
      console.error('Error updating file mod time:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });
}

/**
 * 파일을 최근 파일 목록에 추가
 */
function addToRecentFiles(
  filePath: string,
  store: Store<StoreSchema>,
  mainWindow: BrowserWindow | null
): void {
  try {
    const currentFolder = store.get('lastOpenedFolder', null);
    if (!currentFolder) return;

    const normalizedFolder = path.normalize(currentFolder);
    const recentFilesByFolder = store.get('recentFilesByFolder', {}) as RecentFilesByFolder;
    const recentFiles = recentFilesByFolder[normalizedFolder] || [];
    const fileName = path.basename(filePath);

    // 중복 제거 후 맨 앞에 추가
    const filtered = recentFiles.filter((f: RecentFile) => f.path !== filePath);
    filtered.unshift({
      path: filePath,
      name: fileName,
      timestamp: Date.now()
    });

    // 최대 10개만 유지
    const updated = filtered.slice(0, 10);
    recentFilesByFolder[normalizedFolder] = updated;
    store.set('recentFilesByFolder', recentFilesByFolder);

    // 렌더러에 업데이트 알림
    if (mainWindow) {
      mainWindow.webContents.send('recent-files-updated', updated);
    }
  } catch (error) {
    console.error('Error adding to recent files:', error);
  }
}

/**
 * 파일을 최근 파일 목록에서 제거
 */
function removeFromRecentFiles(
  filePath: string,
  store: Store<StoreSchema>,
  mainWindow: BrowserWindow | null
): void {
  try {
    const currentFolder = store.get('lastOpenedFolder', null);
    if (!currentFolder) return;

    const normalizedFolder = path.normalize(currentFolder);
    const recentFilesByFolder = store.get('recentFilesByFolder', {}) as RecentFilesByFolder;
    const recentFiles = recentFilesByFolder[normalizedFolder] || [];

    // 해당 파일 제거
    const updated = recentFiles.filter((f: RecentFile) => f.path !== filePath);

    if (updated.length !== recentFiles.length) {
      recentFilesByFolder[normalizedFolder] = updated;
      store.set('recentFilesByFolder', recentFilesByFolder);

      // 렌더러에 업데이트 알림
      if (mainWindow) {
        mainWindow.webContents.send('recent-files-updated', updated);
      }
      console.log(`Removed ${filePath} from recent files`);
    }
  } catch (error) {
    console.error('Error removing from recent files:', error);
  }
}

/**
 * 폴더 삭제 시 해당 폴더 내 모든 파일을 최근 파일 목록에서 제거
 */
async function removeDirectoryFromRecentFiles(
  dirPath: string,
  store: Store<StoreSchema>,
  mainWindow: BrowserWindow | null
): Promise<void> {
  try {
    const currentFolder = store.get('lastOpenedFolder', null);
    if (!currentFolder) return;

    const normalizedFolder = path.normalize(currentFolder);
    const recentFilesByFolder = store.get('recentFilesByFolder', {}) as RecentFilesByFolder;
    const recentFiles = recentFilesByFolder[normalizedFolder] || [];

    // 삭제된 폴더 경로로 시작하는 모든 파일 제거
    const updated = recentFiles.filter((f: RecentFile) => !f.path.startsWith(dirPath));

    if (updated.length !== recentFiles.length) {
      recentFilesByFolder[normalizedFolder] = updated;
      store.set('recentFilesByFolder', recentFilesByFolder);

      // 렌더러에 업데이트 알림
      if (mainWindow) {
        mainWindow.webContents.send('recent-files-updated', updated);
      }
      console.log(`Removed all files in ${dirPath} from recent files`);
    }

    // 폴더 내 모든 파일에 대해 file-deleted 이벤트 전송
    if (mainWindow) {
      const deletedFiles = recentFiles.filter((f: RecentFile) => f.path.startsWith(dirPath));
      deletedFiles.forEach((file: RecentFile) => {
        mainWindow.webContents.send('file-deleted', file.path);
      });
    }
  } catch (error) {
    console.error('Error removing directory from recent files:', error);
  }
}

/**
 * 파일 또는 폴더 이름 변경
 */
async function renameItem(oldPath: string, newPath: string, isDirectory: boolean): Promise<RenameResult> {
  try {
    // 새 경로가 이미 존재하는지 확인
    try {
      await fs.access(newPath);
      return { success: false, error: 'A file or folder with that name already exists' };
    } catch {
      // 파일이 존재하지 않음 (정상)
    }

    // 이름 변경
    await fs.rename(oldPath, newPath);
    return { success: true, oldPath, newPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

/**
 * 파일 또는 폴더 이동
 */
async function moveItem(sourcePath: string, targetPath: string, isDirectory: boolean): Promise<RenameResult> {
  try {
    const fileName = path.basename(sourcePath);
    const newPath = path.join(targetPath, fileName);

    // 대상 경로가 이미 존재하는지 확인
    try {
      await fs.access(newPath);
      return { success: false, error: 'A file or folder with that name already exists in the target location' };
    } catch {
      // 파일이 존재하지 않음 (정상)
    }

    // 이동
    await fs.rename(sourcePath, newPath);
    return { success: true, oldPath: sourcePath, newPath };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    return { success: false, error: errorMessage };
  }
}

module.exports = {
  registerFileSystemHandlers
};
