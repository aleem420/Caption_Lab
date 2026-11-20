import React, { useEffect } from 'react';
import { Navigation } from '@plugin/components/Navigation';
import { TranscribeTab } from '@plugin/components/Transcribe/TranscribeTab';
import { TranscriptEditorTab } from '@plugin/components/TranscriptEditor/TranscriptEditorTab';
import { CaptionStudioTab } from '@plugin/components/CaptionStudio/CaptionStudioTab';
import { AnimationEditorTab } from '@plugin/components/AnimationEditor/AnimationEditorTab';
import { StandaloneHomeTab } from './components/StandaloneHomeTab';
import { StandaloneSettingsTab } from './components/StandaloneSettingsTab';
import { StandaloneExportTab } from './components/StandaloneExportTab';
import { SequenceSettingsBar } from './components/SequenceSettingsBar';
import { useProjectStore } from '@plugin/store/projectStore';
import { useSequenceStore } from './store/sequenceStore';
import { EngineApiClient } from '@plugin/services/api';

export const StandaloneApp: React.FC = () => {
  const { currentTab, setEngineConnected, engineConnected } = useProjectStore();
  const { syncToProjectStore } = useSequenceStore();

  useEffect(() => {
    // Initial sync of sequence parameters into project store
    syncToProjectStore();

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
  }, [setEngineConnected, syncToProjectStore]);

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans">
      <Navigation />

      {/* Persistent Sequence Settings Bar for Premiere 2023 */}
      <SequenceSettingsBar />

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
        {currentTab === 'home' && <StandaloneHomeTab />}
        {currentTab === 'transcribe' && <TranscribeTab />}
        {currentTab === 'editor' && <TranscriptEditorTab />}
        {currentTab === 'studio' && <CaptionStudioTab />}
        {currentTab === 'animation' && <AnimationEditorTab />}
        {currentTab === 'export' && <StandaloneExportTab />}
        {currentTab === 'settings' && <StandaloneSettingsTab />}
      </main>
    </div>
  );
};
