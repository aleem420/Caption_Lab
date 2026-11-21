import React, { useEffect, useState } from 'react';
import {
  Mic,
  Video,
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  Film,
  Download,
  CheckCircle2,
  Sliders,
  ExternalLink,
} from 'lucide-react';
import { useProjectStore } from '@plugin/store/projectStore';
import { EngineApiClient } from '@plugin/services/api';
import { useSequenceStore } from '../store/sequenceStore';

export const StandaloneHomeTab: React.FC = () => {
  const { setTab, createNewProject, loadProjectFromServer } = useProjectStore();
  const { projectName, width, height, fps, aspectRatio, timelineOffset } = useSequenceStore();
  const [recentList, setRecentList] = useState<any[]>([]);

  useEffect(() => {
    EngineApiClient.listRecentProjects()
      .then((res) => {
        if (Array.isArray(res)) setRecentList(res);
      })
      .catch(() => {});
  }, []);

  const handleCreateNew = () => {
    createNewProject(projectName, width, height, fps);
    setTab('transcribe');
  };

  const handleOpenRecent = async (projectId: string) => {
    const success = await loadProjectFromServer(projectId);
    if (success) {
      setTab('editor');
    }
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full text-xs">
      {/* Hero Welcome */}
      <div className="bg-gradient-to-r from-blue-950/40 via-zinc-900 to-zinc-900 border border-blue-900/40 rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>Standalone Companion • Adobe Premiere Pro 2023 (v23.5)</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            CaptionLab Studio — Companion Mode
          </h1>
          <p className="text-xs text-zinc-400 max-w-xl">
            Offline AI transcription, Hindi/Hinglish motion typography, and broadcast transparent video export for Adobe Premiere Pro 2023.
          </p>
        </div>
        <button
          onClick={handleCreateNew}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-md hover:shadow-blue-600/20 transition shrink-0"
        >
          <Mic className="w-4 h-4" />
          <span>New Caption Project</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Premiere Active Sequence Context */}
      <div className="bg-zinc-900/90 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Video className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-zinc-200">
              Premiere Pro 2023 Sequence Target
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 font-medium">
            Standalone Companion (Manual Sync)
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Sequence Name</span>
            <span className="font-medium text-zinc-200 truncate block mt-0.5">{projectName}</span>
          </div>
          <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Resolution</span>
            <span className="font-medium text-zinc-200 block mt-0.5">{width} × {height} ({aspectRatio})</span>
          </div>
          <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Frame Rate</span>
            <span className="font-medium text-zinc-200 block mt-0.5">{fps} FPS (Deterministic)</span>
          </div>
          <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Timeline Offset</span>
            <span className="font-medium text-emerald-400 block mt-0.5">
              {timelineOffset > 0 ? `+${timelineOffset.toFixed(2)}s` : '0.0s (Sequence Start)'}
            </span>
          </div>
        </div>
      </div>

      {/* Premiere Pro 2023 End-to-End Workflow Cards */}
      <div className="space-y-2">
        <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
          Premiere Pro 2023 Integration Workflow
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div
            onClick={() => setTab('transcribe')}
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-blue-500/50 cursor-pointer transition space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-105 transition">
              <Mic className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-200">1. Audio Mixdown</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              In Premiere 2023, press <strong>Ctrl+M</strong> to export sequence audio (WAV). Drop into CaptionLab for local Faster-Whisper AI transcription.
            </p>
          </div>

          <div
            onClick={() => setTab('studio')}
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-amber-500/50 cursor-pointer transition space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
              <Sparkles className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-200">2. Hindi Motion Typography</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Design Devanagari typography with 10 presets, word pop, karaoke highlights, and 8 layout families with safe-area previews.
            </p>
          </div>

          <div
            onClick={() => setTab('export')}
            className="p-4 rounded-xl bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 cursor-pointer transition space-y-2 group"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
              <Download className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-zinc-200">3. Premiere 2023 Overlay</h3>
            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Export broadcast transparent <strong>Apple ProRes 4444 MOV</strong> or <strong>PNG Sequences</strong> and drag onto track <strong>V2</strong> in Premiere 2023.
            </p>
          </div>
        </div>
      </div>

      {/* Recent Projects Section */}
      {recentList.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
            Recent Projects
          </h2>
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl divide-y divide-zinc-800/80">
            {recentList.map((item, idx) => (
              <div key={idx} className="p-3 flex items-center justify-between hover:bg-zinc-800/40 transition">
                <div>
                  <div className="font-semibold text-zinc-200">{item.name || item.id}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">
                    {item.updated_at ? new Date(item.updated_at).toLocaleString() : 'Recent'} • {item.fps || 30} FPS
                  </div>
                </div>
                <button
                  onClick={() => handleOpenRecent(item.id)}
                  className="px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-[11px] transition"
                >
                  Open in Editor
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
