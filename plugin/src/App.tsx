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
  const { currentTab, setEngineConnected } = useProjectStore();

  useEffect(() => {
    // Attempt health check connection to local Python engine on launch
    EngineApiClient.checkHealth()
      .then(() => setEngineConnected(true))
      .catch(() => setEngineConnected(false));
  }, [setEngineConnected]);

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-zinc-100 font-sans">
      <Navigation />
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
