import React from 'react';
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
  Radio,
} from 'lucide-react';
import { useProjectStore, NavigationTab } from '../store/projectStore';

export const Navigation: React.FC = () => {
  const {
    currentTab,
    setTab,
    engineConnected,
    undo,
    redo,
    historyStack,
    redoStack,
  } = useProjectStore();

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

        {/* Engine status indicator */}
        <div className="flex items-center space-x-1 pl-2 border-l border-zinc-800 text-[11px]">
          <span
            className={`w-2 h-2 rounded-full ${
              engineConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
            }`}
          />
          <span className="text-zinc-400 text-[10px]">
            {engineConnected ? 'Engine Ready' : 'Connecting Engine...'}
          </span>
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

      {/* History Controls */}
      <div className="flex items-center space-x-1">
        <button
          onClick={undo}
          disabled={historyStack.length === 0}
          title="Undo"
          className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-zinc-800 transition"
        >
          <Undo2 className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={redo}
          disabled={redoStack.length === 0}
          title="Redo"
          className="p-1.5 text-zinc-400 hover:text-zinc-100 disabled:opacity-30 disabled:cursor-not-allowed rounded hover:bg-zinc-800 transition"
        >
          <Redo2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </header>
  );
};
