/**
 * Premiere Pro UXP Integration Bridge & Audio Extraction Guidance
 * Target: Premiere Pro 2025+ (v25+)
 * Phase 2 & 3: Hybrid Audio Architecture (Direct Media, Sequence Audio Mixdown, Multiple Tracks)
 */

export interface SequenceInfo {
  name: string;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  playheadPosition: number;
  hasAudio: boolean;
  isAvailableInHost: boolean;
  notes: string;
}

export class PremiereBridge {
  static getSequenceInfo(): SequenceInfo {
    try {
      const premiere = (window as any).require ? (window as any).require('premierepro') : null;

      if (premiere && premiere.app && premiere.app.project && premiere.app.project.activeSequence) {
        const seq = premiere.app.project.activeSequence;
        const timebase = seq.timebase || 30;
        return {
          name: seq.name || 'Active Sequence',
          width: seq.frameSizeHorizontal || 1920,
          height: seq.frameSizeVertical || 1080,
          fps: Math.round(1000 / (timebase || 33.33)),
          durationSeconds: seq.end ? seq.end.seconds : 60,
          playheadPosition: seq.getPlayerPosition ? seq.getPlayerPosition().seconds : 0,
          hasAudio: true,
          isAvailableInHost: true,
          notes: 'Connected to active Premiere Pro 2025+ sequence.',
        };
      }
    } catch (e) {
      // Running outside Adobe UXP host (development or browser preview)
    }

    // Development / Simulation Fallback
    return {
      name: 'Sequence 01 (1080p 30fps)',
      width: 1920,
      height: 1080,
      fps: 30.0,
      durationSeconds: 120.0,
      playheadPosition: 0.0,
      hasAudio: true,
      isAvailableInHost: false,
      notes: 'Preview Mode. Connect via Adobe UXP Developer Tool inside Premiere Pro 2025+.',
    };
  }

  /**
   * Guidance for Source B & C: Exporting Sequence Audio Mixdown
   * Preserves applied effects, volume keyframes, and multi-track dialogue mixdown.
   */
  static getSequenceExportInstructions(): string[] {
    return [
      '1. In Premiere Pro, select the active sequence in the timeline (or set In/Out points for a range).',
      '2. Press Ctrl+M (Cmd+M) or choose File > Export > Media.',
      '3. In the Export window, select Format: "Waveform Audio" (WAV) or QuickTime (Audio Only).',
      '4. Range: Choose "Entire Sequence" or "Source In/Out". Click Export.',
      '5. Select or drop the exported mixdown file into CaptionLab below. This preserves all tracks and applied effects perfectly.',
    ];
  }

  /**
   * Guidance for importing exported graphics / subtitles back into Premiere Pro timeline
   */
  static getImportWorkflowInstructions(filePath: string, type: 'srt' | 'mov') {
    if (type === 'srt') {
      return [
        '1. In Premiere Pro Project bin, import the generated .srt file.',
        '2. Drag the subtitle clip onto a dedicated Subtitle track above your video.',
        '3. Use the Essential Graphics / Captions panel in Premiere to review and customize font styles if desired.',
      ];
    } else {
      return [
        '1. Drag the exported ProRes 4444 MOV clip into Premiere Pro Project bin.',
        '2. Place it on video track V2 or higher above your main video footage.',
        '3. The video will be 100% transparent with frame-accurate animated Hindi captions and word pop highlights.',
      ];
    }
  }
}
