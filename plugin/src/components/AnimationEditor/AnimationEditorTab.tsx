import React, { useEffect } from 'react';
import {
  Sparkles,
  Zap,
  Play,
  Pause,
  RotateCw,
  Film,
  Layers,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { useProjectStore } from '../../store/projectStore';
import { WordAnimationType, EntranceAnimationType, ExitAnimationType } from '../../types';

export const AnimationEditorTab: React.FC = () => {
  const {
    project,
    activeCaptionId,
    currentTime,
    setCurrentTime,
    isPlaying,
    setIsPlaying,
    updateCaptionAnimation,
    updateAllCaptionsAnimation,
  } = useProjectStore();

  const activeCaption =
    project.captions.find((c) => c.caption_id === activeCaptionId) || project.captions[0];

  // Playback loop for animation preview
  useEffect(() => {
    let animId: number;
    if (isPlaying) {
      let lastTime = performance.now();
      const tick = (now: number) => {
        const delta = (now - lastTime) / 1000;
        lastTime = now;
        const maxTime = project.captions.length > 0
          ? Math.max(...project.captions.map((c) => c.end_time))
          : 10;
        const nextTime = useProjectStore.getState().currentTime + delta;
        if (nextTime >= maxTime) {
          setCurrentTime(maxTime);
          setIsPlaying(false);
        } else {
          setCurrentTime(nextTime);
          animId = requestAnimationFrame(tick);
        }
      };
      animId = requestAnimationFrame(tick);
    }
    return () => cancelAnimationFrame(animId);
  }, [isPlaying, project.captions, setCurrentTime, setIsPlaying]);

  const wordAnimations: { id: WordAnimationType; label: string; desc: string }[] = [
    { id: 'karaoke_highlight', label: 'Karaoke Highlight', desc: 'Active spoken word changes color smoothly' },
    { id: 'word_pop', label: 'Word Pop (Reels/Shorts)', desc: 'Spoken word scales up to 1.15x with punchy bounce' },
    { id: 'sequential_reveal', label: 'Sequential Reveal', desc: 'Words appear one by one as spoken' },
    { id: 'active_word_highlight', label: 'Active Word Focus', desc: 'Subtle highlight on the currently spoken word' },
    { id: 'none', label: 'Static Text', desc: 'No word-by-word animation' },
  ];

  const entranceAnimations: { id: EntranceAnimationType; label: string }[] = [
    { id: 'pop_in', label: 'Pop In (0.8x to 1.0x Ease-Out)' },
    { id: 'fade_in', label: 'Fade In' },
    { id: 'slide_in', label: 'Slide Up' },
    { id: 'type_reveal', label: 'Typewriter' },
    { id: 'none', label: 'Cut (Instant)' },
  ];

  const exitAnimations: { id: ExitAnimationType; label: string }[] = [
    { id: 'fade_out', label: 'Smooth Alpha Fade Out' },
    { id: 'slide_out', label: 'Slide Down / Out' },
    { id: 'shrink', label: 'Shrink Out' },
    { id: 'none', label: 'Hard Cut (Instant)' },
  ];

  const totalDuration = project.captions.length > 0
    ? Math.max(...project.captions.map((c) => c.end_time))
    : 10.0;

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full text-xs">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-white flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Motion Graphics & Word-by-Word Animations</span>
        </h2>
        <p className="text-xs text-zinc-400">
          Deterministic rational frame-timing for YouTube Shorts, Reels, and Cinematic content. Hindi words are treated as whole grapheme units with baseline locking.
        </p>
      </div>

      {/* Word-level Animation Grid */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>Word-Level Animation Engine (PRD Section 12.6)</span>
          </label>
          {activeCaption && (
            <button
              onClick={() =>
                updateAllCaptionsAnimation({
                  word_animation: { ...activeCaption.animation.word_animation },
                })
              }
              className="text-[10px] text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded bg-zinc-800 transition"
            >
              Apply Word Animation to All
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {wordAnimations.map((anim) => {
            const isSelected = activeCaption?.animation.word_animation.type === anim.id;
            return (
              <div
                key={anim.id}
                onClick={() => {
                  if (activeCaption) {
                    updateCaptionAnimation(activeCaption.caption_id, {
                      word_animation: {
                        ...activeCaption.animation.word_animation,
                        type: anim.id,
                        active_scale: anim.id === 'word_pop' ? 1.25 : 1.15,
                      },
                    });
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

        {/* Geometric Scale Slider (Milestone 5) */}
        {activeCaption && (
          <div className="pt-2 border-t border-zinc-800 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400">
              Active Word Geometric Scale ({activeCaption.animation.word_animation.active_scale || 1.15}×)
            </span>
            <input
              type="range"
              min="1.05"
              max="1.35"
              step="0.01"
              value={activeCaption.animation.word_animation.active_scale || 1.15}
              onChange={(e) =>
                updateCaptionAnimation(activeCaption.caption_id, {
                  word_animation: {
                    ...activeCaption.animation.word_animation,
                    active_scale: parseFloat(e.target.value),
                  },
                })
              }
              className="w-48 accent-amber-500"
            />
          </div>
        )}
      </div>

      {/* 10 Professional Motion Presets (Milestone 5) */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <label className="text-xs font-semibold text-zinc-200 flex items-center space-x-1.5">
          <Film className="w-3.5 h-3.5 text-blue-400" />
          <span>Professional Motion Presets (10 Preset Library)</span>
        </label>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {[
            { id: 'mot_word_pop', name: 'Word Pop', type: 'word_pop', scale: 1.25, ent: 'pop_in', ex: 'shrink' },
            { id: 'mot_smooth_fade', name: 'Smooth Fade', type: 'karaoke_highlight', scale: 1.05, ent: 'fade_in', ex: 'fade_out' },
            { id: 'mot_slide_up', name: 'Slide Up', type: 'word_pop', scale: 1.15, ent: 'slide_in', ex: 'slide_out' },
            { id: 'mot_slide_down', name: 'Slide Down', type: 'karaoke_highlight', scale: 1.1, ent: 'slide_in', ex: 'fade_out' },
            { id: 'mot_type_reveal', name: 'Type Reveal', type: 'sequential_reveal', scale: 1.05, ent: 'type_reveal', ex: 'fade_out' },
            { id: 'mot_karaoke', name: 'Karaoke Pro', type: 'karaoke_highlight', scale: 1.15, ent: 'fade_in', ex: 'fade_out' },
            { id: 'mot_scale_bounce', name: 'Scale Bounce', type: 'word_pop', scale: 1.30, ent: 'pop_in', ex: 'shrink' },
            { id: 'mot_cinematic', name: 'Cinematic', type: 'active_word_highlight', scale: 1.08, ent: 'fade_in', ex: 'fade_out' },
            { id: 'mot_staggered', name: 'Staggered', type: 'word_pop', scale: 1.18, ent: 'pop_in', ex: 'fade_out' },
            { id: 'mot_char_reveal', name: 'Character', type: 'sequential_reveal', scale: 1.05, ent: 'type_reveal', ex: 'shrink' },
          ].map((mp) => (
            <button
              key={mp.id}
              onClick={() => {
                if (activeCaption) {
                  updateCaptionAnimation(activeCaption.caption_id, {
                    entrance: { ...activeCaption.animation.entrance, type: mp.ent as any },
                    exit: { ...activeCaption.animation.exit, type: mp.ex as any },
                    word_animation: {
                      ...activeCaption.animation.word_animation,
                      type: mp.type as any,
                      active_scale: mp.scale,
                    },
                  });
                }
              }}
              className="p-2 bg-zinc-950 hover:bg-zinc-800 border border-zinc-800 rounded text-left transition"
            >
              <div className="font-medium text-zinc-200 truncate">{mp.name}</div>
              <div className="text-[10px] text-zinc-500 font-mono">{mp.scale}x • {mp.ent}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Entrance and Exit Transitions */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Entrance */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <span className="text-xs font-semibold text-zinc-200 block">Entrance Animation</span>
          <div className="space-y-1.5">
            {entranceAnimations.map((ent) => (
              <button
                key={ent.id}
                onClick={() => {
                  if (activeCaption) {
                    updateCaptionAnimation(activeCaption.caption_id, {
                      entrance: {
                        ...activeCaption.animation.entrance,
                        type: ent.id,
                        duration_frames: 6,
                      },
                    });
                  }
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

        {/* Exit */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <span className="text-xs font-semibold text-zinc-200 block">Exit Transition</span>
          <div className="space-y-1.5">
            {exitAnimations.map((ex) => (
              <button
                key={ex.id}
                onClick={() => {
                  if (activeCaption) {
                    updateCaptionAnimation(activeCaption.caption_id, {
                      exit: {
                        ...activeCaption.animation.exit,
                        type: ex.id,
                        duration_frames: 5,
                      },
                    });
                  }
                }}
                className={`w-full py-1.5 px-3 rounded text-left text-xs transition border ${
                  activeCaption?.animation.exit.type === ex.id
                    ? 'border-purple-500 bg-purple-950/30 text-white font-medium'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>

        {/* Karaoke Color */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
          <span className="text-xs font-semibold text-zinc-200 block">Karaoke Highlight Color</span>
          <div className="space-y-2">
            <span className="text-[11px] text-zinc-400 block">Active Spoken Word Color:</span>
            <div className="flex items-center space-x-2">
              {['#FFDF00', '#00FF66', '#EC4899', '#38BDF8', '#FFFFFF'].map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    if (activeCaption) {
                      updateCaptionAnimation(activeCaption.caption_id, {
                        word_animation: {
                          ...activeCaption.animation.word_animation,
                          active_color: color,
                        },
                      });
                    }
                  }}
                  style={{ backgroundColor: color }}
                  className="w-7 h-7 rounded-full border border-zinc-700 hover:scale-110 transition shadow"
                />
              ))}
            </div>
            <span className="text-[10px] text-zinc-500 block pt-1">
              Active: {activeCaption?.animation.word_animation.active_color || '#FFDF00'}
            </span>
          </div>
        </div>
      </div>

      {/* Timeline Player Scrubber */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-semibold text-zinc-300">Live Animation Scrubber</span>
          <span className="font-mono text-zinc-400">
            {currentTime.toFixed(2)}s / {totalDuration.toFixed(2)}s
          </span>
        </div>
        <input
          type="range"
          min="0"
          max={totalDuration}
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
            {isPlaying ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Motion</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-zinc-950" />
                <span>Play Live Motion</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
