/**
 * 에디터 및 탭 관리 기능 E2E 테스트
 * - Monaco Editor 통합
 * - 탭 생성/전환/닫기
 * - 다이어그램 실시간 렌더링
 * - 키보드 단축키
 */

const { test: base, expect } = require('@playwright/test');
const {
  launchElectron,
  forceCloseElectron,
  createTestWorkspace,
  cleanupTestWorkspace,
  waitForFileExplorer,
  waitForEditor,
  waitForTab,
  waitForDiagramRender,
  selectFileInTree,
  createNewTab,
  switchToTab,
  typeInEditor,
  getEditorContent,
  saveFile,
  callIPC,
  closeAllTabs
} = require('../helpers/electron-helpers');

// Custom fixture for Electron app
// scope: 'worker'로 설정하여 워커당 한 번만 Electron 실행
const test = base.extend({
  app: [async ({}, use) => {
    const result = await launchElectron();
    await use({ electronApp: result.app, window: result.window });
    await forceCloseElectron(result.app);
  }, { scope: 'worker' }],

  window: async ({ app }, use) => {
    await use(app.window);
  },

  electronApp: async ({ app }, use) => {
    await use(app.electronApp);
  }
});

let testWorkspace;

test.describe('에디터 및 탭 관리', () => {
  test.beforeAll(async () => {
    testWorkspace = await createTestWorkspace();
  });

  test.afterAll(async () => {
    await cleanupTestWorkspace(testWorkspace);
  });

  // 각 테스트 전에 탭 초기화 (worker scope 사용 시 필수)
  test.beforeEach(async ({ window }) => {
    await closeAllTabs(window);
  });

  test('새 탭 생성', async ({ window }) => {
    // React 앱이 로드될 때까지 대기
    await window.waitForSelector('#root', { state: 'attached', timeout: 10000 });

    // 새 탭 버튼이 보일 때까지 대기
    await window.waitForSelector('.tab-new-btn', { state: 'visible', timeout: 10000 });

    // 현재 탭 수 확인
    const initialTabCount = await window.locator('.tab-item').count();

    // 새 탭 버튼 클릭
    await window.click('.tab-new-btn');

    // 에디터 로드 대기
    await waitForEditor(window);

    // 새 탭이 생성되었는지 확인 (탭 수가 증가했는지)
    const newTabCount = await window.locator('.tab-item').count();
    expect(newTabCount).toBe(initialTabCount + 1);

    // Untitled 탭이 활성화되었는지 확인
    await expect(window.locator('.tab-item.active:has-text("Untitled")')).toBeVisible();

    // 기본 다이어그램 코드가 있는지 확인
    const content = await getEditorContent(window);
    expect(content).toContain('graph TD');
  });

  test('여러 탭 생성 및 전환', async ({ window }) => {
    // 초기 탭 수 확인
    const initialTabCount = await window.locator('.tab-item').count();

    // 3개의 탭 생성
    await createNewTab(window);
    await createNewTab(window);
    await createNewTab(window);

    // 탭이 3개 추가되었는지 확인
    const newTabCount = await window.locator('.tab-item').count();
    expect(newTabCount).toBe(initialTabCount + 3);

    // 모든 탭 가져오기
    const tabs = await window.locator('.tab-item').all();
    expect(tabs.length).toBeGreaterThanOrEqual(3);

    // 각 탭에 다른 내용 입력
    await tabs[0].click();
    await typeInEditor(window, 'graph TD\n  Tab1 --> Content1');

    await tabs[1].click();
    await typeInEditor(window, 'flowchart LR\n  Tab2 --> Content2');

    await tabs[2].click();
    await typeInEditor(window, 'sequenceDiagram\n  Tab3->>Content3: Test');

    // 탭 전환하며 내용 확인
    await tabs[0].click();
    let content = await getEditorContent(window);
    expect(content).toContain('Tab1 --> Content1');

    await tabs[1].click();
    content = await getEditorContent(window);
    expect(content).toContain('Tab2 --> Content2');
  });

  test('탭 닫기', async ({ window }) => {
    // 초기 탭 수 확인
    const initialTabCount = await window.locator('.tab-item').count();

    // 3개의 탭 생성
    await createNewTab(window);
    await createNewTab(window);
    await createNewTab(window);

    // 중간 탭 닫기 (두 번째 탭)
    const tabs = await window.locator('.tab-item').all();
    const tabToClose = tabs[1];
    await tabToClose.hover();
    await tabToClose.locator('.tab-close').click();

    // 탭이 닫혔는지 확인 (탭 수가 2개 감소했는지)
    const newTabCount = await window.locator('.tab-item').count();
    expect(newTabCount).toBe(initialTabCount + 2);
  });

  test('수정된 탭 표시 확인', async ({ window }) => {
    // 새 탭 생성
    await createNewTab(window);

    // 내용 수정
    await typeInEditor(window, 'graph TD\n  Modified --> Content');

    // 수정 표시가 나타나는지 확인
    const tab = window.locator('.tab-item:has-text("Untitled")').first();
    await expect(tab).toHaveClass(/modified/);

    // 수정 표시 아이콘(●)이 표시되는지 확인
    await expect(tab.locator('.modified-indicator')).toBeVisible();
  });

  test('탭 드래그 앤 드롭으로 순서 변경', async ({ window }) => {
    // 3개의 탭 생성하고 각각 다른 내용 입력
    await createNewTab(window);
    await typeInEditor(window, 'Tab 1 Content');

    await createNewTab(window);
    await typeInEditor(window, 'Tab 2 Content');

    await createNewTab(window);
    await typeInEditor(window, 'Tab 3 Content');

    // 탭 가져오기
    let tabs = await window.locator('.tab-item').all();

    // HTML5 Drag and Drop API 이벤트를 직접 발생시켜 드래그 시뮬레이션
    // 첫 번째 탭을 세 번째 위치로 이동
    await tabs[0].evaluate((sourceEl) => {
      const dataTransfer = new DataTransfer();
      const dragStartEvent = new DragEvent('dragstart', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      sourceEl.dispatchEvent(dragStartEvent);
    });

    await tabs[2].evaluate((targetEl) => {
      const dataTransfer = new DataTransfer();
      const dragOverEvent = new DragEvent('dragover', {
        bubbles: true,
        cancelable: true,
        dataTransfer: dataTransfer
      });
      targetEl.dispatchEvent(dragOverEvent);
    });

    await tabs[0].evaluate((sourceEl) => {
      const dragEndEvent = new DragEvent('dragend', {
        bubbles: true,
        cancelable: true
      });
      sourceEl.dispatchEvent(dragEndEvent);
    });

    // 약간의 대기 후 순서 확인
    await window.waitForTimeout(100);

    // 순서가 변경되었는지 확인 - 각 탭 클릭해서 내용 확인
    tabs = await window.locator('.tab-item').all();

    // 첫 번째 탭이 이제 Tab 2여야 함
    await tabs[0].click();
    let content = await getEditorContent(window);
    expect(content).toContain('Tab 2 Content');

    // 세 번째 탭이 이제 Tab 1이어야 함
    await tabs[2].click();
    content = await getEditorContent(window);
    expect(content).toContain('Tab 1 Content');
  });

  test('Monaco Editor 기능 - 구문 하이라이팅', async ({ window }) => {
    await createNewTab(window);

    // Mermaid 코드 입력
    const mermaidCode = `graph TD
    %% 주석 테스트
    A[시작] --> B{조건}
    B -->|Yes| C[처리]
    B -->|No| D[종료]

    style A fill:#f9f,stroke:#333,stroke-width:4px
    style B fill:#bbf,stroke:#333,stroke-width:2px`;

    await typeInEditor(window, mermaidCode);

    // Monaco Editor의 토큰화 확인
    const hasHighlighting = await window.evaluate(() => {
      const decorations = window.monaco?.editor?.getModels()[0]?.getLineDecorations(1);
      return decorations && decorations.length > 0;
    });

    expect(hasHighlighting).toBe(true);
  });

  test('Monaco Editor 기능 - 자동완성', async ({ window }) => {
    await createNewTab(window);

    // 에디터에 포커스
    await window.click('.monaco-editor');

    // 자동완성 트리거 (Ctrl+Space)
    await window.keyboard.press('Control+Space');

    // 자동완성 위젯이 나타나는지 확인
    await expect(window.locator('.monaco-editor .suggest-widget')).toBeVisible({ timeout: 2000 });
  });

  test.skip('실시간 다이어그램 렌더링', async ({ window }) => {
    // TODO: 미리보기 패널 레이아웃 설정 필요
    await createNewTab(window);

    // 간단한 다이어그램 입력
    await typeInEditor(window, 'graph TD\n  A[Start] --> B[End]');

    // 다이어그램 렌더링 대기
    await waitForDiagramRender(window);

    // SVG가 생성되었는지 확인
    await expect(window.locator('.diagram-container svg')).toBeVisible();

    // 노드가 렌더링되었는지 확인
    await expect(window.locator('.diagram-container text:has-text("Start")')).toBeVisible();
    await expect(window.locator('.diagram-container text:has-text("End")')).toBeVisible();
  });

  test.skip('다이어그램 오류 처리', async ({ window }) => {
    // TODO: 미리보기 패널 레이아웃 설정 필요
    await createNewTab(window);

    // 잘못된 Mermaid 구문 입력
    await typeInEditor(window, 'graph TD\n  Invalid --> Syntax >>>');

    // 오류 메시지가 표시되는지 확인 (mermaid-error 또는 error-message 클래스)
    await expect(window.locator('.mermaid-error, .error-message')).toBeVisible({ timeout: 3000 });
  });

  test('키보드 단축키 - 새 탭 (Cmd/Ctrl+T)', async ({ window }) => {
    const initialTabCount = await window.locator('.tab-item').count();

    // macOS: Meta+T, Windows/Linux: Control+T
    const isMac = process.platform === 'darwin';
    await window.keyboard.press(isMac ? 'Meta+t' : 'Control+t');
    await waitForEditor(window);

    const newTabCount = await window.locator('.tab-item').count();
    expect(newTabCount).toBe(initialTabCount + 1);
    await expect(window.locator('.tab-item:has-text("Untitled")')).toBeVisible();
  });

  test('키보드 단축키 - 탭 닫기 (Cmd/Ctrl+W)', async ({ window }) => {
    // 초기 탭 수 확인
    const initialTabCount = await window.locator('.tab-item').count();

    await createNewTab(window);
    await createNewTab(window);

    // 현재 탭 닫기 (macOS: Meta+W, Windows/Linux: Control+W)
    const isMac = process.platform === 'darwin';
    await window.keyboard.press(isMac ? 'Meta+w' : 'Control+w');

    // 탭이 닫혔는지 확인 (초기 탭 수 + 1)
    const tabCount = await window.locator('.tab-item').count();
    expect(tabCount).toBe(initialTabCount + 1);
  });

  test('키보드 단축키 - 탭 전환 (Ctrl+Tab)', async ({ window }) => {
    // 3개의 탭 생성
    await createNewTab(window);
    await typeInEditor(window, 'Tab 1 Content');

    await createNewTab(window);
    await typeInEditor(window, 'Tab 2 Content');

    await createNewTab(window);
    await typeInEditor(window, 'Tab 3 Content');

    // Ctrl+Tab으로 다음 탭으로 전환
    await window.keyboard.press('Control+Tab');
    await window.waitForTimeout(200);

    // 첫 번째 탭으로 돌아왔는지 확인
    const content = await getEditorContent(window);
    expect(content).toContain('Tab 1 Content');
  });

  test('파일 열기 후 탭 생성', async ({ window }) => {
    // 폴더 열기 (open-folder-by-path API 사용)
    await callIPC(window, 'open-folder-by-path', testWorkspace);
    await waitForFileExplorer(window);

    // 여러 파일 열기
    await selectFileInTree(window, 'test1.mmd');
    await waitForTab(window, 'test1.mmd');

    await selectFileInTree(window, 'test2.mmd');
    await waitForTab(window, 'test2.mmd');

    // 탭들이 생성되었는지 확인
    await expect(window.locator('.tab-item:has-text("test1.mmd")')).toBeVisible();
    await expect(window.locator('.tab-item:has-text("test2.mmd")')).toBeVisible();

    // 활성 탭 확인
    const activeTab = window.locator('.tab-item.active');
    await expect(activeTab).toContainText('test2.mmd');
  });

  test.skip('에디터와 미리보기 리사이저', async ({ window }) => {
    // TODO: 미리보기 패널 레이아웃 설정 필요
    await createNewTab(window);

    // 리사이저 엘리먼트 찾기
    const resizer = window.locator('.resizer.vertical').last();
    await expect(resizer).toBeVisible();

    // 초기 에디터 너비 확인
    const initialWidth = await window.locator('.editor-panel').evaluate(el => el.offsetWidth);

    // 리사이저 드래그
    const box = await resizer.boundingBox();
    await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await window.mouse.down();
    await window.mouse.move(box.x + box.width / 2 - 100, box.y + box.height / 2);
    await window.mouse.up();

    // 에디터 너비가 변경되었는지 확인
    const newWidth = await window.locator('.editor-panel').evaluate(el => el.offsetWidth);
    expect(Math.abs(newWidth - initialWidth)).toBeGreaterThan(50);
  });

  test('탭 컨텍스트 메뉴 - 모든 탭 닫기', async ({ window }) => {
    // 여러 탭 생성
    await createNewTab(window);
    await createNewTab(window);
    await createNewTab(window);

    // 탭에서 우클릭 (두 번째 탭)
    const tabs = await window.locator('.tab-item').all();
    await tabs[1].click({ button: 'right' });

    // 컨텍스트 메뉴에서 "모든 탭 닫기" 선택
    await window.click('.context-menu-item:has-text("모든 탭 닫기")');

    // 모든 탭이 닫혔는지 확인
    const tabCount = await window.locator('.tab-item').count();
    expect(tabCount).toBe(0);

    // 빈 상태 화면이 표시되는지 확인
    await expect(window.locator('.empty-state')).toBeVisible();
  });

  test('탭 컨텍스트 메뉴 - 다른 탭 닫기', async ({ window }) => {
    // confirm 다이얼로그 자동 승인
    await window.evaluate(() => { window.confirm = () => true; });

    // 여러 탭 생성하고 각각 다른 내용 입력
    await createNewTab(window);
    await typeInEditor(window, 'Tab A Content');

    await createNewTab(window);
    await typeInEditor(window, 'Tab B Content');

    await createNewTab(window);
    await typeInEditor(window, 'Tab C Content');

    // 두 번째 탭에서 우클릭
    const tabs = await window.locator('.tab-item').all();
    await tabs[1].click({ button: 'right' });

    // "다른 탭 모두 닫기" 선택
    await window.click('.context-menu-item:has-text("다른 탭 모두 닫기")');

    // 하나의 탭만 남았는지 확인
    const tabCount = await window.locator('.tab-item').count();
    expect(tabCount).toBe(1);

    // 남은 탭의 내용이 Tab B인지 확인
    const content = await getEditorContent(window);
    expect(content).toContain('Tab B Content');
  });

  test('탭 컨텍스트 메뉴 - 오른쪽 탭 닫기', async ({ window }) => {
    // confirm 다이얼로그 자동 승인
    await window.evaluate(() => { window.confirm = () => true; });

    // 4개의 탭 생성하고 각각 다른 내용 입력
    await createNewTab(window);
    await typeInEditor(window, 'Tab 1 Content');

    await createNewTab(window);
    await typeInEditor(window, 'Tab 2 Content');

    await createNewTab(window);
    await typeInEditor(window, 'Tab 3 Content');

    await createNewTab(window);
    await typeInEditor(window, 'Tab 4 Content');

    // 두 번째 탭에서 우클릭
    const tabs = await window.locator('.tab-item').all();
    await tabs[1].click({ button: 'right' });

    // "오른쪽 탭 모두 닫기" 선택
    await window.click('.context-menu-item:has-text("오른쪽 탭 모두 닫기")');

    // 2개의 탭만 남았는지 확인
    const tabCount = await window.locator('.tab-item').count();
    expect(tabCount).toBe(2);

    // 남은 탭들의 내용 확인
    const remainingTabs = await window.locator('.tab-item').all();

    await remainingTabs[0].click();
    let content = await getEditorContent(window);
    expect(content).toContain('Tab 1 Content');

    await remainingTabs[1].click();
    content = await getEditorContent(window);
    expect(content).toContain('Tab 2 Content');
  });
});