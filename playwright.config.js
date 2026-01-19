/**
 * Playwright 설정 파일
 * Electron 애플리케이션 E2E 테스트용
 */

module.exports = {
  // 테스트 타임아웃
  timeout: 30000,

  // 글로벌 타임아웃 (전체 테스트 실행 + teardown 포함)
  globalTimeout: 600000, // 10분

  // 테스트 재시도 횟수 (Electron 앱 상태로 인한 flaky 테스트 처리)
  retries: 1,

  // 병렬 실행 여부
  workers: 1, // Electron 테스트는 순차 실행 권장

  // 테스트 출력 설정
  reporter: [
    ['html', { outputFolder: 'playwright-report' }],
    ['json', { outputFile: 'test-results/results.json' }],
    ['list']
  ],

  // 테스트 디렉토리
  testDir: './tests/e2e',

  // Vite 개발 서버 자동 시작
  webServer: {
    command: 'npm run dev:renderer',
    port: 5173,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },

  // 글로벌 설정
  use: {
    // 스크린샷 설정
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    trace: 'retain-on-failure',

    // 디버깅용
    headless: false,

    // 뷰포트 크기
    viewport: { width: 1280, height: 720 }
  },

  // 프로젝트 설정
  projects: [
    {
      name: 'electron',
      testMatch: '**/*.spec.js'
    }
  ]
};