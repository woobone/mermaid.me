/**
 * ============================================================================
 * Terminal IPC Handlers
 * ============================================================================
 *
 * 역할: 터미널 관련 IPC 통신 처리
 *
 * 제공 채널:
 * - terminal:create: 새 터미널 생성
 * - terminal:input: 터미널 입력 전달
 * - terminal:resize: 터미널 크기 변경
 * - terminal:kill: 터미널 종료
 * - terminal:set-cwd: 작업 디렉토리 변경
 * ============================================================================
 */

import { ipcMain, BrowserWindow, IpcMainEvent } from 'electron';
import type Store from 'electron-store';
import type { TerminalCreateOptions, TerminalStateData, StoreSchema, TerminalStatesByWorkspace } from '../../types';

const ptyManager = require('../services/ptyManager');

/**
 * 터미널 관련 IPC 핸들러 등록
 */
export function registerTerminalHandlers(
  getMainWindow: () => BrowserWindow | null,
  store: Store<StoreSchema>
): void {
  // 메인 윈도우 참조를 ptyManager에 전달하는 함수
  const updatePtyManagerWindow = (): void => {
    const mainWindow = getMainWindow();
    if (mainWindow) {
      ptyManager.setMainWindow(mainWindow);
    }
  };

  // 초기 설정
  updatePtyManagerWindow();

  // ========================================
  // terminal:create - 새 터미널 생성
  // ========================================
  ipcMain.handle('terminal:create', async (_event, options: TerminalCreateOptions): Promise<{ success: boolean; id: string; error?: string }> => {
    try {
      updatePtyManagerWindow();
      // 프론트엔드에서 전달한 ID 사용, 없으면 자체 생성
      const id = options.id || `terminal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      ptyManager.create(id, options);
      return { success: true, id };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[TerminalHandlers] Failed to create terminal:', errorMessage);
      return { success: false, id: '', error: errorMessage };
    }
  });

  // ========================================
  // terminal:input - 터미널 입력 전달
  // ========================================
  ipcMain.on('terminal:input', (_event: IpcMainEvent, { id, data }: { id: string; data: string }) => {
    try {
      ptyManager.write(id, data);
    } catch (error) {
      console.error('[TerminalHandlers] Failed to write to terminal:', error);
    }
  });

  // ========================================
  // terminal:resize - 터미널 크기 변경
  // ========================================
  ipcMain.on('terminal:resize', (_event: IpcMainEvent, { id, cols, rows }: { id: string; cols: number; rows: number }) => {
    try {
      ptyManager.resize(id, cols, rows);
    } catch (error) {
      console.error('[TerminalHandlers] Failed to resize terminal:', error);
    }
  });

  // ========================================
  // terminal:kill - 터미널 종료
  // ========================================
  ipcMain.handle('terminal:kill', async (_event, { id }: { id: string }): Promise<{ success: boolean; error?: string }> => {
    try {
      ptyManager.kill(id);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[TerminalHandlers] Failed to kill terminal:', error);
      return { success: false, error: errorMessage };
    }
  });

  // ========================================
  // terminal:kill-all - 모든 터미널 종료
  // ========================================
  ipcMain.handle('terminal:kill-all', async (): Promise<{ success: boolean; error?: string }> => {
    try {
      ptyManager.killAll();
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[TerminalHandlers] Failed to kill all terminals:', error);
      return { success: false, error: errorMessage };
    }
  });

  // ========================================
  // terminal:get-count - 활성 터미널 개수
  // ========================================
  ipcMain.handle('terminal:get-count', async (): Promise<{ count: number }> => {
    return { count: ptyManager.count() };
  });

  // ========================================
  // terminal:save-state - 터미널 상태 저장
  // ========================================
  ipcMain.handle('terminal:save-state', async (_event, { workspace, state }: { workspace: string; state: TerminalStateData }): Promise<{ success: boolean; error?: string }> => {
    try {
      const terminalStates = store.get('terminalStatesByWorkspace', {}) as TerminalStatesByWorkspace;
      terminalStates[workspace] = state;
      store.set('terminalStatesByWorkspace', terminalStates);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error('[TerminalHandlers] Failed to save terminal state:', error);
      return { success: false, error: errorMessage };
    }
  });

  // ========================================
  // terminal:get-state - 터미널 상태 로드
  // ========================================
  ipcMain.handle('terminal:get-state', async (_event, { workspace }: { workspace: string }): Promise<TerminalStateData | null> => {
    try {
      const terminalStates = store.get('terminalStatesByWorkspace', {}) as TerminalStatesByWorkspace;
      return terminalStates[workspace] || null;
    } catch (error) {
      console.error('[TerminalHandlers] Failed to get terminal state:', error);
      return null;
    }
  });

  console.log('[TerminalHandlers] Terminal handlers registered');
}

/**
 * 앱 종료 시 모든 터미널 정리
 */
export function cleanupTerminals(): void {
  ptyManager.killAll();
}

module.exports = {
  registerTerminalHandlers,
  cleanupTerminals
};
