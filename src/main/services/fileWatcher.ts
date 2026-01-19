/**
 * 파일 시스템 감시 서비스
 * 폴더 내 파일 변경 사항을 실시간으로 감지
 * 개별 파일 변경 감지 (외부 프로세스에 의한 수정)
 */

import * as fs from 'fs';
import type { BrowserWindow } from 'electron';
import type { FSWatcher, Stats } from 'fs';
const { buildFileTree } = require('../utils/fileTreeBuilder');

interface FileTreeResult {
  children: unknown[];
}

class FileWatcher {
  private currentWatchedFolder: string | null = null;
  private folderWatchers: Map<string, FSWatcher> = new Map();
  private fileWatchers: Map<string, boolean> = new Map();
  private fileModTimes: Map<string, number> = new Map();
  private mainWindow: BrowserWindow | null = null;

  /**
   * 메인 윈도우 설정
   */
  setMainWindow(window: BrowserWindow): void {
    this.mainWindow = window;
  }

  /**
   * 폴더 감시 시작
   */
  startWatchingFolder(folderPath: string): void {
    this.currentWatchedFolder = folderPath;

    try {
      // 루트 폴더만 감시 시작 (lazy loading)
      this.watchDirectory(folderPath);
    } catch (error) {
      console.error('Error starting folder watch:', error);
    }
  }

  /**
   * 특정 폴더 감시
   */
  watchDirectory(dirPath: string): void {
    // 이미 감시 중이면 건너뛰기
    if (this.folderWatchers.has(dirPath)) {
      return;
    }

    try {
      // fs.watch: 파일 시스템 변경 감지
      const watcher = fs.watch(dirPath, { recursive: false }, async (eventType: string, filename: string | null) => {
        if (!filename || filename.startsWith('.')) return;

        console.log(`File system event: ${eventType} - ${filename} in ${dirPath}`);

        // 디바운싱: 100ms 후 실행 (연속된 이벤트 방지)
        setTimeout(async () => {
          try {
            // 변경된 폴더의 파일 트리만 재구성
            const children = await buildFileTree(dirPath) as FileTreeResult;
            // 렌더러에 업데이트 알림
            if (this.mainWindow && !this.mainWindow.isDestroyed()) {
              this.mainWindow.webContents.send('folder-children-updated', dirPath, children.children);
            }
          } catch (error) {
            console.error('Error rebuilding folder children:', error);
          }
        }, 100);
      });

      this.folderWatchers.set(dirPath, watcher);
      console.log(`Started watching: ${dirPath}`);

    } catch (error) {
      console.error(`Error watching directory ${dirPath}:`, error);
    }
  }

  /**
   * 특정 폴더 감시 중단
   */
  stopWatchingDirectory(dirPath: string): void {
    const watcher = this.folderWatchers.get(dirPath);
    if (watcher) {
      try {
        watcher.close();
        this.folderWatchers.delete(dirPath);
        console.log(`Stopped watching: ${dirPath}`);
      } catch (error) {
        console.error(`Error stopping watcher for ${dirPath}:`, error);
      }
    }
  }

  /**
   * 모든 폴더 감시 중단
   */
  stopWatchingAll(): void {
    this.folderWatchers.forEach((watcher, dirPath) => {
      try {
        watcher.close();
        console.log(`Stopped watching: ${dirPath}`);
      } catch (error) {
        console.error(`Error stopping watcher for ${dirPath}:`, error);
      }
    });
    this.folderWatchers.clear();
    this.currentWatchedFolder = null;
  }

  /**
   * 현재 감시 중인 폴더 반환
   */
  getCurrentWatchedFolder(): string | null {
    return this.currentWatchedFolder;
  }

  // ==========================================================================
  // 개별 파일 감시 (외부 변경 감지)
  // ==========================================================================

  /**
   * 파일 감시 시작
   */
  watchFile(filePath: string): void {
    // 이미 감시 중이면 건너뛰기
    if (this.fileWatchers.has(filePath)) {
      return;
    }

    try {
      // 현재 수정 시간 저장
      const stats = fs.statSync(filePath);
      this.fileModTimes.set(filePath, stats.mtimeMs);

      // fs.watchFile: 파일 변경 감지 (폴링 방식, 더 안정적)
      fs.watchFile(filePath, { interval: 1000 }, (curr: Stats, prev: Stats) => {
        // 파일이 삭제된 경우
        if (curr.mtimeMs === 0) {
          console.log(`File deleted: ${filePath}`);
          this.unwatchFile(filePath);
          return;
        }

        // 수정 시간이 변경된 경우
        const lastKnownMtime = this.fileModTimes.get(filePath);
        if (curr.mtimeMs !== lastKnownMtime) {
          console.log(`File changed externally: ${filePath}`);
          this.fileModTimes.set(filePath, curr.mtimeMs);

          // 렌더러에 파일 변경 알림
          if (this.mainWindow && !this.mainWindow.isDestroyed()) {
            this.mainWindow.webContents.send('file-changed-externally', filePath);
          }
        }
      });

      this.fileWatchers.set(filePath, true);
      console.log(`Started watching file: ${filePath}`);

    } catch (error) {
      console.error(`Error watching file ${filePath}:`, error);
    }
  }

  /**
   * 파일 감시 중단
   */
  unwatchFile(filePath: string): void {
    if (this.fileWatchers.has(filePath)) {
      try {
        fs.unwatchFile(filePath);
        this.fileWatchers.delete(filePath);
        this.fileModTimes.delete(filePath);
        console.log(`Stopped watching file: ${filePath}`);
      } catch (error) {
        console.error(`Error unwatching file ${filePath}:`, error);
      }
    }
  }

  /**
   * 파일 수정 시간 업데이트 (내부 저장 후 호출하여 자체 변경 무시)
   */
  updateFileModTime(filePath: string): void {
    try {
      const stats = fs.statSync(filePath);
      this.fileModTimes.set(filePath, stats.mtimeMs);
    } catch (error) {
      console.error(`Error updating mod time for ${filePath}:`, error);
    }
  }

  /**
   * 모든 파일 감시 중단
   */
  unwatchAllFiles(): void {
    this.fileWatchers.forEach((_, filePath) => {
      try {
        fs.unwatchFile(filePath);
      } catch (error) {
        console.error(`Error unwatching file ${filePath}:`, error);
      }
    });
    this.fileWatchers.clear();
    this.fileModTimes.clear();
  }
}

// 싱글톤 인스턴스
const fileWatcher = new FileWatcher();

module.exports = fileWatcher;
export default fileWatcher;
