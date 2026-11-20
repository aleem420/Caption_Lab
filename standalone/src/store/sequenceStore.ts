import { create } from 'zustand';
import { useProjectStore } from '@plugin/store/projectStore';

export type AspectRatioPreset = '16:9' | '9:16' | '1:1' | '4:5' | 'custom';

export interface SequenceSettingsState {
  projectName: string;
  width: number;
  height: number;
  fps: number;
  aspectRatio: string;
  presetId: AspectRatioPreset;
  timelineOffset: number; // in seconds

  // Actions
  setPreset: (preset: AspectRatioPreset) => void;
  setDimensions: (width: number, height: number) => void;
  setFps: (fps: number) => void;
  setTimelineOffset: (offset: number) => void;
  setProjectName: (name: string) => void;
  syncToProjectStore: () => void;
}

const STORAGE_KEY = 'captionlab_standalone_sequence_settings';

const PRESET_CONFIGS: Record<Exclude<AspectRatioPreset, 'custom'>, { width: number; height: number; aspectRatio: string }> = {
  '16:9': { width: 1920, height: 1080, aspectRatio: '16:9' },
  '9:16': { width: 1080, height: 1920, aspectRatio: '9:16' },
  '1:1': { width: 1080, height: 1080, aspectRatio: '1:1' },
  '4:5': { width: 1080, height: 1350, aspectRatio: '4:5' },
};

function loadStoredSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch {
    // Ignore storage parse errors
  }
  return {
    projectName: 'Hindi Mixed Caption Project (Premiere 2023)',
    width: 1920,
    height: 1080,
    fps: 30.0,
    aspectRatio: '16:9',
    presetId: '16:9' as AspectRatioPreset,
    timelineOffset: 0.0,
  };
}

function saveStoredSettings(state: Partial<SequenceSettingsState>) {
  try {
    const payload = {
      projectName: state.projectName,
      width: state.width,
      height: state.height,
      fps: state.fps,
      aspectRatio: state.aspectRatio,
      presetId: state.presetId,
      timelineOffset: state.timelineOffset,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // Ignore storage write errors
  }
}

export const useSequenceStore = create<SequenceSettingsState>((set, get) => {
  const initial = loadStoredSettings();

  const sync = (newState: {
    projectName: string;
    width: number;
    height: number;
    fps: number;
    aspectRatio: string;
    timelineOffset: number;
  }) => {
    // Propagate changes to the primary CaptionLab projectStore
    const projectStore = useProjectStore.getState();
    const currProject = projectStore.project;
    if (currProject) {
      projectStore.setProject({
        ...currProject,
        project: {
          ...currProject.project,
          name: newState.projectName,
          width: newState.width,
          height: newState.height,
          fps: newState.fps,
        },
      });
    }
  };

  return {
    ...initial,

    setPreset: (preset) => {
      if (preset === 'custom') {
        set({ presetId: 'custom' });
        saveStoredSettings({ ...get(), presetId: 'custom' });
        return;
      }
      const config = PRESET_CONFIGS[preset];
      const updated = {
        presetId: preset,
        width: config.width,
        height: config.height,
        aspectRatio: config.aspectRatio,
      };
      set(updated);
      const state = { ...get(), ...updated };
      saveStoredSettings(state);
      sync(state);
    },

    setDimensions: (width, height) => {
      let aspectRatio = 'custom';
      if (width === 1920 && height === 1080) aspectRatio = '16:9';
      else if (width === 1080 && height === 1920) aspectRatio = '9:16';
      else if (width === 1080 && height === 1080) aspectRatio = '1:1';
      else if (width === 1080 && height === 1350) aspectRatio = '4:5';

      let presetId: AspectRatioPreset = 'custom';
      if (aspectRatio in PRESET_CONFIGS) {
        presetId = aspectRatio as AspectRatioPreset;
      }

      const updated = { width, height, aspectRatio, presetId };
      set(updated);
      const state = { ...get(), ...updated };
      saveStoredSettings(state);
      sync(state);
    },

    setFps: (fps) => {
      set({ fps });
      const state = { ...get(), fps };
      saveStoredSettings(state);
      sync(state);
    },

    setTimelineOffset: (timelineOffset) => {
      set({ timelineOffset });
      const state = { ...get(), timelineOffset };
      saveStoredSettings(state);
      sync(state);
    },

    setProjectName: (projectName) => {
      set({ projectName });
      const state = { ...get(), projectName };
      saveStoredSettings(state);
      sync(state);
    },

    syncToProjectStore: () => {
      const state = get();
      sync(state);
    },
  };
});
