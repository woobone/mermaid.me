/**
 * ============================================================================
 * PTY Manager - 터미널 프로세스 관리 서비스
 * ============================================================================
 *
 * 역할: node-pty 인스턴스 관리 및 터미널 프로세스 생명주기 관리
 *
 * 주요 기능:
 * - 터미널 프로세스 생성/종료
 * - stdin/stdout 데이터 전달
 * - 터미널 크기 조절
 * - 다중 터미널 지원
 * ============================================================================
 */

import { app, BrowserWindow } from 'electron';
import * as os from 'os';
import * as path from 'path';
import type { IPty } from '@homebridge/node-pty-prebuilt-multiarch';

interface PtyModule {
  spawn: (
    shell: string,
    args: string[],
    options: {
      name: string;
      cols: number;
      rows: number;
      cwd: string;
      env: NodeJS.ProcessEnv;
    }
  ) => IPty;
}

interface TerminalOptions {
  cols?: number;
  rows?: number;
  cwd?: string;
}

/**
 * 패키징된 앱에서 node-pty 네이티브 모듈 로드
 * asar.unpacked 경로에서 로드해야 함
 */
function loadNodePty(): PtyModule {
  if (app.isPackaged) {
    // 패키징된 앱: app.asar.unpacked에서 로드
    const unpackedPath = path.join(
      process.resourcesPath,
      'app.asar.unpacked',
      'node_modules',
      '@homebridge',
      'node-pty-prebuilt-multiarch'
    );
    return require(unpackedPath);
  } else {
    // 개발 모드: 일반 require
    return require('@homebridge/node-pty-prebuilt-multiarch');
  }
}

const pty = loadNodePty();

class PtyManager {
  private terminals: Map<string, IPty> = new Map();
  private mainWindow: BrowserWindow | null = null;

  /**
   * 메인 윈도우 참조 설정
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * 새 터미널 프로세스 생성
   */
  create(id: string, options: TerminalOptions = {}): string {
    // 운영체제별 기본 쉘 선택
    const shell = this._getDefaultShell();
    const shellArgs = this._getShellArgs();

    // 작업 디렉토리 결정
    const cwd = options.cwd || process.env.HOME || os.homedir();

    // 환경 변수 설정
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      TERM: 'xterm-256color',
      COLORTERM: 'truecolor',
      // PATH에 일반적인 CLI 도구 경로 추가
      PATH: this._enhancePath(process.env.PATH)
    };

    // nvm과 충돌하는 환경변수 제거
    delete env.npm_config_prefix;

    try {
      const ptyProcess = pty.spawn(shell, shellArgs, {
        name: 'xterm-256color',
        cols: options.cols || 80,
        rows: options.rows || 24,
        cwd: cwd,
        env: env
      });

      // 데이터 출력 이벤트
      ptyProcess.onData((data: string) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('terminal:output', { id, data });
        }
      });

      // 프로세스 종료 이벤트
      ptyProcess.onExit(({ exitCode, signal }: { exitCode: number; signal?: number }) => {
        if (this.mainWindow && !this.mainWindow.isDestroyed()) {
          this.mainWindow.webContents.send('terminal:exit', { id, exitCode, signal });
        }
        this.terminals.delete(id);
      });

      this.terminals.set(id, ptyProcess);
      console.log(`[PtyManager] Terminal created: ${id}, shell: ${shell}, cwd: ${cwd}`);
      return id;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      console.error(`[PtyManager] Failed to create terminal: ${errorMessage}`);
      throw error;
    }
  }

  /**
   * 터미널에 데이터 쓰기 (사용자 입력)
   */
  write(id: string, data: string): void {
    const terminal = this.terminals.get(id);
    if (terminal) {
      terminal.write(data);
    }
  }

  /**
   * 터미널 크기 변경
   */
  resize(id: string, cols: number, rows: number): void {
    const terminal = this.terminals.get(id);
    if (terminal) {
      try {
        terminal.resize(cols, rows);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[PtyManager] Failed to resize terminal ${id}:`, errorMessage);
      }
    }
  }

  /**
   * 특정 터미널 종료
   */
  kill(id: string): void {
    const terminal = this.terminals.get(id);
    if (terminal) {
      try {
        terminal.kill();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[PtyManager] Failed to kill terminal ${id}:`, errorMessage);
      }
      this.terminals.delete(id);
      console.log(`[PtyManager] Terminal killed: ${id}`);
    }
  }

  /**
   * 모든 터미널 종료
   */
  killAll(): void {
    for (const [id, terminal] of this.terminals) {
      try {
        terminal.kill();
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error(`[PtyManager] Failed to kill terminal ${id}:`, errorMessage);
      }
    }
    this.terminals.clear();
    console.log('[PtyManager] All terminals killed');
  }

  /**
   * 터미널 존재 여부 확인
   */
  has(id: string): boolean {
    return this.terminals.has(id);
  }

  /**
   * 활성 터미널 개수
   */
  count(): number {
    return this.terminals.size;
  }

  /**
   * 운영체제별 기본 쉘 반환
   */
  private _getDefaultShell(): string {
    if (os.platform() === 'win32') {
      // Windows: PowerShell 우선, 없으면 cmd
      return process.env.COMSPEC || 'cmd.exe';
    }

    // macOS/Linux: 사용자 기본 쉘 또는 zsh/bash
    return process.env.SHELL || '/bin/zsh';
  }

  /**
   * 운영체제별 쉘 인자 반환
   */
  private _getShellArgs(): string[] {
    if (os.platform() === 'win32') {
      return [];
    }

    // macOS/Linux: 로그인 쉘로 실행 (-l)
    return ['-l'];
  }

  /**
   * PATH 환경변수 확장 (일반적인 CLI 도구 경로 추가)
   */
  private _enhancePath(currentPath: string | undefined): string {
    const additionalPaths: string[] = [];

    if (os.platform() === 'darwin') {
      // macOS: Homebrew, npm global 등 추가
      additionalPaths.push(
        '/usr/local/bin',
        '/opt/homebrew/bin',
        '/opt/homebrew/sbin',
        path.join(os.homedir(), '.npm-global/bin'),
        path.join(os.homedir(), '.nvm/versions/node/*/bin'),
        '/usr/local/opt/node/bin'
      );
    } else if (os.platform() === 'linux') {
      // Linux: 일반적인 경로 추가
      additionalPaths.push(
        '/usr/local/bin',
        path.join(os.homedir(), '.npm-global/bin'),
        path.join(os.homedir(), '.local/bin')
      );
    }

    // 중복 제거 및 결합
    const pathSet = new Set([...additionalPaths, ...(currentPath || '').split(path.delimiter)]);
    return Array.from(pathSet).filter(Boolean).join(path.delimiter);
  }
}

// 싱글톤 인스턴스 export
const ptyManager = new PtyManager();
module.exports = ptyManager;
export default ptyManager;
