/**
 * Premiere Pro UXP Integration Bridge
 * Target: Premiere Pro 2025+ (v25+)
 * Handles active sequence inspection and verified import/export fallback workflow (PRD Section 17).
 */

export interface SequenceInfo {
  name: string;
  width: number;
  height: number;
  fps: number;
  durationSeconds: number;
  playheadPosition: number;
  hasAudio: boolean;
  isAvailable: boolean;
}

export class PremiereBridge {
  static getSequenceInfo(): SequenceInfo {
    try {
      // Check if running inside Adobe UXP host environment
      const uxp = (window as any).require ? (window as any).require('uxp') : null;
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
          isAvailable: true,
        };
      }
    } catch (e) {
      // Graceful fallback when running in development browser preview
    }

    // Default development fallback
    return {
      name: 'Sequence 01 (1080p 30fps)',
      width: 1920,
      height: 1080,
      fps: 30.0,
      durationSeconds: 120.0,
      playheadPosition: 0.0,
      hasAudio: true,
      isAvailable: false, // In development mode
    };
  }

  /**
   * Verified workflow for importing exported subtitles / transparent MOV into Premiere
   * (PRD Section 17.4 & 17.5)
   */
  static getImportWorkflowInstructions(filePath: string, type: 'srt' | 'mov') {
    if (type === 'srt') {
      return [
        '1. In Premiere Pro Project panel, double-click or drag-and-drop the generated .srt file.',
        '2. Drag the imported subtitle item onto a dedicated subtitle track above your video.',
        '3. Use the Premiere Essential Graphics panel to review or further refine captions.',
      ];
    } else {
      return [
        '1. Drag the exported ProRes 4444 MOV file directly into Premiere Pro Project bin.',
        '2. Place the clip onto video track V2 or higher above your main footage.',
        '3. The background will be 100% transparent with frame-accurate animated Hindi captions.',
      ];
    }
  }
}
