export interface VideoFile {
  id: string;
  name: string;
  file: File;
  url: string;
  duration: number;
  width: number;
  height: number;
  size: number;
  thumbnail?: string;
  uploadedAt: number;
}

export interface TrimRange {
  start: number;
  end: number;
}

export interface CropRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface VoiceoverTrack {
  id: string;
  name: string;
  blob: Blob;
  url: string;
  duration: number;
  createdAt: number;
  volume: number;
  offset: number;
}

export interface QualitySettings {
  resolution: 'original' | '1080p' | '720p' | '480p' | '360p';
  framerate: 'original' | '60' | '30' | '24';
  bitrate: 'auto' | 'high' | 'medium' | 'low';
  format: 'mp4' | 'webm';
  enhanceQuality: boolean;
  denoise: boolean;
  stabilize: boolean;
  upscale: boolean;
  audioDenoise: boolean;
  audioNormalize: boolean;
}

// ── Color Adjustments ──
export interface ColorAdjustments {
  brightness: number;   // -1 to 1 (0 = normal)
  contrast: number;     // -1 to 1 (0 = normal)
  saturation: number;   // -1 to 1 (0 = normal)
  hue: number;          // -180 to 180 (0 = normal)
  shadows: number;      // -1 to 1
  highlights: number;   // -1 to 1
}

export const DEFAULT_COLOR_ADJUSTMENTS: ColorAdjustments = {
  brightness: 0,
  contrast: 0,
  saturation: 0,
  hue: 0,
  shadows: 0,
  highlights: 0,
};

// ── Transition Types ──
export type TransitionType = 'none' | 'fade' | 'crossfade' | 'slide' | 'wipe' | 'zoom';

export interface TransitionConfig {
  type: TransitionType;
  duration: number; // seconds
}

export const DEFAULT_TRANSITION_IN: TransitionConfig = { type: 'none', duration: 0.5 };
export const DEFAULT_TRANSITION_OUT: TransitionConfig = { type: 'none', duration: 0.5 };
export const DEFAULT_TRANSITION: TransitionConfig = { type: 'none', duration: 0.5 };

// ── Keyframe Animation Types ──
export type EasingType = 'linear' | 'ease-in' | 'ease-out' | 'ease-in-out';

export interface Keyframe {
  id: string;
  /** Time relative to clip start (seconds) */
  time: number;
  /** Position offset as percentage of frame (-100 to 100, 0=center) */
  position: { x: number; y: number };
  /** Scale multiplier (0.1 to 5) */
  scale: number;
  /** Rotation in degrees (-180 to 180) */
  rotation: number;
  /** Opacity (0 to 1) */
  opacity: number;
  /** Easing to the NEXT keyframe */
  easing: EasingType;
}

export function createDefaultKeyframe(time: number): Keyframe {
  return {
    id: crypto.randomUUID(),
    time,
    position: { x: 0, y: 0 },
    scale: 1,
    rotation: 0,
    opacity: 1,
    easing: 'linear',
  };
}

// ── Multi-track Timeline Types ──
export type TrackType = 'video' | 'audio' | 'voiceover';

export interface TimelineClip {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'voiceover';
  /** Start time within the source media (seconds) */
  sourceStart: number;
  /** End time within the source media (seconds) */
  sourceEnd: number;
  /** Position on the timeline (seconds) */
  offset: number;
  /** Duration on the timeline (seconds) */
  duration: number;
  /** Volume multiplier (0-2) */
  volume: number;
  /** Reference to the source video/audio */
  videoFile?: VideoFile;
  blobUrl?: string;
  blob?: Blob;
  /** Transition at start of clip */
  transitionIn: TransitionConfig;
  /** Transition at end of clip */
  transitionOut: TransitionConfig;
  /** Speed multiplier (0.25 = 4x slow-mo, 4 = 4x fast-forward) */
  speed: number;
  /** Keyframe animations */
  keyframes?: Keyframe[];
}

export interface TimelineTrack {
  id: string;
  name: string;
  type: TrackType;
  clips: TimelineClip[];
  muted: boolean;
  locked: boolean;
  volume: number;
}

// ── Text Overlay Types ──
export interface TextOverlay {
  id: string;
  text: string;
  fontFamily: string;
  fontSize: number;
  color: string;
  position: { x: number; y: number }; // percentage 0-100
  alignment: 'left' | 'center' | 'right';
  startTime: number;
  endTime: number;
  background: string; // hex color, empty = transparent
  strokeColor: string;
  strokeWidth: number;
  opacity: number;
  shadow?: { color: string; blur: number; offsetX: number; offsetY: number };
}

export function createDefaultTextOverlay(startTime: number, duration: number): TextOverlay {
  return {
    id: crypto.randomUUID(),
    text: 'Your Text Here',
    fontFamily: 'Arial',
    fontSize: 48,
    color: '#ffffff',
    position: { x: 50, y: 50 },
    alignment: 'center',
    startTime,
    endTime: startTime + Math.min(duration, 5),
    background: '',
    strokeColor: '#000000',
    strokeWidth: 0,
    opacity: 1,
    shadow: { color: '#00000080', blur: 4, offsetX: 2, offsetY: 2 },
  };
}

export const FONT_OPTIONS = [
  { value: 'Arial', label: 'Arial', stack: 'Arial, Helvetica, sans-serif' },
  { value: 'Helvetica', label: 'Helvetica', stack: 'Helvetica, Arial, sans-serif' },
  { value: 'Georgia', label: 'Georgia', stack: 'Georgia, serif' },
  { value: 'Times New Roman', label: 'Times New Roman', stack: '"Times New Roman", Times, serif' },
  { value: 'Courier New', label: 'Courier New', stack: '"Courier New", Courier, monospace' },
  { value: 'Verdana', label: 'Verdana', stack: 'Verdana, Geneva, sans-serif' },
  { value: 'Trebuchet MS', label: 'Trebuchet MS', stack: '"Trebuchet MS", Helvetica, sans-serif' },
  { value: 'Impact', label: 'Impact', stack: 'Impact, Haettenschweiler, sans-serif' },
  { value: 'Comic Sans MS', label: 'Comic Sans', stack: '"Comic Sans MS", cursive, sans-serif' },
] as const;

// ── Project (extended) ──
export interface Project {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  video: VideoFile | null;
  trimRange: TrimRange;
  cropRegion: CropRegion | null;
  voiceoverTracks: VoiceoverTrack[];
  qualitySettings: QualitySettings;
  colorAdjustments?: ColorAdjustments;
  stickers?: Sticker[];
  thumbnail?: string;
  // Multi-track extension
  tracks: TimelineTrack[];
  // Text overlays
  textOverlays?: TextOverlay[];
}

export interface ExportProgress {
  stage: 'preparing' | 'processing' | 'encoding' | 'finalizing' | 'complete' | 'error';
  progress: number;
  message: string;
  outputUrl?: string;
}

// ── Undo History ──
export interface UndoEntry {
  id: string;
  timestamp: number;
  label: string;
  snapshot: string; // JSON-stringified partial project state
}

export const DEFAULT_QUALITY_SETTINGS: QualitySettings = {
  resolution: 'original',
  framerate: 'original',
  bitrate: 'auto',
  format: 'mp4',
  enhanceQuality: false,
  denoise: false,
  stabilize: false,
  upscale: false,
  audioDenoise: false,
  audioNormalize: false,
};

export interface Sticker {
  id: string;
  emoji: string;
  position: { x: number; y: number }; // percentage 0-100
  scale: number;     // 0.1 to 3
  rotation: number;  // -180 to 180
  opacity: number;   // 0 to 1
  startTime: number;
  endTime: number;
}

export function createDefaultSticker(emoji: string, startTime: number, endTime: number): Sticker {
  return {
    id: crypto.randomUUID(),
    emoji,
    position: { x: 50, y: 50 },
    scale: 1,
    rotation: 0,
    opacity: 1,
    startTime,
    endTime,
  };
}

export interface PreviewClip {
  sourceStart: number;
  sourceEnd: number;
  offset: number;
  duration: number;
  speed: number;
}

export const DEFAULT_TRIM_RANGE: TrimRange = { start: 0, end: 0 };

export const RESOLUTION_OPTIONS = [
  { value: 'original', label: 'Original', description: 'Keep source resolution' },
  { value: '1080p', label: '1080p', description: '1920×1080' },
  { value: '720p', label: '720p', description: '1280×720' },
  { value: '480p', label: '480p', description: '854×480' },
  { value: '360p', label: '360p', description: '640×360' },
] as const;

export const FORMAT_OPTIONS = [
  { value: 'mp4', label: 'MP4', description: 'H.264, best compatibility' },
  { value: 'webm', label: 'WebM', description: 'VP9, smaller file size' },
] as const;

// ── Social Media Platform Presets ──
export type PlatformPreset =
  | 'instagram-feed'
  | 'instagram-reels'
  | 'instagram-story'
  | 'youtube-standard'
  | 'youtube-shorts'
  | 'tiktok';

export interface PlatformPresetConfig {
  id: PlatformPreset;
  label: string;
  platform: string;
  description: string;
  icon: string;
  resolution: '1080p' | '720p';
  width: number;
  height: number;
  aspectRatio: string; // e.g. '9:16', '4:5', '1:1', '16:9'
  aspectValue: number; // width/height for crop preset
  framerate: '30' | '60' | '24';
  bitrate: 'high' | 'auto';
  format: 'mp4';
  tips: string[];
}

export const PLATFORM_PRESETS: PlatformPresetConfig[] = [
  {
    id: 'instagram-reels',
    label: 'Reels',
    platform: 'Instagram',
    description: 'Vertical 9:16 — 1080×1920',
    icon: '📱',
    resolution: '1080p',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    aspectValue: 9 / 16,
    framerate: '30',
    bitrate: 'high',
    format: 'mp4',
    tips: ['Keep text in the top 80% — bottom 20% is covered by UI', 'Use 30fps for best compression'],
  },
  {
    id: 'instagram-feed',
    label: 'Feed',
    platform: 'Instagram',
    description: 'Portrait 4:5 — 1080×1350',
    icon: '📱',
    resolution: '1080p',
    width: 1080,
    height: 1350,
    aspectRatio: '4:5',
    aspectValue: 4 / 5,
    framerate: '30',
    bitrate: 'auto',
    format: 'mp4',
    tips: ['Most engaging aspect ratio for feed posts', 'Keep captions within visible area'],
  },
  {
    id: 'instagram-story',
    label: 'Story',
    platform: 'Instagram',
    description: 'Vertical 9:16 — 1080×1920',
    icon: '📱',
    resolution: '1080p',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    aspectValue: 9 / 16,
    framerate: '30',
    bitrate: 'high',
    format: 'mp4',
    tips: ['Leave room at top/bottom for stickers and text', 'Keep duration under 60 seconds'],
  },
  {
    id: 'youtube-standard',
    label: 'Standard',
    platform: 'YouTube',
    description: 'Horizontal 16:9 — 1920×1080',
    icon: '▶️',
    resolution: '1080p',
    width: 1920,
    height: 1080,
    aspectRatio: '16:9',
    aspectValue: 16 / 9,
    framerate: '30',
    bitrate: 'high',
    format: 'mp4',
    tips: ['H.264 MP4 with AAC audio is most compatible', 'Use 60fps for gaming or fast-paced content'],
  },
  {
    id: 'youtube-shorts',
    label: 'Shorts',
    platform: 'YouTube',
    description: 'Vertical 9:16 — 1080×1920',
    icon: '▶️',
    resolution: '1080p',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    aspectValue: 9 / 16,
    framerate: '30',
    bitrate: 'high',
    format: 'mp4',
    tips: ['Vertical format required for Shorts', 'Keep under 60 seconds for best reach'],
  },
  {
    id: 'tiktok',
    label: 'Video',
    platform: 'TikTok',
    description: 'Vertical 9:16 — 1080×1920',
    icon: '🎵',
    resolution: '1080p',
    width: 1080,
    height: 1920,
    aspectRatio: '9:16',
    aspectValue: 9 / 16,
    framerate: '30',
    bitrate: 'auto',
    format: 'mp4',
    tips: ['Export at 1080p — TikTok compresses higher resolutions', 'Keep text out of the bottom 25% (caption area)'],
  },
];

