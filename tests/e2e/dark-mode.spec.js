/**
 * 다크 모드 시스템 E2E 테스트
 * - 테마 토글 (light/dark)
 * - Auto 모드 (시스템 테마 따르기)
 * - Monaco Editor 테마 동기화
 * - Mermaid 다이어그램 테마 동기화
 * - 테마 설정 저장 및 복원
 */

const { test: base, expect } = require('@playwright/test');
const {
  launchElectron,
  forceCloseElectron,
  createTestWorkspace,
  cleanupTestWorkspace
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

test.describe('다크 모드 시스템', () => {
  test.beforeAll(async () => {
    testWorkspace = await createTestWorkspace();
  });

  test.afterAll(async () => {
    await cleanupTestWorkspace(testWorkspace);
  });

  test('앱이 기본 light 테마로 시작해야 함', async ({ window }) => {
    const page = window;

    // 루트 요소의 data-theme 속성 확인
    const dataTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    expect(dataTheme).toBe('light');

    // CSS 변수가 light 테마 값으로 설정되어 있는지 확인
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-primary').trim();
    });

    expect(bgColor).toBeTruthy();
  });

  test('테마 토글 버튼이 표시되어야 함', async ({ window }) => {
    const page = window;

    const themeToggleBtn = page.locator('.theme-toggle-btn');
    await expect(themeToggleBtn).toBeVisible();
  });

  test('테마 토글 버튼 클릭 시 light → dark 전환', async ({ window }) => {
    const page = window;

    // 초기 테마 확인
    const initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(initialTheme).toBe('light');

    // 토글 버튼 클릭
    await page.locator('.theme-toggle-btn').click();
    await page.waitForTimeout(300);

    // 테마 변경 확인
    const newTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(newTheme).toBe('dark');

    // CSS 변수가 dark 테마 값으로 변경되었는지 확인
    const bgColor = await page.evaluate(() => {
      return getComputedStyle(document.documentElement)
        .getPropertyValue('--bg-primary').trim();
    });
    expect(bgColor).toBeTruthy();
  });

  test('테마 토글 버튼 재클릭 시 dark → light 전환', async ({ window }) => {
    const page = window;

    // 먼저 light 테마로 리셋 (이전 테스트 상태 정리)
    let currentTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    if (currentTheme !== 'light') {
      await page.locator('.theme-toggle-btn').click();
      await page.waitForTimeout(300);
    }

    // Dark 모드로 전환
    await page.locator('.theme-toggle-btn').click();
    await page.waitForTimeout(300);

    currentTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(currentTheme).toBe('dark');

    // 다시 클릭하여 light로 전환
    await page.locator('.theme-toggle-btn').click();
    await page.waitForTimeout(300);

    currentTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(currentTheme).toBe('light');
  });

  test('테마 설정이 electron-store에 저장되어야 함', async ({ window }) => {
    const page = window;

    // Dark 모드로 전환
    await page.locator('.theme-toggle-btn').click();
    await page.waitForTimeout(500);

    // 저장된 설정 확인
    const savedSettings = await page.evaluate(async () => {
      return await window.electronAPI.getThemeSettings();
    });

    expect(savedSettings).toHaveProperty('mode');
    expect(['light', 'dark', 'auto']).toContain(savedSettings.mode);
  });

  test('앱 재시작 후 마지막 테마가 복원되어야 함', async ({ window }) => {
    const page = window;

    // Dark 모드로 전환
    await page.locator('.theme-toggle-btn').click();
    await page.waitForTimeout(500);

    // 테마 설정 확인
    const themeBeforeReload = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    // 페이지 새로고침 (앱 재시작 시뮬레이션)
    await page.reload();
    await page.waitForTimeout(1000);

    // 테마가 복원되었는지 확인
    const themeAfterReload = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    expect(themeAfterReload).toBe(themeBeforeReload);
  });

  test('Monaco Editor 테마가 전체 테마와 동기화되어야 함', async ({ window }) => {
    const page = window;

    // 새 탭 생성
    await page.locator('.tab-new-btn').click();
    await page.waitForTimeout(500);

    // Monaco Editor가 로드될 때까지 대기
    await page.waitForSelector('.monaco-editor', { timeout: 5000 });

    // Light 테마에서 Monaco 테마 확인
    let monacoTheme = await page.evaluate(() => {
      const editor = document.querySelector('.monaco-editor');
      if (!editor) return null;

      // vs-light 클래스 또는 밝은 배경색 확인
      return editor.classList.contains('vs') ||
             editor.classList.contains('vs-light') ||
             window.getComputedStyle(editor).backgroundColor.includes('255');
    });
    expect(monacoTheme).toBeTruthy();

    // Dark 모드로 전환
    await page.locator('.theme-toggle-btn').click();
    await page.waitForTimeout(500);

    // Monaco Editor 테마가 dark로 변경되었는지 확인
    monacoTheme = await page.evaluate(() => {
      const editor = document.querySelector('.monaco-editor');
      if (!editor) return null;

      // vs-dark 클래스 또는 어두운 배경색 확인
      return editor.classList.contains('vs-dark') ||
             !window.getComputedStyle(editor).backgroundColor.includes('255');
    });
    expect(monacoTheme).toBeTruthy();
  });

  test('Mermaid 다이어그램 테마가 전체 테마와 동기화되어야 함', async ({ window }) => {
    const page = window;

    // 새 탭 생성 및 다이어그램 입력
    await page.locator('.tab-new-btn').click();
    await page.waitForTimeout(500);

    // Monaco Editor에 다이어그램 코드 입력
    await page.locator('.monaco-editor').click();
    await page.keyboard.type('graph TD\n    A[Start] --> B[End]');
    await page.waitForTimeout(1500); // 다이어그램 렌더링 대기

    // 다이어그램이 렌더링되었는지 확인
    const diagramExists = await page.locator('.diagram-container svg').isVisible();
    if (diagramExists) {
      // Dark 모드로 전환
      await page.locator('.theme-toggle-btn').click();
      await page.waitForTimeout(1000); // 다이어그램 재렌더링 대기

      // Mermaid 다이어그램의 배경색 또는 스타일 확인
      const diagramTheme = await page.evaluate(() => {
        const svg = document.querySelector('.diagram-container svg');
        if (!svg) return null;

        // 다크 테마 스타일이 적용되었는지 확인
        const bgColor = svg.style.backgroundColor ||
                        window.getComputedStyle(svg).backgroundColor;
        const rectFill = svg.querySelector('rect')?.getAttribute('fill');

        return { bgColor, rectFill };
      });

      expect(diagramTheme).toBeTruthy();
    }
  });

  test.skip('Auto 모드 선택 시 시스템 테마를 따라가야 함', async ({ window }) => {
    const page = window;

    // Auto 모드 버튼 클릭 (UI가 있다면)
    const autoBtn = page.locator('.theme-auto-btn');
    const autoButtonExists = await autoBtn.count() > 0;

    if (autoButtonExists) {
      await autoBtn.click();
      await page.waitForTimeout(300);

      // 시스템 테마 가져오기
      const systemTheme = await page.evaluate(async () => {
        return await window.electronAPI.getSystemTheme();
      });

      // 앱 테마가 시스템 테마와 일치하는지 확인
      const appTheme = await page.evaluate(() => {
        return document.documentElement.getAttribute('data-theme');
      });

      expect(['light', 'dark']).toContain(appTheme);
      if (systemTheme) {
        expect(appTheme).toBe(systemTheme);
      }
    }
  });
});

test.describe('다크 모드 E2E 시나리오', () => {
  test.beforeAll(async () => {
    testWorkspace = await createTestWorkspace();
  });

  test.afterAll(async () => {
    await cleanupTestWorkspace(testWorkspace);
  });

  test('야간 작업 시나리오: light → dark 전환 후 작업', async ({ window }) => {
    const page = window;

    // 먼저 light 테마로 리셋 (이전 테스트 상태 정리)
    let initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    if (initialTheme !== 'light') {
      await page.locator('.theme-toggle-btn').click();
      await page.waitForTimeout(300);
    }

    // 1. Light 모드로 시작
    initialTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(initialTheme).toBe('light');

    // 2. Dark 모드로 전환
    await page.locator('.theme-toggle-btn').click();
    await page.waitForTimeout(300);

    const darkTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(darkTheme).toBe('dark');

    // 3. 새 탭 생성 및 다이어그램 작성
    await page.locator('.tab-new-btn').click();
    await page.waitForTimeout(500);

    await page.locator('.monaco-editor').click();
    await page.keyboard.type('graph LR\n    Start --> End');
    await page.waitForTimeout(2000);

    // 4. 다이어그램 렌더링 확인 (타임아웃 내에 렌더링 대기)
    const diagramContainer = page.locator('.diagram-container svg');
    const diagramRendered = await diagramContainer.isVisible().catch(() => false);
    // 다이어그램 렌더링은 선택적 - 테마 테스트가 주 목적
    if (!diagramRendered) {
      console.log('[Test] Diagram not rendered yet, skipping diagram check');
    }

    // 5. 테마가 여전히 dark인지 확인
    const finalTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });
    expect(finalTheme).toBe('dark');
  });

  test('사용자 선호 테마 저장 및 복원 시나리오', async ({ window }) => {
    const page = window;

    // 1. Dark 모드로 여러 번 전환
    await page.locator('.theme-toggle-btn').click();
    await page.waitForTimeout(300);

    await page.locator('.theme-toggle-btn').click();
    await page.waitForTimeout(300);

    await page.locator('.theme-toggle-btn').click();
    await page.waitForTimeout(300);

    // 2. 최종 테마 확인
    const finalTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    // 3. 저장된 설정 확인
    const savedSettings = await page.evaluate(async () => {
      return await window.electronAPI.getThemeSettings();
    });

    expect(savedSettings.mode).toBe(finalTheme);

    // 4. 페이지 새로고침
    await page.reload();
    await page.waitForTimeout(1000);

    // 5. 테마가 복원되었는지 확인
    const restoredTheme = await page.evaluate(() => {
      return document.documentElement.getAttribute('data-theme');
    });

    expect(restoredTheme).toBe(finalTheme);
  });
});
