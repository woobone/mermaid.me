# Mermaid.me E2E 테스트 가이드

## 개요

Playwright를 사용한 Electron 애플리케이션 E2E (End-to-End) 자동화 테스트입니다.

## 최신 업데이트 (2025-10-13)

테스트 시스템이 Playwright Custom Fixture 패턴을 사용하도록 업그레이드되었습니다:
- ✅ Custom Fixture 구현으로 "Internal error: step id not found" 문제 해결
- ✅ 각 테스트마다 독립적인 Electron 인스턴스 생성
- ✅ 자동 정리 (afterEach에서 Electron 앱 종료)
- ✅ 첫 번째 테스트 ("새 탭 생성") 통과 확인
- 🔄 나머지 테스트 업데이트 진행 중 (탭 이름 패턴 수정 필요)

## 테스트 구조

```
tests/
├── e2e/                          # E2E 테스트 파일들
│   ├── file-management.spec.js   # 파일 관리 기능 테스트
│   ├── editor-tabs.spec.js       # 에디터 및 탭 기능 테스트
│   └── export.spec.js            # 내보내기 기능 테스트
├── helpers/                      # 테스트 헬퍼 함수들
│   └── electron-helpers.js       # Electron 테스트 유틸리티
├── fixtures/                     # 테스트 픽스처 (필요시 추가)
└── README.md                     # 본 문서
```

## 설치된 의존성

- `@playwright/test`: Playwright 테스트 프레임워크
- `playwright`: Playwright 브라우저 자동화
- `electron-playwright-helpers`: Electron 테스트 헬퍼
- `@types/node`: Node.js 타입 정의

## 중요: 테스트 실행 방식

**테스트는 자동으로 Vite 개발 서버를 시작합니다!**

모든 테스트 명령어는 `concurrently`를 사용하여 다음을 자동으로 수행합니다:
1. Vite 개발 서버 시작 (`npm run dev:renderer`)
2. 포트 5173이 준비될 때까지 대기 (`wait-on tcp:5173`)
3. Playwright 테스트 실행
4. 테스트 종료 시 Vite 서버 자동 종료 (`-k` 옵션)

따라서 **별도로 `npm run dev`를 실행할 필요가 없습니다.**

## 테스트 실행 명령어

### 전체 테스트 실행
```bash
npm test
```

### UI 모드로 테스트 실행 (추천)
```bash
npm run test:ui
```
- 브라우저에서 테스트를 시각적으로 확인하고 실행
- 각 단계별 실행 및 디버깅 가능
- 스크린샷 및 트레이스 확인 가능

### Headed 모드로 실행 (창 표시)
```bash
npm run test:headed
```
- Electron 창이 실제로 표시되는 상태에서 테스트 실행
- 테스트 동작을 눈으로 확인 가능

### 디버그 모드
```bash
npm run test:debug
```
- 브레이크포인트 설정 및 단계별 실행
- Playwright Inspector 사용

### 테스트 리포트 보기
```bash
npm run test:report
```
- HTML 리포트를 브라우저에서 확인
- 실패한 테스트의 스크린샷 및 비디오 확인

### 개별 테스트 파일 실행
```bash
# 파일 관리 테스트만 실행
npm run test:file-management

# 에디터/탭 테스트만 실행
npm run test:editor-tabs

# 내보내기 테스트만 실행
npm run test:export
```

## 테스트 커버리지

### 1. 파일 관리 기능 (file-management.spec.js)
- ✅ 폴더 열기 및 파일 트리 표시
- ✅ 파일 선택 및 열기
- ✅ 새 파일 생성
- ✅ 파일 삭제
- ✅ 새 폴더 생성
- ✅ 폴더 확장 및 축소
- ✅ 최근 파일 목록
- ✅ 최근 폴더 목록
- ✅ 북마크 추가 및 제거
- ✅ 파일 시스템 감시 (외부 파일 생성/삭제 감지)

### 2. 에디터 및 탭 관리 (editor-tabs.spec.js)
- ✅ 새 탭 생성
- ✅ 여러 탭 생성 및 전환
- ✅ 탭 닫기
- ✅ 수정된 탭 표시 및 저장 확인
- ✅ 탭 드래그 앤 드롭으로 순서 변경
- ✅ Monaco Editor 구문 하이라이팅
- ✅ Monaco Editor 자동완성
- ✅ 실시간 다이어그램 렌더링
- ✅ 다이어그램 오류 처리
- ✅ 키보드 단축키 (Ctrl+N, Ctrl+W, Ctrl+Tab)
- ✅ 파일 열기 후 탭 생성
- ✅ 에디터와 미리보기 리사이저
- ✅ 탭 컨텍스트 메뉴 (모든 탭 닫기, 다른 탭 닫기, 오른쪽 탭 닫기)

### 3. 내보내기 기능 (export.spec.js)
- ✅ PNG 내보내기 (메뉴)
- ✅ PDF 내보내기 (키보드 단축키)
- ✅ SVG 내보내기
- ✅ 클립보드에 복사
- ✅ PNG 고해상도 옵션
- ✅ 여러 형식 연속 내보내기
- ✅ 내보내기 취소
- ✅ 복잡한 다이어그램 내보내기
- ✅ 내보내기 전 다이어그램 유효성 검사
- ✅ 파일 이름 자동 생성

## 테스트 작성 가이드

### 기본 테스트 구조

```javascript
const { test, expect } = require('@playwright/test');
const {
  launchElectron,
  // ... 기타 헬퍼 함수들
} = require('../helpers/electron-helpers');

let electronApp;
let window;

test.describe('테스트 그룹명', () => {
  test.beforeEach(async () => {
    const result = await launchElectron();
    electronApp = result.app;
    window = result.window;
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    if (electronApp) {
      await electronApp.close();
    }
  });

  test('테스트 케이스 설명', async () => {
    // 테스트 로직
  });
});
```

### 헬퍼 함수 사용 예제

```javascript
// Electron 앱 실행
const { app, window } = await launchElectron();

// 테스트 워크스페이스 생성
const workspace = await createTestWorkspace();

// 파일 탐색기 대기
await waitForFileExplorer(window);

// 에디터 대기
await waitForEditor(window);

// 다이어그램 렌더링 대기
await waitForDiagramRender(window);

// 에디터에 텍스트 입력
await typeInEditor(window, 'graph TD\n  A --> B');

// 에디터 내용 가져오기
const content = await getEditorContent(window);

// 파일 선택
await selectFileInTree(window, 'test.mmd');

// 새 탭 생성
await createNewTab(window);

// 탭 전환
await switchToTab(window, 'Untitled-1');
```

## CI/CD 통합

### GitHub Actions 예제

```yaml
name: E2E Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ${{ matrix.os }}
    strategy:
      matrix:
        os: [ubuntu-latest, macos-latest, windows-latest]

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install dependencies
        run: npm ci

      - name: Run E2E tests
        run: npm test

      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: test-results/
```

## 트러블슈팅

### 화면이 나오지 않는 경우
**원인**: Vite 개발 서버가 실행되지 않음

**해결**:
- 테스트 스크립트가 자동으로 Vite 서버를 시작하도록 수정됨
- `npm test` 또는 `npm run test:headed` 명령어 사용
- 포트 5173이 이미 사용 중인 경우: 기존 프로세스 종료 후 재실행
  ```bash
  lsof -ti:5173 | xargs kill -9
  npm test
  ```

### 포트 5173이 이미 사용 중인 경우
**증상**: `Error: Port 5173 is already in use`

**해결**:
```bash
# 포트 사용 중인 프로세스 확인
lsof -i :5173

# 프로세스 종료
lsof -ti:5173 | xargs kill -9

# 또는 npm run dev가 실행 중이면 종료 후 테스트 실행
```

### 테스트가 타임아웃되는 경우
- `playwright.config.js`의 `timeout` 값 증가
- 각 테스트에서 적절한 `waitForTimeout` 사용
- Vite 서버 시작이 느린 경우: `wait-on` 타임아웃 증가

### Electron 앱이 시작되지 않는 경우
- Node.js 버전 확인 (18 이상 권장)
- Electron 의존성 재설치: `npm install electron --force`
- 개발자 도구 확인: 콘솔에 JavaScript 에러가 있는지 확인

### 테스트가 간헐적으로 실패하는 경우
- `waitForLoadState`, `waitForSelector` 등 적절한 대기 추가
- 디버그 모드로 실행하여 원인 파악: `npm run test:debug`
- Electron 앱이 완전히 로드될 때까지 충분한 시간 대기

### macOS 권한 문제
- System Preferences > Security & Privacy에서 Electron 접근 권한 확인
- 테스트 워크스페이스 경로에 접근 권한이 있는지 확인
- 스크린 녹화 권한 필요 (비디오 캡처 사용 시)

## 베스트 프랙티스

1. **각 테스트는 독립적이어야 함**
   - 테스트 간 상태 공유 금지
   - `beforeEach`/`afterEach`로 환경 초기화

2. **명확한 테스트 이름 사용**
   - 테스트가 무엇을 검증하는지 명확히 표현
   - 예: '새 탭 생성' (O), 'test1' (X)

3. **적절한 대기 사용**
   - 하드코딩된 `setTimeout` 대신 `waitFor*` 헬퍼 사용
   - 필요한 경우에만 `waitForTimeout` 사용

4. **스크린샷 활용**
   - 실패 시 자동으로 스크린샷 저장됨
   - 수동 스크린샷: `await window.screenshot({ path: 'test.png' })`

5. **테스트 격리**
   - 각 테스트는 독립적으로 실행 가능해야 함
   - 외부 상태나 파일 시스템 의존 최소화

## 리포트 및 결과

테스트 실행 후 다음 위치에 결과가 저장됩니다:

- `playwright-report/` - HTML 리포트 (`npm run test:report`로 확인)
- `test-results/results.json` - JSON 형식 결과
- `test-results/` - 실패한 테스트 스크린샷 및 비디오

## 추가 자료

- [Playwright 공식 문서](https://playwright.dev)
- [Electron Testing 가이드](https://www.electronjs.org/docs/latest/tutorial/automated-testing)
- [Playwright Electron API](https://playwright.dev/docs/api/class-electron)

## 기여하기

새로운 테스트 케이스를 추가하려면:

1. 적절한 spec 파일 선택 또는 새로 생성
2. 헬퍼 함수 활용하여 테스트 작성
3. 테스트가 독립적으로 실행되는지 확인
4. Pull Request 생성

---

**참고**: 테스트는 개발 중인 기능을 검증하고 회귀를 방지하기 위한 것입니다.
새로운 기능 추가 시 반드시 대응하는 테스트를 함께 작성해주세요.