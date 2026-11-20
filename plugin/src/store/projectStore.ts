import { create } from 'zustand';
import {
  CaptionLabProject,
  CaptionItem,
  WordItem,
  SentenceSegment,
  StylePreset,
  LayoutFamily,
  TypographyStyle,
  BackgroundStyle,
  AnimationConfig,
} from '../types';

export type NavigationTab =
  | 'home'
  | 'transcribe'
  | 'editor'
  | 'studio'
  | 'animation'
  | 'export'
  | 'settings';

// 10 Initial Style Presets (PRD Section 13.2)
export const INITIAL_PRESETS: StylePreset[] = [
  {
    id: 'classic_hindi',
    name: 'Classic Hindi',
    layout_family: 'balanced_two_line',
    typography: {
      font_family: 'Noto Sans Devanagari',
      font_weight: '700',
      font_size: 46,
      line_height: 1.25,
      letter_spacing: 0,
      alignment: 'center',
      text_transform: 'none',
      color: '#FFFFFF',
      stroke_color: '#000000',
      stroke_width: 3,
      shadow_color: 'rgba(0,0,0,0.8)',
      shadow_blur: 6,
    },
    background: { enabled: false, color: '#000000', opacity: 0.7, border_radius: 8, padding_x: 16, padding_y: 8 },
    animation: {
      entrance: { type: 'fade_in', duration_frames: 5 },
      emphasis: { type: 'none', duration_frames: 0 },
      exit: { type: 'fade_out', duration_frames: 4 },
      word_animation: { type: 'karaoke_highlight', active_color: '#FFDF00', active_scale: 1.1 },
    },
    version: '1.2.0',
  },
  {
    id: 'bold_social_media',
    name: 'Bold Social Media (Reels / Shorts)',
    layout_family: 'keyword_highlight',
    typography: {
      font_family: 'Mukta',
      font_weight: '800',
      font_size: 54,
      line_height: 1.15,
      letter_spacing: 1,
      alignment: 'center',
      text_transform: 'uppercase',
      color: '#FFFFFF',
      stroke_color: '#000000',
      stroke_width: 5,
      shadow_color: 'rgba(0,0,0,0.9)',
      shadow_blur: 10,
    },
    background: { enabled: false, color: '#000000', opacity: 0.8, border_radius: 12, padding_x: 20, padding_y: 10 },
    animation: {
      entrance: { type: 'pop_in', duration_frames: 6 },
      emphasis: { type: 'pulse', duration_frames: 10, repeat: true },
      exit: { type: 'shrink', duration_frames: 4 },
      word_animation: { type: 'word_pop', active_color: '#00FF66', active_scale: 1.25 },
    },
    version: '1.2.0',
  },
  {
    id: 'modern_minimal',
    name: 'Modern Minimal',
    layout_family: 'single_line',
    typography: {
      font_family: 'Hind',
      font_weight: '600',
      font_size: 40,
      line_height: 1.2,
      letter_spacing: 0.5,
      alignment: 'center',
      text_transform: 'none',
      color: '#F4F4F5',
      stroke_color: '#18181B',
      stroke_width: 2,
    },
    background: { enabled: false, color: '#000000', opacity: 0.5, border_radius: 6, padding_x: 12, padding_y: 6 },
    animation: {
      entrance: { type: 'fade_in', duration_frames: 4 },
      emphasis: { type: 'none', duration_frames: 0 },
      exit: { type: 'fade_out', duration_frames: 4 },
      word_animation: { type: 'active_word_highlight', active_color: '#38BDF8', active_scale: 1.05 },
    },
    version: '1.2.0',
  },
  {
    id: 'boxed_subtitle',
    name: 'Boxed Subtitle',
    layout_family: 'boxed',
    typography: {
      font_family: 'Noto Sans Devanagari',
      font_weight: '700',
      font_size: 42,
      line_height: 1.3,
      letter_spacing: 0,
      alignment: 'center',
      text_transform: 'none',
      color: '#FFFFFF',
    },
    background: { enabled: true, color: '#111827', opacity: 0.85, border_radius: 10, padding_x: 24, padding_y: 12 },
    animation: {
      entrance: { type: 'slide_in', duration_frames: 6 },
      emphasis: { type: 'none', duration_frames: 0 },
      exit: { type: 'slide_out', duration_frames: 5 },
      word_animation: { type: 'karaoke_highlight', active_color: '#FBBF24', active_scale: 1.1 },
    },
    version: '1.2.0',
  },
  {
    id: 'news_caption',
    name: 'News Caption',
    layout_family: 'single_line',
    typography: {
      font_family: 'Noto Sans Devanagari',
      font_weight: '700',
      font_size: 38,
      line_height: 1.2,
      letter_spacing: 0,
      alignment: 'left',
      text_transform: 'none',
      color: '#FFFFFF',
    },
    background: { enabled: true, color: '#DC2626', opacity: 0.95, border_radius: 0, padding_x: 20, padding_y: 8 },
    animation: {
      entrance: { type: 'type_reveal', duration_frames: 8 },
      emphasis: { type: 'none', duration_frames: 0 },
      exit: { type: 'fade_out', duration_frames: 3 },
      word_animation: { type: 'sequential_reveal', active_color: '#FFFFFF' },
    },
    version: '1.2.0',
  },
  {
    id: 'karaoke_style',
    name: 'Karaoke Style',
    layout_family: 'balanced_two_line',
    typography: {
      font_family: 'Mukta',
      font_weight: '700',
      font_size: 48,
      line_height: 1.2,
      letter_spacing: 0,
      alignment: 'center',
      text_transform: 'none',
      color: '#9CA3AF',
      stroke_color: '#000000',
      stroke_width: 3,
    },
    background: { enabled: false, color: '#000000', opacity: 0.5, border_radius: 8, padding_x: 16, padding_y: 8 },
    animation: {
      entrance: { type: 'fade_in', duration_frames: 4 },
      emphasis: { type: 'none', duration_frames: 0 },
      exit: { type: 'fade_out', duration_frames: 4 },
      word_animation: { type: 'karaoke_highlight', active_color: '#EC4899', active_scale: 1.2 },
    },
    version: '1.2.0',
  },
  {
    id: 'cinematic_caption',
    name: 'Cinematic Caption',
    layout_family: 'cinematic',
    typography: {
      font_family: 'Noto Serif Devanagari',
      font_weight: '400',
      font_size: 36,
      line_height: 1.4,
      letter_spacing: 1.5,
      alignment: 'center',
      text_transform: 'none',
      color: '#E2E8F0',
      shadow_color: 'rgba(0,0,0,0.9)',
      shadow_blur: 8,
    },
    background: { enabled: false, color: '#000000', opacity: 0, border_radius: 0, padding_x: 0, padding_y: 0 },
    animation: {
      entrance: { type: 'fade_in', duration_frames: 10 },
      emphasis: { type: 'none', duration_frames: 0 },
      exit: { type: 'fade_out', duration_frames: 10 },
      word_animation: { type: 'none' },
    },
    version: '1.2.0',
  },
  {
    id: 'podcast_caption',
    name: 'Podcast Caption',
    layout_family: 'speaker_based',
    typography: {
      font_family: 'Hind',
      font_weight: '600',
      font_size: 44,
      line_height: 1.25,
      letter_spacing: 0,
      alignment: 'left',
      text_transform: 'none',
      color: '#F3F4F6',
      stroke_color: '#000000',
      stroke_width: 2,
    },
    background: { enabled: true, color: '#1F2937', opacity: 0.8, border_radius: 12, padding_x: 18, padding_y: 10 },
    animation: {
      entrance: { type: 'slide_in', duration_frames: 5 },
      emphasis: { type: 'none', duration_frames: 0 },
      exit: { type: 'fade_out', duration_frames: 4 },
      word_animation: { type: 'active_word_highlight', active_color: '#A855F7', active_scale: 1.1 },
    },
    version: '1.2.0',
  },
  {
    id: 'highlight_words',
    name: 'Keyword Highlight Focus',
    layout_family: 'keyword_highlight',
    typography: {
      font_family: 'Mukta',
      font_weight: '700',
      font_size: 48,
      line_height: 1.2,
      letter_spacing: 0,
      alignment: 'center',
      text_transform: 'none',
      color: '#FFFFFF',
      stroke_color: '#000000',
      stroke_width: 4,
    },
    background: { enabled: false, color: '#000000', opacity: 0.6, border_radius: 8, padding_x: 16, padding_y: 8 },
    animation: {
      entrance: { type: 'pop_in', duration_frames: 5 },
      emphasis: { type: 'glow', duration_frames: 8 },
      exit: { type: 'fade_out', duration_frames: 4 },
      word_animation: { type: 'word_pop', active_color: '#10B981', active_scale: 1.2 },
    },
    version: '1.2.0',
  },
  {
    id: 'clean_professional',
    name: 'Clean Professional',
    layout_family: 'balanced_two_line',
    typography: {
      font_family: 'Noto Sans Devanagari',
      font_weight: '600',
      font_size: 42,
      line_height: 1.3,
      letter_spacing: 0.2,
      alignment: 'center',
      text_transform: 'none',
      color: '#FFFFFF',
      stroke_color: '#111827',
      stroke_width: 2.5,
    },
    background: { enabled: false, color: '#000000', opacity: 0.5, border_radius: 6, padding_x: 14, padding_y: 8 },
    animation: {
      entrance: { type: 'fade_in', duration_frames: 6 },
      emphasis: { type: 'none', duration_frames: 0 },
      exit: { type: 'fade_out', duration_frames: 5 },
      word_animation: { type: 'karaoke_highlight', active_color: '#38BDF8', active_scale: 1.1 },
    },
    version: '1.2.0',
  },
];

const DEFAULT_PROJECT: CaptionLabProject = {
  project: {
    id: 'proj_default_001',
    name: 'Hindi Mixed Caption Project',
    version: '1.2.0',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    fps: 30,
    width: 1920,
    height: 1080,
  },
  transcript: {
    language: 'hindi_mixed',
    engine: 'faster-whisper',
    model_size: 'base',
    sentences: [
      {
        sentence_id: 's001',
        speaker_id: null,
        start: 0.2,
        end: 4.75,
        text: 'आज हम इस project की नई technology के बारे में बात करेंगे।',
        words: [
          { word_id: 'w0001', text: 'आज', start: 0.2, end: 0.55, confidence: 0.98, speaker_id: null, corrected: false },
          { word_id: 'w0002', text: 'हम', start: 0.58, end: 0.82, confidence: 0.99, speaker_id: null, corrected: false },
          { word_id: 'w0003', text: 'इस', start: 0.85, end: 1.1, confidence: 0.96, speaker_id: null, corrected: false },
          { word_id: 'w0004', text: 'project', start: 1.15, end: 1.7, confidence: 0.97, speaker_id: null, corrected: false },
          { word_id: 'w0005', text: 'की', start: 1.72, end: 1.95, confidence: 0.99, speaker_id: null, corrected: false },
          { word_id: 'w0006', text: 'नई', start: 1.98, end: 2.3, confidence: 0.98, speaker_id: null, corrected: false },
          { word_id: 'w0007', text: 'technology', start: 2.35, end: 3.1, confidence: 0.98, speaker_id: null, corrected: false },
          { word_id: 'w0008', text: 'के', start: 3.12, end: 3.3, confidence: 0.99, speaker_id: null, corrected: false },
          { word_id: 'w0009', text: 'बारे', start: 3.32, end: 3.65, confidence: 0.98, speaker_id: null, corrected: false },
          { word_id: 'w0010', text: 'में', start: 3.68, end: 3.85, confidence: 0.99, speaker_id: null, corrected: false },
          { word_id: 'w0011', text: 'बात', start: 3.88, end: 4.2, confidence: 0.97, speaker_id: null, corrected: false },
          { word_id: 'w0012', text: 'करेंगे।', start: 4.22, end: 4.75, confidence: 0.98, speaker_id: null, corrected: false },
        ],
      },
    ],
    words: [],
  },
  captions: [
    {
      caption_id: 'cap_001',
      start_frame: 6,
      end_frame: 69,
      start_time: 0.2,
      end_time: 2.3,
      duration: 2.1,
      words: [
        { word_id: 'w0001', text: 'आज', start: 0.2, end: 0.55, confidence: 0.98, speaker_id: null, corrected: false },
        { word_id: 'w0002', text: 'हम', start: 0.58, end: 0.82, confidence: 0.99, speaker_id: null, corrected: false },
        { word_id: 'w0003', text: 'इस', start: 0.85, end: 1.1, confidence: 0.96, speaker_id: null, corrected: false },
        { word_id: 'w0004', text: 'project', start: 1.15, end: 1.7, confidence: 0.97, speaker_id: null, corrected: false },
        { word_id: 'w0005', text: 'की', start: 1.72, end: 1.95, confidence: 0.99, speaker_id: null, corrected: false },
        { word_id: 'w0006', text: 'नई', start: 1.98, end: 2.3, confidence: 0.98, speaker_id: null, corrected: false },
      ],
      layout_family: 'balanced_two_line',
      coordinates: { x: 0.5, y: 0.82, width: 0.85, height: 0.15 },
      typography: { ...INITIAL_PRESETS[0].typography },
      background: { ...INITIAL_PRESETS[0].background },
      animation: { ...INITIAL_PRESETS[0].animation },
      user_overridden_properties: [],
    },
    {
      caption_id: 'cap_002',
      start_frame: 70,
      end_frame: 142,
      start_time: 2.35,
      end_time: 4.75,
      duration: 2.4,
      words: [
        { word_id: 'w0007', text: 'technology', start: 2.35, end: 3.1, confidence: 0.98, speaker_id: null, corrected: false },
        { word_id: 'w0008', text: 'के', start: 3.12, end: 3.3, confidence: 0.99, speaker_id: null, corrected: false },
        { word_id: 'w0009', text: 'बारे', start: 3.32, end: 3.65, confidence: 0.98, speaker_id: null, corrected: false },
        { word_id: 'w0010', text: 'में', start: 3.68, end: 3.85, confidence: 0.99, speaker_id: null, corrected: false },
        { word_id: 'w0011', text: 'बात', start: 3.88, end: 4.2, confidence: 0.97, speaker_id: null, corrected: false },
        { word_id: 'w0012', text: 'करेंगे।', start: 4.22, end: 4.75, confidence: 0.98, speaker_id: null, corrected: false },
      ],
      layout_family: 'balanced_two_line',
      coordinates: { x: 0.5, y: 0.82, width: 0.85, height: 0.15 },
      typography: { ...INITIAL_PRESETS[0].typography },
      background: { ...INITIAL_PRESETS[0].background },
      animation: { ...INITIAL_PRESETS[0].animation },
      user_overridden_properties: [],
    },
  ],
  presets: INITIAL_PRESETS,
};

DEFAULT_PROJECT.transcript.words = DEFAULT_PROJECT.transcript.sentences.flatMap((s) => s.words);

interface ProjectStoreState {
  currentTab: NavigationTab;
  project: CaptionLabProject;
  activeCaptionId: string | null;
  activeWordId: string | null;
  currentTime: number;
  isPlaying: boolean;
  engineConnected: boolean;
  historyStack: CaptionLabProject[];
  redoStack: CaptionLabProject[];

  // Actions
  setTab: (tab: NavigationTab) => void;
  setProject: (project: CaptionLabProject) => void;
  setActiveCaptionId: (id: string | null) => void;
  setActiveWordId: (id: string | null) => void;
  setCurrentTime: (time: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setEngineConnected: (connected: boolean) => void;

  // Editing Actions (PRD Section 7 & 9)
  updateWordText: (wordId: string, newText: string) => void;
  updateWordTiming: (wordId: string, start: number, end: number) => void;
  setWordHighlightColor: (wordId: string, color?: string) => void;
  updateCaptionTypography: (captionId: string, updates: Partial<TypographyStyle>) => void;
  updateCaptionBackground: (captionId: string, updates: Partial<BackgroundStyle>) => void;
  updateCaptionLayout: (captionId: string, layout: LayoutFamily) => void;
  updateCaptionCoordinates: (captionId: string, x: number, y: number) => void;
  applyPresetToCaption: (captionId: string, presetId: string) => void;
  applyPresetToAllCaptions: (presetId: string) => void;

  undo: () => void;
  redo: () => void;
}

export const useProjectStore = create<ProjectStoreState>((set, get) => ({
  currentTab: 'home',
  project: DEFAULT_PROJECT,
  activeCaptionId: DEFAULT_PROJECT.captions[0]?.caption_id || null,
  activeWordId: null,
  currentTime: 0.0,
  isPlaying: false,
  engineConnected: false,
  historyStack: [],
  redoStack: [],

  setTab: (tab) => set({ currentTab: tab }),
  setProject: (project) => set({ project, activeCaptionId: project.captions[0]?.caption_id || null }),
  setActiveCaptionId: (id) => set({ activeCaptionId: id }),
  setActiveWordId: (id) => set({ activeWordId: id }),
  setCurrentTime: (time) => set({ currentTime: time }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setEngineConnected: (connected) => set({ engineConnected: connected }),

  updateWordText: (wordId, newText) => {
    const { project, historyStack } = get();
    const cloned = JSON.parse(JSON.stringify(project)) as CaptionLabProject;
    
    // Update in transcript words
    cloned.transcript.words.forEach((w) => {
      if (w.word_id === wordId) {
        w.text = newText;
        w.corrected = true;
      }
    });

    // Update in sentences
    cloned.transcript.sentences.forEach((s) => {
      s.words.forEach((w) => {
        if (w.word_id === wordId) {
          w.text = newText;
          w.corrected = true;
        }
      });
      s.text = s.words.map((w) => w.text).join(' ');
    });

    // Update in captions
    cloned.captions.forEach((c) => {
      c.words.forEach((w) => {
        if (w.word_id === wordId) {
          w.text = newText;
          w.corrected = true;
        }
      });
    });

    set({
      historyStack: [...historyStack.slice(-20), project],
      redoStack: [],
      project: cloned,
    });
  },

  updateWordTiming: (wordId, start, end) => {
    const { project, historyStack } = get();
    const cloned = JSON.parse(JSON.stringify(project)) as CaptionLabProject;
    
    const updateW = (w: WordItem) => {
      if (w.word_id === wordId) {
        w.start = start;
        w.end = end;
        w.corrected = true;
      }
    };

    cloned.transcript.words.forEach(updateW);
    cloned.transcript.sentences.forEach((s) => s.words.forEach(updateW));
    cloned.captions.forEach((c) => c.words.forEach(updateW));

    set({
      historyStack: [...historyStack.slice(-20), project],
      redoStack: [],
      project: cloned,
    });
  },

  setWordHighlightColor: (wordId, color) => {
    const { project } = get();
    const cloned = JSON.parse(JSON.stringify(project)) as CaptionLabProject;
    cloned.captions.forEach((c) => {
      c.words.forEach((w) => {
        if (w.word_id === wordId) {
          w.custom_color = color;
          w.custom_highlight = !!color;
        }
      });
    });
    set({ project: cloned });
  },

  updateCaptionTypography: (captionId, updates) => {
    const { project, historyStack } = get();
    const cloned = JSON.parse(JSON.stringify(project)) as CaptionLabProject;
    cloned.captions.forEach((c) => {
      if (c.caption_id === captionId) {
        c.typography = { ...c.typography, ...updates };
        // Mark as user overridden (PRD Section 9.10)
        Object.keys(updates).forEach((k) => {
          const propKey = `typography.${k}`;
          if (!c.user_overridden_properties.includes(propKey)) {
            c.user_overridden_properties.push(propKey);
          }
        });
      }
    });
    set({
      historyStack: [...historyStack.slice(-20), project],
      redoStack: [],
      project: cloned,
    });
  },

  updateCaptionBackground: (captionId, updates) => {
    const { project, historyStack } = get();
    const cloned = JSON.parse(JSON.stringify(project)) as CaptionLabProject;
    cloned.captions.forEach((c) => {
      if (c.caption_id === captionId) {
        c.background = { ...c.background, ...updates };
        Object.keys(updates).forEach((k) => {
          const propKey = `background.${k}`;
          if (!c.user_overridden_properties.includes(propKey)) {
            c.user_overridden_properties.push(propKey);
          }
        });
      }
    });
    set({
      historyStack: [...historyStack.slice(-20), project],
      redoStack: [],
      project: cloned,
    });
  },

  updateCaptionLayout: (captionId, layout) => {
    const { project } = get();
    const cloned = JSON.parse(JSON.stringify(project)) as CaptionLabProject;
    cloned.captions.forEach((c) => {
      if (c.caption_id === captionId) {
        c.layout_family = layout;
        if (!c.user_overridden_properties.includes('layout_family')) {
          c.user_overridden_properties.push('layout_family');
        }
      }
    });
    set({ project: cloned });
  },

  updateCaptionCoordinates: (captionId, x, y) => {
    const { project } = get();
    const cloned = JSON.parse(JSON.stringify(project)) as CaptionLabProject;
    cloned.captions.forEach((c) => {
      if (c.caption_id === captionId) {
        c.coordinates.x = Math.max(0.05, Math.min(0.95, x));
        c.coordinates.y = Math.max(0.05, Math.min(0.95, y));
        if (!c.user_overridden_properties.includes('coordinates')) {
          c.user_overridden_properties.push('coordinates');
        }
      }
    });
    set({ project: cloned });
  },

  applyPresetToCaption: (captionId, presetId) => {
    const { project, historyStack } = get();
    const preset = INITIAL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const cloned = JSON.parse(JSON.stringify(project)) as CaptionLabProject;

    cloned.captions.forEach((c) => {
      if (c.caption_id === captionId) {
        const overrides = new Set(c.user_overridden_properties);
        if (!overrides.has('layout_family')) c.layout_family = preset.layout_family;
        
        Object.entries(preset.typography).forEach(([k, v]) => {
          if (!overrides.has(`typography.${k}`)) {
            (c.typography as any)[k] = v;
          }
        });

        Object.entries(preset.background).forEach(([k, v]) => {
          if (!overrides.has(`background.${k}`)) {
            (c.background as any)[k] = v;
          }
        });

        c.animation = { ...preset.animation };
      }
    });

    set({
      historyStack: [...historyStack.slice(-20), project],
      redoStack: [],
      project: cloned,
    });
  },

  applyPresetToAllCaptions: (presetId) => {
    const { project, historyStack } = get();
    const preset = INITIAL_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    const cloned = JSON.parse(JSON.stringify(project)) as CaptionLabProject;

    cloned.captions.forEach((c) => {
      const overrides = new Set(c.user_overridden_properties);
      if (!overrides.has('layout_family')) c.layout_family = preset.layout_family;
      
      Object.entries(preset.typography).forEach(([k, v]) => {
        if (!overrides.has(`typography.${k}`)) {
          (c.typography as any)[k] = v;
        }
      });

      Object.entries(preset.background).forEach(([k, v]) => {
        if (!overrides.has(`background.${k}`)) {
          (c.background as any)[k] = v;
        }
      });

      c.animation = { ...preset.animation };
    });

    set({
      historyStack: [...historyStack.slice(-20), project],
      redoStack: [],
      project: cloned,
    });
  },

  undo: () => {
    const { historyStack, project, redoStack } = get();
    if (historyStack.length === 0) return;
    const previous = historyStack[historyStack.length - 1];
    set({
      historyStack: historyStack.slice(0, -1),
      redoStack: [project, ...redoStack],
      project: previous,
    });
  },

  redo: () => {
    const { redoStack, project, historyStack } = get();
    if (redoStack.length === 0) return;
    const next = redoStack[0];
    set({
      redoStack: redoStack.slice(1),
      historyStack: [...historyStack, project],
      project: next,
    });
  },
}));
