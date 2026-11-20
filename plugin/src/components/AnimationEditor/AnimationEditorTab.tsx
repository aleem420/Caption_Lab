import React from 'react';
import {
  Sparkles,
  Zap,
  Play,
  RotateCw,
  Film,
  Layers,
  Sliders,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { WordAnimationType, EntranceAnimationType, ExitAnimationType } from '../../types';

export const AnimationEditorTab: React.FC = () => {
  const { project, activeCaptionId, currentTime, setCurrentTime, isPlaying, setIsPlaying } =
    useProjectStore();

  const activeCaption =
    project.captions.find((c) => c.caption_id === activeCaptionId) || project.captions[0];

  const wordAnimations: { id: WordAnimationType; label: string; desc: string }[] = [
    { id: 'karaoke_highlight', label: 'Karaoke Highlight', desc: 'Active spoken word changes color smoothly' },
    { id: 'word_pop', label: 'Word Pop (Reels/Shorts)', desc: 'Spoken word scales up with a punchy bounce' },
    { id: 'sequential_reveal', label: 'Sequential Reveal', desc: 'Words appear one by one as spoken' },
    { id: 'active_word_highlight', label: 'Active Word Focus', desc: 'Subtle highlight on the currently spoken word' },
    { id: 'none', label: 'Static Text', desc: 'No word-by-word animation' },
  ];

  const entranceAnimations: { id: EntranceAnimationType; label: string }[] = [
    { id: 'fade_in', label: 'Fade In' },
    { id: 'pop_in', label: 'Pop In (Bounce)' },
    { id: 'slide_in', label: 'Slide Up' },
    { id: 'type_reveal', label: 'Typewriter' },
    { id: 'none', label: 'Cut (Instant)' },
  ];

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Motion Graphics & Word-by-Word Animations</span>
        </h2>
        <p className="text-xs text-zinc-400">
          Deterministic rational frame-timing for YouTube Shorts, Reels, and Cinematic content. Hindi words are treated as whole grapheme units.
        </p>
      </div>

      {/* Word-level Animation Grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Word-Level Animation Engine (PRD Section 12.6)</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {wordAnimations.map((anim) => {
            const isSelected = activeCaption?.animation.word_animation.type === anim.id;
            return (
              <div
                key={anim.id}
                onClick={() => {
                  if (activeCaption) {
                    activeCaption.animation.word_animation.type = anim.id as any;
                  }
                }}
                className={`p-3 rounded-lg border cursor-pointer transition ${
                  isSelected
                    ? 'border-amber-500 bg-amber-950/20'
                    : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700'
                }`}
              >
                <div className="text-xs font-medium text-zinc-200">{anim.label}</div>
                <div className="text-[10px] text-zinc-400 mt-0.5">{anim.desc}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Entrance and Exit Transitions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <span className="text-xs font-semibold text-zinc-200 block">Entrance Animation</span>
          <div className="space-y-1.5">
            {entranceAnimations.map((ent) => (
              <button
                key={ent.id}
                onClick={() => {
                  if (activeCaption) activeCaption.animation.entrance.type = ent.id as any;
                }}
                className={`w-full py-1.5 px-3 rounded text-left text-xs transition border ${
                  activeCaption?.animation.entrance.type === ent.id
                    ? 'border-blue-500 bg-blue-950/30 text-white font-medium'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {ent.label}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <span className="text-xs font-semibold text-zinc-200 block">Karaoke Highlight Color</span>
          <div className="space-y-2">
            <span className="text-[11px] text-zinc-400 block">Active Spoken Word Color:</span>
            <div className="flex items-center space-x-2">
              {['#FFDF00', '#00FF66', '#EC4899', '#38BDF8', '#FFFFFF'].map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    if (activeCaption) activeCaption.animation.word_animation.active_color = color;
                  }}
                  style={{ backgroundColor: color }}
                  className="w-7 h-7 rounded-full border border-zinc-700 hover:scale-110 transition shadow"
                />
              ))}
            </div>
            <span className="text-[10px] text-zinc-500 block pt-1">
              Currently active: {activeCaption?.animation.word_animation.active_color || '#FFDF00'}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Player Scrubber */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300">Live Animation Scrubber</span>
          <span className="font-mono text-zinc-400">{currentTime.toFixed(2)}s / 5.00s</span>
        </div>
        <input
          type="range"
          min="0"
          max="5.0"
          step="0.05"
          value={currentTime}
          onChange={(e) => setCurrentTime(parseFloat(e.target.value))}
          className="w-full accent-amber-500"
        />
        <div className="flex items-center justify-center space-x-2">
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="flex items-center space-x-1.5 px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-zinc-950 font-bold text-xs rounded-lg shadow transition"
          >
            {isPlaying ? 'Pause Animation' : 'Play Live Motion'}
          </button>
        </div>
      </div>
    </div>
  );
};
