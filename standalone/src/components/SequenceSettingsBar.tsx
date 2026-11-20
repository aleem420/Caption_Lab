import React, { useState } from 'react';
import {
  Film,
  Sliders,
  Clock,
  Maximize2,
  ChevronDown,
  ChevronUp,
  Check,
  Sparkles,
  Info,
} from 'lucide-react';
import { useSequenceStore, AspectRatioPreset } from '../store/sequenceStore';

export const SequenceSettingsBar: React.FC = () => {
  const {
    projectName,
    width,
    height,
    fps,
    aspectRatio,
    presetId,
    timelineOffset,
    setPreset,
    setDimensions,
    setFps,
    setTimelineOffset,
    setProjectName,
  } = useSequenceStore();

  const [isExpanded, setIsExpanded] = useState(false);

  const presets: { id: AspectRatioPreset; label: string; desc: string }[] = [
    { id: '16:9', label: '16:9 Landscape', desc: '1920 × 1080' },
    { id: '9:16', label: '9:16 Vertical', desc: '1080 × 1920' },
    { id: '1:1', label: '1:1 Square', desc: '1080 × 1080' },
    { id: '4:5', label: '4:5 Portrait', desc: '1080 × 1350' },
    { id: 'custom', label: 'Custom', desc: 'Manual size' },
  ];

  const commonFps = [
    { value: 23.976, label: '23.976 FPS (Cinematic)' },
    { value: 24, label: '24 FPS (Film)' },
    { value: 25, label: '25 FPS (PAL)' },
    { value: 29.97, label: '29.97 FPS (NTSC)' },
    { value: 30, label: '30 FPS (Standard Digital)' },
    { value: 60, label: '60 FPS (High Frame Rate)' },
  ];

  return (
    <div className="bg-zinc-900/95 border-b border-zinc-800 text-xs select-none">
      {/* Compact Status & Quick Info Bar */}
      <div className="px-4 py-2 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="flex items-center space-x-1.5 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse"></span>
            <span>Standalone Companion • Premiere Pro 2023 (v23.5)</span>
          </div>

          <div className="hidden sm:flex items-center space-x-2 text-zinc-400 text-[11px]">
            <span>Sequence:</span>
            <span className="font-semibold text-zinc-200">{projectName}</span>
            <span className="text-zinc-600">•</span>
            <span className="font-mono text-zinc-300">{width}×{height}</span>
            <span className="px-1 py-0.2 rounded bg-zinc-800 text-[10px] text-zinc-300 font-mono">
              {aspectRatio}
            </span>
            <span className="text-zinc-600">•</span>
            <span className="font-mono text-zinc-300">{fps} FPS</span>
            {timelineOffset > 0 && (
              <>
                <span className="text-zinc-600">•</span>
                <span className="text-emerald-400 font-mono">Offset: +{timelineOffset.toFixed(2)}s</span>
              </>
            )}
          </div>
        </div>

        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center space-x-1.5 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300 transition text-[11px] font-medium"
        >
          <Sliders className="w-3 h-3 text-amber-400" />
          <span>{isExpanded ? 'Hide Sequence Settings' : 'Edit Sequence Settings'}</span>
          {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
        </button>
      </div>

      {/* Expanded Interactive Sequence Controls */}
      {isExpanded && (
        <div className="p-4 bg-zinc-950/80 border-t border-zinc-800/80 space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <div className="text-xs font-semibold text-white flex items-center space-x-1.5">
                <Film className="w-3.5 h-3.5 text-blue-400" />
                <span>Premiere Pro 2023 Sequence Configuration</span>
              </div>
              <p className="text-[11px] text-zinc-400 mt-0.5">
                Configure your active Premiere sequence parameters. Caption layouts, timings, and exports will strictly conform to these values.
              </p>
            </div>
          </div>

          {/* Project Name */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
            <div className="sm:col-span-2">
              <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
                Project / Sequence Name
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="My Premiere Sequence"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Frame Rate (FPS) */}
            <div>
              <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1">
                Frame Rate (FPS)
              </label>
              <select
                value={fps}
                onChange={(e) => setFps(parseFloat(e.target.value))}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-amber-500"
              >
                {commonFps.map((item) => (
                  <option key={item.value} value={item.value}>
                    {item.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Timeline Start Offset */}
            <div>
              <label className="text-[10px] uppercase font-semibold text-zinc-400 block mb-1 flex items-center space-x-1">
                <Clock className="w-3 h-3 text-zinc-500" />
                <span>Timeline Start (Sec)</span>
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                value={timelineOffset}
                onChange={(e) => setTimelineOffset(parseFloat(e.target.value) || 0)}
                placeholder="0.0"
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1.5 text-zinc-200 text-xs focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>

          {/* Aspect Ratio & Resolution Presets */}
          <div className="space-y-2">
            <label className="text-[10px] uppercase font-semibold text-zinc-400 block">
              Resolution & Aspect Ratio Presets
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {presets.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPreset(p.id)}
                  className={`p-2 rounded-lg border text-left transition flex flex-col justify-between ${
                    presetId === p.id
                      ? 'border-amber-500 bg-amber-500/10 ring-1 ring-amber-500/40 text-white'
                      : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700 text-zinc-300'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-[11px]">{p.label}</span>
                    {presetId === p.id && <Check className="w-3 h-3 text-amber-400" />}
                  </div>
                  <span className="text-[10px] text-zinc-400 font-mono mt-0.5">{p.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Manual Custom Dimensions (if Custom selected or edited) */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-800/60 text-xs">
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Custom Width (px):</label>
              <input
                type="number"
                value={width}
                onChange={(e) => setDimensions(parseInt(e.target.value) || 1920, height)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] text-zinc-400 block mb-1">Custom Height (px):</label>
              <input
                type="number"
                value={height}
                onChange={(e) => setDimensions(width, parseInt(e.target.value) || 1080)}
                className="w-full bg-zinc-900 border border-zinc-800 rounded px-2 py-1 text-zinc-200 font-mono text-xs"
              />
            </div>
            <div className="col-span-2 flex items-center space-x-2 text-[11px] text-zinc-400 pt-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Settings automatically propagate to <strong>Caption Studio Safe Areas</strong>, <strong>Timing Math</strong>, and <strong>ProRes Export</strong>.
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
