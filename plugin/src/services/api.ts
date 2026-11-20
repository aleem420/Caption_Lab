import { CaptionItem, WordItem, ModelInfo, AudioValidationResult, AudioSourceType, WhisperModelSize } from '../types';

export const ENGINE_BASE_URL = 'http://127.0.0.1:8765';

export interface HealthResponse {
  status: string;
  app_name: string;
  version: string;
  session_token: string;
  device: string;
  gpu_available: boolean;
  gpu_name: string;
  ffmpeg_available: boolean;
  default_model: string;
  default_language: string;
  models: ModelInfo[];
}

export class EngineApiClient {
  private static token: string = '';

  static setToken(token: string) {
    this.token = token;
  }

  static async checkHealth(): Promise<HealthResponse> {
    try {
      const response = await fetch(`${ENGINE_BASE_URL}/health/`, {
        headers: this.token ? { 'X-CaptionLab-Token': this.token } : {},
      });
      if (!response.ok) throw new Error(`Engine returned ${response.status}`);
      const data = await response.json();
      if (data.session_token) this.token = data.session_token;
      return data;
    } catch (err) {
      throw new Error(`Engine offline: ${(err as Error).message}`);
    }
  }

  static async getModels(): Promise<ModelInfo[]> {
    const response = await fetch(`${ENGINE_BASE_URL}/transcribe/models`, {
      headers: this.token ? { 'X-CaptionLab-Token': this.token } : {},
    });
    if (!response.ok) throw new Error('Failed to retrieve model catalog');
    return response.json();
  }

  static async validateAudioSource(filePath: string, sourceType: AudioSourceType = 'direct_media'): Promise<AudioValidationResult> {
    const response = await fetch(`${ENGINE_BASE_URL}/transcribe/validate-source`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { 'X-CaptionLab-Token': this.token } : {}),
      },
      body: JSON.stringify({
        file_path: filePath,
        source_type: sourceType,
      }),
    });
    if (!response.ok) throw new Error('Validation request failed');
    return response.json();
  }

  static async transcribeAudio(params: {
    audio_path: string;
    language?: string;
    model_size?: WhisperModelSize;
    device?: string;
    source_type?: AudioSourceType;
    range_start?: number;
    range_end?: number;
    vad_filter?: boolean;
    vad_threshold?: number;
  }) {
    const response = await fetch(`${ENGINE_BASE_URL}/transcribe/path`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { 'X-CaptionLab-Token': this.token } : {}),
      },
      body: JSON.stringify({
        audio_path: params.audio_path,
        language: params.language || 'hindi_mixed',
        model_size: params.model_size || 'small', // Factory Default: small
        device: params.device || 'cpu',
        source_type: params.source_type || 'sequence_audio',
        range_start: params.range_start,
        range_end: params.range_end,
        word_timestamps: true,
        vad_filter: params.vad_filter ?? true,
        vad_threshold: params.vad_threshold ?? 0.5,
      }),
    });
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Transcription failed: ${errorText}`);
    }
    return response.json();
  }

  static async autoGroupCaptions(
    words: WordItem[],
    layout_family: string = 'balanced_two_line',
    fps: number = 30.0
  ): Promise<CaptionItem[]> {
    const response = await fetch(`${ENGINE_BASE_URL}/render/layout/auto-group`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { 'X-CaptionLab-Token': this.token } : {}),
      },
      body: JSON.stringify({
        words,
        layout_family,
        fps,
      }),
    });
    if (!response.ok) throw new Error('Failed to auto-group captions');
    return response.json();
  }

  static async exportCaptions(payload: {
    output_type: 'srt' | 'vtt' | 'prores_4444' | 'both';
    captions: CaptionItem[];
    resolution: { width: number; height: number };
    fps: number;
    filename_prefix: string;
    output_directory?: string;
  }) {
    const response = await fetch(`${ENGINE_BASE_URL}/render/export`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { 'X-CaptionLab-Token': this.token } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!response.ok) {
      const err = await response.text();
      throw new Error(`Export failed: ${err}`);
    }
    return response.json();
  }

  static async saveProject(projectData: any) {
    const response = await fetch(`${ENGINE_BASE_URL}/projects/save`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(this.token ? { 'X-CaptionLab-Token': this.token } : {}),
      },
      body: JSON.stringify(projectData),
    });
    return response.json();
  }

  static async listRecentProjects() {
    const response = await fetch(`${ENGINE_BASE_URL}/projects/recent`, {
      headers: this.token ? { 'X-CaptionLab-Token': this.token } : {},
    });
    return response.json();
  }
}
