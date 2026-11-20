/**
 * CaptionLab Shared Type Definitions
 * Version: 1.2
 * Corresponds to PRD Sections 6, 8, 9, 10, 12, 13, 20
 */

// Property Provenance System (PRD Section 9.10)
export type PropertyProvenance = 'DEFAULT' | 'AUTO' | 'USER' | 'IMPORTED';

export interface ProvenanceValue<T> {
  value: T;
  provenance: PropertyProvenance;
}

// Model Selection & Processing Devices (PRD Section 6.4)
export type WhisperModelSize = 'tiny' | 'base' | 'small' | 'medium' | 'large';
export type ProcessingDevice = 'cpu' | 'cuda';

// Layout Families (PRD Section 10.4)
export type LayoutFamily =
  | 'single_line'
  | 'balanced_two_line'
  | 'stacked'
  | 'keyword_highlight'
  | 'word_by_word'
  | 'speaker_based'
  | 'boxed'
  | 'cinematic';

// Screen Resolutions & Aspect Ratios (PRD Section 10.6)
export interface Resolution {
  width: number;
  height: number;
  label?: string;
  aspect_ratio: string; // e.g. "16:9", "9:16", "1:1", "4:5"
}

// Normalized Screen Coordinates (0.0 - 1.0) (PRD Section 10.7)
export interface NormalizedCoordinates {
  x: number; // 0.0 (left) to 1.0 (right), e.g. 0.5 center
  y: number; // 0.0 (top) to 1.0 (bottom), e.g. 0.82 bottom subtitle area
  width: number; // 0.0 to 1.0 fraction of canvas width
  height: number; // 0.0 to 1.0 fraction of canvas height
}

// Word Entity with Timestamp & Correction Status (PRD Section 6.5)
export interface WordItem {
  word_id: string;
  text: string;
  start: number; // in seconds
  end: number; // in seconds
  confidence: number | null;
  speaker_id: string | null;
  corrected: boolean;
  // Word-level style overrides (PRD Section 9.2 Level 3)
  custom_color?: string;
  custom_scale?: number;
  custom_highlight?: boolean;
  custom_stroke?: string;
}

// Sentence / Segment Entity
export interface SentenceSegment {
  sentence_id: string;
  speaker_id: string | null;
  start: number;
  end: number;
  text: string;
  words: WordItem[];
}

// Typography Configuration (PRD Section 9.5 & 11)
export interface TypographyStyle {
  font_family: string;
  font_weight: number | string; // 400, 700, 900
  font_size: number; // normalized or pt
  line_height: number; // e.g. 1.2
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

// Background Box Style (PRD Section 9.6)
export interface BackgroundStyle {
  enabled: boolean;
  color: string;
  opacity: number; // 0.0 - 1.0
  border_radius: number;
  padding_x: number;
  padding_y: number;
  border_color?: string;
  border_width?: number;
}

// Animation Definitions (PRD Section 12)
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

export interface Keyframe {
  frame: number;
  time: number;
  properties: {
    position_x?: number;
    position_y?: number;
    scale?: number;
    opacity?: number;
    rotation?: number;
    blur?: number;
    glow?: number;
  };
  easing?: 'linear' | 'ease_in' | 'ease_out' | 'ease_in_out' | 'elastic';
}

export interface AnimationConfig {
  entrance: {
    type: EntranceAnimationType;
    duration_frames: number;
  };
  emphasis: {
    type: EmphasisAnimationType;
    duration_frames: number;
    repeat?: boolean;
  };
  exit: {
    type: ExitAnimationType;
    duration_frames: number;
  };
  word_animation: {
    type: WordAnimationType;
    active_color?: string;
    inactive_color?: string;
    active_scale?: number;
  };
  keyframes?: Keyframe[];
}

// Text Block Entity (PRD Section 9.2 Level 2)
export interface TextBlock {
  block_id: string;
  text: string;
  word_ids: string[];
  typography: TypographyStyle;
  background?: BackgroundStyle;
  position_offset?: { x: number; y: number };
  animation?: Partial<AnimationConfig>;
  provenance: PropertyProvenance;
}

// Caption Layer (PRD Section 9.3)
export type LayerType =
  | 'text'
  | 'shape'
  | 'background'
  | 'highlight'
  | 'decorative'
  | 'effect'
  | 'group';

export interface LayerItem {
  layer_id: string;
  name: string;
  type: LayerType;
  visible: boolean;
  locked: boolean;
  opacity: number;
  z_index: number;
  transform: {
    x: number;
    y: number;
    width: number;
    height: number;
    rotation: number;
    scale: number;
  };
  style: Record<string, unknown>;
}

// Caption Item (PRD Section 8.5)
export interface CaptionItem {
  caption_id: string;
  start_frame: number;
  end_frame: number;
  start_time: number;
  end_time: number;
  duration: number;
  words: WordItem[];
  text_blocks: TextBlock[];
  layers: LayerItem[];
  layout_family: LayoutFamily;
  coordinates: NormalizedCoordinates;
  typography: TypographyStyle;
  background: BackgroundStyle;
  animation: AnimationConfig;
  user_overridden_properties: string[]; // List of property keys customized by user
}

// Caption Style Preset (PRD Section 13)
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

// Export Configuration (PRD Section 16)
export interface ExportConfig {
  output_type: 'srt' | 'vtt' | 'prores_4444' | 'png_sequence' | 'both';
  resolution: { width: number; height: number };
  fps: number;
  start_time?: number;
  end_time?: number;
  output_directory: string;
  filename_prefix: string;
  render_background_transparency: boolean;
}

// Project Manifest Root Structure (PRD Section 20)
export interface CaptionLabProject {
  project: {
    id: string;
    name: string;
    version: string; // "1.2.0"
    created_at: string;
    updated_at: string;
    fps: number;
    width: number;
    height: number;
    audio_source_path?: string;
    video_source_path?: string;
  };
  transcript: {
    language: string; // "hindi_mixed"
    engine: string; // "faster-whisper"
    model_size: WhisperModelSize;
    sentences: SentenceSegment[];
    words: WordItem[];
  };
  captions: CaptionItem[];
  presets: StylePreset[];
  export_settings?: ExportConfig;
}
