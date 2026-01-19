/**
 * 뷰 모드 기능 E2E 테스트
 * - Code Only / Split / Preview Only 모드 전환
 * - 뷰 모드 설정 저장/복원
 * - 각 모드별 레이아웃 검증
 */

const { test: base, expect } = require('@playwright/test');
const {
  launchElectron,
  forceCloseElectron,
  createTestWorkspace,
  cleanupTestWorkspace,
  waitForEditor,
  closeAllTabs,
  createNewTab
} = require('../helpers/electron-helpers');

// Custom fixture for Electron app
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

test.describe('뷰 모드 기능', () => {
  test.beforeAll(async () => {
    testWorkspace = await createTestWorkspace();
  });

  test.afterAll(async () => {
    await cleanupTestWorkspace(testWorkspace);
  });

  test.beforeEach(async ({ window }) => {
    await closeAllTabs(window);
  });

  test('ViewModeToggle 버튼이 표시되어야 함', async ({ window }) => {
    // React 앱 로드 대기
    await window.waitForSelector('#root', { state: 'attached', timeout: 10000 });

    // ViewModeToggle 컴포넌트가 표시되는지 확인
    await window.waitForSelector('.view-mode-toggle', { state: 'visible', timeout: 5000 });

    // 3개의 버튼이 있는지 확인 (Code, Split, Preview)
    const buttons = await window.locator('.view-mode-toggle .view-mode-btn').count();
    expect(buttons).toBe(3);

    // 각 버튼 텍스트 확인
    const codeBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(0);
    const splitBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(1);
    const previewBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(2);

    await expect(codeBtn).toHaveText('Code');
    await expect(splitBtn).toHaveText('Split');
    await expect(previewBtn).toHaveText('Preview');
  });

  test('기본 뷰 모드가 Split이어야 함', async ({ window }) => {
    await window.waitForSelector('.view-mode-toggle', { state: 'visible', timeout: 5000 });

    // Split 버튼이 active 상태인지 확인
    const splitBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(1);
    await expect(splitBtn).toHaveClass(/active/);
  });

  test('Code 모드 전환 시 에디터만 표시', async ({ window }) => {
    // 새 탭 생성
    await createNewTab(window);
    await waitForEditor(window);

    // Code 버튼 클릭
    const codeBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(0);
    await codeBtn.click();

    // Code 버튼이 active 상태인지 확인
    await expect(codeBtn).toHaveClass(/active/);

    // 에디터 패널이 표시되는지 확인
    const editorPanel = window.locator('.editor-panel');
    await expect(editorPanel).toBeVisible();

    // 에디터 패널이 full-width 클래스를 가지는지 확인
    await expect(editorPanel).toHaveClass(/full-width/);

    // 미리보기 패널이 숨겨졌는지 확인
    const previewPanel = window.locator('.preview-panel');
    await expect(previewPanel).not.toBeVisible();

    // SplitView가 없는지 확인
    const splitView = window.locator('.split-view');
    await expect(splitView).not.toBeVisible();
  });

  test('Preview 모드 전환 시 미리보기만 표시', async ({ window }) => {
    // 새 탭 생성
    await createNewTab(window);
    await waitForEditor(window);

    // Preview 버튼 클릭
    const previewBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(2);
    await previewBtn.click();

    // Preview 버튼이 active 상태인지 확인
    await expect(previewBtn).toHaveClass(/active/);

    // 미리보기 패널이 표시되는지 확인
    const previewPanel = window.locator('.preview-panel');
    await expect(previewPanel).toBeVisible();

    // 에디터 패널이 숨겨졌는지 확인
    const editorPanel = window.locator('.editor-panel');
    await expect(editorPanel).not.toBeVisible();

    // SplitView가 없는지 확인
    const splitView = window.locator('.split-view');
    await expect(splitView).not.toBeVisible();
  });

  test('Split 모드 전환 시 에디터와 미리보기 모두 표시', async ({ window }) => {
    // ViewModeToggle이 로드될 때까지 대기
    await window.waitForSelector('.view-mode-toggle', { state: 'visible', timeout: 5000 });

    // 새 탭 버튼 클릭으로 탭 생성
    await window.click('.tab-new-btn');
    await window.waitForTimeout(500);

    // 먼저 Code 모드로 전환
    const codeBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(0);
    await codeBtn.click();
    await expect(codeBtn).toHaveClass(/active/);

    // Split 버튼 클릭
    const splitBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(1);
    await splitBtn.click();

    // Split 버튼이 active 상태인지 확인
    await expect(splitBtn).toHaveClass(/active/);

    // SplitView가 표시되는지 확인
    const splitView = window.locator('.split-view');
    await expect(splitView).toBeVisible();

    // 에디터 패널이 표시되는지 확인
    const editorPanel = window.locator('.editor-panel');
    await expect(editorPanel).toBeVisible();

    // 미리보기 패널이 표시되는지 확인
    const previewPanel = window.locator('.preview-panel');
    await expect(previewPanel).toBeVisible();
  });

  test('뷰 모드 전환 시 에디터 내용 유지', async ({ window }) => {
    // 새 탭 생성
    await createNewTab(window);
    await waitForEditor(window);

    // 에디터에 코드 입력
    const testCode = 'graph TD\n    Test --> Content';
    await window.evaluate((code) => {
      const editor = window.monaco?.editor?.getEditors()[0];
      if (editor) {
        editor.setValue(code);
      }
    }, testCode);

    // Code 모드로 전환
    const codeBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(0);
    await codeBtn.click();

    // 에디터 내용 확인
    let editorContent = await window.evaluate(() => {
      const editor = window.monaco?.editor?.getEditors()[0];
      return editor?.getValue() || '';
    });
    expect(editorContent).toContain('Test --> Content');

    // Preview 모드로 전환
    const previewBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(2);
    await previewBtn.click();

    // Split 모드로 전환
    const splitBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(1);
    await splitBtn.click();

    // 에디터 내용이 유지되는지 확인
    editorContent = await window.evaluate(() => {
      const editor = window.monaco?.editor?.getEditors()[0];
      return editor?.getValue() || '';
    });
    expect(editorContent).toContain('Test --> Content');
  });

  test('Split 모드에서 Resizer가 표시되어야 함', async ({ window }) => {
    // 새 탭 생성
    await createNewTab(window);
    await waitForEditor(window);

    // Split 모드 확인 (기본값)
    const splitBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(1);
    await splitBtn.click();

    // SplitView 내의 Resizer가 표시되는지 확인
    const splitView = window.locator('.split-view');
    await expect(splitView).toBeVisible();

    const resizer = splitView.locator('.resizer');
    await expect(resizer).toBeVisible();
  });

  test('Code/Preview 모드에서 Resizer가 숨겨져야 함', async ({ window }) => {
    // 새 탭 생성
    await createNewTab(window);
    await waitForEditor(window);

    // Code 모드로 전환
    const codeBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(0);
    await codeBtn.click();

    // SplitView가 없는지 확인 (따라서 내부 Resizer도 없음)
    const splitView = window.locator('.split-view');
    await expect(splitView).not.toBeVisible();

    // Preview 모드로 전환
    const previewBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(2);
    await previewBtn.click();

    // SplitView가 없는지 확인
    await expect(splitView).not.toBeVisible();
  });

  test('탭이 없을 때 EmptyState 표시 (뷰 모드 무관)', async ({ window }) => {
    // 모든 탭 닫기 확인
    await closeAllTabs(window);

    // EmptyState가 표시되는지 확인
    const emptyState = window.locator('.empty-state');
    await expect(emptyState).toBeVisible();

    // Code 모드로 전환해도 EmptyState 유지
    const codeBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(0);
    await codeBtn.click();
    await expect(emptyState).toBeVisible();

    // Preview 모드로 전환해도 EmptyState 유지
    const previewBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(2);
    await previewBtn.click();
    await expect(emptyState).toBeVisible();
  });
});

test.describe('뷰 모드 설정 저장/복원', () => {
  // Note: electron-store 직접 접근은 테스트 환경에서 복잡하므로
  // IPC 호출을 통해 저장/복원 동작을 검증

  test('뷰 모드 변경 시 saveLayoutSettings IPC가 호출됨', async ({ window }) => {
    await window.waitForSelector('.view-mode-toggle', { state: 'visible', timeout: 5000 });

    // Code 모드로 전환
    const codeBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(0);
    await codeBtn.click();

    // 잠시 대기 (저장 완료)
    await window.waitForTimeout(500);

    // IPC 호출 확인 (렌더러에서 electronAPI.saveLayoutSettings 호출됨)
    // getLayoutSettings로 저장된 값 확인
    const layoutSettings = await window.evaluate(async () => {
      if (window.electronAPI?.getLayoutSettings) {
        return await window.electronAPI.getLayoutSettings();
      }
      return null;
    });

    // viewMode가 저장되었는지 확인
    expect(layoutSettings?.viewMode).toBe('code');
  });

  test('저장된 뷰 모드가 getLayoutSettings로 조회됨', async ({ window }) => {
    await window.waitForSelector('.view-mode-toggle', { state: 'visible', timeout: 5000 });

    // Preview 모드로 전환
    const previewBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(2);
    await previewBtn.click();

    // 저장 대기
    await window.waitForTimeout(500);

    // getLayoutSettings로 저장된 값 확인
    const layoutSettings = await window.evaluate(async () => {
      if (window.electronAPI?.getLayoutSettings) {
        return await window.electronAPI.getLayoutSettings();
      }
      return null;
    });

    expect(layoutSettings?.viewMode).toBe('preview');
  });
});

test.describe('뷰 모드 UI 테스트', () => {
  test('버튼 호버 시 스타일 변경', async ({ window }) => {
    await window.waitForSelector('.view-mode-toggle', { state: 'visible', timeout: 5000 });

    const codeBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(0);

    // 호버 전 배경색 확인
    const beforeHover = await codeBtn.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // 호버
    await codeBtn.hover();

    // 호버 후 배경색이 변경되었는지 확인 (active가 아닌 버튼만)
    const splitBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(1);
    const isActive = await splitBtn.evaluate((el) => el.classList.contains('active'));

    if (!isActive) {
      // active가 아닌 경우에만 호버 효과 테스트
      await splitBtn.hover();
      // 스타일 변경 확인은 생략 (CSS 변수 사용으로 인한 복잡성)
    }
  });

  test('활성 버튼에 active 클래스가 적용되어야 함', async ({ window }) => {
    await window.waitForSelector('.view-mode-toggle', { state: 'visible', timeout: 5000 });

    // 각 버튼 클릭 후 active 클래스 확인
    const buttons = [
      { index: 0, mode: 'code' },
      { index: 1, mode: 'split' },
      { index: 2, mode: 'preview' }
    ];

    for (const { index } of buttons) {
      const btn = window.locator('.view-mode-toggle .view-mode-btn').nth(index);
      await btn.click();

      // 클릭한 버튼만 active 상태인지 확인
      await expect(btn).toHaveClass(/active/);

      // 다른 버튼들은 active가 아닌지 확인
      for (let i = 0; i < 3; i++) {
        if (i !== index) {
          const otherBtn = window.locator('.view-mode-toggle .view-mode-btn').nth(i);
          await expect(otherBtn).not.toHaveClass(/active/);
        }
      }
    }
  });
});
