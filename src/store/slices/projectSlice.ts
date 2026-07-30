import type { StateCreator } from 'zustand';
import type { Project, VideoFile, TrimRange, CropRegion, VoiceoverTrack, TimelineTrack, TimelineClip } from '../../types';
import { DEFAULT_TRIM_RANGE, DEFAULT_QUALITY_SETTINGS, DEFAULT_TRANSITION_IN, DEFAULT_TRANSITION_OUT, DEFAULT_COLOR_ADJUSTMENTS } from '../../types';
import type { StoreState } from '../storeTypes';

const MAX_UNDO = 50;
let _lastTrimUndoTime = 0;

function migrateProjectTracks(project: Project): TimelineTrack[] {
  if (project.tracks && project.tracks.length > 0) return project.tracks;
  const tracks: TimelineTrack[] = [];
  if (project.video) {
    tracks.push({
      id: crypto.randomUUID(), name: 'Video 1', type: 'video',
      muted: false, locked: false, volume: 1,
      clips: [{
        id: crypto.randomUUID(), name: project.video.name, type: 'video',
        sourceStart: 0, sourceEnd: project.video.duration, offset: 0,
        duration: project.video.duration, volume: 1,
        videoFile: project.video, blobUrl: project.video.url,
        speed: 1, transitionIn: { ...DEFAULT_TRANSITION_IN }, transitionOut: { ...DEFAULT_TRANSITION_OUT },
      }],
    });
  } else {
    tracks.push({ id: crypto.randomUUID(), name: 'Video 1', type: 'video', muted: false, locked: false, volume: 1, clips: [] });
  }
  if (project.voiceoverTracks.length > 0) {
    tracks.push({
      id: crypto.randomUUID(), name: 'Voiceover', type: 'voiceover',
      muted: false, locked: false, volume: 1,
      clips: project.voiceoverTracks.map((vt) => ({
        id: vt.id, name: vt.name, type: 'voiceover' as const,
        sourceStart: 0, sourceEnd: vt.duration, offset: vt.offset,
        duration: vt.duration, volume: vt.volume, blobUrl: vt.url, blob: vt.blob,
        speed: 1, transitionIn: { ...DEFAULT_TRANSITION_IN }, transitionOut: { ...DEFAULT_TRANSITION_OUT },
      })),
    });
  }
  tracks.push({ id: crypto.randomUUID(), name: 'Audio 1', type: 'audio', muted: false, locked: false, volume: 1, clips: [] });
  return tracks;
}

function snapshotProject(project: Project | null): string {
  if (!project) return 'null';
  const { tracks, ...rest } = project;
  const safeTracks = tracks.map((t) => ({ ...t, clips: t.clips.map((c) => ({ ...c, blob: undefined })) }));
  return JSON.stringify({ ...rest, tracks: safeTracks });
}

export interface ProjectSlice {
  projects: Project[];
  currentProjectId: string | null;
  undoStack: { id: string; timestamp: number; label: string; snapshot: string }[];
  redoStack: { id: string; timestamp: number; label: string; snapshot: string }[];
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
  undoActions: {
    pushUndo: (label: string) => void;
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
  };
}

export const createProjectSlice: StateCreator<StoreState, [], [], ProjectSlice> = (set, get) => ({
  projects: [],
  currentProjectId: null,
  undoStack: [],
  redoStack: [],

  projectActions: {
    createProject: (name: string) => {
      const project: Project = {
        id: crypto.randomUUID(), name, createdAt: Date.now(), updatedAt: Date.now(),
        video: null, trimRange: { ...DEFAULT_TRIM_RANGE }, cropRegion: null,
        voiceoverTracks: [], qualitySettings: { ...DEFAULT_QUALITY_SETTINGS }, tracks: [],
      };
      project.tracks = migrateProjectTracks(project);
      set((state) => ({
        projects: [...state.projects, project],
        currentProjectId: project.id,
        undoStack: [],
        redoStack: [],
      }));
      return project;
    },
    restoreProject: (project: Project) => {
      const migrated = { ...project, tracks: migrateProjectTracks(project) };
      set((state) => {
        const exists = state.projects.find((p) => p.id === migrated.id);
        return exists
          ? { projects: state.projects.map((p) => p.id === migrated.id ? { ...p, ...migrated, updatedAt: Date.now() } : p) }
          : { projects: [...state.projects, migrated] };
      });
    },
    deleteProject: (id: string) => {
      set((state) => ({
        projects: state.projects.filter((p) => p.id !== id),
        currentProjectId: state.currentProjectId === id ? null : state.currentProjectId,
      }));
    },
    setCurrentProject: (id: string) => set({ currentProjectId: id }),
    updateProject: (id: string, updates: Partial<Project>) => {
      set((state) => ({
        projects: state.projects.map((p) => p.id === id ? { ...p, ...updates, updatedAt: Date.now() } : p),
      }));
    },
    getCurrentProject: () => {
      const { projects, currentProjectId } = get();
      const p = projects.find((proj) => proj.id === currentProjectId);
      if (!p) return null;
      if (!p.tracks || p.tracks.length === 0) {
        const migrated = { ...p, tracks: migrateProjectTracks(p) };
        set((state) => ({ projects: state.projects.map((proj) => proj.id === p.id ? migrated : proj) }));
        return migrated;
      }
      return p;
    },
    resetAll: () => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Reset all');
      const project = projectActions.getCurrentProject();
      if (!project?.video) return;
      const dur = project.video.duration;
      projectActions.updateProject(currentProjectId, {
        trimRange: { start: 0, end: dur },
        cropRegion: null,
        colorAdjustments: { ...DEFAULT_COLOR_ADJUSTMENTS },
        stickers: [],
        textOverlays: [],
        voiceoverTracks: [],
        tracks: project.tracks.map((t) => {
          if (t.type === 'video') {
            const firstClip = t.clips[0];
            if (firstClip) {
              return {
                ...t,
                clips: [{
                  ...firstClip,
                  sourceStart: 0,
                  sourceEnd: dur,
                  offset: 0,
                  duration: dur,
                  speed: 1,
                  keyframes: undefined,
                  transitionIn: { ...DEFAULT_TRANSITION_IN },
                  transitionOut: { ...DEFAULT_TRANSITION_OUT },
                }],
              };
            }
          }
          if (t.type === 'voiceover') return { ...t, clips: [] };
          return t;
        }),
      });
    },
  },

  videoActions: {
    setVideo: (video: VideoFile) => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Import video');
      projectActions.updateProject(currentProjectId, { video, trimRange: { start: 0, end: video.duration } });
      const project = get().projectActions.getCurrentProject();
      if (project) {
        const videoTrack = project.tracks.find((t) => t.type === 'video');
        if (videoTrack) {
          get().trackActions.addClip(videoTrack.id, {
            id: crypto.randomUUID(), name: video.name, type: 'video',
            sourceStart: 0, sourceEnd: video.duration, offset: 0,
            duration: video.duration, volume: 1,
            videoFile: video, blobUrl: video.url, speed: 1,
            transitionIn: { ...DEFAULT_TRANSITION_IN }, transitionOut: { ...DEFAULT_TRANSITION_OUT },
          });
        }
      }
    },
    removeVideo: () => {
      const { currentProjectId, projectActions } = get();
      if (!currentProjectId) return;
      get().undoActions.pushUndo('Remove video');
      const project = projectActions.getCurrentProject();
      if (project?.video?.url) URL.revokeObjectURL(project.video.url);
      projectActions.updateProject(currentProjectId, { video: null, trimRange: { ...DEFAULT_TRIM_RANGE }, cropRegion: null });
      const updatedProject = get().projectActions.getCurrentProject();
      if (updatedProject) {
        const videoTrack = updatedProject.tracks.find((t) => t.type === 'video');
        if (videoTrack) get().trackActions.removeClip(videoTrack.id, videoTrack.clips[0]?.id || '');
      }
    },
  },

  trimActions: {
    setTrimRange: (range: TrimRange) => {
      const { currentProjectId, projectActions } = get();
      if (currentProjectId) {
        const now = Date.now();
        if (now - _lastTrimUndoTime > 1000) { _lastTrimUndoTime = now; get().undoActions.pushUndo('Trim'); }
        projectActions.updateProject(currentProjectId, { trimRange: range });
        const project = projectActions.getCurrentProject();
        if (project) {
          const vTrack = project.tracks.find((t) => t.type === 'video');
          if (vTrack && vTrack.clips.length > 0) {
            const firstClip = vTrack.clips[0];
            get().trackActions.updateClip(vTrack.id, firstClip.id, { sourceStart: range.start, sourceEnd: range.end, duration: range.end - range.start });
          }
        }
      }
    },
    resetTrim: () => {
      const { currentProjectId, projectActions } = get();
      if (currentProjectId) {
        get().undoActions.pushUndo('Reset trim');
        const project = projectActions.getCurrentProject();
        if (project?.video) projectActions.updateProject(currentProjectId, { trimRange: { start: 0, end: project.video.duration } });
      }
    },
  },

  cropActions: {
    setCropRegion: (region: CropRegion | null) => {
      const { currentProjectId, projectActions } = get();
      if (currentProjectId) {
        get().undoActions.pushUndo('Set crop');
        projectActions.updateProject(currentProjectId, { cropRegion: region });
      }
    },
  },

  voiceoverActions: {
    addVoiceover: (track: VoiceoverTrack) => {
      const { currentProjectId, projectActions } = get();
      if (currentProjectId) {
        const project = projectActions.getCurrentProject();
        if (project) {
          get().undoActions.pushUndo('Add voiceover');
          projectActions.updateProject(currentProjectId, { voiceoverTracks: [...project.voiceoverTracks, track] });
          get().trackActions.addClip(
            project.tracks.find((t) => t.type === 'voiceover')?.id || '',
            { id: track.id, name: track.name, type: 'voiceover', sourceStart: 0, sourceEnd: track.duration, offset: track.offset, duration: track.duration, volume: track.volume, blobUrl: track.url, blob: track.blob, speed: 1, transitionIn: { ...DEFAULT_TRANSITION_IN }, transitionOut: { ...DEFAULT_TRANSITION_OUT } }
          );
        }
      }
    },
    removeVoiceover: (id: string) => {
      const { currentProjectId, projectActions } = get();
      if (currentProjectId) {
        get().undoActions.pushUndo('Remove voiceover');
        const project = projectActions.getCurrentProject();
        if (project) {
          const track = project.voiceoverTracks.find((t) => t.id === id);
          if (track?.url) URL.revokeObjectURL(track.url);
          projectActions.updateProject(currentProjectId, { voiceoverTracks: project.voiceoverTracks.filter((t) => t.id !== id) });
        }
      }
    },
    updateVoiceover: (id: string, updates: Partial<VoiceoverTrack>) => {
      const { currentProjectId, projectActions } = get();
      if (currentProjectId) {
        get().undoActions.pushUndo('Update voiceover');
        const project = projectActions.getCurrentProject();
        if (project) {
          projectActions.updateProject(currentProjectId, { voiceoverTracks: project.voiceoverTracks.map((t) => t.id === id ? { ...t, ...updates } : t) });
        }
      }
    },
  },

  undoActions: {
    pushUndo: (label) => {
      const { projects, currentProjectId, undoStack } = get();
      const project = projects.find((p) => p.id === currentProjectId);
      if (!project) return;
      const entry = { id: crypto.randomUUID(), timestamp: Date.now(), label, snapshot: snapshotProject(project) };
      const newStack = [...undoStack, entry].slice(-MAX_UNDO);
      set({ undoStack: newStack, redoStack: [] });
    },
    undo: () => {
      const { undoStack, redoStack, projects, currentProjectId } = get();
      if (undoStack.length === 0) return;
      const currentProject = projects.find((p) => p.id === currentProjectId);
      if (!currentProject) return;
      const entry = undoStack[undoStack.length - 1];
      const newUndoStack = undoStack.slice(0, -1);
      const redoEntry = { id: crypto.randomUUID(), timestamp: Date.now(), label: entry.label, snapshot: snapshotProject(currentProject) };
      try {
        const restored = JSON.parse(entry.snapshot);
        const restoredTracks = restored.tracks?.map((rt: TimelineTrack) => ({
          ...rt, clips: rt.clips.map((rc: TimelineClip) => {
            const currentClip = currentProject.tracks.flatMap((t) => t.clips).find((c) => c.id === rc.id);
            return { ...rc, blob: currentClip?.blob, blobUrl: currentClip?.blobUrl, videoFile: currentClip?.videoFile };
          }),
        }));
        set({
          projects: projects.map((p) => p.id === currentProjectId ? { ...currentProject, ...restored, tracks: restoredTracks || currentProject.tracks, updatedAt: Date.now() } : p),
          undoStack: newUndoStack, redoStack: [...redoStack, redoEntry],
        });
      } catch (e) { console.error('Undo failed:', e); }
    },
    redo: () => {
      const { undoStack, redoStack, projects, currentProjectId } = get();
      if (redoStack.length === 0) return;
      const currentProject = projects.find((p) => p.id === currentProjectId);
      if (!currentProject) return;
      const entry = redoStack[redoStack.length - 1];
      const newRedoStack = redoStack.slice(0, -1);
      const undoEntry = { id: crypto.randomUUID(), timestamp: Date.now(), label: entry.label, snapshot: snapshotProject(currentProject) };
      try {
        const restored = JSON.parse(entry.snapshot);
        const restoredTracks = restored.tracks?.map((rt: TimelineTrack) => ({
          ...rt, clips: rt.clips.map((rc: TimelineClip) => {
            const currentClip = currentProject.tracks.flatMap((t) => t.clips).find((c) => c.id === rc.id);
            return { ...rc, blob: currentClip?.blob, blobUrl: currentClip?.blobUrl, videoFile: currentClip?.videoFile };
          }),
        }));
        set({
          projects: projects.map((p) => p.id === currentProjectId ? { ...currentProject, ...restored, tracks: restoredTracks || currentProject.tracks, updatedAt: Date.now() } : p),
          undoStack: [...undoStack, undoEntry], redoStack: newRedoStack,
        });
      } catch (e) { console.error('Redo failed:', e); }
    },
    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,
  },
});
