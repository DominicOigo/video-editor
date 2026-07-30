import { create } from 'zustand';
import type { StoreState } from './storeTypes';
import { createProjectSlice } from './slices/projectSlice';
import { createTrackSlice } from './slices/trackSlice';
import { createEffectSlice } from './slices/effectSlice';
import { createQualitySlice } from './slices/qualitySlice';

export const useEditorStore = create<StoreState>()((...a) => ({
  ...createProjectSlice(...a),
  ...createTrackSlice(...a),
  ...createEffectSlice(...a),
  ...createQualitySlice(...a),
}));
