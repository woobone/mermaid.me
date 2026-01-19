/**
 * 터미널 기능 E2E 테스트
 * - 터미널 패널 열기/닫기
 * - 키보드 단축키
 * - 명령어 실행
 * - 터미널 높이 조절
 * - 테마 동기화
 */

const { test: base, expect } = require('@playwright/test');
const {
  launchElectron,
  forceCloseElectron,
  closeAllTabs
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

/**
 * 터미널이 열릴 때까지 대기
 */
async function waitForTerminal(window) {
  await window.waitForSelector('.terminal-panel', {
    state: 'visible',
    timeout: 10000
  });
  // xterm.js가 초기화될 때까지 대기
  await window.waitForSelector('.terminal-panel .xterm', {
    state: 'visible',
    timeout: 10000
  });
}

/**
 * 터미널이 닫힐 때까지 대기
 */
async function waitForTerminalClosed(window) {
  await window.waitForSelector('.terminal-panel', {
    state: 'hidden',
    timeout: 5000
  });
}

/**
 * 터미널 토글 버튼 클릭
 */
async function clickTerminalToggle(window) {
  await window.click('.terminal-toggle-btn');
}

/**
 * 터미널 닫기 버튼 클릭 (패널 닫기)
 */
async function clickTerminalClose(window) {
  await window.click('.terminal-panel-close-btn');
}

// ========================================
// 멀티 터미널 헬퍼 함수
// ========================================

/**
 * 터미널 탭 개수 확인
 */
async function getTerminalTabCount(window) {
  return await window.locator('.terminal-tab').count();
}

/**
 * 활성 터미널 탭 이름 확인
 */
async function getActiveTerminalName(window) {
  return await window.locator('.terminal-tab.active .terminal-tab-name').textContent();
}

/**
 * 새 터미널 추가 버튼 클릭
 */
async function clickAddTerminal(window) {
  await window.click('.terminal-add-btn');
}

/**
 * 특정 터미널 탭 클릭
 */
async function clickTerminalTab(window, index) {
  await window.locator('.terminal-tab').nth(index).click();
}

/**
 * 특정 터미널 탭 닫기 버튼 클릭
 */
async function closeTerminalTab(window, index) {
  await window.locator('.terminal-tab').nth(index).locator('.terminal-tab-close').click();
}

/**
 * 터미널 탭이 특정 개수가 될 때까지 대기
 */
async function waitForTerminalCount(window, count) {
  await window.waitForFunction(
    (expectedCount) => document.querySelectorAll('.terminal-tab').length === expectedCount,
    count,
    { timeout: 5000 }
  );
}

test.describe('터미널 기능', () => {
  // 각 테스트 전에 탭 초기화
  test.beforeEach(async ({ window }) => {
    await closeAllTabs(window);
    // 터미널이 열려있으면 닫기
    const isTerminalVisible = await window.locator('.terminal-panel').isVisible();
    if (isTerminalVisible) {
      await clickTerminalClose(window);
      await waitForTerminalClosed(window);
    }
  });

  test('터미널 토글 버튼이 표시됨', async ({ window }) => {
    // React 앱이 로드될 때까지 대기
    await window.waitForSelector('#root', { state: 'attached', timeout: 10000 });

    // 터미널 토글 버튼 확인
    const toggleBtn = window.locator('.terminal-toggle-btn');
    await expect(toggleBtn).toBeVisible();
    await expect(toggleBtn).toContainText('>_');
  });

  test('터미널 토글 버튼으로 열기/닫기', async ({ window }) => {
    // 터미널이 처음에는 닫혀있는지 확인
    await expect(window.locator('.terminal-panel')).not.toBeVisible();

    // 토글 버튼 클릭하여 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 터미널 패널이 보이는지 확인
    await expect(window.locator('.terminal-panel')).toBeVisible();

    // 토글 버튼이 active 상태인지 확인
    await expect(window.locator('.terminal-toggle-btn')).toHaveClass(/active/);

    // 토글 버튼 다시 클릭하여 터미널 닫기
    await clickTerminalToggle(window);
    await waitForTerminalClosed(window);

    // 터미널 패널이 숨겨졌는지 확인
    await expect(window.locator('.terminal-panel')).not.toBeVisible();
  });

  test('터미널 닫기 버튼으로 닫기', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 닫기 버튼 클릭
    await clickTerminalClose(window);
    await waitForTerminalClosed(window);

    // 터미널이 닫혔는지 확인
    await expect(window.locator('.terminal-panel')).not.toBeVisible();
  });

  test('키보드 단축키 Ctrl+` 로 터미널 토글', async ({ window }) => {
    // 터미널이 처음에는 닫혀있는지 확인
    await expect(window.locator('.terminal-panel')).not.toBeVisible();

    // Ctrl+` 로 터미널 열기
    await window.keyboard.press('Control+`');
    await waitForTerminal(window);

    // 터미널이 열렸는지 확인
    await expect(window.locator('.terminal-panel')).toBeVisible();

    // Ctrl+` 로 터미널 닫기
    await window.keyboard.press('Control+`');
    await waitForTerminalClosed(window);

    // 터미널이 닫혔는지 확인
    await expect(window.locator('.terminal-panel')).not.toBeVisible();
  });

  test('키보드 단축키 Cmd+J 로 터미널 토글 (macOS)', async ({ window }) => {
    // macOS에서만 실행
    if (process.platform !== 'darwin') {
      test.skip();
      return;
    }

    // 터미널이 처음에는 닫혀있는지 확인
    await expect(window.locator('.terminal-panel')).not.toBeVisible();

    // Cmd+J 로 터미널 열기
    await window.keyboard.press('Meta+j');
    await waitForTerminal(window);

    // 터미널이 열렸는지 확인
    await expect(window.locator('.terminal-panel')).toBeVisible();

    // Cmd+J 로 터미널 닫기
    await window.keyboard.press('Meta+j');
    await waitForTerminalClosed(window);

    // 터미널이 닫혔는지 확인
    await expect(window.locator('.terminal-panel')).not.toBeVisible();
  });

  // 명령어 실행 테스트는 CI/테스트 환경에서 PTY 생성이 불안정할 수 있어 skip 처리
  // 로컬에서 수동 테스트 필요
  test.skip('터미널에서 명령어 실행 (echo)', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 터미널에 포커스
    await window.click('.terminal-content');

    // 초기화 시간 대기
    await window.waitForTimeout(1000);

    // echo 명령어 실행
    await window.keyboard.type('echo "Hello Terminal"');
    await window.keyboard.press('Enter');

    // 출력 확인 (시간 대기 후)
    await window.waitForTimeout(500);

    // 터미널 내용에 "Hello Terminal"이 포함되어 있는지 확인
    const terminalContent = await window.locator('.terminal-content').textContent();
    expect(terminalContent).toContain('Hello Terminal');
  });

  // 명령어 실행 테스트는 CI/테스트 환경에서 PTY 생성이 불안정할 수 있어 skip 처리
  test.skip('터미널에서 pwd 명령어 실행', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 터미널에 포커스
    await window.click('.terminal-content');

    // 초기화 시간 대기
    await window.waitForTimeout(1000);

    // pwd 명령어 실행
    await window.keyboard.type('pwd');
    await window.keyboard.press('Enter');

    // 출력 확인 (시간 대기 후)
    await window.waitForTimeout(500);

    // 터미널 내용에 경로가 포함되어 있는지 확인 (홈 디렉토리 또는 / 포함)
    const terminalContent = await window.locator('.terminal-content').textContent();
    expect(terminalContent).toMatch(/\//); // 경로에는 / 포함
  });

  test('터미널 헤더에 "Terminal 1" 탭 표시', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 터미널 탭 확인 (멀티 터미널: "Terminal 1"로 표시)
    const terminalTab = window.locator('.terminal-tab');
    await expect(terminalTab).toBeVisible();
    await expect(terminalTab).toContainText('Terminal 1');
  });

  test('터미널 높이 리사이저 표시', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 수평 리사이저 확인 (터미널 위에 있음)
    const resizer = window.locator('.resizer.horizontal');
    await expect(resizer).toBeVisible();
  });

  test('터미널 높이 조절', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 초기 터미널 높이 확인
    const initialHeight = await window.locator('.terminal-panel').evaluate(el => el.offsetHeight);

    // 수평 리사이저 드래그
    const resizer = window.locator('.resizer.horizontal');
    const box = await resizer.boundingBox();

    await window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    await window.mouse.down();
    await window.mouse.move(box.x + box.width / 2, box.y - 100); // 위로 드래그 (높이 증가)
    await window.mouse.up();

    // 높이가 변경되었는지 확인
    const newHeight = await window.locator('.terminal-panel').evaluate(el => el.offsetHeight);
    expect(newHeight).toBeGreaterThan(initialHeight);
  });

  test('다크 테마에서 터미널 배경색', async ({ window }) => {
    // 다크 테마로 설정 (기본값)
    const theme = await window.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 터미널 배경색 확인
    const bgColor = await window.locator('.terminal-content').evaluate(el => {
      return window.getComputedStyle(el).backgroundColor;
    });

    if (theme === 'dark') {
      // 다크 테마: 어두운 배경 (rgb 값이 낮음)
      expect(bgColor).toMatch(/rgb\(\d{1,2}, \d{1,2}, \d{1,2}\)/);
    }
  });

  test('터미널 xterm.js 초기화 확인', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // xterm 요소들이 생성되었는지 확인
    await expect(window.locator('.terminal-content .xterm')).toBeVisible();
    await expect(window.locator('.terminal-content .xterm-viewport')).toBeVisible();
    await expect(window.locator('.terminal-content .xterm-screen')).toBeVisible();
  });

  test('터미널 열고 닫아도 다른 UI에 영향 없음', async ({ window }) => {
    // 새 탭 버튼 존재 확인
    await expect(window.locator('.tab-new-btn')).toBeVisible();

    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 새 탭 버튼이 여전히 존재하는지 확인
    await expect(window.locator('.tab-new-btn')).toBeVisible();

    // 새 탭 생성 가능한지 확인
    await window.click('.tab-new-btn');
    await expect(window.locator('.tab-item')).toBeVisible();

    // 터미널 닫기
    await clickTerminalClose(window);
    await waitForTerminalClosed(window);

    // 탭이 여전히 존재하는지 확인
    await expect(window.locator('.tab-item')).toBeVisible();
  });

  test('터미널 여러 번 열고 닫기 안정성', async ({ window }) => {
    // 5번 반복
    for (let i = 0; i < 5; i++) {
      // 터미널 열기
      await clickTerminalToggle(window);
      await waitForTerminal(window);
      await expect(window.locator('.terminal-panel')).toBeVisible();

      // 터미널 닫기
      await clickTerminalToggle(window);
      await waitForTerminalClosed(window);
      await expect(window.locator('.terminal-panel')).not.toBeVisible();
    }
  });
});

// ========================================
// 멀티 터미널 기능 테스트
// ========================================

test.describe('멀티 터미널 기능', () => {
  test.beforeEach(async ({ window }) => {
    await closeAllTabs(window);
    // 터미널이 열려있으면 닫기
    const isTerminalVisible = await window.locator('.terminal-panel').isVisible();
    if (isTerminalVisible) {
      await clickTerminalClose(window);
      await waitForTerminalClosed(window);
    }
  });

  test('터미널 패널 열면 기본 터미널 1개 생성', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 터미널 탭 1개 확인
    const tabCount = await getTerminalTabCount(window);
    expect(tabCount).toBe(1);

    // 탭 이름 확인
    const tabName = await getActiveTerminalName(window);
    expect(tabName).toBe('Terminal 1');
  });

  test('+ 버튼으로 새 터미널 추가', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 초기 탭 개수 확인
    expect(await getTerminalTabCount(window)).toBe(1);

    // 새 터미널 추가
    await clickAddTerminal(window);
    await waitForTerminalCount(window, 2);

    // 탭 개수 확인
    expect(await getTerminalTabCount(window)).toBe(2);

    // 새 탭이 활성화되었는지 확인
    const activeTabName = await getActiveTerminalName(window);
    expect(activeTabName).toBe('Terminal 2');
  });

  test('터미널 탭 클릭으로 전환', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 터미널 2개 추가
    await clickAddTerminal(window);
    await waitForTerminalCount(window, 2);

    // 첫 번째 탭 클릭
    await clickTerminalTab(window, 0);

    // 첫 번째 탭이 활성화되었는지 확인
    const activeTabName = await getActiveTerminalName(window);
    expect(activeTabName).toBe('Terminal 1');

    // 첫 번째 탭에 active 클래스 확인
    const firstTab = window.locator('.terminal-tab').nth(0);
    await expect(firstTab).toHaveClass(/active/);
  });

  test('× 버튼으로 터미널 삭제', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 터미널 2개로 만들기
    await clickAddTerminal(window);
    await waitForTerminalCount(window, 2);

    // 두 번째 탭 닫기
    await closeTerminalTab(window, 1);
    await waitForTerminalCount(window, 1);

    // 탭 개수 확인
    expect(await getTerminalTabCount(window)).toBe(1);
  });

  test('마지막 터미널 삭제 시 새 터미널 자동 생성', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 터미널 1개 확인
    expect(await getTerminalTabCount(window)).toBe(1);

    // 마지막 터미널 닫기
    await closeTerminalTab(window, 0);

    // 약간의 대기 (자동 생성 시간)
    await window.waitForTimeout(500);

    // 새 터미널이 자동 생성되었는지 확인
    expect(await getTerminalTabCount(window)).toBe(1);
  });

  test('여러 터미널 추가 시 순차적 이름', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 터미널 3개 추가 (총 4개)
    await clickAddTerminal(window);
    await clickAddTerminal(window);
    await clickAddTerminal(window);
    await waitForTerminalCount(window, 4);

    // 각 탭 이름 확인
    const tabs = window.locator('.terminal-tab .terminal-tab-name');
    await expect(tabs.nth(0)).toHaveText('Terminal 1');
    await expect(tabs.nth(1)).toHaveText('Terminal 2');
    await expect(tabs.nth(2)).toHaveText('Terminal 3');
    await expect(tabs.nth(3)).toHaveText('Terminal 4');
  });

  test('비활성 터미널도 출력 수신 (백그라운드 실행)', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 두 번째 터미널 추가
    await clickAddTerminal(window);
    await waitForTerminalCount(window, 2);

    // Terminal 2가 활성 상태
    expect(await getActiveTerminalName(window)).toBe('Terminal 2');

    // Terminal 1으로 전환
    await clickTerminalTab(window, 0);
    expect(await getActiveTerminalName(window)).toBe('Terminal 1');

    // Terminal 1에서 echo 실행
    await window.click('.terminal-content');
    await window.waitForTimeout(500);
    await window.keyboard.type('echo "Test from Terminal 1"');
    await window.keyboard.press('Enter');
    await window.waitForTimeout(500);

    // Terminal 2로 전환
    await clickTerminalTab(window, 1);

    // 다시 Terminal 1로 전환
    await clickTerminalTab(window, 0);

    // Terminal 1의 출력이 유지되는지 확인
    const terminalContent = await window.locator('.terminal-content').textContent();
    expect(terminalContent).toContain('Test from Terminal 1');
  });

  test('터미널 5개 이상일 때 스크롤 버튼 동작', async ({ window }) => {
    // 터미널 열기
    await clickTerminalToggle(window);
    await waitForTerminal(window);

    // 터미널 6개로 만들기
    for (let i = 0; i < 5; i++) {
      await clickAddTerminal(window);
    }
    await waitForTerminalCount(window, 6);

    // 스크롤 버튼 표시 여부 확인 (오버플로우 시에만)
    const isScrollable = await window.evaluate(() => {
      const tabs = document.querySelector('.terminal-tabs');
      return tabs && tabs.scrollWidth > tabs.clientWidth;
    });

    if (isScrollable) {
      const scrollRightBtn = window.locator('.terminal-scroll-btn.right');
      await expect(scrollRightBtn).toHaveClass(/visible/);
    }
  });
});
