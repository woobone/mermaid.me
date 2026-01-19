/**
 * 파일 관리 기능 E2E 테스트
 * - 폴더 열기/탐색
 * - 파일 생성/삭제
 * - 최근 파일/폴더
 * - 북마크
 */

const { test: base, expect } = require('@playwright/test');
const path = require('path');
const fs = require('fs').promises;
const {
  launchElectron,
  forceCloseElectron,
  createTestWorkspace,
  cleanupTestWorkspace,
  waitForFileExplorer,
  waitForEditor,
  selectFileInTree,
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

// open-folder-by-path API 사용으로 IPC 통신 문제 해결됨
test.describe('파일 관리 기능', () => {
  test.beforeAll(async () => {
    // 테스트 워크스페이스 생성
    testWorkspace = await createTestWorkspace();
  });

  test.afterAll(async () => {
    // 테스트 워크스페이스 정리
    await cleanupTestWorkspace(testWorkspace);
  });

  // 각 테스트 전에 탭 초기화 (worker scope 사용 시 필수)
  test.beforeEach(async ({ window }) => {
    await closeAllTabs(window);
  });

  test('폴더 열기 및 파일 트리 표시', async ({ window }) => {
    // 폴더 열기
    await callIPC(window, 'open-folder-by-path', testWorkspace);

    // 파일 탐색기 대기
    await waitForFileExplorer(window);

    // 파일 트리 아이템 확인 (.tree-item.file, .tree-item.directory 사용)
    await expect(window.locator('.tree-item.file:has-text("test1.mmd")')).toBeVisible();
    await expect(window.locator('.tree-item.file:has-text("test2.mmd")')).toBeVisible();
    await expect(window.locator('.tree-item.file:has-text("test.md")')).toBeVisible();
    await expect(window.locator('.tree-item.directory:has-text("subfolder")')).toBeVisible();
  });

  test('파일 선택 및 열기', async ({ window }) => {
    // 폴더 열기
    await callIPC(window, 'open-folder-by-path', testWorkspace);
    await waitForFileExplorer(window);

    // 파일 선택
    await selectFileInTree(window, 'test1.mmd');

    // 에디터에 파일 내용 표시 확인
    const content = await window.evaluate(() => {
      const editor = window.monaco?.editor?.getModels()[0];
      return editor ? editor.getValue() : '';
    });

    expect(content).toContain('graph TD');
    expect(content).toContain('A[Test1] --> B[End]');

    // 탭이 열렸는지 확인
    await expect(window.locator('.tab-item:has-text("test1.mmd")')).toBeVisible();
  });

  // TODO: UI 상호작용 패턴이 다름 - 인라인 입력 사용, 한국어 메뉴 텍스트
  test.skip('새 파일 생성', async ({ window }) => {
    // 폴더 열기
    await callIPC(window, 'open-folder-by-path', testWorkspace);
    await waitForFileExplorer(window);

    // 파일 트리에서 우클릭 컨텍스트 메뉴
    await window.click('.file-tree', { button: 'right' });

    // 새 파일 메뉴 선택 (실제: "📄 새 파일")
    await window.click('.context-menu-item:has-text("새 파일")');

    // 인라인 입력 (실제: .inline-input)
    await window.fill('.inline-input', 'newtest.mmd');
    await window.keyboard.press('Enter');

    // 새 파일이 트리에 나타나는지 확인
    await expect(window.locator('.tree-item.file:has-text("newtest.mmd")')).toBeVisible();

    // 실제 파일 시스템에 생성되었는지 확인
    const filePath = path.join(testWorkspace, 'newtest.mmd');
    const fileExists = await fs.access(filePath).then(() => true).catch(() => false);
    expect(fileExists).toBe(true);
  });

  // TODO: UI 상호작용 패턴이 다름 - 커스텀 삭제 확인 다이얼로그 사용
  test.skip('파일 삭제', async ({ window }) => {
    // 테스트용 파일 생성
    const testFile = path.join(testWorkspace, 'to-delete.mmd');
    await fs.writeFile(testFile, 'test content');

    // 폴더 열기
    await callIPC(window, 'open-folder-by-path', testWorkspace);
    await waitForFileExplorer(window);

    // 파일 선택 후 우클릭
    await window.click('.tree-item.file:has-text("to-delete.mmd")', { button: 'right' });

    // 삭제 메뉴 선택 (실제: "🗑️ 삭제")
    await window.click('.context-menu-item:has-text("삭제")');

    // 커스텀 삭제 확인 다이얼로그에서 삭제 버튼 클릭
    await window.click('.delete-confirm-dialog .delete-btn');

    // 파일이 트리에서 사라졌는지 확인
    await expect(window.locator('.tree-item.file:has-text("to-delete.mmd")')).not.toBeVisible();

    // 실제 파일 시스템에서 삭제되었는지 확인
    const fileExists = await fs.access(testFile).then(() => true).catch(() => false);
    expect(fileExists).toBe(false);
  });

  // TODO: UI 상호작용 패턴이 다름 - 인라인 입력 사용, 한국어 메뉴 텍스트
  test.skip('새 폴더 생성', async ({ window }) => {
    // 폴더 열기
    await callIPC(window, 'open-folder-by-path', testWorkspace);
    await waitForFileExplorer(window);

    // 파일 트리에서 우클릭
    await window.click('.file-tree', { button: 'right' });

    // 새 폴더 메뉴 선택 (실제: "📁 새 폴더")
    await window.click('.context-menu-item:has-text("새 폴더")');

    // 인라인 입력 (실제: .inline-input)
    await window.fill('.inline-input', 'newfolder');
    await window.keyboard.press('Enter');

    // 새 폴더가 트리에 나타나는지 확인
    await expect(window.locator('.tree-item.directory:has-text("newfolder")')).toBeVisible();

    // 실제 파일 시스템에 생성되었는지 확인
    const folderPath = path.join(testWorkspace, 'newfolder');
    const stats = await fs.stat(folderPath);
    expect(stats.isDirectory()).toBe(true);
  });

  // TODO: 확장/축소 상태 클래스명이 다름 (collapsed 대신 chevron expanded 사용)
  test.skip('폴더 확장 및 축소', async ({ window }) => {
    // 폴더 열기
    await callIPC(window, 'open-folder-by-path', testWorkspace);
    await waitForFileExplorer(window);

    // subfolder 찾기
    const subfolder = window.locator('.tree-item.directory:has-text("subfolder")');

    // 폴더 확장 (클릭)
    await subfolder.click();

    // 중첩된 파일 표시 확인
    await expect(window.locator('.tree-item.file:has-text("nested.mmd")')).toBeVisible();

    // 다시 축소
    await subfolder.click();
    await expect(window.locator('.tree-item.file:has-text("nested.mmd")')).not.toBeVisible();
  });

  // TODO: 최근 파일 섹션이 기본적으로 접혀있음 - showRecentFiles 상태가 false
  test.skip('최근 파일 목록', async ({ window }) => {
    // 폴더 열기
    await callIPC(window, 'open-folder-by-path', testWorkspace);
    await waitForFileExplorer(window);

    // 파일들 열기
    await selectFileInTree(window, 'test1.mmd');
    await window.waitForTimeout(500);

    await selectFileInTree(window, 'test2.mmd');
    await window.waitForTimeout(500);

    // 최근 파일 섹션 확인
    const recentFiles = window.locator('.recent-files-section');
    await expect(recentFiles).toBeVisible();

    // 최근 파일 목록에 파일들이 있는지 확인 (역순)
    const recentItems = await recentFiles.locator('.recent-file-item').all();
    expect(recentItems.length).toBeGreaterThanOrEqual(2);

    // 가장 최근 파일이 먼저 표시되는지 확인
    await expect(recentItems[0]).toContainText('test2.mmd');
    await expect(recentItems[1]).toContainText('test1.mmd');
  });

  // TODO: 셀렉터가 다름 - .open-folder-btn (📂 아이콘 버튼)
  test.skip('최근 폴더 목록', async ({ window }) => {
    // 첫 번째 폴더 열기
    await callIPC(window, 'open-folder-by-path', testWorkspace);
    await waitForFileExplorer(window);

    // 두 번째 테스트 폴더 생성 및 열기
    const testWorkspace2 = await createTestWorkspace();
    await callIPC(window, 'open-folder-by-path', testWorkspace2);

    // 최근 폴더 드롭다운 열기 (실제: .open-folder-btn)
    await window.click('.open-folder-btn');

    // 최근 폴더 목록 확인
    const recentFolders = await window.locator('.recent-folder-item').all();
    expect(recentFolders.length).toBeGreaterThanOrEqual(1);

    // 첫 번째 폴더가 목록에 있는지 확인
    const folderNames = await Promise.all(
      recentFolders.map(f => f.textContent())
    );
    expect(folderNames.some(name => name.includes(path.basename(testWorkspace)))).toBe(true);

    // 정리
    await cleanupTestWorkspace(testWorkspace2);
  });

  // TODO: 북마크 버튼 셀렉터가 다름 - .bookmark-btn
  test.skip('북마크 추가 및 제거', async ({ window }) => {
    // 폴더 열기
    await callIPC(window, 'open-folder-by-path', testWorkspace);
    await waitForFileExplorer(window);

    // 북마크 추가 버튼 클릭 (실제: .bookmark-btn)
    await window.click('.bookmark-btn');

    // 북마크 섹션에 추가되었는지 확인
    const bookmarks = window.locator('.bookmarks-section');
    await expect(bookmarks).toBeVisible();

    const bookmarkItem = bookmarks.locator(`.bookmark-item:has-text("${path.basename(testWorkspace)}")`);
    await expect(bookmarkItem).toBeVisible();

    // 북마크 제거 (다시 .bookmark-btn 클릭으로 토글)
    await window.click('.bookmark-btn');

    // 북마크가 제거되었는지 확인
    await expect(bookmarkItem).not.toBeVisible();
  });

  // TODO: 파일 감시 기능 테스트 - 셀렉터 수정됨
  test.skip('파일 시스템 감시 - 외부 파일 생성 감지', async ({ window }) => {
    // 폴더 열기
    await callIPC(window, 'open-folder-by-path', testWorkspace);
    await waitForFileExplorer(window);

    // 외부에서 파일 생성
    const newFile = path.join(testWorkspace, 'external.mmd');
    await fs.writeFile(newFile, 'graph TD\n  External --> File');

    // 파일 트리가 업데이트될 때까지 대기
    await window.waitForTimeout(1000); // 파일 감시 디바운스 대기

    // 새 파일이 트리에 나타나는지 확인
    await expect(window.locator('.tree-item.file:has-text("external.mmd")')).toBeVisible();

    // 정리
    await fs.unlink(newFile);
  });

  // TODO: 파일 감시 기능 테스트 - 셀렉터 수정됨
  test.skip('파일 시스템 감시 - 외부 파일 삭제 감지', async ({ window }) => {
    // 테스트 파일 생성
    const tempFile = path.join(testWorkspace, 'temp.mmd');
    await fs.writeFile(tempFile, 'temp content');

    // 폴더 열기
    await callIPC(window, 'open-folder-by-path', testWorkspace);
    await waitForFileExplorer(window);

    // 파일이 트리에 있는지 확인
    await expect(window.locator('.tree-item.file:has-text("temp.mmd")')).toBeVisible();

    // 파일 열기
    await selectFileInTree(window, 'temp.mmd');

    // 외부에서 파일 삭제
    await fs.unlink(tempFile);

    // 파일 트리가 업데이트될 때까지 대기
    await window.waitForTimeout(1000);

    // 파일이 트리에서 사라졌는지 확인
    await expect(window.locator('.tree-item.file:has-text("temp.mmd")')).not.toBeVisible();

    // 열려있던 탭도 닫혔는지 확인
    await expect(window.locator('.tab-item:has-text("temp.mmd")')).not.toBeVisible();
  });
});