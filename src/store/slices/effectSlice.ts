import type { StateCreator } from 'zustand';
import type { ColorAdjustments, Sticker, TextOverlay } from '../../types';
import { DEFAULT_COLOR_ADJUSTMENTS } from '../../types';
import type { StoreState } from '../storeTypes';

export interface EffectSliceActions {
  colorActions: {
    setColorAdjustments: (adjustments: ColorAdjustments) => void;
    updateColorAdjustment: <K extends keyof ColorAdjustments>(key: K, value: ColorAdjustments[K]) => void;
  };
  stickerActions: {
    addSticker: (sticker: Sticker) => void;
    updateSticker: (id: string, updates: Partial<Sticker>) => void;
    removeSticker: (id: string) => void;
  };
  textActions: {
    addTextOverlay: (overlay: TextOverlay) => void;
    updateTextOverlay: (id: string, updates: Partial<TextOverlay>) => void;
    removeTextOverlay: (id: string) => void;
  };
}

export const createEffectSlice: StateCreator<StoreState, [], [], EffectSliceActions> = (set, get) => ({
  colorActions: {
    setColorAdjustments: (adjustments) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Adjust colors');
      projectActions.updateProject(currentProjectId, { colorAdjustments: adjustments });
    },
    updateColorAdjustment: (key, value) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const project = projectActions.getCurrentProject();
      if (!project) return;
      const current = project.colorAdjustments || DEFAULT_COLOR_ADJUSTMENTS;
      projectActions.updateProject(currentProjectId, { colorAdjustments: { ...current, [key]: value } });
    },
  },
  stickerActions: {
    addSticker: (sticker) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const project = projectActions.getCurrentProject();
      if (!project) return;
      get().undoActions.pushUndo('Add sticker');
      projectActions.updateProject(currentProjectId, { stickers: [...(project.stickers || []), sticker] });
    },
    updateSticker: (id, updates) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const project = projectActions.getCurrentProject();
      if (!project) return;
      get().undoActions.pushUndo('Update sticker');
      projectActions.updateProject(currentProjectId, { stickers: (project.stickers || []).map((s) => s.id === id ? { ...s, ...updates } : s) });
    },
    removeSticker: (id) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Remove sticker');
      const project = projectActions.getCurrentProject();
      if (!project) return;
      projectActions.updateProject(currentProjectId, { stickers: (project.stickers || []).filter((s) => s.id !== id) });
    },
  },
  textActions: {
    addTextOverlay: (overlay) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const project = projectActions.getCurrentProject();
      if (!project) return;
      get().undoActions.pushUndo('Add text');
      projectActions.updateProject(currentProjectId, { textOverlays: [...(project.textOverlays || []), overlay] });
    },
    updateTextOverlay: (id, updates) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Update text');
      const project = projectActions.getCurrentProject();
      if (!project) return;
      projectActions.updateProject(currentProjectId, { textOverlays: (project.textOverlays || []).map((t) => t.id === id ? { ...t, ...updates } : t) });
    },
    removeTextOverlay: (id) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Remove text');
      const project = projectActions.getCurrentProject();
      if (!project) return;
      projectActions.updateProject(currentProjectId, { textOverlays: (project.textOverlays || []).filter((t) => t.id !== id) });
    },
  },
});
