import type { StateCreator } from 'zustand';
import type { TimelineTrack, TimelineClip, TransitionConfig, Keyframe } from '../../types';
import { createDefaultKeyframe } from '../../types';
import type { StoreState } from '../storeTypes';

export interface TrackSliceActions {
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
}

let _lastVolumeUndoTime = 0;
let _lastUpdateClipUndoTime = 0;

export const createTrackSlice: StateCreator<StoreState, [], [], { trackActions: TrackSliceActions }> = (set, get) => ({
  trackActions: {
    addTrack: (type, name) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo(`Add ${type} track`);
      const project = projectActions.getCurrentProject();
      if (!project) return;
      const track: TimelineTrack = {
        id: crypto.randomUUID(),
        name: name || `${type === 'video' ? 'Video' : 'Audio'} ${project.tracks.filter((t) => t.type === type).length + 1}`,
        type, clips: [], muted: false, locked: false, volume: 1,
      };
      projectActions.updateProject(currentProjectId, { tracks: [...project.tracks, track] });
    },
    removeTrack: (trackId) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Remove track');
      const project = projectActions.getCurrentProject();
      if (!project) return;
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.filter((t) => t.id !== trackId) });
    },
    renameTrack: (trackId, name) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Rename track');
      const project = projectActions.getCurrentProject();
      if (!project) return;
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, name } : t) });
    },
    reorderTracks: (fromIndex, toIndex) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Reorder tracks');
      const project = projectActions.getCurrentProject();
      if (!project) return;
      const newTracks = [...project.tracks];
      const [moved] = newTracks.splice(fromIndex, 1);
      newTracks.splice(toIndex, 0, moved);
      projectActions.updateProject(currentProjectId, { tracks: newTracks });
    },
    toggleMute: (trackId) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Toggle mute');
      const project = projectActions.getCurrentProject();
      if (!project) return;
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, muted: !t.muted } : t) });
    },
    setTrackVolume: (trackId, volume) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const now = Date.now();
      if (now - _lastVolumeUndoTime > 1000) { _lastVolumeUndoTime = now; get().undoActions.pushUndo('Set volume'); }
      const project = projectActions.getCurrentProject();
      if (!project) return;
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, volume: Math.max(0, Math.min(2, volume)) } : t) });
    },
    addClip: (trackId, clip) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const project = projectActions.getCurrentProject();
      if (!project) return;
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, clips: [...t.clips, clip] } : t) });
    },
    removeClip: (trackId, clipId) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const project = projectActions.getCurrentProject();
      if (!project) return;
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, clips: t.clips.filter((c) => c.id !== clipId) } : t) });
    },
    updateClip: (trackId, clipId, updates) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const now = Date.now();
      if (now - _lastUpdateClipUndoTime > 1000) { _lastUpdateClipUndoTime = now; get().undoActions.pushUndo('Update clip'); }
      const project = projectActions.getCurrentProject();
      if (!project) return;
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, clips: t.clips.map((c) => c.id === clipId ? { ...c, ...updates } : c) } : t) });
    },
    moveClip: (trackId, clipId, newOffset) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Move clip');
      const project = projectActions.getCurrentProject();
      if (!project) return;
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, clips: t.clips.map((c) => c.id === clipId ? { ...c, offset: Math.max(0, newOffset) } : c) } : t) });
    },
    moveClipToTrack: (fromTrackId, toTrackId, clipId, newOffset) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId || fromTrackId === toTrackId) return;
      get().undoActions.pushUndo('Move clip to track');
      const project = projectActions.getCurrentProject();
      if (!project) return;
      const fromTrack = project.tracks.find((t) => t.id === fromTrackId);
      const clipToMove = fromTrack?.clips.find((c) => c.id === clipId);
      if (!clipToMove || !fromTrack) return;
      projectActions.updateProject(currentProjectId, {
        tracks: project.tracks.map((t) => {
          if (t.id === fromTrackId) return { ...t, clips: t.clips.filter((c) => c.id !== clipId) };
          if (t.id === toTrackId) return { ...t, clips: [...t.clips, { ...clipToMove, type: t.type as 'video' | 'audio' | 'voiceover', offset: Math.max(0, newOffset) }] };
          return t;
        }),
      });
    },
    setClipTransitionIn: (trackId, clipId, config) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const project = projectActions.getCurrentProject();
      if (!project) return;
      get().undoActions.pushUndo('Set transition');
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, clips: t.clips.map((c) => c.id === clipId ? { ...c, transitionIn: config } : c) } : t) });
    },
    setClipTransitionOut: (trackId, clipId, config) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const project = projectActions.getCurrentProject();
      if (!project) return;
      get().undoActions.pushUndo('Set transition');
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, clips: t.clips.map((c) => c.id === clipId ? { ...c, transitionOut: config } : c) } : t) });
    },
    addKeyframe: (trackId, clipId, time) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const project = projectActions.getCurrentProject();
      if (!project) return;
      get().undoActions.pushUndo('Add keyframe');
      const newKf = createDefaultKeyframe(time);
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, clips: t.clips.map((c) => { if (c.id !== clipId) return c; const kfs = [...(c.keyframes || [])]; const idx = kfs.findIndex((k) => k.time > time); if (idx === -1) kfs.push(newKf); else kfs.splice(idx, 0, newKf); return { ...c, keyframes: kfs }; }) } : t) });
    },
    updateKeyframe: (trackId, clipId, keyframeId, updates) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Update keyframe');
      const project = projectActions.getCurrentProject();
      if (!project) return;
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, clips: t.clips.map((c) => c.id === clipId ? { ...c, keyframes: (c.keyframes || []).map((k) => k.id === keyframeId ? { ...k, ...updates } : k) } : c) } : t) });
    },
    removeKeyframe: (trackId, clipId, keyframeId) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const project = projectActions.getCurrentProject();
      if (!project) return;
      get().undoActions.pushUndo('Remove keyframe');
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, clips: t.clips.map((c) => c.id === clipId ? { ...c, keyframes: (c.keyframes || []).filter((k) => k.id !== keyframeId) } : c) } : t) });
    },
    splitClip: (trackId, clipId, splitTime) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const project = projectActions.getCurrentProject();
      if (!project) return;
      const track = project.tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);
      if (!clip || clip.type !== 'video') return;
      const splitOffset = splitTime - clip.offset;
      if (splitOffset <= 0 || splitOffset >= clip.duration) return;
      get().undoActions.pushUndo('Split clip');
      projectActions.updateProject(currentProjectId, {
        tracks: project.tracks.map((t) => t.id === trackId ? {
          ...t, clips: t.clips.flatMap((c) => c.id === clipId ? [
            { ...clip, id: crypto.randomUUID(), name: `${clip.name} (1)`, duration: splitOffset, sourceEnd: clip.sourceStart + splitOffset },
            { ...clip, id: crypto.randomUUID(), name: `${clip.name} (2)`, offset: clip.offset + splitOffset, duration: clip.duration - splitOffset, sourceStart: clip.sourceStart + splitOffset },
          ] : [c]),
        } : t),
      });
    },
    duplicateClip: (trackId, clipId) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      const project = projectActions.getCurrentProject();
      if (!project) return;
      const track = project.tracks.find((t) => t.id === trackId);
      const clip = track?.clips.find((c) => c.id === clipId);
      if (!clip) return;
      get().undoActions.pushUndo('Duplicate clip');
      projectActions.updateProject(currentProjectId, { tracks: project.tracks.map((t) => t.id === trackId ? { ...t, clips: [...t.clips, { ...clip, id: crypto.randomUUID(), name: `${clip.name} (copy)`, offset: clip.offset + clip.duration }] } : t) });
    },
  },
});
