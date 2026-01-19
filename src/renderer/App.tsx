import React, { useState, ReactElement } from 'react';
import FileExplorer from './components/FileExplorer';
import Resizer from './components/Resizer';
import TabView from './components/TabView';
import EmptyState from './components/EmptyState';
import EditorPanel from './components/Editor/EditorPanel';
import PreviewPanel from './components/Editor/PreviewPanel';
import SplitView from './components/SplitView/SplitView';
import ViewModeToggle from './components/ViewModeToggle/ViewModeToggle';
import TerminalPanel from './components/Terminal/TerminalPanel';
import { VIEW_MODES } from './constants/viewModes';
import { useTabManager } from './hooks/useTabManager';
import { useLayoutSettings } from './hooks/useLayoutSettings';
import { useDiagramRenderer } from './hooks/useDiagramRenderer';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { useMenuHandlers } from './hooks/useMenuHandlers';
import { useTheme } from './hooks/useTheme';
import { useTerminal } from './hooks/useTerminal';
import type { FileType } from '../types';
import './App.css';

function App(): ReactElement {
  const [isExplorerVisible, setIsExplorerVisible] = useState<boolean>(true);
  const [workspaceFolder, setWorkspaceFolder] = useState<string | null>(null);

  // Custom Hooks
  const {
    tabs,
    activeTabId,
    activeTab,
    diagramCode,
    currentFilePath,
    updateActiveTab,
    handleEditorChange,
    handleFileSelect,
    handleTabSelect,
    handleTabClose,
    handleTabNew,
    handleTabReorder,
    handleCloseAllTabs,
    handleCloseOtherTabs,
    handleCloseTabsToRight
  } = useTabManager();

  const {
    explorerWidth,
    editorWidth,
    viewMode,
    handleExplorerResize,
    handleEditorResize,
    handleViewModeChange
  } = useLayoutSettings(isExplorerVisible);

  const diagramRef = useDiagramRenderer(diagramCode, viewMode);

  const { theme, toggleTheme } = useTheme();

  const {
    isTerminalVisible,
    terminalHeight,
    toggleTerminal,
    closeTerminal,
    handleTerminalResizeByPosition
  } = useTerminal();

  useKeyboardShortcuts(tabs, activeTabId, handleTabClose, handleTabNew, (id) => handleTabSelect(id), toggleTerminal);

  useMenuHandlers(diagramCode, currentFilePath, updateActiveTab, handleTabNew, handleFileSelect, diagramRef);

  // Explorer toggle handler
  const handleToggleExplorer = (): void => {
    setIsExplorerVisible(prev => !prev);
  };

  // 콘텐츠 영역 렌더링 함수
  const renderContent = (): ReactElement => {
    if (tabs.length === 0) {
      return <EmptyState onCreateNew={handleTabNew} />;
    }

    const fileType: FileType = activeTab?.fileType || 'mermaid';

    // Code Only 모드
    if (viewMode === VIEW_MODES.CODE) {
      return (
        <EditorPanel
          diagramCode={diagramCode}
          onEditorChange={handleEditorChange}
          fileType={fileType}
          fullWidth
        />
      );
    }

    // Preview Only 모드
    if (viewMode === VIEW_MODES.PREVIEW) {
      return (
        <PreviewPanel
          diagramRef={diagramRef}
          content={diagramCode}
          fileType={fileType}
          currentFilePath={currentFilePath}
          fullWidth
        />
      );
    }

    // Split 모드 (기본)
    return (
      <SplitView
        left={
          <EditorPanel
            diagramCode={diagramCode}
            onEditorChange={handleEditorChange}
            fileType={fileType}
          />
        }
        right={
          <PreviewPanel
            diagramRef={diagramRef}
            content={diagramCode}
            fileType={fileType}
            currentFilePath={currentFilePath}
          />
        }
        leftWidth={editorWidth}
        onResize={handleEditorResize}
      />
    );
  };

  return (
    <div className="app">
      <div
        className={`file-explorer-container ${!isExplorerVisible ? 'collapsed' : ''}`}
        style={{ width: isExplorerVisible ? `${explorerWidth}px` : '48px' }}
      >
        {isExplorerVisible ? (
          <FileExplorer
            onFileSelect={handleFileSelect}
            onToggleExplorer={handleToggleExplorer}
            onWorkspaceChange={setWorkspaceFolder}
          />
        ) : (
          <div className="explorer-collapsed">
            <button
              className="show-explorer-btn"
              onClick={handleToggleExplorer}
              title="Show Explorer"
            >
              ▶
            </button>
          </div>
        )}
      </div>

      {isExplorerVisible && (
        <Resizer
          direction="vertical"
          onResize={handleExplorerResize}
        />
      )}

      <div className="main-content" style={{ flex: 1 }}>
        <div className="editor-preview-container">
          <div className="app-header">
            <ViewModeToggle
              viewMode={viewMode}
              onViewModeChange={handleViewModeChange}
            />
            <div className="header-actions">
              <button
                className={`terminal-toggle-btn ${isTerminalVisible ? 'active' : ''}`}
                onClick={toggleTerminal}
                title={`Toggle Terminal (Ctrl+\`)`}
              >
                {'>_'}
              </button>
              <button
                className="theme-toggle-btn"
                onClick={toggleTheme}
                title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`}
              >
                {theme === 'light' ? '🌙' : '☀️'}
              </button>
            </div>
          </div>
          <TabView
            tabs={tabs}
            activeTabId={activeTabId}
            onTabSelect={handleTabSelect}
            onTabClose={handleTabClose}
            onTabNew={handleTabNew}
            onTabReorder={handleTabReorder}
            onCloseAllTabs={handleCloseAllTabs}
            onCloseOtherTabs={handleCloseOtherTabs}
            onCloseTabsToRight={handleCloseTabsToRight}
          />

          <div className="editor-preview-content">
            {renderContent()}
          </div>
        </div>

        {/* Terminal Panel */}
        {isTerminalVisible && (
          <>
            <Resizer
              direction="horizontal"
              onResize={handleTerminalResizeByPosition}
            />
            <TerminalPanel
              isVisible={isTerminalVisible}
              height={terminalHeight}
              onClose={closeTerminal}
              workspace={workspaceFolder}
              theme={theme}
            />
          </>
        )}
      </div>
    </div>
  );
}

export default App;
