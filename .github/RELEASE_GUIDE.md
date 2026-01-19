# Release 가이드

GitHub Actions를 사용한 자동 빌드 및 배포 가이드입니다.

## 🚀 릴리스 프로세스

### 1. 버전 업데이트

`package.json`의 버전을 업데이트합니다:

```json
{
  "version": "1.0.0"  // 새 버전으로 변경
}
```

### 2. 변경사항 커밋

```bash
git add .
git commit -m "Release v1.0.0"
git push origin main
```

### 3. 태그 생성 및 푸시

```bash
# 태그 생성
git tag v1.0.0

# 태그 푸시 (이 순간 자동 빌드 시작!)
git push origin v1.0.0
```

### 4. 자동 빌드 확인

- GitHub 저장소 → **Actions** 탭 확인
- 빌드 진행 상황 실시간 확인 가능
- 빌드 완료 시간: 약 10-15분

### 5. GitHub Releases 확인

- 빌드 완료 후 **Releases** 탭에 자동 업로드
- 다운로드 가능한 파일:
  - `Mermaid Editor-1.0.0-arm64.dmg` (macOS Apple Silicon)
  - `Mermaid Editor-1.0.0-arm64-mac.zip` (macOS Apple Silicon)
  - `Mermaid Editor-1.0.0.dmg` (macOS Intel)
  - `Mermaid Editor-1.0.0-mac.zip` (macOS Intel)
  - `Mermaid Editor Setup 1.0.0.exe` (Windows NSIS)
  - `Mermaid Editor 1.0.0.exe` (Windows Portable)

---

## 📋 빌드 매트릭스

| 플랫폼 | 아키텍처 | 빌드 환경 | 산출물 |
|--------|----------|-----------|--------|
| macOS | Apple Silicon (arm64) | macos-latest | DMG, ZIP |
| macOS | Intel (x64) | macos-latest | DMG, ZIP |
| Windows | x64 | windows-latest | NSIS, Portable |

---

## ⚙️ Workflow 동작 방식

### 트리거 조건
```yaml
on:
  push:
    tags:
      - 'v*.*.*'  # v1.0.0, v1.2.3 등
```

### 빌드 단계
1. **Checkout** - 코드 체크아웃
2. **Setup Node.js** - Node.js 22 설치
3. **Install dependencies** - `npm ci` 실행
4. **Build Electron** - TypeScript 컴파일 (`npm run build:electron`)
5. **Build Renderer** - Vite 빌드 (`npm run build:renderer`)
6. **Package** - electron-builder로 패키징
7. **Upload Artifacts** - 빌드 파일 임시 저장
8. **Upload to Releases** - GitHub Releases에 업로드

---

## 🔧 수동 빌드 (로컬)

자동 빌드 대신 로컬에서 빌드하려면:

```bash
# macOS Apple Silicon
npm run dist:mac:apple

# macOS Intel
npm run dist:mac:intel

# Windows
npm run dist:win

# 빌드 결과: dist/release/
```

수동으로 GitHub Releases에 업로드:
1. GitHub 저장소 → **Releases** → **Create a new release**
2. 태그 선택 또는 새 태그 생성
3. 빌드 파일 드래그 앤 드롭
4. **Publish release** 클릭

---

## 🐛 문제 해결

### 빌드 실패 시

1. **GitHub Actions 로그 확인**
   - Actions 탭 → 실패한 워크플로우 클릭
   - 에러 메시지 확인

2. **자주 발생하는 문제**

   **문제**: `npm ci` 실패
   - **해결**: `package-lock.json`이 최신인지 확인
   ```bash
   npm install
   git add package-lock.json
   git commit -m "Update package-lock.json"
   ```

   **문제**: TypeScript 컴파일 에러
   - **해결**: 로컬에서 먼저 테스트
   ```bash
   npm run build:electron
   ```

   **문제**: electron-builder 실패
   - **해결**: `dist/` 폴더 정리 후 재빌드
   ```bash
   npm run clean
   npm run dist
   ```

3. **로컬에서 재현**
   ```bash
   # 전체 빌드 프로세스 테스트
   npm run clean
   npm run build:electron
   npm run build:renderer
   npm run dist
   ```

### 태그 삭제 및 재생성

잘못된 태그를 삭제하고 다시 생성:

```bash
# 로컬 태그 삭제
git tag -d v1.0.0

# 원격 태그 삭제
git push origin :refs/tags/v1.0.0

# 새 태그 생성
git tag v1.0.0
git push origin v1.0.0
```

---

## 📦 Release 노트 작성

GitHub Releases에서 Release Notes 작성 권장:

```markdown
## 🎉 What's New in v1.0.0

### ✨ Features
- 새로운 기능 설명

### 🐛 Bug Fixes
- 수정된 버그 설명

### 📝 Changes
- 변경사항 설명

### 📦 Downloads
플랫폼에 맞는 설치 파일을 다운로드하세요:
- **macOS (Apple Silicon)**: Mermaid Editor-1.0.0-arm64.dmg
- **macOS (Intel)**: Mermaid Editor-1.0.0.dmg
- **Windows**: Mermaid Editor Setup 1.0.0.exe
```

---

## 🔐 보안

- `GITHUB_TOKEN`은 자동으로 제공됨 (설정 불필요)
- 코드 서명(Code Signing)은 설정되지 않음
  - macOS: "확인되지 않은 개발자" 경고 발생
  - Windows: SmartScreen 경고 발생 가능

코드 서명 추가 시 별도 설정 필요 (Apple Developer, Windows Code Signing Certificate)

---

## 📊 빌드 시간

예상 빌드 시간:
- macOS (Apple Silicon): 약 8-10분
- macOS (Intel): 약 8-10분
- Windows: 약 5-7분

**총 소요 시간**: 약 15-20분 (병렬 실행)

---

## 🎯 체크리스트

릴리스 전 확인사항:

- [ ] `package.json` 버전 업데이트
- [ ] `CHANGELOG.md` 작성 (있는 경우)
- [ ] 로컬에서 빌드 테스트 완료
- [ ] 모든 테스트 통과 (`npm test`)
- [ ] 변경사항 커밋 및 푸시
- [ ] 태그 생성 및 푸시
- [ ] GitHub Actions 빌드 성공 확인
- [ ] Release Notes 작성
- [ ] 다운로드 링크 테스트

---

## 📚 참고 자료

- [GitHub Actions 문서](https://docs.github.com/en/actions)
- [electron-builder 문서](https://www.electron.build/)
- [GitHub Releases 가이드](https://docs.github.com/en/repositories/releasing-projects-on-github)
