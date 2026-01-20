# Mermaid Diagram Editor

<div align="center">

**Cross-platform Mermaid Diagram Editor**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Electron](https://img.shields.io/badge/Electron-39.0-47848F?logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-18.2-61DAFB?logo=react)](https://reactjs.org/)
[![Mermaid](https://img.shields.io/badge/Mermaid-11.12-FF3670?logo=mermaid)](https://mermaid.js.org/)

English | [한국어](./README_KR.md)

</div>

---

## 📖 Introduction

**Mermaid Diagram Editor** is a cross-platform desktop application built on Electron that allows you to edit Mermaid diagrams and Markdown files with real-time preview capabilities.

### ✨ Key Features

- 🎨 **Multi-format Support** - Edit both Mermaid (`.mmd`) and Markdown (`.md`) files
- 💻 **Monaco Editor** - VS Code's editor with syntax highlighting and auto-completion
- 🔄 **Real-time Preview** - Instant diagram rendering as you type
- 📁 **Smart File Management** - Lazy loading file explorer with real-time file watching
- 📑 **Advanced Tab System** - Edit multiple files simultaneously with drag-and-drop support
- ⭐ **Workspace Management** - Bookmarks, recent files, and automatic state restoration
- 📤 **Multiple Export Formats** - Export to PNG, PDF, SVG, or copy to clipboard
- 🖨️ **Markdown Print** - Print Markdown with preserved styling
- 🌙 **Dark Mode** - Light/Dark theme toggle with system theme sync
- ⚡ **High Performance** - Optimized for large projects with debouncing

---

## 🖼️ Screenshots

> 📝 **TODO**: Screenshots coming soon
>
> - Main interface (File explorer + Editor + Preview)
> - Diagram rendering examples
> - Dark mode
> - Markdown preview

---

## 📦 Download

### macOS

- **Apple Silicon (M1/M2/M3/M4)**
  - [Download DMG](https://github.com/woobone/mermaid.me/releases/latest)
  - [Download ZIP](https://github.com/woobone/mermaid.me/releases/latest)

- **Intel Mac (x64)**
  - [Download DMG](https://github.com/woobone/mermaid.me/releases/latest)
  - [Download ZIP](https://github.com/woobone/mermaid.me/releases/latest)

**System Requirements**: macOS 12.0 or later

#### ⚠️ macOS Security Notice

Since this app is not signed with an Apple Developer certificate, macOS may display one of the following warnings:

- **"Mermaid Editor is damaged and can't be opened"**
- **"Mermaid Editor can't be opened because Apple cannot check it for malicious software"**
- **"Mermaid Editor is from an unidentified developer"**

This is expected behavior for open-source apps distributed outside the Mac App Store. The app is safe to use.

**Solution**: Run this command in Terminal after moving the app to Applications:

```bash
xattr -cr "/Applications/Mermaid Editor.app"
```

Then open the app normally. This command removes the macOS quarantine flag that blocks unsigned apps downloaded from the internet.

### Windows

- [Installer (NSIS)](https://github.com/woobone/mermaid.me/releases/latest) - Recommended
- [Portable Version](https://github.com/woobone/mermaid.me/releases/latest) - No installation required

**System Requirements**: Windows 7 or later

### Linux

> 📝 **Note**: Linux builds are not currently supported.

---

## 🚀 Main Features

### 1. Editor Features

#### Monaco Editor Integration
- Same editing experience as VS Code
- Syntax highlighting
- Auto-completion and code formatting

#### Dark Mode
- 🌙/☀️ Toggle button for Light/Dark theme
- Automatic Monaco Editor theme synchronization
- Automatic Mermaid diagram theme synchronization
- CSS variable-based unified theme system

#### File Type Support
- **Mermaid** (`.mmd`, `.mermaid`) - Real-time diagram rendering
- **Markdown** (`.md`, `.markdown`) - GFM support with embedded Mermaid block rendering

### 2. File Management

#### Smart File Explorer
- Tree view folder structure
- **Lazy Loading** - Load child items only when folders are expanded (optimized for large projects)
- Real-time file system watching (fs.watch based)
- File name search filtering
- Context menu (Create new folder/file, Delete)

#### Workspace Management
- **Bookmarks** - Favorite frequently used folders
- **Recent Files** - Workspace-specific recent file list (up to 10)
- **Recent Folders** - Recently opened folder list (up to 15)
- **Workspace Restoration** - Automatically save and restore tab states and layouts on app restart

### 3. Tab System

- Edit multiple files simultaneously
- Drag and drop reordering
- Tab context menu
  - Close all tabs
  - Close other tabs
  - Close tabs to the right
- Track modification status per tab (`*` indicator)

### 4. Export

Supported formats:
- **PNG** - High-quality images (2x rendering based on device pixel ratio)
- **PDF** - PDF document generation
- **SVG** - Vector graphics (Raw SVG / Compatible SVG)
- **Clipboard** - Copy diagrams as PNG to clipboard

### 5. UI/UX

- **Resizers** - Adjust file explorer, editor, and preview panel sizes
- **Layout Persistence** - Automatic save and restore via electron-store
- **Empty State Screen** - Guidance screen when no tabs are open
- **Native Menus** - OS-specific native menu bars

---

## ⌨️ Keyboard Shortcuts

| Function | macOS | Windows/Linux |
|----------|-------|---------------|
| New Tab | `Cmd + N` | `Ctrl + N` |
| Close Tab | `Cmd + W` | `Ctrl + W` |
| Next Tab | `Ctrl + Tab` | `Ctrl + Tab` |
| Previous Tab | `Ctrl + Shift + Tab` | `Ctrl + Shift + Tab` |
| Switch to Tab 1-9 | `Cmd + 1-9` | `Ctrl + 1-9` |
| Save File | `Cmd + S` | `Ctrl + S` |
| Open File | `Cmd + O` | `Ctrl + O` |
| Open Folder | `Cmd + Shift + O` | `Ctrl + Shift + O` |
| Export PNG | `Cmd + Shift + P` | `Ctrl + Shift + P` |
| Export PDF | `Cmd + Shift + D` | `Ctrl + Shift + D` |
| Export SVG | `Cmd + Shift + S` | `Ctrl + Shift + S` |

### Additional Features

- **Tab Drag & Drop** - Drag tabs to reorder
- **Copy Diagram** - Right-click preview area → "Copy Image to Clipboard"
- **Create Files** - Right-click file explorer → "New File" / "New Folder"
- **Add Bookmarks** - Right-click folder → "Add to Bookmarks"

---

## 🛠 Tech Stack

### Core Frameworks
- **Electron** 39.0 - Cross-platform desktop app
- **React** 18.2 - UI framework
- **Vite** 4.4 - Build tool and dev server
- **TypeScript** 5.9 - Type safety

### Editor & Rendering
- **Monaco Editor** 4.5 - Code editor
- **Mermaid.js** 11.12 - Diagram rendering
- **React Markdown** 10.1 - Markdown rendering
- **remark-gfm** 4.0 - GitHub Flavored Markdown
- **rehype-sanitize** 6.0 - XSS prevention

### Utilities
- **electron-store** 8.1 - Local settings storage
- **jsPDF** 3.0 - PDF generation
- **html2canvas** 1.4 - Canvas conversion

### Testing
- **Playwright** 1.57 - E2E testing

---

## 💻 Development Guide

### Requirements

- **Node.js** 22.0 or higher
- **npm** or **yarn**

### Installation

```bash
# Clone repository
git clone https://github.com/woobone/mermaid.me.git
cd mermaid.me

# Install dependencies
npm install
```

### Development Mode

```bash
# Start dev server (Electron + React concurrently)
npm run dev

# Start React dev server only (port: 5173)
npm run dev:renderer
```

### Build

```bash
# Compile TypeScript
npm run build:electron

# Build React
npm run build:renderer

# Full build
npm run build
```

### Packaging

```bash
# Package for distribution
npm run dist

# macOS (Apple Silicon)
npm run dist:mac:apple

# macOS (Intel)
npm run dist:mac:intel

# Windows
npm run dist:win

# Package test (dist folder only)
npm run pack
```

### Testing

```bash
# Run E2E tests
npm test

# UI mode
npm run test:ui

# Headed mode (show browser window)
npm run test:headed

# View test report
npm run test:report
```

---

## 📂 Project Structure

```
mermaid.me/
├── src/
│   ├── main/                    # Electron main process
│   │   ├── main.ts             # App entry point and window management
│   │   ├── handlers/           # IPC handlers (modularized)
│   │   │   ├── fileSystemHandlers.ts
│   │   │   ├── workspaceHandlers.ts
│   │   │   ├── exportHandlers.ts
│   │   │   ├── settingsHandlers.ts
│   │   │   └── themeHandlers.ts
│   │   ├── services/
│   │   │   └── fileWatcher.ts  # File system watching
│   │   └── utils/
│   │       └── fileTreeBuilder.ts
│   │
│   ├── preload/
│   │   └── preload.ts          # Electron security bridge
│   │
│   └── renderer/                # React renderer process
│       ├── App.jsx             # Main app component
│       ├── components/         # React components
│       ├── hooks/              # Custom hooks
│       ├── utils/              # Utility functions
│       └── constants/          # Constants
│
├── tests/                       # E2E tests (Playwright)
├── dist/                        # Build output
├── assets/                      # Icons and resources
├── package.json
├── tsconfig.json
├── vite.config.js
└── README.md
```

For detailed architecture and development guide, see [CLAUDE.md](./CLAUDE.md).

---

## 🤝 Contributing

Contributions are welcome! Here's how you can help:

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

For more details, see [CONTRIBUTING.md](./CONTRIBUTING.md).

---

## 📝 License

This project is distributed under the [MIT License](./LICENSE).

```
MIT License

Copyright (c) 2024 woobone

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction...
```

---

## 💬 Support

If you encounter issues or have feature suggestions:

- 📫 [GitHub Issues](https://github.com/woobone/mermaid.me/issues)
- 📧 Email: jajakk@gmail.com

When reporting bugs, please include:
- OS and version
- Steps to reproduce
- Screenshots (if applicable)

---

## 🙏 Acknowledgments

This project uses the following open source projects:

- [Electron](https://www.electronjs.org/)
- [React](https://reactjs.org/)
- [Mermaid.js](https://mermaid.js.org/)
- [Monaco Editor](https://microsoft.github.io/monaco-editor/)
- [Vite](https://vitejs.dev/)

---

<div align="center">

**Made by [woobone](https://github.com/woobone)**

[⬆ Back to Top](#mermaid-diagram-editor)

</div>
