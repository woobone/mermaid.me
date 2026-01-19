/**
 * Electron 테스트 헬퍼 함수들
 * Playwright를 사용한 Electron 앱 테스트 유틸리티
 */

const { _electron: electron } = require('playwright');
const path = require('path');
const fs = require('fs').promises;

/**
 * Electron 앱 강제 종료
 * graceful close가 실패할 경우 프로세스를 직접 kill
 */
async function forceCloseElectron(electronApp) {
  try {
    // 먼저 graceful close 시도 (3초 타임아웃)
    const closePromise = electronApp.close();
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Close timeout')), 3000)
    );

    await Promise.race([closePromise, timeoutPromise]);
  } catch (error) {
    // graceful close 실패 시 프로세스 강제 종료
    console.log('[Test] Graceful close failed, force killing process...');
    try {
      const process = electronApp.process();
      if (process) {
        process.kill('SIGKILL');
      }
    } catch (killError) {
      console.warn('[Test] Force kill failed:', killError.message);
    }
  }
}

/**
 * Vite 서버가 준비될 때까지 대기
 */
async function waitForViteServer() {
  const maxRetries = 30; // 30초
  const retryDelay = 1000; // 1초

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch('http://localhost:5173/');
      if (response.ok) {
        console.log('[Test] Vite server is ready');
        return true;
      }
    } catch (error) {
      // 서버가 아직 준비되지 않음
    }
    await new Promise(resolve => setTimeout(resolve, retryDelay));
  }

  throw new Error('Vite server did not start within 30 seconds');
}

/**
 * Electron 애플리케이션 실행 및 초기화
 */
async function launchElectron() {
  // 절대 경로 계산
  const mainPath = path.join(__dirname, '../../src/main/main.js');
  const preloadPath = path.join(__dirname, '../../src/preload/preload.js');

  console.log('[Test] Launching Electron with:');
  console.log('[Test] Main:', mainPath);
  console.log('[Test] Preload:', preloadPath);

  // Vite 서버가 완전히 준비될 때까지 대기
  console.log('[Test] Waiting for Vite server...');
  await waitForViteServer();

  // Electron 앱 실행 (executablePath 자동 감지)
  const electronApp = await electron.launch({
    args: [mainPath],
    env: {
      ...process.env,
      NODE_ENV: 'test',
      // preload 경로를 환경 변수로 전달 (앱 소스 수정 없이 우회)
      ELECTRON_PRELOAD_PATH: preloadPath
    },
    timeout: 30000
  });

  // 모든 윈도우가 열릴 때까지 대기
  // 개발 모드에서는 DevTools도 함께 열림
  await new Promise(resolve => setTimeout(resolve, 1000));

  // 모든 윈도우 가져오기
  const windows = electronApp.windows();
  console.log(`[Test] Found ${windows.length} windows`);

  // DevTools가 아닌 실제 메인 윈도우 찾기
  let mainWindow = null;
  for (const win of windows) {
    const url = await win.evaluate(() => window.location.href);
    console.log('[Test] Window URL:', url);

    // DevTools가 아닌 윈도우 선택
    if (!url.startsWith('devtools://')) {
      mainWindow = win;
      console.log('[Test] Selected main window:', url);
      break;
    }
  }

  if (!mainWindow) {
    // DevTools만 있거나 윈도우가 없는 경우, 다시 시도
    console.warn('[Test] Main window not found, waiting and retrying...');
    await new Promise(resolve => setTimeout(resolve, 2000));

    const allWindows = electronApp.windows();
    for (const win of allWindows) {
      const url = await win.evaluate(() => window.location.href);
      if (!url.startsWith('devtools://')) {
        mainWindow = win;
        break;
      }
    }
  }

  if (!mainWindow) {
    throw new Error('Could not find main window (only DevTools found)');
  }

  const window = mainWindow;

  // 간단하게 로드 대기만 수행
  await window.waitForLoadState('domcontentloaded', { timeout: 15000 });
  console.log('[Test] Page loaded');

  return { app: electronApp, window };
}

/**
 * 테스트용 임시 폴더 생성
 */
async function createTestWorkspace() {
  const testDir = path.join(__dirname, '../../test-workspace-' + Date.now());
  await fs.mkdir(testDir, { recursive: true });

  // 테스트 파일들 생성
  const files = [
    { name: 'test1.mmd', content: 'graph TD\n  A[Test1] --> B[End]' },
    { name: 'test2.mmd', content: 'flowchart LR\n  Start --> Stop' },
    { name: 'test.md', content: '# Test Markdown\n\n```mermaid\ngraph TD\n  A --> B\n```' }
  ];

  for (const file of files) {
    await fs.writeFile(path.join(testDir, file.name), file.content);
  }

  // 하위 폴더 생성
  const subDir = path.join(testDir, 'subfolder');
  await fs.mkdir(subDir);
  await fs.writeFile(
    path.join(subDir, 'nested.mmd'),
    'graph TD\n  Nested --> File'
  );

  return testDir;
}

/**
 * 테스트 워크스페이스 정리
 */
async function cleanupTestWorkspace(testDir) {
  try {
    await fs.rm(testDir, { recursive: true, force: true });
  } catch (error) {
    console.warn('Failed to cleanup test workspace:', error);
  }
}

/**
 * 파일 탐색기가 로드될 때까지 대기
 */
async function waitForFileExplorer(page) {
  await page.waitForSelector('.file-explorer', {
    state: 'visible',
    timeout: 5000
  });
}

/**
 * 에디터가 준비될 때까지 대기
 */
async function waitForEditor(page) {
  // React 루트가 마운트될 때까지 대기
  await page.waitForSelector('#root', {
    state: 'attached',
    timeout: 10000
  });

  // Monaco Editor가 보일 때까지 대기
  await page.waitForSelector('.monaco-editor', {
    state: 'visible',
    timeout: 10000
  });
}

/**
 * 탭이 열릴 때까지 대기
 */
async function waitForTab(page, tabName) {
  await page.waitForSelector(`.tab-item:has-text("${tabName}")`, {
    state: 'visible',
    timeout: 5000
  });
}

/**
 * 다이어그램이 렌더링될 때까지 대기
 */
async function waitForDiagramRender(page) {
  await page.waitForSelector('.diagram-container svg', {
    state: 'visible',
    timeout: 5000
  });
}

/**
 * 메뉴 명령 실행
 */
async function executeMenuCommand(app, command) {
  await app.evaluate(async ({ command }) => {
    const { Menu } = require('electron');
    const menu = Menu.getApplicationMenu();

    // 메뉴 아이템 찾기 및 실행
    const findAndClick = (menu, label) => {
      for (let i = 0; i < menu.items.length; i++) {
        const item = menu.items[i];
        if (item.label === label) {
          if (item.click) item.click();
          return true;
        }
        if (item.submenu && findAndClick(item.submenu, label)) {
          return true;
        }
      }
      return false;
    };

    return findAndClick(menu, command);
  }, { command });
}

/**
 * electronAPI 메서드 직접 호출
 *
 * electronAPI의 메서드를 직접 호출합니다.
 * 예: callAPI(page, 'openFolder') -> window.electronAPI.openFolder()
 */
async function callAPI(page, method, ...args) {
  const hasAPI = await page.evaluate(() => {
    return typeof window.electronAPI !== 'undefined';
  });

  if (!hasAPI) {
    throw new Error('electronAPI not available - preload script not loaded');
  }

  try {
    return await page.evaluate(async ({ method, args }) => {
      if (typeof window.electronAPI[method] !== 'function') {
        throw new Error(`electronAPI.${method} is not a function`);
      }
      return await window.electronAPI[method](...args);
    }, { method, args });
  } catch (error) {
    console.error(`[Test] API call failed: ${method}`, error);
    throw error;
  }
}

/**
 * IPC 호출 시뮬레이션 (하위 호환성 유지)
 *
 * channel 이름을 electronAPI 메서드 이름으로 변환하여 호출
 * 예: 'open-folder' -> 'openFolder'
 *
 * 참고: 일부 메서드는 인자를 받지 않으므로 실제 사용 시 주의 필요
 */
async function callIPC(page, channel, ...args) {
  // channel 이름을 camelCase로 변환
  // 예: 'open-folder' -> 'openFolder', 'get-recent-files' -> 'getRecentFiles'
  const method = channel.replace(/-([a-z])/g, (g) => g[1].toUpperCase());

  return callAPI(page, method, ...args);
}

/**
 * 파일 트리에서 파일 선택
 * FileExplorer 컴포넌트의 실제 클래스: .tree-item.file
 */
async function selectFileInTree(page, fileName) {
  const fileItem = await page.locator(`.tree-item.file:has-text("${fileName}")`);
  await fileItem.click();
  await waitForEditor(page);
}

/**
 * 새 탭 생성
 */
async function createNewTab(page) {
  await page.click('.tab-new-btn');
  await waitForEditor(page);
}

/**
 * 탭 전환
 */
async function switchToTab(page, tabName) {
  await page.click(`.tab-item:has-text("${tabName}")`);
  await waitForEditor(page);
}

/**
 * 에디터에 텍스트 입력
 */
async function typeInEditor(page, text) {
  // Monaco Editor에 텍스트 입력
  await page.evaluate((text) => {
    const editor = window.monaco?.editor?.getModels()[0];
    if (editor) {
      editor.setValue(text);
    }
  }, text);
}

/**
 * 현재 에디터 내용 가져오기
 */
async function getEditorContent(page) {
  return await page.evaluate(() => {
    const editor = window.monaco?.editor?.getModels()[0];
    return editor ? editor.getValue() : '';
  });
}

/**
 * 파일 저장 시뮬레이션
 */
async function saveFile(page) {
  await page.keyboard.press('Control+S');
  // 또는 메뉴 사용
  // await page.click('[role="menuitem"]:has-text("Save")');
}

/**
 * 대화상자 처리 헬퍼
 */
async function handleDialog(page, action = 'accept', inputText = '') {
  page.once('dialog', async dialog => {
    if (action === 'accept') {
      await dialog.accept(inputText);
    } else {
      await dialog.dismiss();
    }
  });
}

/**
 * 모든 탭 닫기 (초기화용)
 * 저장되지 않은 변경사항 확인 다이얼로그 자동 처리
 */
async function closeAllTabs(window) {
  // confirm 다이얼로그 자동 승인 (저장하지 않고 닫기)
  await window.evaluate(() => {
    window.confirm = () => true;
  });

  let tabCount = await window.locator('.tab-item').count();

  if (tabCount === 0) {
    return;
  }

  // 최대 시도 횟수 설정 (무한 루프 방지)
  const maxAttempts = tabCount + 5;
  let attempts = 0;

  // 모든 탭 닫기: 각 탭의 닫기 버튼 클릭
  while (attempts < maxAttempts) {
    const tabs = await window.locator('.tab-item').all();
    if (tabs.length === 0) {
      break;
    }

    try {
      await tabs[0].hover();
      await tabs[0].locator('.tab-close').click();
      // 탭이 닫힐 때까지 잠시 대기
      await window.waitForTimeout(150);
    } catch (error) {
      // 에러 발생시 다음 시도
    }
    attempts++;
  }

  // 빈 상태 확인
  const remainingTabs = await window.locator('.tab-item').count();
  if (remainingTabs > 0) {
    console.warn(`[Test] Warning: ${remainingTabs} tabs still remain after closeAllTabs`);
  }
}

module.exports = {
  launchElectron,
  forceCloseElectron,
  createTestWorkspace,
  cleanupTestWorkspace,
  waitForFileExplorer,
  waitForEditor,
  waitForTab,
  waitForDiagramRender,
  executeMenuCommand,
  callAPI,
  callIPC,
  selectFileInTree,
  createNewTab,
  switchToTab,
  typeInEditor,
  getEditorContent,
  saveFile,
  handleDialog,
  closeAllTabs
};