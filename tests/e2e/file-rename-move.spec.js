/**
 * 파일 이름 변경 및 이동 기능 E2E 테스트
 * - 파일 인라인 편집 (F2 키)
 * - 폴더 인라인 편집
 * - 파일 이동 (드래그 앤 드롭)
 * - 충돌 처리 (중복 이름)
 * - 열린 탭 경로 동기화
 */

const { test: base, expect } = require('@playwright/test');
const {
  launchElectron,
  forceCloseElectron,
  createTestWorkspace,
  cleanupTestWorkspace
} = require('../helpers/electron-helpers');
const path = require('path');

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

test.describe('파일 이름 변경 (Rename)', () => {
  test.beforeAll(async () => {
    testWorkspace = await createTestWorkspace();
  });

  test.afterAll(async () => {
    await cleanupTestWorkspace(testWorkspace);
  });

  test('컨텍스트 메뉴로 파일 인라인 편집 모드 진입', async ({ window }) => {
    const page = window;

    // 워크스페이스 열기
    await page.evaluate((workspacePath) => {
      return window.electronAPI.openFolderByPath(workspacePath);
    }, testWorkspace);

    // 파일 트리가 로드될 때까지 대기
    await page.waitForSelector('.tree-item.file', { timeout: 10000 });
    await page.waitForTimeout(500);

    // 파일 아이템 우클릭 (컨텍스트 메뉴 열기)
    const fileItem = page.locator('.tree-item.file').first();
    await fileItem.click({ button: 'right' });
    await page.waitForTimeout(300);

    // 컨텍스트 메뉴가 표시되어야 함
    const contextMenu = page.locator('.context-menu');
    await expect(contextMenu).toBeVisible();

    // '이름 바꾸기' 클릭
    const renameMenuItem = page.locator('.context-menu-item').filter({ hasText: '이름 바꾸기' });
    await renameMenuItem.click();
    await page.waitForTimeout(300);

    // 인라인 편집 입력 필드가 표시되어야 함
    const inlineEditInput = page.locator('.inline-edit input');
    await expect(inlineEditInput).toBeVisible();

    // 테스트 종료 전 인라인 편집 취소
    await page.keyboard.press('Escape');
    await page.waitForTimeout(200);
  });

  test('파일 이름 변경 성공', async ({ window }) => {
    const page = window;

    await page.evaluate((workspacePath) => {
      return window.electronAPI.openFolderByPath(workspacePath);
    }, testWorkspace);
    await page.waitForTimeout(1000);

    // 첫 번째 파일의 원래 이름 가져오기
    const originalName = await page.locator('.tree-item.file .name').first().textContent();
    const originalBaseName = originalName.split('.')[0]; // 확장자 제외한 이름

    // 파일 선택 후 F2
    await page.locator('.tree-item.file').first().click();
    await page.keyboard.press('F2');
    await page.waitForTimeout(300);

    // 새 이름 입력 (확장자 제외)
    const newBaseName = 'renamed-file';
    const inlineEditInput = page.locator('.inline-edit input');
    await inlineEditInput.fill(newBaseName);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 파일 트리가 업데이트되어야 함
    const updatedName = await page.locator('.tree-item.file .name').first().textContent();
    expect(updatedName).toContain(newBaseName);

    // 원래 이름으로 다시 변경 (다른 테스트에 영향 주지 않도록)
    await page.locator('.tree-item.file').first().click();
    await page.keyboard.press('F2');
    await page.waitForTimeout(300);

    const restoreInput = page.locator('.inline-edit input');
    await restoreInput.fill(originalBaseName);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 원래 이름으로 복원되었는지 확인
    const restoredName = await page.locator('.tree-item.file .name').first().textContent();
    expect(restoredName).toBe(originalName);
  });

  test('폴더 이름 변경 성공', async ({ window }) => {
    const page = window;

    await page.evaluate((workspacePath) => {
      return window.electronAPI.openFolderByPath(workspacePath);
    }, testWorkspace);
    await page.waitForTimeout(1000);

    // subfolder를 찾아서 이름 변경 (루트 폴더가 아닌 하위 폴더)
    const subfolderItem = page.locator('.tree-item.directory').filter({ hasText: 'subfolder' });
    const subfolderExists = await subfolderItem.count();

    if (subfolderExists > 0) {
      // subfolder 우클릭으로 컨텍스트 메뉴 열기
      await subfolderItem.click({ button: 'right' });
      await page.waitForTimeout(300);

      // '이름 바꾸기' 클릭
      const renameMenuItem = page.locator('.context-menu-item').filter({ hasText: '이름 바꾸기' });
      await renameMenuItem.click();
      await page.waitForTimeout(300);

      // 새 이름 입력
      const newFolderName = 'renamed-folder';
      const inlineEditInput = page.locator('.inline-edit input');
      await inlineEditInput.fill(newFolderName);
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);

      // 폴더 이름이 변경되어야 함
      const renamedFolder = page.locator('.tree-item.directory').filter({ hasText: 'renamed-folder' });
      await expect(renamedFolder).toBeVisible();

      // 원래 이름으로 다시 변경 (다른 테스트에 영향 주지 않도록)
      await renamedFolder.click({ button: 'right' });
      await page.waitForTimeout(300);

      const restoreMenuItem = page.locator('.context-menu-item').filter({ hasText: '이름 바꾸기' });
      await restoreMenuItem.click();
      await page.waitForTimeout(300);

      const restoreInput = page.locator('.inline-edit input');
      await restoreInput.fill('subfolder');
      await page.keyboard.press('Enter');
      await page.waitForTimeout(500);
    } else {
      console.log('[Test] No subfolder found to rename');
    }
  });

  test('ESC 키로 이름 변경 취소', async ({ window }) => {
    const page = window;

    await page.evaluate((workspacePath) => {
      return window.electronAPI.openFolderByPath(workspacePath);
    }, testWorkspace);
    await page.waitForTimeout(1000);

    // 원래 이름 저장
    const originalName = await page.locator('.tree-item.file .name').first().textContent();

    // 파일 선택 후 F2
    await page.locator('.tree-item.file').first().click();
    await page.keyboard.press('F2');
    await page.waitForTimeout(300);

    // 이름 변경 시도 후 ESC
    const inlineEditInput = page.locator('.inline-edit input');
    await inlineEditInput.fill('should-not-change');
    await page.keyboard.press('Escape');
    await page.waitForTimeout(300);

    // 인라인 편집이 닫혀야 함
    await expect(inlineEditInput).not.toBeVisible();

    // 이름이 변경되지 않아야 함
    const currentName = await page.locator('.tree-item.file .name').first().textContent();
    expect(currentName).toBe(originalName);
  });

  test('빈 이름으로 변경 시도 시 취소', async ({ window }) => {
    const page = window;

    await page.evaluate((workspacePath) => {
      return window.electronAPI.openFolderByPath(workspacePath);
    }, testWorkspace);
    await page.waitForTimeout(1000);

    const originalName = await page.locator('.tree-item.file .name').first().textContent();

    await page.locator('.tree-item.file').first().click();
    await page.keyboard.press('F2');
    await page.waitForTimeout(300);

    // 빈 문자열 입력
    const inlineEditInput = page.locator('.inline-edit input');
    await inlineEditInput.fill('   ');
    await page.keyboard.press('Enter');
    await page.waitForTimeout(300);

    // 이름이 변경되지 않아야 함
    const currentName = await page.locator('.tree-item.file .name').first().textContent();
    expect(currentName).toBe(originalName);
  });

  test.skip('중복 파일명 충돌 감지', async ({ window }) => {
    const page = window;

    await page.evaluate((workspacePath) => {
      return window.electronAPI.openFolderByPath(workspacePath);
    }, testWorkspace);
    await page.waitForTimeout(1000);

    // 두 번째 파일의 이름 가져오기
    const targetName = await page.locator('.tree-item.file .name').nth(1).textContent();
    const baseName = targetName.split('.')[0];

    // 첫 번째 파일을 두 번째 파일과 같은 이름으로 변경 시도
    await page.locator('.tree-item.file').first().click();
    await page.keyboard.press('F2');
    await page.waitForTimeout(300);

    const inlineEditInput = page.locator('.inline-edit input');
    await inlineEditInput.fill(baseName);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 에러 메시지 또는 충돌 다이얼로그가 표시되어야 함
    const errorMessage = page.locator('.error-message, .conflict-dialog');
    await expect(errorMessage).toBeVisible();
  });
});

test.describe('열린 탭 경로 동기화', () => {
  test.beforeAll(async () => {
    testWorkspace = await createTestWorkspace();
  });

  test.afterAll(async () => {
    await cleanupTestWorkspace(testWorkspace);
  });

  test('파일 이름 변경 시 열린 탭 경로 자동 업데이트', async ({ window }) => {
    const page = window;

    await page.evaluate((workspacePath) => {
      return window.electronAPI.openFolderByPath(workspacePath);
    }, testWorkspace);
    await page.waitForTimeout(1000);

    // 파일 열기 (탭 생성)
    const fileItem = page.locator('.tree-item.file').first();
    await fileItem.click();
    await page.waitForTimeout(500);

    // 탭이 생성되었는지 확인
    const tabCount = await page.locator('.tab-item').count();
    expect(tabCount).toBeGreaterThan(0);

    // 원래 탭 제목 저장
    const originalTabTitle = await page.locator('.tab-item .tab-title').first().textContent();

    // 파일 이름 변경
    await fileItem.click();
    await page.keyboard.press('F2');
    await page.waitForTimeout(300);

    const newBaseName = 'renamed-open-file';
    const inlineEditInput = page.locator('.inline-edit input');
    await inlineEditInput.fill(newBaseName);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 탭 제목이 업데이트되어야 함
    const updatedTabTitle = await page.locator('.tab-item .tab-title').first().textContent();
    expect(updatedTabTitle).toContain(newBaseName);
    expect(updatedTabTitle).not.toBe(originalTabTitle);

    // 원래 이름으로 복원
    const originalBaseName = originalTabTitle.split('.')[0];
    await page.locator('.tree-item.file').first().click();
    await page.keyboard.press('F2');
    await page.waitForTimeout(300);

    const restoreInput = page.locator('.inline-edit input');
    await restoreInput.fill(originalBaseName);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);
  });

  test.skip('이름 변경된 파일을 저장할 때 새 경로로 저장', async ({ window }) => {
    const page = window;

    await page.evaluate((workspacePath) => {
      return window.electronAPI.openFolderByPath(workspacePath);
    }, testWorkspace);
    await page.waitForTimeout(1000);

    // 파일 열기
    await page.locator('.tree-item.file').first().click();
    await page.waitForTimeout(500);

    // 파일 이름 변경
    await page.locator('.tree-item.file').first().click();
    await page.keyboard.press('F2');
    await page.waitForTimeout(300);

    const newBaseName = 'renamed-save-test';
    await page.locator('.inline-edit input').fill(newBaseName);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 에디터에서 내용 수정
    await page.locator('.monaco-editor').click();
    await page.keyboard.type('\n// Modified content');
    await page.waitForTimeout(500);

    // 저장 (Ctrl+S / Cmd+S)
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await page.keyboard.press('Meta+S');
    } else {
      await page.keyboard.press('Control+S');
    }
    await page.waitForTimeout(1000);

    // 저장이 성공해야 함 (수정 플래그가 사라져야 함)
    const modifiedDot = await page.locator('.tab-item.active .modified-indicator').isVisible();
    expect(modifiedDot).toBe(false);
  });
});

test.describe('E2E 시나리오', () => {
  test.beforeAll(async () => {
    testWorkspace = await createTestWorkspace();
  });

  test.afterAll(async () => {
    await cleanupTestWorkspace(testWorkspace);
  });

  test.skip('파일 편집 → 이름 변경 → 저장 전체 플로우', async ({ window }) => {
    const page = window;

    // 1. 워크스페이스 열기
    await page.evaluate((workspacePath) => {
      return window.electronAPI.openFolderByPath(workspacePath);
    }, testWorkspace);
    await page.waitForTimeout(1000);

    // 2. 파일 열기
    await page.locator('.tree-item.file').first().click();
    await page.waitForTimeout(500);

    const originalTabTitle = await page.locator('.tab-item .tab-title').first().textContent();

    // 3. 에디터에서 내용 수정
    await page.locator('.monaco-editor').click();
    await page.keyboard.type('graph TD\n  A --> B\n  B --> C');
    await page.waitForTimeout(500);

    // 4. 수정 플래그 확인
    const isModified = await page.locator('.tab-item.active .modified-indicator').isVisible();
    expect(isModified).toBe(true);

    // 5. 파일 이름 변경
    await page.locator('.tree-item.file').first().click();
    await page.keyboard.press('F2');
    await page.waitForTimeout(300);

    const newName = 'final-renamed-file';
    await page.locator('.inline-edit input').fill(newName);
    await page.keyboard.press('Enter');
    await page.waitForTimeout(500);

    // 6. 탭 제목 업데이트 확인
    const updatedTabTitle = await page.locator('.tab-item .tab-title').first().textContent();
    expect(updatedTabTitle).toContain(newName);

    // 7. 파일 저장
    const isMac = process.platform === 'darwin';
    if (isMac) {
      await page.keyboard.press('Meta+S');
    } else {
      await page.keyboard.press('Control+S');
    }
    await page.waitForTimeout(1000);

    // 8. 수정 플래그가 사라져야 함
    const isStillModified = await page.locator('.tab-item.active .modified-indicator').isVisible();
    expect(isStillModified).toBe(false);

    // 9. 파일이 새 이름으로 저장되었는지 확인 (파일 트리에서)
    const fileNameInTree = await page.locator('.tree-item.file.selected .name').textContent();
    expect(fileNameInTree).toContain(newName);
  });
});
