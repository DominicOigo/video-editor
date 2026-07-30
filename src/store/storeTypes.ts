import type { Project, VideoFile, TrimRange, CropRegion, VoiceoverTrack, QualitySettings, ColorAdjustments, Sticker, TextOverlay, TimelineTrack, TimelineClip, TransitionConfig, Keyframe, ExportProgress } from '../types';

export interface StoreState {
  projects: Project[];
  currentProjectId: string | null;
  undoStack: { id: string; timestamp: number; label: string; snapshot: string }[];
  redoStack: { id: string; timestamp: number; label: string; snapshot: string }[];
  exportProgress: ExportProgress | null;
  projectActions: {
    createProject: (name: string) => Project;
    restoreProject: (project: Project) => void;
    deleteProject: (id: string) => void;
    setCurrentProject: (id: string) => void;
    updateProject: (id: string, updates: Partial<Project>) => void;
    getCurrentProject: () => Project | null;
    resetAll: () => void;
  };
  videoActions: {
    setVideo: (video: VideoFile) => void;
    removeVideo: () => void;
  };
  trimActions: {
    setTrimRange: (range: TrimRange) => void;
    resetTrim: () => void;
  };
  cropActions: {
    setCropRegion: (region: CropRegion | null) => void;
  };
  voiceoverActions: {
    addVoiceover: (track: VoiceoverTrack) => void;
    removeVoiceover: (id: string) => void;
    updateVoiceover: (id: string, updates: Partial<VoiceoverTrack>) => void;
  };
  trackActions: {
    addTrack: (type: 'video' | 'audio' | 'voiceover', name?: string) => void;
    removeTrack: (trackId: string) => void;
    renameTrack: (trackId: string, name: string) => void;
    reorderTracks: (fromIndex: number, toIndex: number) => void;
    toggleMute: (trackId: string) => void;
    setTrackVolume: (trackId: string, volume: number) => void;
    addClip: (trackId: string, clip: TimelineClip) => void;
    removeClip: (trackId: string, clipId: string) => void;
    updateClip: (trackId: string, clipId: string, updates: Partial<TimelineClip>) => void;
    moveClip: (trackId: string, clipId: string, newOffset: number) => void;
    moveClipToTrack: (fromTrackId: string, toTrackId: string, clipId: string, newOffset: number) => void;
    setClipTransitionIn: (trackId: string, clipId: string, config: TransitionConfig) => void;
    setClipTransitionOut: (trackId: string, clipId: string, config: TransitionConfig) => void;
    addKeyframe: (trackId: string, clipId: string, time: number) => void;
    updateKeyframe: (trackId: string, clipId: string, keyframeId: string, updates: Partial<Keyframe>) => void;
    removeKeyframe: (trackId: string, clipId: string, keyframeId: string) => void;
    splitClip: (trackId: string, clipId: string, splitTime: number) => void;
    duplicateClip: (trackId: string, clipId: string) => void;
  };
  undoActions: {
    pushUndo: (label: string) => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
  };
  qualityActions: {
    setQualitySettings: (settings: QualitySettings) => void;
    updateQualitySetting: <K extends keyof QualitySettings>(key: K, value: QualitySettings[K]) => void;
  };
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
  exportActions: {
    setExportProgress: (progress: ExportProgress | null) => void;
  };
}
