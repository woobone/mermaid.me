# Mermaid Diagram Editor

<div align="center">

**크로스 플랫폼 Mermaid 다이어그램 에디터**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-39.0-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://reactjs.org/)
[![Mermaid](https://img.shields.io/badge/Mermaid-11.12-FF3670?logo=mermaid)](https://mermaid.js.org/)

[English](./README.md) | 한국어

</div>

---

## 📖 소개

**Mermaid Diagram Editor**는 Electron 기반의 크로스 플랫폼 데스크톱 애플리케이션으로, Mermaid 다이어그램과 Markdown 파일을 편집하고 실시간으로 미리볼 수 있는 강력한 도구입니다.

### ✨ 주요 특징

- 🎨 **멀티 포맷 지원** - Mermaid (`.mmd`) 및 Markdown (`.md`) 파일 동시 지원
- 💻 **Monaco Editor** - VS Code와 동일한 에디터로 구문 하이라이팅, 자동완성 제공
- 🔄 **실시간 미리보기** - 코드 작성과 동시에 다이어그램 렌더링
- 📁 **스마트 파일 관리** - Lazy loading 파일 탐색기, 실시간 파일 감시
- 📑 **고급 탭 시스템** - 여러 파일 동시 편집, 드래그 앤 드롭 지원
- ⭐ **워크스페이스 관리** - 북마크, 최근 파일, 작업 상태 자동 저장/복원
- 📤 **다양한 내보내기** - PNG, PDF, SVG 형식 지원, 클립보드 복사
- 🖨️ **Markdown 프린트** - 스타일 유지된 Markdown 출력
- 🌙 **다크 모드** - Light/Dark 테마 전환 (시스템 테마 연동)
- ⚡ **고성능** - 디바운싱 및 최적화로 대규모 프로젝트 지원

---

## 🖼️ 스크린샷

> 📝 **TODO**: 스크린샷 추가 예정
>
> - 메인 화면 (파일 탐색기 + 에디터 + 미리보기)
> - 다이어그램 렌더링 예시
> - 다크 모드
> - Markdown 미리보기

---

## 📦 다운로드

### macOS

- **Apple Silicon (M1/M2/M3/M4)**
  - [DMG 다운로드](https://github.com/woobone/mermaid.me/releases/latest)
  - [ZIP 다운로드](https://github.com/woobone/mermaid.me/releases/latest)

- **Intel Mac (x64)**
  - [DMG 다운로드](https://github.com/woobone/mermaid.me/releases/latest)
  - [ZIP 다운로드](https://github.com/woobone/mermaid.me/releases/latest)

**시스템 요구사항**: macOS 12.0 이상

#### ⚠️ macOS 보안 경고 해결

"확인되지 않은 개발자" 경고가 나타나는 경우:

**방법 1 (권장)**: 앱 아이콘 우클릭 → "열기" 선택 → "열기" 클릭

**방법 2**: 터미널에서 실행
```bash
xattr -cr "/Applications/Mermaid Editor.app"
```

### Windows

- [설치 프로그램 (NSIS)](https://github.com/woobone/mermaid.me/releases/latest) - 권장
- [Portable 버전](https://github.com/woobone/mermaid.me/releases/latest) - 설치 불필요

**시스템 요구사항**: Windows 7 이상

### Linux

> 📝 **참고**: Linux 빌드는 현재 지원하지 않습니다.

---

## 🚀 주요 기능

### 1. 에디터 기능

#### Monaco Editor 통합
- VS Code와 동일한 편집 환경
- 구문 하이라이팅
- 자동완성 및 코드 포맷팅

#### 다크 모드
- 🌙/☀️ 토글 버튼으로 Light/Dark 테마 전환
- Monaco Editor 테마 자동 동기화
- Mermaid 다이어그램 테마 자동 동기화
- CSS 변수 기반 통합 테마 시스템

#### 파일 타입 지원
- **Mermaid** (`.mmd`, `.mermaid`) - 실시간 다이어그램 렌더링
- **Markdown** (`.md`, `.markdown`) - GFM 지원, 내부 Mermaid 블록 렌더링

### 2. 파일 관리

#### 스마트 파일 탐색기
- 트리 뷰 방식의 폴더 구조
- **Lazy Loading** - 폴더 확장 시에만 하위 항목 로드 (대규모 프로젝트 최적화)
- 실시간 파일 시스템 감시 (fs.watch 기반)
- 파일명 검색 필터링
- 컨텍스트 메뉴 (새 폴더/파일 생성, 삭제)

#### 워크스페이스 관리
- **북마크** - 자주 사용하는 폴더 즐겨찾기
- **최근 파일** - 워크스페이스별 최근 파일 목록 (최대 10개)
- **최근 폴더** - 최근 열린 폴더 목록 (최대 15개)
- **작업 공간 복원** - 앱 재시작 시 탭 상태 및 레이아웃 자동 복원

### 3. 탭 시스템

- 여러 파일 동시 편집
- 드래그 앤 드롭 재정렬
- 탭 컨텍스트 메뉴
  - 모든 탭 닫기
  - 다른 탭 닫기
  - 오른쪽 탭 닫기
- 탭별 수정 상태 추적 (`*` 표시)

### 4. 내보내기

지원 형식:
- **PNG** - 고화질 이미지 (디바이스 픽셀 비율 기반 2x 렌더링)
- **PDF** - PDF 문서 생성
- **SVG** - 벡터 그래픽 (Raw SVG / 호환성 SVG)
- **클립보드** - 다이어그램을 PNG로 클립보드에 복사

### 5. UI/UX

- **리사이저** - 파일 탐색기, 에디터, 미리보기 패널 크기 조절
- **레이아웃 저장** - electron-store를 통한 자동 저장 및 복원
- **빈 상태 화면** - 탭이 없을 때 안내 화면
- **네이티브 메뉴** - OS별 네이티브 메뉴 바

---

## ⌨️ 키보드 단축키

| 기능 | macOS | Windows/Linux |
|------|-------|---------------|
| 새 탭 | `Cmd + N` | `Ctrl + N` |
| 탭 닫기 | `Cmd + W` | `Ctrl + W` |
| 다음 탭 | `Ctrl + Tab` | `Ctrl + Tab` |
| 이전 탭 | `Ctrl + Shift + Tab` | `Ctrl + Shift + Tab` |
| 탭 번호로 전환 | `Cmd + 1-9` | `Ctrl + 1-9` |
| 파일 저장 | `Cmd + S` | `Ctrl + S` |
| 파일 열기 | `Cmd + O` | `Ctrl + O` |
| 폴더 열기 | `Cmd + Shift + O` | `Ctrl + Shift + O` |
| PNG 내보내기 | `Cmd + Shift + P` | `Ctrl + Shift + P` |
| PDF 내보내기 | `Cmd + Shift + D` | `Ctrl + Shift + D` |
| SVG 내보내기 | `Cmd + Shift + S` | `Ctrl + Shift + S` |

### 추가 기능

- **탭 드래그 앤 드롭** - 탭을 드래그하여 순서 변경
- **다이어그램 복사** - 미리보기 영역 우클릭 → "Copy Image to Clipboard"
- **파일 생성** - 파일 탐색기 우클릭 → "New File" / "New Folder"
- **북마크 추가** - 폴더 우클릭 → "Add to Bookmarks"

---

## 🛠 기술 스택

### 핵심 프레임워크
- **Electron** 39.0 - 크로스 플랫폼 데스크톱 앱
- **React** 18.2 - UI 프레임워크
- **Vite** 4.4 - 빌드 도구 및 개발 서버
- **TypeScript** 5.9 - 타입 안정성

### 에디터 & 렌더링
- **Monaco Editor** 4.5 - 코드 에디터
- **Mermaid.js** 11.12 - 다이어그램 렌더링
- **React Markdown** 10.1 - Markdown 렌더링
- **remark-gfm** 4.0 - GitHub Flavored Markdown
- **rehype-sanitize** 6.0 - XSS 방지

### 유틸리티
- **electron-store** 8.1 - 로컬 설정 저장
- **jsPDF** 3.0 - PDF 생성
- **html2canvas** 1.4 - Canvas 변환

### 테스트
- **Playwright** 1.57 - E2E 테스트

---

## 💻 개발 가이드

### 요구사항

- **Node.js** 22.0 이상
- **npm** 또는 **yarn**

### 설치

```bash
# 저장소 클론
git clone https://github.com/woobone/mermaid.me.git
cd mermaid.me

# 의존성 설치
npm install
```

### 개발 모드 실행

```bash
# 개발 서버 시작 (Electron + React 동시 실행)
npm run dev

# React 개발 서버만 시작 (포트: 5173)
npm run dev:renderer
```

### 빌드

```bash
# TypeScript 컴파일
npm run build:electron

# React 빌드
npm run build:renderer

# 전체 빌드
npm run build
```

### 패키징

```bash
# 배포용 패키징
npm run dist

# macOS (Apple Silicon)
npm run dist:mac:apple

# macOS (Intel)
npm run dist:mac:intel

# Windows
npm run dist:win

# 패키징 테스트 (dist 폴더에만)
npm run pack
```

### 테스트

```bash
# E2E 테스트 실행
npm test

# UI 모드
npm run test:ui

# Headed 모드 (브라우저 창 표시)
npm run test:headed

# 테스트 리포트 확인
npm run test:report
```

---

## 📂 프로젝트 구조

```
mermaid.me/
├── src/
│   ├── main/                    # Electron 메인 프로세스
│   │   ├── main.ts             # 앱 진입점 및 윈도우 관리
│   │   ├── handlers/           # IPC 핸들러 (모듈화)
│   │   │   ├── fileSystemHandlers.ts
│   │   │   ├── workspaceHandlers.ts
│   │   │   ├── exportHandlers.ts
│   │   │   ├── settingsHandlers.ts
│   │   │   └── themeHandlers.ts
│   │   ├── services/
│   │   │   └── fileWatcher.ts  # 파일 시스템 감시
│   │   └── utils/
│   │       └── fileTreeBuilder.ts
│   │
│   ├── preload/
│   │   └── preload.ts          # Electron 보안 브릿지
│   │
│   └── renderer/                # React 렌더러 프로세스
│       ├── App.jsx             # 메인 앱 컴포넌트
│       ├── components/         # React 컴포넌트
│       ├── hooks/              # Custom Hooks
│       ├── utils/              # 유틸리티 함수
│       └── constants/          # 상수 정의
│
├── tests/                       # E2E 테스트 (Playwright)
├── dist/                        # 빌드 산출물
├── assets/                      # 아이콘 및 리소스
├── package.json
├── tsconfig.json
├── vite.config.js
└── README.md
```

상세한 아키텍처 및 개발 가이드는 [CLAUDE.md](./CLAUDE.md)를 참고하세요.

---

## 🤝 기여하기

기여를 환영합니다! 다음 방법으로 참여할 수 있습니다:

1. 이 저장소를 Fork
2. Feature 브랜치 생성 (`git checkout -b feature/AmazingFeature`)
3. 변경사항 커밋 (`git commit -m 'Add some AmazingFeature'`)
4. 브랜치에 Push (`git push origin feature/AmazingFeature`)
5. Pull Request 생성

자세한 내용은 [CONTRIBUTING.md](./CONTRIBUTING.md)를 참고하세요.

---

## 📝 라이선스

이 프로젝트는 [MIT 라이선스](./LICENSE) 하에 배포됩니다.

```
MIT License

Copyright (c) 2024 woobone

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 💬 지원 및 문의

문제가 발생하거나 기능 제안이 있으시면:

- 📫 [GitHub Issues](https://github.com/woobone/mermaid.me/issues)에 문의
- 📧 이메일: jajakk@gmail.com

버그 리포트 시 다음 정보를 포함해주세요:
- 사용 중인 OS 및 버전
- 재현 방법
- 스크린샷 (가능한 경우)

---

## 🙏 감사의 말

이 프로젝트는 다음 오픈소스 프로젝트들을 사용합니다:

- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Mermaid.js](https://mermaid.js.org/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Vite](https://vitejs.dev/)

---

<div align="center">

**Made by [woobone](https://github.com/woobone)**

[⬆ 맨 위로](#mermaid-diagram-editor)

</div>
