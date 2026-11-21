import React, { useEffect } from 'react';
import {
  Home,
  Mic,
  FileText,
  Palette,
  Sparkles,
  Download,
  Settings as SettingsIcon,
  Undo2,
  Redo2,
  RefreshCw,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Save,
} from 'lucide-react';
import { useProjectStore, NavigationTab } from '../store/projectStore';
import { EngineApiClient } from '../services/api';

export const Navigation: React.FC = () => {
  const {
    currentTab,
    setTab,
    engineConnected,
    setEngineConnected,
    undo,
    redo,
    historyStack,
    redoStack,
    isSaving,
    isDirty,
    lastSavedAt,
    saveError,
    saveProjectToServer,
  } = useProjectStore();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        saveProjectToServer();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [saveProjectToServer]);

  const handleRetryConnection = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await EngineApiClient.checkHealth(3000);
      setEngineConnected(true);
    } catch {
      setEngineConnected(false);
    }
  };

  const tabs: { id: NavigationTab; label: string; icon: React.ReactNode }[] = [
    { id: 'home', label: 'Home', icon: <Home className="w-4 h-4" /> },
    { id: 'transcribe', label: 'Transcribe', icon: <Mic className="w-4 h-4" /> },
    { id: 'editor', label: 'Transcript', icon: <FileText className="w-4 h-4" /> },
    { id: 'studio', label: 'Studio', icon: <Palette className="w-4 h-4" /> },
    { id: 'animation', label: 'Motion', icon: <Sparkles className="w-4 h-4" /> },
    { id: 'export', label: 'Export', icon: <Download className="w-4 h-4" /> },
    { id: 'settings', label: 'Settings', icon: <SettingsIcon className="w-4 h-4" /> },
  ];

  return (
    <header className="bg-zinc-900 border-b border-zinc-800 px-3 py-2 flex items-center justify-between select-none">
      <div className="flex items-center space-x-3">
        <div className="flex items-center space-x-1.5 cursor-pointer" onClick={() => setTab('home')}>
          <div className="w-6 h-6 rounded bg-gradient-to-tr from-blue-600 via-indigo-600 to-amber-400 flex items-center justify-center font-black text-xs text-white shadow">
            CL
          </div>
          <div>
            <div className="font-bold text-sm tracking-tight text-white flex items-center space-x-1">
              <span>CaptionLab</span>
              <span className="text-[10px] text-zinc-400 font-normal px-1 py-0.2 bg-zinc-800 rounded">v1.2</span>
            </div>
            <div className="text-[9px] text-zinc-400 tracking-wider uppercase font-medium">Words into Motion</div>
          </div>
        </div>

        {/* Engine status indicator with reconnect trigger */}
        <div
          onClick={handleRetryConnection}
          className="flex items-center space-x-1.5 pl-2 border-l border-zinc-800 text-[11px] cursor-pointer hover:bg-zinc-800/50 px-1.5 py-0.5 rounded transition"
          title={engineConnected ? 'Local Python Engine is online' : 'Click to retry engine connection'}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              engineConnected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'
            }`}
          />
          <span className={`text-[10px] ${engineConnected ? 'text-zinc-400' : 'text-red-400 font-medium'}`}>
            {engineConnected ? 'Engine Ready' : 'Engine Offline (Click to Retry)'}
          </span>
          {!engineConnected && <RefreshCw className="w-2.5 h-2.5 text-red-400 animate-spin" />}
        </div>
      </div>

      {/* Tabs */}
      <nav className="flex items-center space-x-1 bg-zinc-950/80 p-0.5 rounded-lg border border-zinc-800/80">
        {tabs.map((tab) => {
          const isActive = currentTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setTab(tab.id)}
              className={`flex items-center space-x-1 px-2.5 py-1 rounded text-xs font-medium transition-all ${
                isActive
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50'
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Save Status & History Controls */}
      <div className="flex items-center space-x-2">
        <button
          onClick={() => saveProjectToServer()}
          disabled={isSaving}
          title={saveError || (isDirty ? 'Unsaved changes (Ctrl+S to save)' : `Project saved (${lastSavedAt || 'Synced'})`)}
          className={`flex items-center space-x-1.5 px-2 py-0.5 rounded text-[11px] border transition ${
            saveError
              ? 'bg-red-950/60 border-red-800 text-red-300 hover:bg-red-900/60'
              : isSaving
              ? 'bg-blue-950/60 border-blue-800 text-blue-300'
              : isDirty
              ? 'bg-amber-950/60 border-amber-800 text-amber-300 hover:bg-amber-900/60'
              : 'bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:text-zinc-200'
          }`}
        >
          {isSaving ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
              <span>Saving...</span>
            </>
          ) : saveError ? (
            <>
              <AlertCircle className="w-3 h-3 text-red-400" />
              <span>Save error</span>
            </>
          ) : isDirty ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Save (Ctrl+S)</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3 h-3 text-emerald-400" />
              <span>Saved</span>
            </>
          )}
        </button>

        <div className="flex items-center space-x-1 border-l border-zinc-800 pl-2">
          <button
            onClick={undo}
            disabled={historyStack.length === 0}
            title="Undo (Ctrl+Z)"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-zinc-800 transition"
          >
            <Undo2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={redo}
            disabled={redoStack.length === 0}
            title="Redo (Ctrl+Y)"
            className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-zinc-800 transition"
          >
            <Redo2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
};
