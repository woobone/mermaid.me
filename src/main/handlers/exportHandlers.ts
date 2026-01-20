/**
 * 다이어그램 내보내기 관련 IPC 핸들러
 * PNG, PDF, SVG 형식으로 다이어그램 내보내기
 */

import { ipcMain, dialog, BrowserWindow, PrintToPDFOptions } from 'electron';
import * as fs from 'fs/promises';
import type { ExportResult } from '../../types';

interface PrintToPDFResult {
  success: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

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

  /**
   * Markdown을 PDF로 내보내기 (브라우저 프린트 엔진 사용)
   * - CSS break-inside: avoid 자동 적용
   * - 이미지 비율 유지
   * - 페이지 분할 최적화
   */
  ipcMain.handle('print-to-pdf', async (_event, htmlContent: string, fileName: string): Promise<PrintToPDFResult> => {
    try {
      const mainWindow = getMainWindow();
      if (!mainWindow) {
        return { success: false, error: 'Main window not available' };
      }

      // 저장 경로 선택 다이얼로그
      const result = await dialog.showSaveDialog(mainWindow, {
        defaultPath: fileName || 'document.pdf',
        filters: [{ name: 'PDF Files', extensions: ['pdf'] }]
      });

      if (result.canceled || !result.filePath) {
        return { success: false, canceled: true };
      }

      // 임시 숨겨진 창 생성하여 PDF 렌더링
      const printWindow = new BrowserWindow({
        width: 794,  // A4 width at 96 DPI
        height: 1123, // A4 height at 96 DPI
        show: false,
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
        }
      });

      // HTML 콘텐츠 로드
      await printWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(htmlContent)}`);

      // 렌더링 완료 대기
      await new Promise(resolve => setTimeout(resolve, 500));

      // PDF 옵션 설정
      const pdfOptions: PrintToPDFOptions = {
        pageSize: 'A4',
        printBackground: true,
        margins: {
          top: 0.6,      // inches
          bottom: 0.6,
          left: 0.6,
          right: 0.6
        }
      };

      // PDF 생성
      const pdfBuffer = await printWindow.webContents.printToPDF(pdfOptions);

      // 임시 창 닫기
      printWindow.close();

      // PDF 파일 저장
      await fs.writeFile(result.filePath, pdfBuffer);

      return { success: true, filePath: result.filePath };

    } catch (error) {
      console.error('Error printing to PDF:', error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      return { success: false, error: errorMessage };
    }
  });
}

module.exports = {
  registerExportHandlers
};
