/**
 * Premiere Pro UXP Integration Bridge & Host Diagnostics
 * Target: Adobe Premiere Pro 2025+ (Version 25.0.0+)
 * Phase 4 Milestone 1: Robust Host Integration & Sequence Introspection
 */

export interface SequenceMetadata {
  name: string;
  width: number;
  height: number;
  fps: number;
  timebase: number;
  durationSeconds: number;
  playheadPosition: number;
  aspectRatio: string;
}

export interface HostStatus {
  isAvailableInHost: boolean;
  hasActiveSequence: boolean;
  hostVersion?: string;
  statusMessage: string;
  sequence?: SequenceMetadata;
}

export class PremiereBridge {
  private static cachedHostStatus: HostStatus | null = null;

  /**
   * Introspects Adobe Premiere Pro 2025+ host environment and active sequence.
   * Adheres strictly to genuine UXP API behavior without inventing unsupported capabilities.
   */
  static getHostStatus(): HostStatus {
    try {
      // Check if running inside genuine Adobe UXP runtime
      const uxp = typeof window !== 'undefined' && (window as any).require
        ? (window as any).require('uxp')
        : null;
      const premiere = typeof window !== 'undefined' && (window as any).require
        ? (window as any).require('premierepro')
        : null;

      if (premiere && premiere.app) {
        const app = premiere.app;
        const project = app.project;
        const hostVersion = app.version || '2025+';

        if (project && project.activeSequence) {
          const seq = project.activeSequence;
          const timebase = seq.timebase || 30;
          const width = seq.frameSizeHorizontal || 1920;
          const height = seq.frameSizeVertical || 1080;
          
          // Determine rational aspect ratio
          let aspectRatio = '16:9';
          if (width === 1080 && height === 1920) aspectRatio = '9:16';
          else if (width === height) aspectRatio = '1:1';
          else if (width === 1080 && height === 1350) aspectRatio = '4:5';

          const seqMeta: SequenceMetadata = {
            name: seq.name || 'Untitled Sequence',
            width,
            height,
            fps: Math.round(1000 / (timebase || 33.33)),
            timebase,
            durationSeconds: seq.end ? seq.end.seconds : 60.0,
            playheadPosition: seq.getPlayerPosition ? seq.getPlayerPosition().seconds : 0.0,
            aspectRatio,
          };

          return {
            isAvailableInHost: true,
            hasActiveSequence: true,
            hostVersion,
            statusMessage: `Connected to Premiere Pro ${hostVersion} • Sequence "${seqMeta.name}" (${width}x${height} @ ${seqMeta.fps}fps)`,
            sequence: seqMeta,
          };
        } else {
          // Premiere is open, but no sequence is currently active in timeline
          return {
            isAvailableInHost: true,
            hasActiveSequence: false,
            hostVersion,
            statusMessage: 'Premiere Pro connected. No active sequence in timeline. Please open a sequence or use Direct Media.',
          };
        }
      }
    } catch (err: any) {
      console.warn('[CaptionLab PremiereBridge] Error querying UXP host:', err?.message || err);
    }

    // Running in development / browser preview mode (Standby mode)
    return {
      isAvailableInHost: false,
      hasActiveSequence: false,
      statusMessage: 'Preview Mode (Standalone). Connect via Adobe UXP Developer Tool in Premiere Pro 2025+.',
      sequence: {
        name: 'Sequence 01 (1080p 30fps)',
        width: 1920,
        height: 1080,
        fps: 30.0,
        timebase: 33.33,
        durationSeconds: 120.0,
        playheadPosition: 0.0,
        aspectRatio: '16:9',
      },
    };
  }

  /**
   * Returns sequence audio mixdown export instructions
   */
  static getSequenceExportInstructions(): string[] {
    return [
      '1. In Premiere Pro, select the active sequence in the timeline (or set In/Out points for a range).',
      '2. Press Ctrl+M (Cmd+M on macOS) or choose File > Export > Media.',
      '3. In the Export settings dialog, select Format: "Waveform Audio" (WAV) or QuickTime (Audio Only).',
      '4. Range: Choose "Entire Sequence" or "Source In/Out". Click Export.',
      '5. Select or drop the exported mixdown file into CaptionLab. This preserves dialogue balance across all tracks with applied effects.',
    ];
  }

  /**
   * Returns verified timeline placement guidance for exported assets
   */
  static getImportWorkflowInstructions(filePath: string, type: 'srt' | 'mov' | 'png') {
    if (type === 'srt') {
      return [
        '1. In Premiere Pro, import the generated .srt file into your Project bin (File > Import or drag-and-drop).',
        '2. Drag the subtitle clip onto a dedicated Subtitle Track in your sequence timeline.',
        '3. Use the Premiere Essential Graphics panel if you wish to adjust global subtitle styling or native text.',
      ];
    } else if (type === 'mov') {
      return [
        '1. Drag the exported transparent ProRes 4444 MOV clip directly into the Premiere Pro Project bin.',
        '2. Drag the clip onto video track V2 (or higher) directly above your main video footage on V1.',
        '3. The video background is 100% transparent. Animated Hindi captions with word pop and karaoke highlights will overlay perfectly.',
      ];
    } else {
      return [
        '1. In Premiere Pro, open File > Import.',
        '2. Select the first frame of the exported PNG sequence (e.g. frame_000000.png).',
        '3. Check the "Image Sequence" checkbox at the bottom of the import dialog, then click Open.',
        '4. Drag the resulting image sequence clip onto video track V2 above your footage.',
      ];
    }
  }
}
