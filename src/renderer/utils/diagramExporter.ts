/**
 * 다이어그램 내보내기 유틸리티
 * PNG, PDF, SVG 형식으로 다이어그램 내보내기
 */

import mermaid from 'mermaid';
import jsPDF from 'jspdf';

// ============================================================================
// 타입 정의
// ============================================================================

export type ExportFormat = 'png' | 'pdf' | 'svg' | 'svg-compat';
export type ToastType = 'success' | 'error' | 'info';
export type ShowToastFn = (message: string, type?: ToastType) => void;

interface SVGDimensions {
  width: number;
  height: number;
  vbX: number;
  vbY: number;
}

interface SVGResult {
  svg: string;
  width: number;
  height: number;
}

// ============================================================================
// 상수 정의
// ============================================================================

const XLINK_NS = 'http://www.w3.org/1999/xlink';
const SVG_NS = 'http://www.w3.org/2000/svg';

const INLINE_STYLE_PROPS = [
  'fill', 'fill-opacity', 'stroke', 'stroke-opacity', 'stroke-width',
  'stroke-linecap', 'stroke-linejoin', 'stroke-dasharray', 'stroke-dashoffset',
  'opacity', 'font-family', 'font-size', 'font-weight', 'text-anchor', 'dominant-baseline'
];

const DEFAULT_DIMENSIONS = { width: 800, height: 600 };
const DEFAULT_EXPORT_SCALE = 2;
const DEFAULT_FONT_FAMILY = 'trebuchet ms, verdana, arial, sans-serif';

// 색상 팔레트
const COLORS = {
  TEXT: '#333',
  NODE_FILL: '#ECECFF',
  NODE_STROKE: '#9370DB',
  EDGE_STROKE: '#333',
  CLUSTER_FILL: '#ffffde',
  CLUSTER_STROKE: '#aaaa33',
  ACTOR_STROKE: '#ccccff',
  ACTOR_FILL: '#ECECFF',
  WHITE: '#ffffff',
  TRANSPARENT: 'transparent'
};

// 폰트 및 크기 설정
const FONT_SIZES = {
  TEXT: '12px',
  LABEL: '10px',
  TITLE: '16px'
};

const FONT_WEIGHT_BOLD = '600';
const MAX_TEXT_LENGTH_BEFORE_WRAP = 8;
const CLEAN_SVG_PADDING = 20;
const MARKER_SIZE = '10';
const PNG_QUALITY = 1.0;

// 선 굵기 상수
const STROKE_WIDTHS = {
  NODE: '1',
  EDGE: '2',
  CLUSTER: '1'
};

// 셀렉터 상수
const SELECTORS = {
  SHAPES: 'rect, circle, ellipse, polygon, path',
  BACKGROUND_ELEMENTS: 'rect, path[fill]:not([stroke])',
  TEXT: 'text',
  MARKERS: 'marker',
  USE: 'use'
};

// ============================================================================
// SVG 호환성 헬퍼 함수
// ============================================================================

/**
 * SVG 네임스페이스 속성 보장
 */
function ensureSVGNamespaces(svgEl: SVGSVGElement): void {
  if (!svgEl.getAttribute('xmlns')) svgEl.setAttribute('xmlns', SVG_NS);
  if (!svgEl.getAttribute('xmlns:xlink')) svgEl.setAttribute('xmlns:xlink', XLINK_NS);
  if (!svgEl.getAttribute('preserveAspectRatio')) svgEl.setAttribute('preserveAspectRatio', 'xMidYMid meet');
}

/**
 * href와 xlink:href 속성을 동시에 설정하여 다양한 SVG 뷰어 호환성 확보
 */
function ensureHrefDual(elem: Element): void {
  const href = elem.getAttribute('href') || elem.getAttributeNS(XLINK_NS, 'href');
  if (!href) return;
  elem.setAttribute('href', href);
  elem.setAttributeNS(XLINK_NS, 'xlink:href', href);
}

/**
 * SVG 마커 요소 보강 (화살표 등이 제대로 렌더링되도록)
 */
function strengthenMarkers(svgEl: SVGSVGElement): void {
  svgEl.querySelectorAll(SELECTORS.MARKERS).forEach(marker => {
    if (!marker.getAttribute('markerUnits')) marker.setAttribute('markerUnits', 'userSpaceOnUse');
    if (!marker.getAttribute('orient')) marker.setAttribute('orient', 'auto');
    if (!marker.getAttribute('markerWidth')) marker.setAttribute('markerWidth', MARKER_SIZE);
    if (!marker.getAttribute('markerHeight')) marker.setAttribute('markerHeight', MARKER_SIZE);
    ensureHrefDual(marker);
  });

  svgEl.querySelectorAll(SELECTORS.USE).forEach(use => ensureHrefDual(use));
}

/**
 * SVG 요소에 인라인 스타일 적용 (CSS 의존성 제거)
 */
function inlineStylesAndMarkers(svgEl: SVGSVGElement): void {
  ensureSVGNamespaces(svgEl);

  svgEl.querySelectorAll('*').forEach(el => {
    const tagName = el.tagName.toLowerCase();

    if (tagName === 'style') return;

    let computedStyle: CSSStyleDeclaration | null = null;
    try { computedStyle = window.getComputedStyle(el); } catch (_) { /* ignore */ }

    INLINE_STYLE_PROPS.forEach(prop => {
      if (el.hasAttribute(prop)) return;

      let value = '';
      if (computedStyle?.getPropertyValue) {
        value = computedStyle.getPropertyValue(prop) || '';
      } else if ((el as HTMLElement).style?.[prop as keyof CSSStyleDeclaration]) {
        value = String((el as HTMLElement).style[prop as keyof CSSStyleDeclaration]);
      }

      if (!value || ['initial', 'normal', 'none', 'rgba(0, 0, 0, 0)'].includes(value)) return;
      el.setAttribute(prop, value);
    });

    // 텍스트 요소 기본값 보강
    if (tagName === 'text') {
      if (!el.getAttribute('text-anchor')) el.setAttribute('text-anchor', 'middle');
      if (!el.getAttribute('dominant-baseline')) el.setAttribute('dominant-baseline', 'central');
      if (!el.getAttribute('font-family')) el.setAttribute('font-family', DEFAULT_FONT_FAMILY);
      if (!el.getAttribute('font-size')) el.setAttribute('font-size', FONT_SIZES.TEXT);
    }

    if (['use', 'image', 'a'].includes(tagName)) {
      ensureHrefDual(el);
    }
  });

  strengthenMarkers(svgEl);
}

// ============================================================================
// SVG 크기 계산 헬퍼 함수
// ============================================================================

/**
 * SVG 요소에서 크기 및 viewBox 정보 추출
 */
function extractSVGDimensions(svgEl: SVGSVGElement): SVGDimensions {
  let width = 0, height = 0, vbX = 0, vbY = 0;

  const viewBox = svgEl.getAttribute('viewBox');
  if (viewBox) {
    const [x, y, w, h] = viewBox.split(/\s+/).map(Number);
    vbX = x || 0;
    vbY = y || 0;
    width = Math.max(1, Math.floor(w || 0));
    height = Math.max(1, Math.floor(h || 0));
  } else {
    const wAttr = parseFloat(svgEl.getAttribute('width') || '0');
    const hAttr = parseFloat(svgEl.getAttribute('height') || '0');
    width = Math.max(1, Math.floor(wAttr || DEFAULT_DIMENSIONS.width));
    height = Math.max(1, Math.floor(hAttr || DEFAULT_DIMENSIONS.height));
  }

  return { width, height, vbX, vbY };
}

/**
 * SVG 요소에 크기 및 네임스페이스 속성 설정
 */
function configureSVGAttributes(svgEl: SVGSVGElement, width: number, height: number, vbX = 0, vbY = 0): void {
  svgEl.setAttribute('width', `${width}px`);
  svgEl.setAttribute('height', `${height}px`);

  if (!svgEl.getAttribute('viewBox')) {
    svgEl.setAttribute('viewBox', `${vbX} ${vbY} ${width} ${height}`);
  }

  ensureSVGNamespaces(svgEl);
}

/**
 * SVG에 흰색 배경 추가
 */
function addWhiteBackground(svgEl: SVGSVGElement, x: number, y: number, width: number, height: number): void {
  const bg = document.createElementNS(SVG_NS, 'rect');
  bg.setAttribute('x', String(x));
  bg.setAttribute('y', String(y));
  bg.setAttribute('width', String(width));
  bg.setAttribute('height', String(height));
  bg.setAttribute('fill', COLORS.WHITE);
  svgEl.insertBefore(bg, svgEl.firstChild);
}

/**
 * Mermaid 다이어그램 렌더링 및 SVG 요소 파싱
 */
async function renderMermaidSVG(diagramCode: string, id = 'temp-diagram-export'): Promise<SVGSVGElement> {
  const { svg } = await mermaid.render(id, diagramCode);

  const tmp = document.createElement('div');
  tmp.innerHTML = svg.trim();
  const svgEl = tmp.querySelector('svg');

  if (!svgEl) {
    throw new Error('Failed to render Mermaid SVG');
  }

  return svgEl;
}

// ============================================================================
// SVG 생성 함수 (통합)
// ============================================================================

/**
 * SVG 생성 - Raw 또는 호환성 모드
 * @param diagramCode - Mermaid 다이어그램 코드
 * @param compatMode - true면 인라인 스타일 적용, false면 원본 유지
 */
async function generateSVG(diagramCode: string, compatMode = false): Promise<SVGResult> {
  const id = compatMode ? 'temp-diagram-export-compat' : 'temp-diagram-export-raw';
  const svgEl = await renderMermaidSVG(diagramCode, id);

  const { width, height, vbX, vbY } = extractSVGDimensions(svgEl);
  configureSVGAttributes(svgEl, width, height, vbX, vbY);
  addWhiteBackground(svgEl, vbX, vbY, width, height);

  // 폰트 패밀리 보장
  if (!svgEl.style.fontFamily) {
    svgEl.style.fontFamily = DEFAULT_FONT_FAMILY;
  }

  // 호환성 모드인 경우 인라인 스타일 적용
  if (compatMode) {
    inlineStylesAndMarkers(svgEl);
  }

  const serializer = new XMLSerializer();
  const svgString = serializer.serializeToString(svgEl);

  return { svg: svgString, width, height };
}

/**
 * Raw SVG 생성 - Mermaid가 생성한 SVG를 있는 그대로 사용
 * (viewBox/defs/markers를 보존하여 시퀀스/간트 다이어그램 왜곡 방지)
 */
export const generateRawSVG = async (diagramCode: string): Promise<SVGResult> => {
  return generateSVG(diagramCode, false);
};

/**
 * 호환성 SVG 생성 - 스타일 인라인 + 마커/참조 보강
 */
export const generateCompatSVG = async (diagramCode: string): Promise<SVGResult> => {
  return generateSVG(diagramCode, true);
};

// ============================================================================
// Clean SVG 헬퍼 함수
// ============================================================================

const CLEAN_SVG_STYLES = `
  .mermaid {
    font-family: ${DEFAULT_FONT_FAMILY};
    font-size: ${FONT_SIZES.TITLE};
    fill: ${COLORS.TEXT};
  }
  text {
    font-family: ${DEFAULT_FONT_FAMILY} !important;
    font-size: ${FONT_SIZES.LABEL} !important;
    fill: ${COLORS.TEXT} !important;
    text-anchor: middle !important;
    dominant-baseline: central !important;
    alignment-baseline: central !important;
    font-weight: ${FONT_WEIGHT_BOLD} !important;
  }
  .node rect, .node circle, .node ellipse, .node polygon, .node path {
    fill: ${COLORS.NODE_FILL} !important;
    stroke: ${COLORS.NODE_STROKE} !important;
    stroke-width: ${STROKE_WIDTHS.NODE}px !important;
  }
  .edgePath .path {
    stroke: ${COLORS.EDGE_STROKE} !important;
    stroke-width: ${STROKE_WIDTHS.EDGE}px !important;
    fill: none !important;
  }
  .edgeLabel {
    background-color: ${COLORS.TRANSPARENT} !important;
    fill: ${COLORS.TEXT} !important;
  }
  .edgeLabel rect {
    fill: ${COLORS.TRANSPARENT} !important;
    stroke: none !important;
  }
  .cluster rect {
    fill: ${COLORS.CLUSTER_FILL} !important;
    stroke: ${COLORS.CLUSTER_STROKE} !important;
    stroke-width: ${STROKE_WIDTHS.CLUSTER}px !important;
  }
  .actor {
    stroke: ${COLORS.ACTOR_STROKE} !important;
    fill: ${COLORS.ACTOR_FILL} !important;
  }
  .label {
    color: ${COLORS.TEXT} !important;
    fill: ${COLORS.TEXT} !important;
  }
`;

/**
 * 텍스트 요소에 기본 스타일 적용
 */
function applyTextStyles(text: SVGTextElement, isSequenceDiagram: boolean): void {
  text.style.fontFamily = DEFAULT_FONT_FAMILY;
  text.style.fill = COLORS.TEXT;

  if (isSequenceDiagram) return;

  const isEdgeLabel = text.classList.contains('edgeLabel') ||
                     text.closest('.edgeLabel') ||
                     text.parentElement?.classList.contains('edgeLabel');

  text.setAttribute('text-anchor', 'middle');
  text.setAttribute('dominant-baseline', 'central');
  text.setAttribute('alignment-baseline', 'central');
  text.setAttribute('baseline-shift', '0');
  text.style.fontSize = FONT_SIZES.LABEL;
  text.style.fontWeight = FONT_WEIGHT_BOLD;
  text.style.textAnchor = 'middle';
  text.style.dominantBaseline = 'central';

  if (isEdgeLabel) {
    removeEdgeLabelBackground(text);
  } else {
    centerTextInShape(text);
    wrapLongText(text);
  }
}

/**
 * 연결선 라벨 배경 제거
 */
function removeEdgeLabelBackground(text: SVGTextElement): void {
  text.style.background = 'none';

  const parentGroup = text.parentElement;
  if (parentGroup) {
    const backgroundElements = parentGroup.querySelectorAll(SELECTORS.BACKGROUND_ELEMENTS);
    backgroundElements.forEach(bg => {
      (bg as SVGElement).style.fill = COLORS.TRANSPARENT;
      (bg as SVGElement).style.stroke = 'none';
      (bg as SVGElement).style.opacity = '0';
    });
  }
}

/**
 * 텍스트를 shape 중앙에 배치
 */
function centerTextInShape(text: SVGTextElement): void {
  const bbox = text.getBBox ? text.getBBox() : null;
  if (!bbox) return;

  const parentElement = text.parentElement;
  if (!parentElement) return;

  const shape = parentElement.querySelector(SELECTORS.SHAPES) as SVGGraphicsElement | null;
  if (!shape) return;

  const shapeBox = shape.getBBox ? shape.getBBox() : null;
  if (!shapeBox) return;

  const centerX = shapeBox.x + shapeBox.width / 2;
  const centerY = shapeBox.y + shapeBox.height / 2;
  text.setAttribute('x', centerX.toString());
  text.setAttribute('y', centerY.toString());
}

/**
 * 긴 텍스트 줄바꿈 처리
 */
function wrapLongText(text: SVGTextElement): void {
  const textContent = text.textContent;
  if (!textContent || textContent.length <= MAX_TEXT_LENGTH_BEFORE_WRAP || textContent.includes('\n')) return;

  const words = textContent.split(' ');
  if (words.length <= 1) return;

  text.innerHTML = '';
  const originalX = text.getAttribute('x') || '0';
  const originalY = text.getAttribute('y') || '0';

  words.forEach((word, index) => {
    const tspan = document.createElementNS(SVG_NS, 'tspan');
    tspan.textContent = word;
    tspan.setAttribute('x', originalX);
    tspan.setAttribute('y', originalY);
    tspan.setAttribute('dy', index === 0 ? '0' : '1.0em');
    tspan.setAttribute('text-anchor', 'middle');
    tspan.setAttribute('dominant-baseline', 'central');
    text.appendChild(tspan);
  });
}

/**
 * Shape 요소에 기본 스타일 적용
 */
function applyShapeStyles(shape: Element): void {
  const fill = shape.getAttribute('fill');
  if (!fill || fill === 'none') {
    shape.setAttribute('fill', COLORS.NODE_FILL);
  }
  if (!shape.getAttribute('stroke')) {
    shape.setAttribute('stroke', COLORS.NODE_STROKE);
  }
  if (!shape.getAttribute('stroke-width')) {
    shape.setAttribute('stroke-width', STROKE_WIDTHS.NODE);
  }
}

/**
 * Clean SVG 생성 - Mermaid 다이어그램을 깔끔한 SVG로 변환
 */
export const generateCleanSVG = async (diagramCode: string): Promise<SVGResult> => {
  const svgEl = await renderMermaidSVG(diagramCode, 'temp-diagram-export');
  const isSequenceDiagram = diagramCode.trim().startsWith('sequenceDiagram');

  // 텍스트 요소 처리
  svgEl.querySelectorAll(SELECTORS.TEXT).forEach(text => {
    applyTextStyles(text as SVGTextElement, isSequenceDiagram);
  });

  // Shape 요소 처리
  svgEl.querySelectorAll(SELECTORS.SHAPES).forEach(shape => {
    applyShapeStyles(shape);
  });

  // 크기 계산 및 패딩 추가
  const { width: baseWidth, height: baseHeight } = extractSVGDimensions(svgEl);
  const width = baseWidth + CLEAN_SVG_PADDING * 2;
  const height = baseHeight + CLEAN_SVG_PADDING * 2;

  // 스타일이 적용된 Clean SVG 생성
  const cleanSVG = `
    <svg width="${width}" height="${height}"
         viewBox="0 0 ${width} ${height}"
         xmlns="${SVG_NS}"
         xmlns:xlink="${XLINK_NS}"
         style="background-color: white;">
      <defs>
        <style type="text/css"><![CDATA[${CLEAN_SVG_STYLES}]]></style>
      </defs>
      <g transform="translate(${CLEAN_SVG_PADDING}, ${CLEAN_SVG_PADDING})">
        ${svgEl.innerHTML}
      </g>
    </svg>
  `;

  return { svg: cleanSVG, width, height };
};

// ============================================================================
// Promise 유틸리티 함수
// ============================================================================

/**
 * Image 로드를 Promise로 변환
 */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Failed to load SVG into Image'));
    img.src = url;
    if (img.decode) {
      try {
        img.decode().then(() => resolve(img)).catch(() => { /* ignore */ });
      } catch (_) { /* ignore */ }
    }
  });
}

/**
 * Canvas를 Blob으로 변환
 */
function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => {
      if (!b) return reject(new Error('Failed to create PNG'));
      resolve(b);
    }, 'image/png', PNG_QUALITY);
  });
}

/**
 * Blob을 Data URL로 변환
 */
function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error('Failed to read blob'));
    reader.readAsDataURL(blob);
  });
}

// ============================================================================
// SVG → PNG 변환 헬퍼 함수 (중복 제거)
// ============================================================================

/**
 * SVG를 PNG Blob으로 변환
 * @param svgString - SVG 문자열
 * @param width - SVG 너비
 * @param height - SVG 높이
 * @param scale - 스케일 배율 (기본값: devicePixelRatio 기반)
 */
async function convertSVGToPNGBlob(svgString: string, width: number, height: number, scale: number | null = null): Promise<Blob> {
  const exportScale = scale || Math.max(DEFAULT_EXPORT_SCALE, Math.ceil(window.devicePixelRatio || 1));

  // SVG → Base64 Data URL → Image (Blob URL 대신 Data URL 사용으로 tainted canvas 방지)
  const svgBase64 = btoa(unescape(encodeURIComponent(svgString)));
  const dataUrl = `data:image/svg+xml;base64,${svgBase64}`;

  const img = await loadImage(dataUrl);

  // 고해상도 캔버스에 렌더링
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.floor(width * exportScale));
  canvas.height = Math.max(1, Math.floor(height * exportScale));
  const ctx = canvas.getContext('2d');

  if (ctx) {
    ctx.fillStyle = COLORS.WHITE;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  }

  return canvasToBlob(canvas);
}

// ============================================================================
// 에러 처리 헬퍼 함수
// ============================================================================

/**
 * 통합 에러 핸들러
 */
function handleExportError(error: unknown, operation: string, showToast?: ShowToastFn): void {
  const errorMessage = error instanceof Error ? error.message : 'Unknown error';
  console.error(`${operation} error:`, error);
  if (showToast) {
    showToast(`${operation} failed: ${errorMessage}`, 'error');
  }
}

/**
 * Electron API 호출 검증
 */
function validateElectronAPI(): void {
  if (!window.electronAPI) {
    throw new Error('Electron API not available');
  }
}

// ============================================================================
// 내보내기 함수
// ============================================================================

/**
 * PNG로 내보내기
 */
export const exportToPNG = async (
  _diagramElement: HTMLElement | null,
  fileName: string,
  diagramCode: string,
  showToast?: ShowToastFn
): Promise<void> => {
  try {
    validateElectronAPI();

    const result = await window.electronAPI.exportDiagram('', 'png', `${fileName}.png`);
    if (result.canceled) return;
    if (!result.success) {
      throw new Error(result.error || 'Export dialog failed');
    }

    const { svg: svgString, width, height } = await generateRawSVG(diagramCode);
    const blob = await convertSVGToPNGBlob(svgString, width, height);
    const buffer = await blob.arrayBuffer();
    const uint8Array = new Uint8Array(buffer);

    const saveResult = await window.electronAPI.saveExportedFile(result.filePath!, uint8Array);
    if (!saveResult.success) {
      throw new Error(saveResult.error || 'Failed to save PNG file');
    }

    if (showToast) showToast('PNG exported successfully!');
  } catch (error) {
    handleExportError(error, 'PNG export', showToast);
  }
};

/**
 * PDF로 내보내기
 */
export const exportToPDF = async (
  _diagramElement: HTMLElement | null,
  fileName: string,
  diagramCode: string,
  showToast?: ShowToastFn
): Promise<void> => {
  try {
    validateElectronAPI();

    const result = await window.electronAPI.exportDiagram('', 'pdf', `${fileName}.pdf`);
    if (result.canceled) return;
    if (!result.success) {
      throw new Error(result.error || 'Export dialog failed');
    }

    const { svg: svgString, width, height } = await generateRawSVG(diagramCode);
    const blob = await convertSVGToPNGBlob(svgString, width, height);

    // Blob → Data URL
    const imgData = await blobToDataURL(blob);

    // jsPDF로 PDF 생성
    const pdf = new jsPDF({
      orientation: width > height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [width, height]
    });

    pdf.addImage(imgData, 'PNG', 0, 0, width, height);

    const pdfBuffer = pdf.output('arraybuffer');
    const uint8Array = new Uint8Array(pdfBuffer);

    const saveResult = await window.electronAPI.saveExportedFile(result.filePath!, uint8Array);
    if (!saveResult.success) {
      throw new Error(saveResult.error || 'Failed to save PDF file');
    }

    if (showToast) showToast('PDF exported successfully!');
  } catch (error) {
    handleExportError(error, 'PDF export', showToast);
  }
};

/**
 * 클립보드에 이미지 복사
 */
export const copyToClipboard = async (diagramCode: string, showToast?: ShowToastFn): Promise<void> => {
  try {
    if (!diagramCode?.trim()) {
      throw new Error('No diagram code to copy');
    }

    const { svg: svgString, width, height } = await generateRawSVG(diagramCode);
    const blob = await convertSVGToPNGBlob(svgString, width, height);

    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': blob })
    ]);

    if (showToast) showToast('Image copied to clipboard!');
  } catch (error) {
    handleExportError(error, 'Copy to clipboard', showToast);
  }
};

/**
 * SVG를 파일로 내보내기 (공통 로직)
 */
async function exportSVGToFile(svgContent: string, fileName: string, formatType: string, showToast?: ShowToastFn): Promise<void> {
  const finalSVG = svgContent.startsWith('<?xml')
    ? svgContent
    : `<?xml version="1.0" encoding="UTF-8"?>\n${svgContent}`;

  const result = await window.electronAPI.exportDiagram(finalSVG, 'svg', `${fileName}.svg`);

  if (result.canceled) return;
  if (!result.success) {
    throw new Error(result.error || 'Export failed');
  }

  if (showToast) showToast(`${formatType} exported successfully!`);
}

/**
 * 다이어그램 내보내기 메인 함수
 */
export const exportDiagram = async (
  diagramCode: string,
  currentFilePath: string | null,
  format: ExportFormat,
  diagramElement: HTMLElement | null,
  showToast?: ShowToastFn
): Promise<void> => {
  try {
    if (!diagramCode?.trim()) {
      throw new Error('No diagram code to export');
    }

    validateElectronAPI();

    const fileName = currentFilePath
      ? currentFilePath.split('/').pop()?.replace(/\.[^/.]+$/, '') || 'diagram'
      : 'diagram';

    if (format === 'svg') {
      const { svg: rawSVG } = await generateRawSVG(diagramCode);
      await exportSVGToFile(rawSVG, fileName, 'SVG', showToast);
    } else if (format === 'svg-compat') {
      const { svg: compatSVG } = await generateCompatSVG(diagramCode);
      await exportSVGToFile(compatSVG, fileName, 'SVG (compat)', showToast);
    } else if (format === 'png') {
      await exportToPNG(diagramElement, fileName, diagramCode, showToast);
    } else if (format === 'pdf') {
      await exportToPDF(diagramElement, fileName, diagramCode, showToast);
    } else {
      throw new Error(`Unsupported export format: ${format}`);
    }
  } catch (error) {
    handleExportError(error, 'Export', showToast);
  }
};
