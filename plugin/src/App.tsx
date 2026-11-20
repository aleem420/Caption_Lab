import React, { useEffect } from 'react';
import { Navigation } from './components/Navigation';
import { HomeTab } from './components/Dashboard/HomeTab';
import { TranscribeTab } from './components/Transcribe/TranscribeTab';
import { TranscriptEditorTab } from './components/TranscriptEditor/TranscriptEditorTab';
import { CaptionStudioTab } from './components/CaptionStudio/CaptionStudioTab';
import { AnimationEditorTab } from './components/AnimationEditor/AnimationEditorTab';
import { ExportTab } from './components/Export/ExportTab';
import { SettingsTab } from './components/Settings/SettingsTab';
import { useProjectStore } from './store/projectStore';
import { EngineApiClient } from './services/api';

export const App: React.FC = () => {
  const { currentTab, setEngineConnected, engineConnected } = useProjectStore();

  useEffect(() => {
    // Initial health check
    EngineApiClient.checkHealth()
      .then(() => setEngineConnected(true))
      .catch(() => setEngineConnected(false));

    // Listen to real-time connection state updates from heartbeat
    const unsubscribe = EngineApiClient.onConnectionChange((online) => {
      setEngineConnected(online);
    });

    // Start background heartbeat
    EngineApiClient.startHeartbeat(5000);

    return () => {
      unsubscribe();
      EngineApiClient.stopHeartbeat();
    };
  }, [setEngineConnected]);

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans">
      <Navigation />

      {/* Offline Alert Banner if Engine is unreachable */}
      {!engineConnected && (
        <div className="bg-red-950/70 border-b border-red-800/80 px-4 py-1.5 flex items-center justify-between text-[11px] text-red-200">
          <span>
            <strong>Local Processing Engine Offline:</strong> Start the engine by running <code className="bg-red-900/60 px-1 py-0.5 rounded text-white font-mono">python run.py</code> in the <code className="font-mono">engine/</code> folder.
          </span>
          <button
            onClick={() => EngineApiClient.checkHealth(3000).catch(() => {})}
            className="px-2 py-0.5 bg-red-800 hover:bg-red-700 text-white rounded text-[10px] font-semibold transition"
          >
            Retry Connection
          </button>
        </div>
      )}

      <main className="flex-1 overflow-hidden">
        {currentTab === 'home' && <HomeTab />}
        {currentTab === 'transcribe' && <TranscribeTab />}
        {currentTab === 'editor' && <TranscriptEditorTab />}
        {currentTab === 'studio' && <CaptionStudioTab />}
        {currentTab === 'animation' && <AnimationEditorTab />}
        {currentTab === 'export' && <ExportTab />}
        {currentTab === 'settings' && <SettingsTab />}
      </main>
    </div>
  );
};
