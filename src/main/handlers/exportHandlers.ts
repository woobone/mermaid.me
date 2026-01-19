/**
 * 다이어그램 내보내기 관련 IPC 핸들러
 * PNG, PDF, SVG 형식으로 다이어그램 내보내기
 */

import { ipcMain, dialog, BrowserWindow } from 'electron';
import * as fs from 'fs/promises';
import type { ExportResult } from '../../types';

interface FileFilter {
  name: string;
  extensions: string[];
}

/**
 * 내보내기 핸들러 등록
 */
export function registerExportHandlers(getMainWindow: () => BrowserWindow | null): void {
  /**
   * 다이어그램 내보내기 (파일 선택 다이얼로그)
   */
  ipcMain.handle('export-diagram', async (_event, svgData: string, exportType: string, fileName: string): Promise<ExportResult> => {
    try {
      const defaultExt = exportType;
      let filters: FileFilter[] = [];

      switch (exportType) {
        case 'png':
          filters = [{ name: 'PNG Files', extensions: ['png'] }];
          break;
        case 'pdf':
          filters = [{ name: 'PDF Files', extensions: ['pdf'] }];
          break;
        case 'svg':
          filters = [{ name: 'SVG Files', extensions: ['svg'] }];
          break;
        default:
          filters = [{ name: 'All Files', extensions: ['*'] }];
      }

      const mainWindow = getMainWindow();
      if (!mainWindow) {
        return { success: false, error: 'Main window not available' };
      }

      // 저장 위치 선택 다이얼로그
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: fileName || `diagram.${defaultExt}`,
        filters: filters
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      const filePath = result.filePath;

      if (exportType === 'svg') {
        // SVG는 바로 저장
        await fs.writeFile(filePath, svgData, 'utf-8');
        return { success: true, filePath };
      } else {
        // PNG/PDF는 렌더러에서 변환 필요
        return { success: true, filePath, needsConversion: true };
      }

    } catch (error) {
      console.error('Error exporting diagram:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });

  /**
   * 변환된 파일 저장 (PNG/PDF)
   */
  ipcMain.handle('save-exported-file', async (_event, filePath: string, buffer: Uint8Array): Promise<{ success: boolean; error?: string }> => {
    try {
      await fs.writeFile(filePath, buffer);
      return { success: true };
    } catch (error) {
      console.error('Error saving exported file:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });
}

module.exports = {
  registerExportHandlers
};
