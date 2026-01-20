/**
 * Markdown PDF 내보내기 유틸리티
 * - Electron printToPDF API 사용 (브라우저 프린트 엔진)
 * - CSS break-inside: avoid 자동 적용
 * - 이미지 비율 유지, 페이지 분할 최적화
 */

// ============================================================================
// 타입 정의
// ============================================================================

type ToastType = 'success' | 'error' | 'info';
type ShowToastFn = (message: string, type?: ToastType) => void;

interface ExportResult {
  success: boolean;
  canceled?: boolean;
  filePath?: string;
  error?: string;
}

// ============================================================================
// PDF 내보내기용 스타일
// ============================================================================

// PDF 레이아웃 및 페이지 분할 관련 스타일만 (색상은 앱 스타일에서 상속)
const PDF_STYLES = `
  * {
    box-sizing: border-box;
  }

  @page {
    size: A4;
    margin: 0;
  }

  html, body {
    margin: 0;
    padding: 0;
    background: var(--md-bg);
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .markdown-content {
    max-width: 100%;
    padding: 15mm;
    min-height: 100vh;
  }

  /* 페이지 분할 제어 */
  h1, h2, h3, h4, h5, h6 {
    page-break-after: avoid;
    break-after: avoid;
  }

  pre, blockquote, table, img {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* Mermaid 다이어그램 블록 - 페이지 분할 방지 */
  .mermaid-block-wrapper,
  .mermaid-block {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* SVG 크기 유지 */
  .mermaid-block svg {
    max-width: 100%;
    height: auto !important;
    width: auto !important;
  }

  /* 코드 블록 래퍼 */
  .code-block-wrapper {
    page-break-inside: avoid;
    break-inside: avoid;
  }

  /* 복사 버튼 숨기기 (PDF에서 불필요) */
  .copy-button,
  .mermaid-copy-btn,
  .code-copy-btn {
    display: none !important;
  }
`;

// ============================================================================
// 메인 내보내기 함수
// ============================================================================

/**
 * Markdown을 PDF로 내보내기 (printToPDF 방식)
 * - 브라우저 프린트 엔진이 자동으로 페이지 분할 처리
 * - CSS break-inside: avoid가 자동 적용됨
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

    if (showToast) showToast('Preparing PDF...', 'info');

    // HTML 콘텐츠 준비
    const htmlContent = buildPDFHTML(element);

    // printToPDF API 호출
    const result = await window.electronAPI.printToPDF(htmlContent, `${fileName}.pdf`);

    if (result.canceled) {
      return { success: false, canceled: true };
    }

    if (!result.success) {
      throw new Error(result.error || 'PDF export failed');
    }

    if (showToast) {
      showToast('PDF exported successfully!', 'success');
    }

    return { success: true, filePath: result.filePath };

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
 * PDF용 완전한 HTML 문서 생성
 */
function buildPDFHTML(element: HTMLElement): string {
  // 현재 테마 감지
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

  // SVG 크기 고정 처리
  const clone = element.cloneNode(true) as HTMLElement;

  // 복사 버튼 제거 (PDF에서 불필요)
  clone.querySelectorAll('.copy-button, .mermaid-copy-btn, .code-copy-btn, button').forEach((btn) => {
    btn.remove();
  });

  // 모든 Mermaid SVG의 크기를 명시적으로 설정
  clone.querySelectorAll('.mermaid-block svg').forEach((svg) => {
    const svgEl = svg as SVGSVGElement;
    const viewBox = svgEl.getAttribute('viewBox');

    if (viewBox) {
      const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);
      if (vbWidth && vbHeight) {
        // viewBox 기준으로 크기 설정 (최대 너비 제한)
        const maxWidth = 650; // A4 기준 컨텐츠 영역
        const scale = vbWidth > maxWidth ? maxWidth / vbWidth : 1;
        svgEl.style.width = `${vbWidth * scale}px`;
        svgEl.style.height = `${vbHeight * scale}px`;
        svgEl.style.maxWidth = '100%';
      }
    }
  });

  // 현재 페이지의 스타일시트 복사
  let appStyles = '';
  try {
    Array.from(document.styleSheets).forEach(styleSheet => {
      try {
        Array.from(styleSheet.cssRules).forEach(rule => {
          appStyles += rule.cssText + '\n';
        });
      } catch (_) { /* cross-origin 스타일시트 무시 */ }
    });
  } catch (_) { /* ignore */ }

  return `<!DOCTYPE html>
<html data-theme="${currentTheme}">
<head>
  <meta charset="UTF-8">
  <title>PDF Export</title>
  <style>
    ${appStyles}
    ${PDF_STYLES}
  </style>
</head>
<body data-theme="${currentTheme}">
  <div class="markdown-content">
    ${clone.innerHTML}
  </div>
</body>
</html>`;
}

/**
 * Markdown 프린트 (브라우저 프린트 대화상자)
 */
export function printMarkdownPreview(element: HTMLElement | null): void {
  if (!element) return;

  const printWindow = window.open('', '_blank');
  if (!printWindow) return;

  // 현재 테마 감지
  const currentTheme = document.documentElement.getAttribute('data-theme') || 'light';

  // SVG 크기 고정 처리
  const clone = element.cloneNode(true) as HTMLElement;

  // 복사 버튼 제거
  clone.querySelectorAll('.copy-button, .mermaid-copy-btn, .code-copy-btn, button').forEach((btn) => {
    btn.remove();
  });

  clone.querySelectorAll('.mermaid-block svg').forEach((svg) => {
    const svgEl = svg as SVGSVGElement;
    const viewBox = svgEl.getAttribute('viewBox');

    if (viewBox) {
      const [, , vbWidth, vbHeight] = viewBox.split(/\s+/).map(Number);
      if (vbWidth && vbHeight) {
        const maxWidth = 650;
        const scale = vbWidth > maxWidth ? maxWidth / vbWidth : 1;
        svgEl.style.width = `${vbWidth * scale}px`;
        svgEl.style.height = `${vbHeight * scale}px`;
        svgEl.style.maxWidth = '100%';
      }
    }
  });

  // 현재 페이지의 스타일시트 복사
  let appStyles = '';
  try {
    Array.from(document.styleSheets).forEach(styleSheet => {
      try {
        Array.from(styleSheet.cssRules).forEach(rule => {
          appStyles += rule.cssText + '\n';
        });
      } catch (_) { /* cross-origin 스타일시트 무시 */ }
    });
  } catch (_) { /* ignore */ }

  printWindow.document.write(`<!DOCTYPE html>
<html data-theme="${currentTheme}">
<head>
  <title>Print Preview</title>
  <style>
    ${appStyles}
    ${PDF_STYLES}
  </style>
</head>
<body data-theme="${currentTheme}">
  <div class="markdown-content">
    ${clone.innerHTML}
  </div>
</body>
</html>`);

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
