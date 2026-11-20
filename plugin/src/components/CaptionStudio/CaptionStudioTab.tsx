import React, { useState } from 'react';
import {
  Palette,
  Layout,
  Type,
  Square,
  Sparkles,
  Move,
  Maximize2,
  Check,
  Play,
  Pause,
  Sliders,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { LayoutFamily } from '../../types';

export const CaptionStudioTab: React.FC = () => {
  const {
    project,
    activeCaptionId,
    setActiveCaptionId,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    updateCaptionTypography,
    updateCaptionBackground,
    updateCaptionLayout,
    updateCaptionCoordinates,
    applyPresetToCaption,
    applyPresetToAllCaptions,
  } = useProjectStore();

  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [showSafeAreas, setShowSafeAreas] = useState(true);

  const activeCaption = project.captions.find((c) => c.caption_id === activeCaptionId) || project.captions[0];

  const layoutFamilies: { id: LayoutFamily; label: string }[] = [
    { id: 'single_line', label: 'Single Line' },
    { id: 'balanced_two_line', label: 'Balanced 2-Line' },
    { id: 'stacked', label: 'Stacked Blocks' },
    { id: 'keyword_highlight', label: 'Keyword Focus' },
    { id: 'word_by_word', label: 'Word by Word' },
    { id: 'speaker_based', label: 'Speaker Style' },
    { id: 'boxed', label: 'Boxed Background' },
    { id: 'cinematic', label: 'Cinematic Sub' },
  ];

  return (
    <div className="h-full flex overflow-hidden bg-zinc-950">
      {/* Left / Center: Interactive Preview Canvas */}
      <div className="flex-1 flex flex-col border-r border-zinc-800">
        {/* Canvas Toolbar */}
        <div className="bg-zinc-900 border-b border-zinc-800 px-4 py-2 flex items-center justify-between text-xs">
          <div className="flex items-center space-x-2">
            <span className="text-zinc-400 font-medium">Aspect Ratio:</span>
            {(['16:9', '9:16', '1:1'] as const).map((ratio) => (
              <button
                key={ratio}
                onClick={() => setAspectRatio(ratio)}
                className={`px-2 py-0.5 rounded text-xs transition ${
                  aspectRatio === ratio
                    ? 'bg-blue-600 text-white font-semibold'
                    : 'bg-zinc-800 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {ratio}
              </button>
            ))}
          </div>

          <div className="flex items-center space-x-3">
            <label className="flex items-center space-x-1.5 cursor-pointer text-zinc-400 hover:text-zinc-200">
              <input
                type="checkbox"
                checked={showSafeAreas}
                onChange={(e) => setShowSafeAreas(e.target.checked)}
                className="rounded border-zinc-700 text-blue-600"
              />
              <span>Safe Areas</span>
            </label>
            <button
              onClick={() => setIsPlaying(!isPlaying)}
              className="flex items-center space-x-1 px-2.5 py-1 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded"
            >
              {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 fill-zinc-200" />}
              <span>{isPlaying ? 'Pause' : 'Play'}</span>
            </button>
          </div>
        </div>

        {/* Canvas Viewport */}
        <div className="flex-1 p-6 flex items-center justify-center bg-zinc-950 overflow-hidden relative">
          <div
            style={{
              aspectRatio: aspectRatio === '16:9' ? '16/9' : aspectRatio === '9:16' ? '9/16' : '1/1',
              width: aspectRatio === '9:16' ? '45%' : '85%',
              maxHeight: '90%',
            }}
            className="bg-black/90 border border-zinc-800 rounded-lg shadow-2xl relative overflow-hidden flex items-center justify-center transition-all select-none"
          >
            {/* Safe Area Outlines */}
            {showSafeAreas && (
              <div className="absolute inset-[10%] border border-blue-500/20 pointer-events-none rounded">
                <div className="absolute inset-[5%] border border-emerald-500/15 pointer-events-none" />
                <span className="absolute bottom-1 right-2 text-[9px] text-zinc-600 uppercase font-mono">
                  Safe Area
                </span>
              </div>
            )}

            {/* Caption Text Composition */}
            {activeCaption && (
              <div
                style={{
                  position: 'absolute',
                  left: `${activeCaption.coordinates.x * 100}%`,
                  top: `${activeCaption.coordinates.y * 100}%`,
                  transform: 'translate(-50%, -50%)',
                  maxWidth: `${activeCaption.coordinates.width * 100}%`,
                }}
                className="text-center transition-all cursor-move"
              >
                <div
                  style={{
                    backgroundColor: activeCaption.background.enabled || activeCaption.layout_family === 'boxed'
                      ? activeCaption.background.color
                      : 'transparent',
                    opacity: activeCaption.background.enabled || activeCaption.layout_family === 'boxed'
                      ? activeCaption.background.opacity
                      : 1,
                    borderRadius: `${activeCaption.background.border_radius}px`,
                    padding: `${activeCaption.background.padding_y}px ${activeCaption.background.padding_x}px`,
                  }}
                  className="inline-block transition-all"
                >
                  <p
                    style={{
                      fontFamily: activeCaption.typography.font_family,
                      fontWeight: activeCaption.typography.font_weight,
                      fontSize: `${activeCaption.typography.font_size * 0.45}px`, // Scaled for viewport
                      lineHeight: activeCaption.typography.line_height,
                      letterSpacing: `${activeCaption.typography.letter_spacing}px`,
                      color: activeCaption.typography.color,
                      textShadow: activeCaption.typography.shadow_color
                        ? `0 2px ${activeCaption.typography.shadow_blur}px ${activeCaption.typography.shadow_color}`
                        : undefined,
                      WebkitTextStroke: activeCaption.typography.stroke_width
                        ? `${activeCaption.typography.stroke_width * 0.35}px ${activeCaption.typography.stroke_color}`
                        : undefined,
                    }}
                    className="font-devanagari m-0 tracking-normal"
                  >
                    {activeCaption.words.map((w, wIdx) => {
                      const isWordActive = currentTime >= w.start && currentTime <= w.end;
                      return (
                        <span
                          key={w.word_id || wIdx}
                          style={{
                            color: isWordActive
                              ? activeCaption.animation.word_animation.active_color || '#FFDF00'
                              : w.custom_color || activeCaption.typography.color,
                            transform: isWordActive ? 'scale(1.1)' : 'scale(1)',
                            display: 'inline-block',
                            transition: 'all 0.15s ease',
                          }}
                          className="mr-1.5"
                        >
                          {w.text}
                        </span>
                      );
                    })}
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Caption Navigator Carousel (Bottom) */}
        <div className="bg-zinc-900 border-t border-zinc-800 px-4 py-2.5 flex items-center space-x-3 overflow-x-auto text-xs">
          <span className="text-[10px] text-zinc-500 uppercase tracking-wider shrink-0 font-semibold">
            Captions ({project.captions.length}):
          </span>
          {project.captions.map((cap, idx) => (
            <button
              key={cap.caption_id}
              onClick={() => {
                setActiveCaptionId(cap.caption_id);
                setCurrentTime(cap.start_time);
              }}
              className={`px-3 py-1.5 rounded-lg border text-left shrink-0 transition ${
                activeCaption?.caption_id === cap.caption_id
                  ? 'border-blue-500 bg-blue-950/40 text-white font-medium'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700'
              }`}
            >
              <div className="text-[9px] text-zinc-500 font-mono">
                #{idx + 1} • {cap.start_time.toFixed(1)}s
              </div>
              <div className="truncate max-w-[130px] font-devanagari text-xs text-zinc-200">
                {cap.words.map((w) => w.text).join(' ')}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right Properties Inspector */}
      <div className="w-80 bg-zinc-900 overflow-y-auto p-4 space-y-5 text-xs">
        {/* Style Presets */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Style Presets (10 Ready-Made)</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {project.presets.map((preset) => (
              <button
                key={preset.id}
                onClick={() => activeCaption && applyPresetToCaption(activeCaption.caption_id, preset.id)}
                className="p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded text-left transition group"
              >
                <div className="text-zinc-200 font-medium truncate">{preset.name}</div>
                <div className="text-[10px] text-zinc-500 group-hover:text-blue-400 transition">
                  {preset.layout_family}
                </div>
              </button>
            ))}
          </div>
          <button
            onClick={() => activeCaption && applyPresetToAllCaptions(activeCaption.layout_family)}
            className="w-full py-1 text-[11px] bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded transition mt-1"
          >
            Apply Preset to All Captions
          </button>
        </div>

        {/* Layout Family Selector (PRD Section 10.4) */}
        <div className="space-y-2 pt-3 border-t border-zinc-800">
          <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
            <Layout className="w-3.5 h-3.5 text-blue-400" />
            <span>Layout Family (8 Intelligent Layouts)</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {layoutFamilies.map((fam) => (
              <button
                key={fam.id}
                onClick={() => activeCaption && updateCaptionLayout(activeCaption.caption_id, fam.id)}
                className={`py-1.5 px-2 rounded text-left border transition ${
                  activeCaption?.layout_family === fam.id
                    ? 'border-blue-500 bg-blue-950/30 text-white font-medium'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                }`}
              >
                {fam.label}
              </button>
            ))}
          </div>
        </div>

        {/* Typography Controls (PRD Section 9.5 & 11) */}
        {activeCaption && (
          <div className="space-y-3 pt-3 border-t border-zinc-800">
            <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
              <Type className="w-3.5 h-3.5 text-indigo-400" />
              <span>Hindi Typography</span>
            </label>

            {/* Font Family */}
            <div>
              <span className="text-[10px] text-zinc-400 block mb-1">Font Family</span>
              <select
                value={activeCaption.typography.font_family}
                onChange={(e) =>
                  updateCaptionTypography(activeCaption.caption_id, { font_family: e.target.value })
                }
                className="w-full bg-zinc-950 border border-zinc-800 rounded px-2.5 py-1.5 text-zinc-200 focus:outline-none"
              >
                <option value="Noto Sans Devanagari">Noto Sans Devanagari (Clean Modern)</option>
                <option value="Mukta">Mukta (Bold / Dynamic)</option>
                <option value="Hind">Hind (Balanced Body)</option>
                <option value="Noto Serif Devanagari">Noto Serif Devanagari (Cinematic)</option>
              </select>
            </div>

            {/* Font Size & Weight */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-zinc-400 block mb-1">
                  Size ({activeCaption.typography.font_size}px)
                </span>
                <input
                  type="range"
                  min="24"
                  max="80"
                  value={activeCaption.typography.font_size}
                  onChange={(e) =>
                    updateCaptionTypography(activeCaption.caption_id, {
                      font_size: parseInt(e.target.value),
                    })
                  }
                  className="w-full accent-blue-600"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block mb-1">Font Weight</span>
                <select
                  value={activeCaption.typography.font_weight}
                  onChange={(e) =>
                    updateCaptionTypography(activeCaption.caption_id, { font_weight: e.target.value })
                  }
                  className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-zinc-200"
                >
                  <option value="400">Regular (400)</option>
                  <option value="600">SemiBold (600)</option>
                  <option value="700">Bold (700)</option>
                  <option value="900">Black (900)</option>
                </select>
              </div>
            </div>

            {/* Text Color & Stroke */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-zinc-400 block mb-1">Text Color</span>
                <input
                  type="color"
                  value={activeCaption.typography.color}
                  onChange={(e) =>
                    updateCaptionTypography(activeCaption.caption_id, { color: e.target.value })
                  }
                  className="w-full h-7 bg-zinc-950 rounded cursor-pointer border border-zinc-800"
                />
              </div>
              <div>
                <span className="text-[10px] text-zinc-400 block mb-1">Stroke Color</span>
                <input
                  type="color"
                  value={activeCaption.typography.stroke_color || '#000000'}
                  onChange={(e) =>
                    updateCaptionTypography(activeCaption.caption_id, { stroke_color: e.target.value })
                  }
                  className="w-full h-7 bg-zinc-950 rounded cursor-pointer border border-zinc-800"
                />
              </div>
            </div>
          </div>
        )}

        {/* Position Controls (Normalized Coordinates) */}
        {activeCaption && (
          <div className="space-y-3 pt-3 border-t border-zinc-800">
            <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
              <Move className="w-3.5 h-3.5 text-zinc-400" />
              <span>Position (Normalized Y: {activeCaption.coordinates.y.toFixed(2)})</span>
            </label>
            <input
              type="range"
              min="0.1"
              max="0.95"
              step="0.01"
              value={activeCaption.coordinates.y}
              onChange={(e) =>
                updateCaptionCoordinates(
                  activeCaption.caption_id,
                  activeCaption.coordinates.x,
                  parseFloat(e.target.value)
                )
              }
              className="w-full accent-blue-600"
            />
            <div className="flex justify-between text-[10px] text-zinc-500">
              <span>Top (0.1)</span>
              <span>Center (0.5)</span>
              <span>Bottom (0.82 Subtitle)</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
