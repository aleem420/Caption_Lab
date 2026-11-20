import React, { useEffect, useState } from 'react';
import {
  PlusCircle,
  FolderOpen,
  Mic,
  Video,
  Sparkles,
  Layers,
  ArrowRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { PremiereBridge, SequenceInfo } from '../../services/premiereBridge';
import { EngineApiClient } from '../../services/api';

export const HomeTab: React.FC = () => {
  const { project, setTab } = useProjectStore();
  const [seqInfo, setSeqInfo] = useState<SequenceInfo | null>(null);
  const [recentList, setRecentList] = useState<any[]>([]);

  useEffect(() => {
    setSeqInfo(PremiereBridge.getSequenceInfo());
    EngineApiClient.listRecentProjects()
      .then((res) => {
        if (Array.isArray(res)) setRecentList(res);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6 overflow-y-auto h-full">
      {/* Hero Welcome */}
      <div className="bg-gradient-to-r from-blue-950/40 via-zinc-900 to-zinc-900 border border-blue-900/40 rounded-xl p-5 shadow-lg flex items-center justify-between">
        <div className="space-y-1">
          <div className="inline-flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold">
            <Sparkles className="w-3 h-3" />
            <span>AI Motion Captions • Local & Offline</span>
          </div>
          <h1 className="text-xl font-bold text-white tracking-tight">
            Welcome to CaptionLab
          </h1>
          <p className="text-xs text-zinc-400 max-w-xl">
            Transcribe Hindi & Hinglish audio with word-accurate timestamps, generate dynamic text layouts, and export transparent ProRes 4444 motion graphics directly into Adobe Premiere Pro 2025+.
          </p>
        </div>
        <button
          onClick={() => setTab('transcribe')}
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
            <Video className="w-4 h-4 text-blue-400" />
            <span className="text-xs font-semibold text-zinc-200">
              Premiere Pro Sequence Context
            </span>
          </div>
          <span className="text-[10px] px-2 py-0.5 rounded bg-zinc-800 text-zinc-400">
            {seqInfo?.isAvailable ? 'Connected to Premiere' : 'Standby / Preview Mode'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Sequence Name</span>
            <span className="font-medium text-zinc-200 truncate block mt-0.5">{seqInfo?.name || 'Active Sequence'}</span>
          </div>
          <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Resolution</span>
            <span className="font-medium text-zinc-200 block mt-0.5">{seqInfo?.width} × {seqInfo?.height} (16:9)</span>
          </div>
          <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Frame Rate</span>
            <span className="font-medium text-zinc-200 block mt-0.5">{seqInfo?.fps} FPS (Deterministic)</span>
          </div>
          <div className="bg-zinc-950/70 p-2.5 rounded-lg border border-zinc-800/80">
            <span className="text-[10px] text-zinc-500 uppercase tracking-wider block">Language Mode</span>
            <span className="font-medium text-amber-400 block mt-0.5">Hindi Mixed (Hinglish)</span>
          </div>
        </div>
      </div>

      {/* Workflow Quick Launch Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div
          onClick={() => setTab('transcribe')}
          className="bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-blue-500/50 p-4 rounded-xl cursor-pointer transition group space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition">
            <Mic className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-xs text-zinc-200">1. AI Speech Recognition</h3>
          <p className="text-[11px] text-zinc-400">
            Local Faster-Whisper inference preserving spoken Hindi and English technical terms without unwanted translation.
          </p>
        </div>

        <div
          onClick={() => setTab('studio')}
          className="bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-indigo-500/50 p-4 rounded-xl cursor-pointer transition group space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-400 flex items-center justify-center group-hover:scale-110 transition">
            <Layers className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-xs text-zinc-200">2. Dynamic Layout & Studio</h3>
          <p className="text-[11px] text-zinc-400">
            8 balanced layout families, Hindi Devanagari typography, keyword highlighting, and non-destructive styling.
          </p>
        </div>

        <div
          onClick={() => setTab('export')}
          className="bg-zinc-900/60 hover:bg-zinc-800/60 border border-zinc-800/80 hover:border-emerald-500/50 p-4 rounded-xl cursor-pointer transition group space-y-2"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition">
            <Sparkles className="w-4 h-4" />
          </div>
          <h3 className="font-semibold text-xs text-zinc-200">3. Motion Graphics Export</h3>
          <p className="text-[11px] text-zinc-400">
            Export transparent ProRes 4444 MOV with alpha channel, frame-accurate karaoke animations, or editable SRT subtitles.
          </p>
        </div>
      </div>

      {/* Current Project Snapshot */}
      <div className="bg-zinc-900/80 border border-zinc-800 rounded-xl p-4 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-zinc-300">Active Working Project</span>
          <span className="text-[10px] text-zinc-400">
            {project.captions.length} Captions • {project.transcript.sentences.length} Sentences
          </span>
        </div>
        <div className="p-3 bg-zinc-950 rounded-lg border border-zinc-800 flex items-center justify-between">
          <div>
            <div className="font-medium text-xs text-zinc-200">{project.project.name}</div>
            <div className="text-[11px] text-zinc-400 font-devanagari mt-0.5">
              "{project.transcript.sentences[0]?.text || 'No transcript loaded'}"
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setTab('editor')}
              className="px-2.5 py-1 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded transition"
            >
              Edit Words
            </button>
            <button
              onClick={() => setTab('studio')}
              className="px-2.5 py-1 text-xs bg-blue-600 hover:bg-blue-500 text-white rounded transition"
            >
              Open Studio
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
