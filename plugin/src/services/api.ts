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
  private static connectionListeners: ((online: boolean) => void)[] = [];
  private static isPolling: boolean = false;

  static setToken(token: string) {
    this.token = token;
  }

  static getMaskedToken(): string {
    if (!this.token) return 'None';
    if (this.token.length <= 8) return '••••••••';
    return `••••••••${this.token.slice(-6)}`;
  }

  static onConnectionChange(listener: (online: boolean) => void) {
    this.connectionListeners.push(listener);
    return () => {
      this.connectionListeners = this.connectionListeners.filter((l) => l !== listener);
    };
  }

  private static notifyConnection(online: boolean) {
    this.connectionListeners.forEach((l) => l(online));
  }

  /**
   * Health check with 5000ms timeout guard to avoid hanging UI panels
   */
  static async checkHealth(timeoutMs: number = 5000): Promise<HealthResponse> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${ENGINE_BASE_URL}/health/`, {
        signal: controller.signal,
        headers: this.token ? { 'X-CaptionLab-Token': this.token } : {},
      });
      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`Engine returned HTTP ${response.status}`);
      const data = await response.json();
      if (data.session_token) this.token = data.session_token;
      this.notifyConnection(true);
      return data;
    } catch (err: any) {
      clearTimeout(timeoutId);
      this.notifyConnection(false);
      const msg = err.name === 'AbortError' ? 'Engine connection timed out (5s)' : err.message;
      throw new Error(`Engine offline: ${msg}`);
    }
  }

  /**
   * Starts non-blocking background heartbeat to detect engine availability & recovery
   */
  static startHeartbeat(intervalMs: number = 5000) {
    if (this.isPolling) return;
    this.isPolling = true;

    const poll = async () => {
      try {
        await this.checkHealth(3000);
      } catch {
        // Polling failed, status notified via catch in checkHealth
      }
      if (this.isPolling) {
        setTimeout(poll, intervalMs);
      }
    };
    poll();
  }

  static stopHeartbeat() {
    this.isPolling = false;
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
        model_size: params.model_size || 'small',
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
    output_type: 'srt' | 'vtt' | 'prores_4444' | 'png_sequence' | 'both';
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
