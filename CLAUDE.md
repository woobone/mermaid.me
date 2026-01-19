# Mermaid Diagram Editor - Development Guide

## 📖 Project Overview

Cross-platform Mermaid diagram editor built on Electron.

**Key Features**:
- Mermaid (`.mmd`) and Markdown (`.md`) file support with real-time preview
- Workspace state persistence (tabs, layout, recent files)
- Lazy loading file explorer optimized for large projects
- Dark mode with system theme sync
- Multi-format export (PNG, PDF, SVG)

---

## 🛠 Tech Stack

### Core
- **Electron** 39.0 - Desktop framework
- **React** 18.2 - UI library
- **TypeScript** 5.9 - Type safety
- **Vite** 4.4 - Build tool

### Editor & Rendering
- **Monaco Editor** 4.5 - Code editor (VS Code)
- **Mermaid.js** 11.12 - Diagram rendering
- **React Markdown** 10.1 - Markdown rendering
- **remark-gfm** 4.0 - GitHub Flavored Markdown

### Utilities
- **electron-store** 8.1 - Local settings
- **jsPDF** 3.0 - PDF export
- **Playwright** 1.57 - E2E testing

---

## 📂 Project Structure

```
mermaid.me/
├── src/
│   ├── main/                    # Electron main process (TypeScript)
│   │   ├── main.ts             # App entry point
│   │   ├── handlers/           # IPC handlers (modularized)
│   │   ├── services/           # File watcher, etc.
│   │   └── utils/              # File tree builder
│   │
│   ├── preload/
│   │   └── preload.ts          # Security bridge (contextBridge)
│   │
│   └── renderer/                # React renderer (JSX/TypeScript)
│       ├── App.jsx
│       ├── components/
│       │   ├── Editor/         # EditorPanel, PreviewPanel, MermaidPreview
│       │   ├── FileExplorer/   # File tree, bookmarks, recent files
│       │   ├── TabView.jsx     # Tab management
│       │   └── Resizer.jsx
│       ├── hooks/              # useTabManager, useTheme, useDiagramRenderer
│       ├── utils/              # diagramExporter, fileTypeDetector
│       └── constants/
│
├── tests/                       # E2E tests (Playwright)
├── .github/workflows/           # GitHub Actions (auto build)
├── dist/                        # Build output
└── package.json
```

---

## 💻 Development Commands

```bash
# Install dependencies
npm install

# Development mode (Electron + React)
npm run dev

# Build TypeScript (main & preload)
npm run build:electron

# Build React (renderer)
npm run build:renderer

# Package for distribution
npm run dist              # All platforms
npm run dist:mac:apple    # macOS Apple Silicon
npm run dist:mac:intel    # macOS Intel
npm run dist:win          # Windows

# Testing
npm test                  # E2E tests
npm run test:ui           # UI mode
npm run test:headed       # Show browser
```

---

## 🏗 Architecture

### Electron Process Communication

```
Main Process (src/main/)
  ├─ IPC Handlers (handlers/)
  │   ├─ fileSystemHandlers.ts   # File I/O operations
  │   ├─ workspaceHandlers.ts    # Folder management, recent files
  │   ├─ exportHandlers.ts       # PNG/PDF/SVG export
  │   ├─ settingsHandlers.ts     # Bookmarks, layout
  │   └─ themeHandlers.ts        # Dark mode settings
  │
  ├─ Services
  │   └─ fileWatcher.ts          # fs.watch based file monitoring
  │
  └─ Utils
      └─ fileTreeBuilder.ts      # File tree generation

          ↕ IPC (ipcMain/ipcRenderer)

Preload (src/preload/)
  └─ preload.ts                  # contextBridge API exposure

          ↕ contextBridge

Renderer Process (src/renderer/)
  ├─ React Components
  ├─ Custom Hooks
  └─ electronAPI calls
```

### Key Features Implementation

**1. File Management**
- **Lazy Loading**: Load child items only when folders are expanded
- **Real-time Watch**: fs.watch based file system monitoring
- **Workspace State**: electron-store for persistent storage

**2. Tab System**
- Multiple file editing with drag-and-drop reordering
- Tab state auto-save per workspace (500ms debounce)
- Modification tracking (`*` indicator)

**3. Theme System**
- Dark/Light mode with CSS variables (112 variables)
- Auto-sync: Monaco Editor + Mermaid diagram themes
- System theme detection and follow

**4. Export Pipeline**
```
Mermaid Code
  ↓ generateRawSVG()
SVG String
  ↓ Blob → Image → Canvas
PNG/PDF/SVG
  ↓ electronAPI.saveExportedFile()
File System
```

---

## 🔧 Development Notes

### Security
- `nodeIntegration: false` - No Node.js in renderer
- `contextIsolation: true` - Separated contexts
- All file operations in main process only

### Performance Optimizations
- Mermaid rendering: 500ms debounce
- File tree: Lazy loading + lazy unwatch
- Tab state save: 500ms debounce

### TypeScript Migration
- **Completed**: Main process and preload
- **Remaining**: Renderer (JSX files)
- Output: `dist/tscbuild/`

### Testing
- E2E tests with Playwright + Electron
- Custom fixtures for test isolation
- 16 passing tests (tab management, file operations, etc.)

---

## 📦 Build & Release

### Local Build
```bash
npm run clean              # Clean dist/
npm run build:electron     # TypeScript compile
npm run build:renderer     # Vite build
npm run pack               # Test packaging
```

### GitHub Actions
- Automatic builds on tag push (`v*.*.*`)
- Builds: macOS (arm64 + x64), Windows (x64)
- Uploads to GitHub Releases
- See `.github/workflows/release.yml`

---

## 🔍 Key File Locations

| File | Purpose |
|------|---------|
| `src/main/main.ts` | App entry, window management, menu |
| `src/preload/preload.ts` | 43 safe API methods exposed |
| `src/renderer/App.jsx` | Main React component |
| `src/renderer/hooks/useTabManager.js` | Tab state management |
| `src/renderer/hooks/useTheme.js` | Theme management |
| `src/renderer/utils/diagramExporter.js` | Export logic (726 lines) |
| `src/main/services/fileWatcher.js` | File system monitoring |

---

## 🐛 Common Issues

### Development Server Won't Start
```bash
# Check if port 5173 is in use
lsof -i :5173

# Reinstall dependencies
rm -rf node_modules && npm install
```

### White Screen on Launch
- Open DevTools: View → Toggle Developer Tools
- Ensure Vite dev server is running first

### Build Fails
```bash
rm -rf dist
npm run build
```

### Test Failures
```bash
pkill -f vite  # Kill existing Vite processes
npm test
```

---

## 📚 Additional Resources

- **README.md**: User-facing documentation (English)
- **README_KR.md**: Korean documentation
- **LICENSE**: MIT License
- **.github/RELEASE_GUIDE.md**: Release process guide
- **Mermaid.js Docs**: https://mermaid.js.org/
- **Electron Docs**: https://www.electronjs.org/docs

---

## 🎯 Quick Start for Contributors

1. **Clone & Install**
   ```bash
   git clone https://github.com/woobone/mermaid.me.git
   cd mermaid.me
   npm install
   ```

2. **Start Development**
   ```bash
   npm run dev
   ```

3. **Make Changes**
   - Main process: `src/main/` (TypeScript)
   - Renderer: `src/renderer/` (React JSX)

4. **Test**
   ```bash
   npm test
   ```

5. **Build & Package**
   ```bash
   npm run pack  # Test build
   npm run dist  # Production build
   ```

---

*Last Updated: 2025-01-19*
*Version: 1.0.0*
