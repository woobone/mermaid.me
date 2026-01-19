/**
 * ============================================================================
 * TerminalPanel - 멀티 터미널 UI 컴포넌트
 * ============================================================================
 *
 * 역할: xterm.js 기반 멀티 터미널 에뮬레이터 UI
 *
 * 기능:
 * - 다중 터미널 탭 관리 (추가/삭제/전환)
 * - 각 터미널별 독립적인 PTY 세션
 * - 터미널 크기 자동 조절
 * - 다크/라이트 테마 지원
 * - 탭 스크롤 (많은 터미널일 때)
 * ============================================================================
 */

import React, { useEffect, useRef, useState, useCallback, ReactElement, MouseEvent, KeyboardEvent, ChangeEvent } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import { WebLinksAddon } from '@xterm/addon-web-links';
import { SerializeAddon } from '@xterm/addon-serialize';
import { useTabScrolling } from '../../hooks/useTabScrolling';
import '@xterm/xterm/css/xterm.css';
import './TerminalPanel.css';
import type { TerminalStateData, TerminalInfo, ThemeMode } from '../../../types';

interface TerminalTab {
  id: string;
  name: string;
  isInitialized: boolean;
}

interface TerminalContextMenu {
  x: number;
  y: number;
  terminalId: string;
}

interface TerminalPanelProps {
  isVisible: boolean;
  height: number;
  onClose: () => void;
  workspace: string | null;
  theme?: ThemeMode;
}

interface TerminalTheme {
  background: string;
  foreground: string;
  cursor: string;
  cursorAccent: string;
  selection: string;
  black: string;
  red: string;
  green: string;
  yellow: string;
  blue: string;
  magenta: string;
  cyan: string;
  white: string;
  brightBlack: string;
  brightRed: string;
  brightGreen: string;
  brightYellow: string;
  brightBlue: string;
  brightMagenta: string;
  brightCyan: string;
  brightWhite: string;
}

type DebouncedFunction<T extends (...args: unknown[]) => void> = (...args: Parameters<T>) => void;

/**
 * 디바운스 함수 - 연속 호출 시 마지막 호출만 실행
 */
function debounce<T extends (...args: unknown[]) => void>(fn: T, delay: number): DebouncedFunction<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  return function (this: unknown, ...args: Parameters<T>): void {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
    timeoutId = setTimeout(() => {
      fn.apply(this, args);
      timeoutId = null;
    }, delay);
  };
}

/**
 * 터미널 패널 컴포넌트
 */
function TerminalPanel({ isVisible, height, onClose, workspace, theme = 'dark' }: TerminalPanelProps): ReactElement | null {
  // ========================================
  // 상태 관리
  // ========================================
  const [terminals, setTerminals] = useState<TerminalTab[]>([]);
  const [activeTerminalId, setActiveTerminalId] = useState<string | null>(null);
  const [nextTerminalNumber, setNextTerminalNumber] = useState<number>(1);

  // 탭 이름 변경 상태
  const [editingTerminalId, setEditingTerminalId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<TerminalContextMenu | null>(null);

  // ========================================
  // Refs (mutable 객체 관리)
  // ========================================
  const xtermRefs = useRef<Record<string, Terminal>>({});
  const fitAddonRefs = useRef<Record<string, FitAddon>>({});
  const serializeAddonRefs = useRef<Record<string, SerializeAddon>>({});
  const terminalContainerRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const savedScrollbackRefs = useRef<Record<string, string>>({});

  // 이전 워크스페이스 추적 (변경 감지용)
  const prevWorkspaceRef = useRef<string | null>(workspace);

  // 최신 상태를 참조할 refs (클로저 문제 해결)
  const terminalsRef = useRef<TerminalTab[]>(terminals);
  const activeTerminalIdRef = useRef<string | null>(activeTerminalId);
  const nextTerminalNumberRef = useRef<number>(nextTerminalNumber);
  const workspaceRef = useRef<string | null>(workspace);

  // ========================================
  // 탭 스크롤 훅
  // ========================================
  const {
    scrollContainerRef,
    canScrollLeft,
    canScrollRight,
    scrollTabs,
    checkScrollButtons,
    handleWheel
  } = useTabScrolling(activeTerminalId, terminals.length);

  // ========================================
  // 테마 설정
  // ========================================
  const getTerminalTheme = useCallback((currentTheme: ThemeMode): TerminalTheme => {
    if (currentTheme === 'light') {
      return {
        background: '#ffffff',
        foreground: '#1e1e1e',
        cursor: '#1e1e1e',
        cursorAccent: '#ffffff',
        selection: 'rgba(0, 120, 212, 0.3)',
        black: '#000000',
        red: '#cd3131',
        green: '#00bc00',
        yellow: '#949800',
        blue: '#0451a5',
        magenta: '#bc05bc',
        cyan: '#0598bc',
        white: '#555555',
        brightBlack: '#666666',
        brightRed: '#cd3131',
        brightGreen: '#14ce14',
        brightYellow: '#b5ba00',
        brightBlue: '#0451a5',
        brightMagenta: '#bc05bc',
        brightCyan: '#0598bc',
        brightWhite: '#a5a5a5'
      };
    }
    // Dark theme (default)
    return {
      background: '#1e1e1e',
      foreground: '#cccccc',
      cursor: '#ffffff',
      cursorAccent: '#000000',
      selection: 'rgba(38, 79, 120, 0.5)',
      black: '#000000',
      red: '#cd3131',
      green: '#0dbc79',
      yellow: '#e5e510',
      blue: '#2472c8',
      magenta: '#bc3fbc',
      cyan: '#11a8cd',
      white: '#e5e5e5',
      brightBlack: '#666666',
      brightRed: '#f14c4c',
      brightGreen: '#23d18b',
      brightYellow: '#f5f543',
      brightBlue: '#3b8eea',
      brightMagenta: '#d670d6',
      brightCyan: '#29b8db',
      brightWhite: '#e5e5e5'
    };
  }, []);

  // ========================================
  // ref 값 동기화 (렌더링마다 최신 상태로 업데이트)
  // ========================================
  useEffect(() => {
    terminalsRef.current = terminals;
    activeTerminalIdRef.current = activeTerminalId;
    nextTerminalNumberRef.current = nextTerminalNumber;
    workspaceRef.current = workspace;
  });

  // ========================================
  // 스크롤백 직렬화 함수
  // ========================================
  const serializeScrollback = useCallback((terminalId: string): string => {
    const serializeAddon = serializeAddonRefs.current[terminalId];
    if (serializeAddon) {
      try {
        // 최대 1000줄까지 직렬화 (저장 용량과 성능 균형)
        return serializeAddon.serialize({ scrollback: 1000 });
      } catch (e) {
        console.warn('[TerminalPanel] Failed to serialize scrollback:', e);
        return '';
      }
    }
    return '';
  }, []);

  // ========================================
  // 상태 저장 함수 (즉시 저장 버전)
  // ========================================
  const saveTerminalStateImmediate = useCallback(async (): Promise<void> => {
    const currentWorkspace = workspaceRef.current;
    const currentTerminals = terminalsRef.current;
    const currentActiveId = activeTerminalIdRef.current;
    const currentNextNum = nextTerminalNumberRef.current;

    if (!currentWorkspace || currentTerminals.length === 0) return;

    // 초기화된 터미널만 저장 (serializeAddon이 있는 터미널)
    const terminalsToSave = currentTerminals.filter(t =>
      serializeAddonRefs.current[t.id] !== undefined
    );

    // 초기화된 터미널이 없으면 저장하지 않음
    if (terminalsToSave.length === 0) {
      console.log('[TerminalPanel] No initialized terminals to save');
      return;
    }

    const state: TerminalStateData = {
      terminals: terminalsToSave.map(t => {
        const scrollback = serializeScrollback(t.id);
        console.log(`[TerminalPanel] Saving terminal "${t.name}": scrollback length = ${scrollback.length}`);
        return {
          id: t.id,
          name: t.name,
          cwd: currentWorkspace,
          scrollback
        };
      }),
      activeIndex: terminalsToSave.findIndex(t => t.id === currentActiveId),
      nextTerminalNumber: currentNextNum
    };

    console.log(`[TerminalPanel] Saving ${state.terminals.length} terminals to workspace: ${currentWorkspace}`);
    await window.electronAPI.terminalSaveState(currentWorkspace, state);
  }, [serializeScrollback]);

  // ========================================
  // 상태 저장 함수 (디바운스 적용, useRef 패턴)
  // ========================================
  const saveTerminalStateRef = useRef<DebouncedFunction<() => Promise<void>> | null>(null);

  // 디바운스된 저장 함수를 ref로 관리
  useEffect(() => {
    saveTerminalStateRef.current = debounce(saveTerminalStateImmediate, 500);
  }, [saveTerminalStateImmediate]);

  const saveTerminalState = useCallback((): void => {
    if (saveTerminalStateRef.current) {
      saveTerminalStateRef.current();
    }
  }, []);

  // ========================================
  // 모든 터미널 정리 함수
  // ========================================
  const cleanupAllTerminals = useCallback((): void => {
    // 모든 xterm dispose
    Object.values(xtermRefs.current).forEach(xterm => {
      if (xterm) xterm.dispose();
    });
    // 모든 PTY 종료
    window.electronAPI.terminalKillAll().catch(console.error);

    // refs 초기화
    xtermRefs.current = {};
    fitAddonRefs.current = {};
    serializeAddonRefs.current = {};
    terminalContainerRefs.current = {};
    savedScrollbackRefs.current = {};
  }, []);

  // ========================================
  // 터미널 추가
  // ========================================
  const addTerminal = useCallback((): void => {
    const newTerminal: TerminalTab = {
      id: crypto.randomUUID(),
      name: `Terminal ${nextTerminalNumber}`,
      isInitialized: false
    };
    setTerminals(prev => [...prev, newTerminal]);
    setActiveTerminalId(newTerminal.id);
    setNextTerminalNumber(prev => prev + 1);
  }, [nextTerminalNumber]);

  // ========================================
  // 터미널 초기화 (xterm + PTY 연결)
  // ========================================
  const initializeTerminal = useCallback(async (terminalId: string, container: HTMLDivElement): Promise<void> => {
    // 이미 초기화된 경우 스킵
    if (xtermRefs.current[terminalId]) return;

    // xterm.js 초기화
    const term = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      lineHeight: 1.2,
      theme: getTerminalTheme(theme),
      allowProposedApi: true,
      scrollback: 10000,
      convertEol: true
    });

    const fitAddon = new FitAddon();
    const webLinksAddon = new WebLinksAddon();
    const serializeAddon = new SerializeAddon();

    term.loadAddon(fitAddon);
    term.loadAddon(webLinksAddon);
    term.loadAddon(serializeAddon);
    term.open(container);

    // 저장된 스크롤백 복원 (PTY 연결 전!)
    const savedScrollback = savedScrollbackRefs.current[terminalId];
    if (savedScrollback && savedScrollback.length > 0) {
      console.log(`[TerminalPanel] Writing scrollback to terminal (${savedScrollback.length} chars)`);
      term.write(savedScrollback);
      term.write('\r\n\x1b[90m--- Session restored ---\x1b[0m\r\n\r\n');
      delete savedScrollbackRefs.current[terminalId];  // 사용 후 삭제
    } else {
      console.log(`[TerminalPanel] No scrollback to restore for terminal ${terminalId}`);
    }

    // 초기 크기 맞추기
    setTimeout(() => fitAddon.fit(), 100);

    // refs에 저장
    xtermRefs.current[terminalId] = term;
    fitAddonRefs.current[terminalId] = fitAddon;
    serializeAddonRefs.current[terminalId] = serializeAddon;

    // PTY 생성 - 프론트엔드 ID 전달
    try {
      const { success, error } = await window.electronAPI.terminalCreate({
        id: terminalId,
        cols: term.cols,
        rows: term.rows,
        cwd: workspace ?? undefined
      });

      if (success) {
        // 키 입력 → PTY
        term.onData((data: string) => {
          window.electronAPI.terminalInput(terminalId, data);
        });

        // 상태 업데이트: isInitialized = true
        setTerminals(prev => prev.map(t =>
          t.id === terminalId ? { ...t, isInitialized: true } : t
        ));
      } else {
        console.error('Failed to create terminal:', error);
        term.write(`\x1b[31mFailed to create terminal: ${error}\x1b[0m\r\n`);
      }
    } catch (error) {
      console.error('Terminal initialization error:', error);
      term.write(`\x1b[31mTerminal initialization error: ${(error as Error).message}\x1b[0m\r\n`);
    }
  }, [workspace, theme, getTerminalTheme]);

  // ========================================
  // 터미널 삭제
  // ========================================
  const removeTerminal = useCallback((terminalId: string): void => {
    // 1. 편집 중인 터미널이 삭제되면 편집 모드 종료
    if (editingTerminalId === terminalId) {
      setEditingTerminalId(null);
      setEditingName('');
    }

    // 2. refs에서 정리
    const xterm = xtermRefs.current[terminalId];
    if (xterm) {
      xterm.dispose();
      delete xtermRefs.current[terminalId];
    }

    // PTY 종료
    window.electronAPI.terminalKill(terminalId).catch(err => {
      console.warn(`Failed to kill terminal ${terminalId}:`, err);
    });

    // 모든 refs 정리 (SerializeAddon 포함)
    delete fitAddonRefs.current[terminalId];
    delete serializeAddonRefs.current[terminalId];
    delete terminalContainerRefs.current[terminalId];

    // 3. 상태 업데이트 및 활성 터미널 변경
    setTerminals(prev => {
      const remaining = prev.filter(t => t.id !== terminalId);

      // 활성 터미널 변경 (삭제된 터미널이 활성이었을 경우)
      setActiveTerminalId(currentActive => {
        if (currentActive !== terminalId) return currentActive;
        return remaining.length > 0 ? remaining[remaining.length - 1].id : null;
      });

      return remaining;
    });
  }, [editingTerminalId]);

  // ========================================
  // 터미널 전환
  // ========================================
  const switchTerminal = useCallback((terminalId: string): void => {
    setActiveTerminalId(terminalId);
    // 활성 터미널에 포커스
    const xterm = xtermRefs.current[terminalId];
    if (xterm) {
      setTimeout(() => xterm.focus(), 0);
    }
  }, []);

  // ========================================
  // 이벤트 리스너 (컴포넌트 마운트 시 한 번만)
  // ========================================
  useEffect(() => {
    const handleOutput = ({ id, data }: { id: string; data: string }): void => {
      const xterm = xtermRefs.current[id];
      if (xterm) {
        xterm.write(data);
      }
    };

    const handleExit = ({ id, exitCode }: { id: string; exitCode: number }): void => {
      const xterm = xtermRefs.current[id];
      if (xterm) {
        xterm.write(`\r\n\x1b[33m[Process exited with code ${exitCode}]\x1b[0m\r\n`);
      }
    };

    window.electronAPI.onTerminalOutput(handleOutput);
    window.electronAPI.onTerminalExit(handleExit);

    return () => {
      window.electronAPI.removeTerminalListeners();
    };
  }, []);

  // ========================================
  // 워크스페이스 변경 감지 및 처리
  // ========================================
  useEffect(() => {
    if (!isVisible) return;

    // 워크스페이스가 변경된 경우
    if (prevWorkspaceRef.current !== workspace && prevWorkspaceRef.current !== null) {
      // 1. 기존 터미널 정리
      cleanupAllTerminals();
      // 2. 상태 초기화 (새 상태 로드 트리거)
      setTerminals([]);
      setActiveTerminalId(null);
      setNextTerminalNumber(1);
    }

    prevWorkspaceRef.current = workspace;
  }, [isVisible, workspace, cleanupAllTerminals]);

  // ========================================
  // 상태 복원 (초기 로드 또는 워크스페이스 변경 후)
  // ========================================
  useEffect(() => {
    if (!isVisible) return;
    // 터미널이 있으면 이미 로드된 상태
    if (terminals.length > 0) return;

    const loadSavedState = async (): Promise<void> => {
      // workspace가 있으면 저장된 상태 로드 시도
      if (workspace) {
        console.log(`[TerminalPanel] Loading saved state for workspace: ${workspace}`);
        const savedState = await window.electronAPI.terminalGetState(workspace);

        if (savedState && savedState.terminals.length > 0) {
          console.log(`[TerminalPanel] Found ${savedState.terminals.length} saved terminals`);

          // 저장된 상태로 터미널 복원
          const restoredTerminals: TerminalTab[] = savedState.terminals.map((saved: TerminalInfo) => {
            const id = crypto.randomUUID();
            // 스크롤백 데이터를 ref에 저장 (초기화 시 사용)
            const scrollbackLength = saved.scrollback?.length || 0;
            console.log(`[TerminalPanel] Restoring terminal "${saved.name}": scrollback length = ${scrollbackLength}`);
            savedScrollbackRefs.current[id] = saved.scrollback || '';
            return {
              id,
              name: saved.name,
              isInitialized: false
            };
          });

          setTerminals(restoredTerminals);
          setNextTerminalNumber(savedState.nextTerminalNumber);

          // 활성 터미널 설정 (유효한 인덱스인 경우)
          if (savedState.activeIndex >= 0 && savedState.activeIndex < restoredTerminals.length) {
            setActiveTerminalId(restoredTerminals[savedState.activeIndex].id);
          } else {
            setActiveTerminalId(restoredTerminals[0].id);
          }
          return;  // 복원 완료
        }
      }

      // workspace가 없거나 저장된 상태가 없으면 기본 터미널 생성
      console.log('[TerminalPanel] No saved state found, creating default terminal');
      addTerminal();
    };

    loadSavedState();
  }, [isVisible, workspace, terminals.length, addTerminal]);

  // ========================================
  // 상태 변경 시 자동 저장
  // ========================================
  useEffect(() => {
    if (terminals.length > 0) {
      saveTerminalState();
    }
  }, [terminals, activeTerminalId, nextTerminalNumber, saveTerminalState]);

  // ========================================
  // 새 터미널이 추가되면 xterm 초기화
  // ========================================
  useEffect(() => {
    terminals.forEach(terminal => {
      // 이미 초기화된 터미널은 스킵
      if (xtermRefs.current[terminal.id]) return;

      // DOM 요소가 아직 없으면 스킵
      const container = terminalContainerRefs.current[terminal.id];
      if (!container) return;

      // xterm 초기화
      initializeTerminal(terminal.id, container);
    });
  }, [terminals, initializeTerminal]);

  // ========================================
  // 테마 변경 시 모든 터미널 테마 업데이트
  // ========================================
  useEffect(() => {
    Object.values(xtermRefs.current).forEach(xterm => {
      if (xterm) {
        xterm.options.theme = getTerminalTheme(theme);
      }
    });
  }, [theme, getTerminalTheme]);

  // ========================================
  // 높이 변경 시 모든 터미널 fit
  // ========================================
  useEffect(() => {
    if (!isVisible) return;

    const timeoutId = setTimeout(() => {
      Object.entries(fitAddonRefs.current).forEach(([terminalId, fitAddon]) => {
        if (fitAddon) {
          fitAddon.fit();
          const xterm = xtermRefs.current[terminalId];
          if (xterm) {
            window.electronAPI.terminalResize(terminalId, xterm.cols, xterm.rows);
          }
        }
      });
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [height, isVisible]);

  // ========================================
  // 창 크기 변경 시 활성 터미널 fit
  // ========================================
  useEffect(() => {
    if (!isVisible || !activeTerminalId) return;

    const handleResize = (): void => {
      const fitAddon = fitAddonRefs.current[activeTerminalId];
      const xterm = xtermRefs.current[activeTerminalId];
      if (fitAddon && xterm) {
        fitAddon.fit();
        window.electronAPI.terminalResize(activeTerminalId, xterm.cols, xterm.rows);
      }
    };

    // ResizeObserver로 컨테이너 크기 변경 감지
    const container = terminalContainerRefs.current[activeTerminalId];
    let resizeObserver: ResizeObserver | undefined;
    if (container) {
      resizeObserver = new ResizeObserver(handleResize);
      resizeObserver.observe(container);
    }

    window.addEventListener('resize', handleResize);

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      window.removeEventListener('resize', handleResize);
    };
  }, [isVisible, activeTerminalId]);

  // ========================================
  // 앱 종료/숨김 시 즉시 저장
  // ========================================
  useEffect(() => {
    // beforeunload: 앱 종료 또는 새로고침 시
    const handleBeforeUnload = (): void => {
      saveTerminalStateImmediate();
    };

    // visibilitychange: 앱이 백그라운드로 갈 때
    const handleVisibilityChange = (): void => {
      if (document.visibilityState === 'hidden') {
        saveTerminalStateImmediate();
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [saveTerminalStateImmediate]);

  // ========================================
  // 컴포넌트 언마운트 시 모든 터미널 정리
  // ========================================
  useEffect(() => {
    return () => {
      // 언마운트 시 즉시 저장
      saveTerminalStateImmediate();
      // 모든 xterm dispose
      Object.values(xtermRefs.current).forEach(xterm => {
        if (xterm) xterm.dispose();
      });
      // 모든 PTY 종료
      window.electronAPI.terminalKillAll().catch(console.error);
    };
  }, [saveTerminalStateImmediate]);

  // ========================================
  // 터미널에 포커스
  // ========================================
  const focusTerminal = useCallback((): void => {
    if (activeTerminalId) {
      const xterm = xtermRefs.current[activeTerminalId];
      if (xterm) xterm.focus();
    }
  }, [activeTerminalId]);

  // ========================================
  // 탭 이름 변경 함수
  // ========================================

  // 이름 변경 시작
  const startRenaming = useCallback((terminalId: string): void => {
    const terminal = terminals.find(t => t.id === terminalId);
    if (terminal) {
      setEditingTerminalId(terminalId);
      setEditingName(terminal.name);
    }
    setContextMenu(null);
  }, [terminals]);

  // 이름 변경 확정
  const confirmRename = useCallback((): void => {
    if (!editingTerminalId) return;

    const newName = editingName.trim();
    if (newName) {
      setTerminals(prev => prev.map(t =>
        t.id === editingTerminalId
          ? { ...t, name: newName }
          : t
      ));
    }
    // 빈 이름인 경우 변경하지 않음 (기존 이름 유지)

    setEditingTerminalId(null);
    setEditingName('');
  }, [editingTerminalId, editingName]);

  // 이름 변경 취소
  const cancelRename = useCallback((): void => {
    setEditingTerminalId(null);
    setEditingName('');
  }, []);

  // ========================================
  // 컨텍스트 메뉴 핸들러
  // ========================================

  // 컨텍스트 메뉴 열기 (화면 경계 체크 포함)
  const handleContextMenu = useCallback((e: MouseEvent<HTMLDivElement>, terminalId: string): void => {
    e.preventDefault();
    e.stopPropagation();

    // 메뉴 크기 (CSS와 일치해야 함)
    const menuWidth = 150;
    const menuHeight = 80;

    let x = e.clientX;
    let y = e.clientY;

    // 화면 오른쪽 경계 체크
    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 10;
    }
    // 화면 아래쪽 경계 체크
    if (y + menuHeight > window.innerHeight) {
      y = window.innerHeight - menuHeight - 10;
    }

    setContextMenu({ x, y, terminalId });
  }, []);

  // ========================================
  // 컨텍스트 메뉴 외부 클릭 시 닫기
  // ========================================
  useEffect(() => {
    if (!contextMenu) return;

    const handleClickOutside = (): void => setContextMenu(null);
    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [contextMenu]);

  if (!isVisible) return null;

  return (
    <div
      className={`terminal-panel ${theme}`}
      style={{ height: `${height}px` }}
      onClick={focusTerminal}
    >
      {/* 헤더 */}
      <div className="terminal-header">
        {/* 왼쪽 스크롤 버튼 */}
        <button
          className={`terminal-scroll-btn left ${canScrollLeft ? 'visible' : ''}`}
          onClick={(e) => { e.stopPropagation(); scrollTabs('left'); }}
          title="Scroll left"
        >
          ◀
        </button>

        {/* 탭 목록 */}
        <div
          className="terminal-tabs"
          ref={scrollContainerRef}
          onScroll={checkScrollButtons}
          onWheel={handleWheel}
        >
          {terminals.map(terminal => (
            <div
              key={terminal.id}
              className={`terminal-tab ${terminal.id === activeTerminalId ? 'active' : ''}`}
              onClick={(e) => { e.stopPropagation(); switchTerminal(terminal.id); }}
              onDoubleClick={(e) => { e.stopPropagation(); startRenaming(terminal.id); }}
              onContextMenu={(e) => handleContextMenu(e, terminal.id)}
            >
              {editingTerminalId === terminal.id ? (
                // 편집 모드
                <input
                  type="text"
                  className="terminal-tab-name-input"
                  value={editingName}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setEditingName(e.target.value)}
                  onKeyDown={(e: KeyboardEvent<HTMLInputElement>) => {
                    if (e.key === 'Enter') {
                      confirmRename();
                    } else if (e.key === 'Escape') {
                      cancelRename();
                    }
                  }}
                  onBlur={confirmRename}
                  autoFocus
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                // 일반 모드
                <span className="terminal-tab-name">{terminal.name}</span>
              )}
              <button
                className="terminal-tab-close"
                onClick={(e) => {
                  e.stopPropagation();
                  removeTerminal(terminal.id);
                }}
                title="Close Terminal"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* 오른쪽 스크롤 버튼 */}
        <button
          className={`terminal-scroll-btn right ${canScrollRight ? 'visible' : ''}`}
          onClick={(e) => { e.stopPropagation(); scrollTabs('right'); }}
          title="Scroll right"
        >
          ▶
        </button>

        {/* 탭 추가 버튼 */}
        <button
          className="terminal-add-btn"
          onClick={(e) => { e.stopPropagation(); addTerminal(); }}
          title="New Terminal"
        >
          +
        </button>

        {/* 패널 닫기 버튼 */}
        <button
          className="terminal-panel-close-btn"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          title="Close Panel (Ctrl+`)"
        >
          ×
        </button>
      </div>

      {/* 터미널 콘텐츠 */}
      <div className="terminal-content">
        {terminals.map(terminal => (
          <div
            key={terminal.id}
            className="terminal-view"
            style={{ display: terminal.id === activeTerminalId ? 'block' : 'none' }}
            ref={el => { terminalContainerRefs.current[terminal.id] = el; }}
          />
        ))}
      </div>

      {/* 컨텍스트 메뉴 */}
      {contextMenu && (
        <div
          className="terminal-context-menu"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          <div
            className="terminal-context-menu-item"
            onClick={() => startRenaming(contextMenu.terminalId)}
          >
            이름 변경
          </div>
          <div className="terminal-context-menu-divider" />
          <div
            className="terminal-context-menu-item"
            onClick={() => {
              removeTerminal(contextMenu.terminalId);
              setContextMenu(null);
            }}
          >
            터미널 닫기
          </div>
        </div>
      )}
    </div>
  );
}

export default TerminalPanel;
