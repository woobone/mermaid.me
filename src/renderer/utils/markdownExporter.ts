/**
 * Markdown PDF 내보내기 유틸리티
 * - 전체 콘텐츠를 이미지로 렌더링 후 페이지 분할
 * - Mermaid 다이어그램 포함 지원
 */

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

// ============================================================================
// 타입 정의
// ============================================================================

type ToastType = 'success' | 'error' | 'info';
type ShowToastFn = (message: string, type?: ToastType) => void;

interface ExportResult {
  success: boolean;
  canceled?: boolean;
  pageCount?: number;
  filePath?: string;
  error?: string;
}

// ============================================================================
// 상수 정의
// ============================================================================

// A4 크기 (px at 96 DPI)
const A4 = {
  WIDTH_PX: 794,   // 210mm
  HEIGHT_PX: 1123, // 297mm
} as const;

// 페이지 마진 (px)
const MARGIN = {
  TOP: 40,
  BOTTOM: 40,
  LEFT: 40,
  RIGHT: 40,
} as const;

// 실제 컨텐츠 영역
const CONTENT_WIDTH = A4.WIDTH_PX - MARGIN.LEFT - MARGIN.RIGHT;  // 714px
const CONTENT_HEIGHT = A4.HEIGHT_PX - MARGIN.TOP - MARGIN.BOTTOM; // 1043px

// 렌더링 스케일 (선명도)
const RENDER_SCALE = 2;

// ============================================================================
// 메인 내보내기 함수
// ============================================================================

/**
 * Markdown을 PDF로 내보내기
 * 전체 콘텐츠를 하나의 긴 이미지로 렌더링 후 A4 높이로 잘라서 페이지 분할
 */
export async function exportMarkdownToPDF(
  element: HTMLElement | null,
  fileName: string,
  showToast?: ShowToastFn
): Promise<ExportResult> {
  try {
    if (!element) {
      throw new Error('No content element provided');
    }

    if (!window.electronAPI) {
      throw new Error('Electron API not available');
    }

    // 1. 저장 경로 선택
    const result = await window.electronAPI.exportDiagram('', 'pdf', `${fileName}.pdf`);
    if (result.canceled) return { success: false, canceled: true };
    if (!result.success) {
      throw new Error(result.error || 'Export dialog failed');
    }

    if (showToast) showToast('Rendering content...', 'info');

    // 2. 클론 생성하여 렌더링 준비
    const clone = element.cloneNode(true) as HTMLElement;
    const container = document.createElement('div');
    container.style.cssText = `
      position: fixed;
      left: -9999px;
      top: 0;
      width: ${CONTENT_WIDTH}px;
      background: white;
      padding: 0;
      margin: 0;
    `;
    container.appendChild(clone);

    // 스타일 적용
    clone.style.cssText = `
      width: ${CONTENT_WIDTH}px;
      padding: 0;
      margin: 0;
      background: white;
      color: #24292e;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      line-height: 1.6;
    `;

    document.body.appendChild(container);

    // 렌더링 대기 (Mermaid SVG 포함)
    await new Promise(resolve => setTimeout(resolve, 300));

    // 3. 전체 콘텐츠를 하나의 캔버스로 렌더링
    const canvas = await html2canvas(container, {
      scale: RENDER_SCALE,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: CONTENT_WIDTH,
      windowWidth: CONTENT_WIDTH,
      logging: false,
    });

    document.body.removeChild(container);

    // 4. 캔버스를 페이지 단위로 분할하여 PDF 생성
    const totalHeight = canvas.height / RENDER_SCALE;
    const pageContentHeight = CONTENT_HEIGHT;
    const pageCount = Math.ceil(totalHeight / pageContentHeight);

    if (showToast) showToast(`Creating ${pageCount} pages...`, 'info');

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'px',
      format: [A4.WIDTH_PX, A4.HEIGHT_PX],
      hotfixes: ['px_scaling'],
    });

    for (let page = 0; page < pageCount; page++) {
      // 현재 페이지에 해당하는 영역 계산
      const sourceY = page * pageContentHeight * RENDER_SCALE;
      const sourceHeight = Math.min(
        pageContentHeight * RENDER_SCALE,
        canvas.height - sourceY
      );

      if (sourceHeight <= 0) break;

      // 페이지용 캔버스 생성
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = CONTENT_WIDTH * RENDER_SCALE;
      pageCanvas.height = pageContentHeight * RENDER_SCALE;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        // 해당 영역 복사
        ctx.drawImage(
          canvas,
          0, sourceY,                              // source x, y
          CONTENT_WIDTH * RENDER_SCALE, sourceHeight, // source width, height
          0, 0,                                    // dest x, y
          CONTENT_WIDTH * RENDER_SCALE, sourceHeight  // dest width, height
        );
      }

      // PDF에 페이지 추가
      if (page > 0) {
        pdf.addPage([A4.WIDTH_PX, A4.HEIGHT_PX], 'portrait');
      }

      const imgData = pageCanvas.toDataURL('image/jpeg', 0.92);
      pdf.addImage(
        imgData,
        'JPEG',
        MARGIN.LEFT,
        MARGIN.TOP,
        CONTENT_WIDTH,
        sourceHeight / RENDER_SCALE
      );
    }

    // 5. PDF 저장
    const pdfBuffer = pdf.output('arraybuffer');
    const uint8Array = new Uint8Array(pdfBuffer);

    const saveResult = await window.electronAPI.saveExportedFile(result.filePath!, uint8Array);
    if (!saveResult.success) {
      throw new Error(saveResult.error || 'Failed to save PDF file');
    }

    if (showToast) {
      showToast(`PDF exported: ${pageCount} pages`, 'success');
    }

    return { success: true, pageCount, filePath: result.filePath! };

  } catch (error) {
    console.error('PDF export error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (showToast) {
      showToast(`Export failed: ${errorMessage}`, 'error');
    }
    return { success: false, error: errorMessage };
  }
}

/**
 * Markdown 프린트 (브라우저 프린트 대화상자)
 */
export function printMarkdownPreview(element: HTMLElement | null): void {
  if (!element) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // 스타일시트 복사
  let styles = '';
  try {
    Array.from(document.styleSheets).forEach(styleSheet => {
      try {
        Array.from(styleSheet.cssRules).forEach(rule => {
          styles += rule.cssText + '\n';
        });
      } catch (_) { /* ignore */ }
    });
  } catch (_) { /* ignore */ }

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Print Preview</title>
        <style>
          ${styles}

          @media print {
            @page {
              size: A4;
              margin: 15mm;
            }

            body {
              margin: 0;
              padding: 0;
              -webkit-print-color-adjust: exact;
              print-color-adjust: exact;
            }

            .markdown-content {
              max-width: 100%;
              background: white;
            }

            /* 페이지 분할 제어 */
            h1, h2, h3, h4, h5, h6 {
              page-break-after: avoid;
              break-after: avoid;
            }

            pre, table, blockquote, .mermaid-block {
              page-break-inside: avoid;
              break-inside: avoid;
            }

            /* Mermaid 다이어그램 크기 제한 */
            .mermaid-block {
              max-height: 250mm;
              overflow: visible;
            }

            .mermaid-block svg {
              max-height: 240mm;
              max-width: 100%;
              width: auto !important;
              height: auto !important;
            }
          }

          body {
            margin: 0;
            padding: 20px;
            background: white;
          }

          .markdown-content {
            max-width: 100%;
            background: white;
          }
        </style>
      </head>
      <body>
        <div class="markdown-content">
          ${element.innerHTML}
        </div>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

export default {
  exportMarkdownToPDF,
  printMarkdownPreview,
};
