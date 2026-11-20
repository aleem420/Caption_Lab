export type PropertyProvenance = 'DEFAULT' | 'AUTO' | 'USER' | 'IMPORTED';

export type WhisperModelSize = 'tiny' | 'base' | 'small' | 'medium' | 'large';
export type ProcessingDevice = 'cpu' | 'cuda';
export type AudioSourceType = 'direct_media' | 'sequence_audio' | 'timeline_range';

export interface ModelInfo {
  model_id: WhisperModelSize;
  name: string;
  size_mb: number;
  ram_estimate_mb: number;
  vram_estimate_mb: number;
  is_cached: boolean;
  is_default: boolean;
  is_fast_mode: boolean;
  description: string;
}

export interface AudioValidationResult {
  file_path: string;
  source_type: AudioSourceType;
  is_valid: boolean;
  format?: string;
  duration_seconds?: number;
  sample_rate?: number;
  channels?: number;
  error_message?: string;
  extracted_cache_path?: string;
}

export type LayoutFamily =
  | 'single_line'
  | 'balanced_two_line'
  | 'stacked'
  | 'keyword_highlight'
  | 'word_by_word'
  | 'speaker_based'
  | 'boxed'
  | 'cinematic';

export interface NormalizedCoordinates {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface WordItem {
  word_id: string;
  text: string;
  start: number;
  end: number;
  confidence: number | null;
  speaker_id: string | null;
  corrected: boolean;
  custom_color?: string;
  custom_scale?: number;
  custom_highlight?: boolean;
  custom_stroke?: string;
}

export interface SentenceSegment {
  sentence_id: string;
  speaker_id: string | null;
  start: number;
  end: number;
  text: string;
  words: WordItem[];
}

export interface TypographyStyle {
  font_family: string;
  font_weight: number | string;
  font_size: number;
  line_height: number;
  letter_spacing: number;
  alignment: 'left' | 'center' | 'right';
  text_transform: 'none' | 'uppercase' | 'lowercase';
  color: string;
  stroke_color?: string;
  stroke_width?: number;
  shadow_color?: string;
  shadow_blur?: number;
  shadow_offset_x?: number;
  shadow_offset_y?: number;
}

export interface BackgroundStyle {
  enabled: boolean;
  color: string;
  opacity: number;
  border_radius: number;
  padding_x: number;
  padding_y: number;
  border_color?: string;
  border_width?: number;
}

export type EntranceAnimationType =
  | 'none'
  | 'fade_in'
  | 'pop_in'
  | 'slide_in'
  | 'bounce_in'
  | 'zoom_in'
  | 'type_reveal';

export type EmphasisAnimationType =
  | 'none'
  | 'pulse'
  | 'shake'
  | 'scale'
  | 'glow'
  | 'highlight'
  | 'color_transition';

export type ExitAnimationType =
  | 'none'
  | 'fade_out'
  | 'slide_out'
  | 'shrink'
  | 'blur_out';

export type WordAnimationType =
  | 'none'
  | 'word_pop'
  | 'karaoke_highlight'
  | 'sequential_reveal'
  | 'active_word_highlight'
  | 'word_scale'
  | 'word_color_transition';

export interface AnimationConfig {
  entrance: {
    type: EntranceAnimationType | string;
    duration_frames: number;
  };
  emphasis: {
    type: EmphasisAnimationType | string;
    duration_frames: number;
    repeat?: boolean;
  };
  exit: {
    type: ExitAnimationType | string;
    duration_frames: number;
  };
  word_animation: {
    type: WordAnimationType | string;
    active_color?: string;
    inactive_color?: string;
    active_scale?: number;
  };
}

export interface CaptionItem {
  caption_id: string;
  start_frame: number;
  end_frame: number;
  start_time: number;
  end_time: number;
  duration: number;
  words: WordItem[];
  layout_family: LayoutFamily;
  coordinates: NormalizedCoordinates;
  typography: TypographyStyle;
  background: BackgroundStyle;
  animation: AnimationConfig;
  user_overridden_properties: string[];
}

export interface StylePreset {
  id: string;
  name: string;
  description?: string;
  layout_family: LayoutFamily;
  typography: TypographyStyle;
  background: BackgroundStyle;
  animation: AnimationConfig;
  version: string;
}

export interface CaptionLabProject {
  project: {
    id: string;
    name: string;
    version: string;
    created_at: string;
    updated_at: string;
    fps: number;
    width: number;
    height: number;
    audio_source_path?: string;
    video_source_path?: string;
  };
  transcript: {
    language: string;
    engine: string;
    model_size: WhisperModelSize;
    sentences: SentenceSegment[];
    words: WordItem[];
  };
  captions: CaptionItem[];
  presets: StylePreset[];
}
