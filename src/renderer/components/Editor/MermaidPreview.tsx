import React, { useState, ReactElement, RefObject } from 'react';
import { exportDiagram, copyToClipboard, ExportFormat, ShowToastFn } from '../../utils/diagramExporter';

interface ContextMenuState {
  x: number;
  y: number;
}

interface ToastState {
  message: string;
  type: 'success' | 'error';
}

interface MermaidPreviewProps {
  diagramRef: RefObject<HTMLDivElement | null>;
  content: string;
  currentFilePath: string | null;
}

/**
 * Mermaid 다이어그램 전용 미리보기
 */
const MermaidPreview = ({ diagramRef, content, currentFilePath }: MermaidPreviewProps): ReactElement => {
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);

  const showToast: ShowToastFn = (message, type = 'success') => {
    setToast({ message, type: type === 'info' ? 'success' : type });
    setTimeout(() => setToast(null), 1500);
  };

  const handleExport = async (format: ExportFormat): Promise<void> => {
    if (!diagramRef.current) {
      showToast('No diagram to export', 'error');
      return;
    }
    try {
      await exportDiagram(content, currentFilePath, format, diagramRef.current, showToast);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Export failed: ${errorMessage}`, 'error');
    }
  };

  const handleCopyToClipboard = async (): Promise<void> => {
    try {
      await copyToClipboard(content, showToast);
      setContextMenu(null);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      showToast(`Copy failed: ${errorMessage}`, 'error');
    }
  };

  const handleContextMenu = (e: React.MouseEvent): void => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = (): void => {
    setContextMenu(null);
  };

  React.useEffect(() => {
    if (contextMenu) {
      document.addEventListener('click', handleCloseContextMenu);
      return () => document.removeEventListener('click', handleCloseContextMenu);
    }
  }, [contextMenu]);

  return (
    <div className="preview-panel mermaid-preview">
      <div className="preview-header">
        <h3>Mermaid Preview</h3>
        <div className="export-buttons">
          <button
            className="export-btn"
            onClick={handleCopyToClipboard}
            title="Copy to Clipboard"
          >
            📋 Copy
          </button>
          <button
            className="export-btn"
            onClick={() => handleExport('png')}
            title="Export as PNG"
          >
            📷 PNG
          </button>
          <button
            className="export-btn"
            onClick={() => handleExport('pdf')}
            title="Export as PDF"
          >
            📄 PDF
          </button>
          <button
            className="export-btn"
            onClick={() => handleExport('svg')}
            title="Export as SVG"
          >
            🎨 SVG
          </button>
        </div>
      </div>

      <div
        className="diagram-container"
        ref={diagramRef}
        onContextMenu={handleContextMenu}
      ></div>

      {contextMenu && (
        <div
          className="context-menu"
          style={{
            position: 'fixed',
            top: contextMenu.y,
            left: contextMenu.x,
            zIndex: 1000
          }}
        >
          <button onClick={handleCopyToClipboard}>
            📋 Copy Image to Clipboard
          </button>
        </div>
      )}

      {toast && (
        <div className={`toast toast-${toast.type}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
};

export default MermaidPreview;
