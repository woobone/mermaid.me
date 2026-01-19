/**
 * ============================================================================
 * Electron 메인 프로세스 (리팩토링 버전)
 * ============================================================================
 *
 * 역할: Electron 애플리케이션의 중심 프로세스
 * - 윈도우 관리 및 애플리케이션 생명주기
 * - IPC 핸들러 등록 (모듈화)
 * - 네이티브 메뉴 생성
 *
 * 리팩토링 개선사항:
 * - 1288줄 → 약 200줄로 축소
 * - 기능별 모듈 분리로 유지보수성 향상
 * - 중복 코드 제거 및 책임 분리
 * ============================================================================
 */

// ============================================================================
// 모듈 Import
// ============================================================================

// Electron 핵심 모듈
import { app, BrowserWindow, Menu, dialog, MenuItemConstructorOptions } from 'electron';
import * as path from 'path';
import * as fs from 'fs/promises';

// 서드파티 모듈
import Store from 'electron-store';

// 타입
import type { StoreSchema } from '../types';

// 커스텀 핸들러 모듈
import { registerFileSystemHandlers } from './handlers/fileSystemHandlers';
import { registerWorkspaceHandlers } from './handlers/workspaceHandlers';
import { registerExportHandlers } from './handlers/exportHandlers';
import { registerSettingsHandlers } from './handlers/settingsHandlers';
import { registerThemeHandlers } from './handlers/themeHandlers';
import { registerTerminalHandlers, cleanupTerminals } from './handlers/terminalHandlers';

// 서비스 모듈
const fileWatcher = require('./services/fileWatcher');
const ptyManager = require('./services/ptyManager');

// ============================================================================
// 전역 변수
// ============================================================================

interface StoreConfig {
  name?: string;
  cwd?: string;
}

// 테스트 환경에서는 별도의 저장소 사용
const storeConfig: StoreConfig = process.env.NODE_ENV === 'test'
  ? { name: 'test-config', cwd: app.getPath('temp') }
  : {};

const store = new Store<StoreSchema>(storeConfig);

// 테스트 환경에서는 시작 시 저장소 초기화
if (process.env.NODE_ENV === 'test') {
  store.clear();
  console.log('[Test] Electron store cleared for test environment');
}

let mainWindow: BrowserWindow | null = null;
let handlersRegistered = false;  // IPC 핸들러 등록 여부 추적

// ============================================================================
// 윈도우 생성 함수
// ============================================================================

function createWindow(): void {
  // 이미 윈도우가 존재하면 포커스만 주고 반환
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore();
    mainWindow.focus();
    return;
  }

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, '../preload/preload.js')
    },
    show: false
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../vite/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  // 창이 닫힐 때 처리
  mainWindow.on('closed', () => {
    // macOS에서는 창만 닫고 앱은 유지
    mainWindow = null;
  });

  // IPC 핸들러는 앱 생명주기 동안 한 번만 등록
  if (!handlersRegistered) {
    registerAllHandlers();
    handlersRegistered = true;
  } else {
    // 창이 다시 생성된 경우 mainWindow 참조만 업데이트
    updateMainWindowReference();
  }
}

// ============================================================================
// IPC 핸들러 등록
// ============================================================================

function registerAllHandlers(): void {
  // mainWindow getter 함수 생성
  const getMainWindow = (): BrowserWindow | null => mainWindow;

  // 각 모듈의 핸들러 등록 (getter 함수 전달)
  registerFileSystemHandlers(getMainWindow, store);
  registerWorkspaceHandlers(getMainWindow, store);
  registerExportHandlers(getMainWindow);
  registerSettingsHandlers(store);
  registerThemeHandlers(getMainWindow, store);
  registerTerminalHandlers(getMainWindow, store);
}

// ============================================================================
// 메인 윈도우 참조 업데이트
// ============================================================================

function updateMainWindowReference(): void {
  // fileWatcher에 새 mainWindow 참조 전달
  if (mainWindow) {
    fileWatcher.setMainWindow(mainWindow);
    ptyManager.setMainWindow(mainWindow);
  }
}

// ============================================================================
// 네이티브 메뉴 생성
// ============================================================================

function createMenu(): void {
  const isMac = process.platform === 'darwin';

  const template: MenuItemConstructorOptions[] = [
    // macOS 전용: 앱 이름 메뉴
    ...(isMac ? [{
      label: app.getName(),
      submenu: [
        { role: 'about' as const },
        { type: 'separator' as const },
        { role: 'services' as const },
        { type: 'separator' as const },
        { role: 'hide' as const },
        { role: 'hideOthers' as const },
        { role: 'unhide' as const },
        { type: 'separator' as const },
        { role: 'quit' as const }
      ]
    }] : []),

    // File 메뉴
    {
      label: 'File',
      submenu: [
        {
          label: 'New',
          accelerator: 'CmdOrCtrl+N',
          click: (): void => {
            mainWindow?.webContents.send('menu-new');
          }
        },
        {
          label: 'Open',
          accelerator: 'CmdOrCtrl+O',
          click: async (): Promise<void> => {
            if (!mainWindow) return;

            const result = await dialog.showOpenDialog(mainWindow, {
              filters: [
                { name: 'Supported Files', extensions: ['mmd', 'mermaid', 'md', 'markdown'] },
                { name: 'Mermaid Files', extensions: ['mmd', 'mermaid'] },
                { name: 'Markdown Files', extensions: ['md', 'markdown'] },
                { name: 'All Files', extensions: ['*'] }
              ]
            });

            if (!result.canceled && result.filePaths.length > 0) {
              const content = await fs.readFile(result.filePaths[0], 'utf-8');
              mainWindow.webContents.send('menu-open', content, result.filePaths[0]);
            }
          }
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: (): void => {
            mainWindow?.webContents.send('menu-save');
          }
        },
        { type: 'separator' as const },
        {
          label: 'Export as PNG',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: (): void => {
            mainWindow?.webContents.send('menu-export-png');
          }
        },
        {
          label: 'Export as PDF',
          accelerator: 'CmdOrCtrl+Shift+D',
          click: (): void => {
            mainWindow?.webContents.send('menu-export-pdf');
          }
        },
        {
          label: 'Export as SVG',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: (): void => {
            mainWindow?.webContents.send('menu-export-svg');
          }
        },
        ...(isMac ? [] : [
          { type: 'separator' as const },
          { role: 'quit' as const }
        ])
      ]
    },

    // Edit 메뉴
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        ...(isMac ? [
          { role: 'pasteAndMatchStyle' as const },
          { role: 'delete' as const },
          { role: 'selectAll' as const },
          { type: 'separator' as const },
          {
            label: 'Speech',
            submenu: [
              { role: 'startSpeaking' as const },
              { role: 'stopSpeaking' as const }
            ]
          }
        ] : [
          { role: 'delete' as const },
          { type: 'separator' as const },
          { role: 'selectAll' as const }
        ])
      ]
    },

    // View 메뉴
    {
      label: 'View',
      submenu: [
        { role: 'reload' as const },
        { role: 'forceReload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const }
      ]
    },

    // Window 메뉴
    {
      label: 'Window',
      submenu: [
        { role: 'minimize' as const },
        { role: 'close' as const },
        ...(isMac ? [
          { type: 'separator' as const },
          { role: 'front' as const },
          { type: 'separator' as const },
          { role: 'window' as const }
        ] : [])
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// ============================================================================
// 애플리케이션 생명주기 이벤트
// ============================================================================

// Electron 앱이 준비되면 실행
app.whenReady().then(() => {
  createWindow();
  createMenu();

  // macOS: Dock 아이콘 클릭 시 창 다시 열기
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

// 모든 창이 닫혔을 때
app.on('window-all-closed', () => {
  fileWatcher.stopWatchingAll();
  cleanupTerminals();

  // macOS가 아니면 앱 종료
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// 앱 종료 전
app.on('before-quit', () => {
  fileWatcher.stopWatchingAll();
  cleanupTerminals();
});