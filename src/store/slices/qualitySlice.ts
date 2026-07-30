import type { StateCreator } from 'zustand';
import type { QualitySettings, ExportProgress } from '../../types';
import type { StoreState } from '../storeTypes';

export interface QualitySliceActions {
  qualityActions: {
    setQualitySettings: (settings: QualitySettings) => void;
    updateQualitySetting: <K extends keyof QualitySettings>(key: K, value: QualitySettings[K]) => void;
  };
  exportProgress: ExportProgress | null;
  exportActions: {
    setExportProgress: (progress: ExportProgress | null) => void;
  };
}

export const createQualitySlice: StateCreator<StoreState, [], [], QualitySliceActions> = (set, get) => ({
  qualityActions: {
    setQualitySettings: (settings) => {
      const { currentProjectId, projectActions } = get();
      if (currentProjectId) {
        get().undoActions.pushUndo('Set quality');
        projectActions.updateProject(currentProjectId, { qualitySettings: settings });
      }
    },
    updateQualitySetting: (key, value) => {
      const { currentProjectId, projectActions } = get();
      if (currentProjectId) {
        const project = projectActions.getCurrentProject();
        if (project) projectActions.updateProject(currentProjectId, { qualitySettings: { ...project.qualitySettings, [key]: value } });
      }
    },
  },
  exportProgress: null,
  exportActions: {
    setExportProgress: (progress) => set({ exportProgress: progress }),
  },
});
