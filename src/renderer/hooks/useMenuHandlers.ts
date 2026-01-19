import { useEffect, RefObject } from 'react';
import { exportDiagram } from '../utils/diagramExporter';

interface TabUpdates {
  filePath?: string | null;
  isModified?: boolean;
}

/**
 * 메뉴 핸들러 Hook
 * Electron 메뉴 이벤트 처리
 */
export const useMenuHandlers = (
  diagramCode: string,
  currentFilePath: string | null,
  updateActiveTab: (updates: TabUpdates) => void,
  handleTabNew: () => void,
  handleFileSelect: (content: string, filePath: string) => void,
  diagramRef: RefObject<HTMLDivElement | null>
): void => {
  useEffect(() => {
    if (!window.electronAPI) return;

    const handleNew = (): void => {
      handleTabNew();
    };

    const handleOpen = (_event: unknown, content: string, filePath: string): void => {
      handleFileSelect(content, filePath);
    };

    const handleSave = async (): Promise<void> => {
      const result = await window.electronAPI.saveFile(diagramCode, currentFilePath ?? undefined);
      if (result.success) {
        updateActiveTab({ filePath: result.filePath, isModified: false });
      }
    };

    const handleExportPNG = (): void => {
      if (diagramRef.current) {
        exportDiagram(diagramCode, currentFilePath, 'png', diagramRef.current);
      }
    };
    const handleExportPDF = (): void => {
      if (diagramRef.current) {
        exportDiagram(diagramCode, currentFilePath, 'pdf', diagramRef.current);
      }
    };
    const handleExportSVG = (): void => {
      if (diagramRef.current) {
        exportDiagram(diagramCode, currentFilePath, 'svg', diagramRef.current);
      }
    };

    window.electronAPI.onMenuNew(handleNew);
    window.electronAPI.onMenuOpen(handleOpen);
    window.electronAPI.onMenuSave(handleSave);
    window.electronAPI.onMenuExportPNG(handleExportPNG);
    window.electronAPI.onMenuExportPDF(handleExportPDF);
    window.electronAPI.onMenuExportSVG(handleExportSVG);

    return () => {
      window.electronAPI.removeAllListeners('menu-new');
      window.electronAPI.removeAllListeners('menu-open');
      window.electronAPI.removeAllListeners('menu-save');
      window.electronAPI.removeAllListeners('menu-export-png');
      window.electronAPI.removeAllListeners('menu-export-pdf');
      window.electronAPI.removeAllListeners('menu-export-svg');
    };
  }, [diagramCode, currentFilePath, updateActiveTab, handleTabNew, handleFileSelect, diagramRef]);
};
