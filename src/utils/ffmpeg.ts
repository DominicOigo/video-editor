import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import type { TrimRange, CropRegion, QualitySettings, TransitionConfig, TimelineTrack, Keyframe, TextOverlay, ColorAdjustments, Sticker } from '../types';
import { DEFAULT_QUALITY_SETTINGS } from '../types';
import { buildFFmpegCommand } from './buildFFmpegCommand';
import type { BuildArgsInput, AudioClipMeta, VoiceoverMeta } from './buildFFmpegCommand';

let ffmpeg: FFmpeg | null = null;
let loadingPromise: Promise<void> | null = null;

export function getFFmpeg(): FFmpeg {
  if (!ffmpeg) {
    ffmpeg = new FFmpeg();
  }
  return ffmpeg;
}

export async function loadFFmpeg(): Promise<void> {
  if (ffmpeg?.loaded) return;
  if (loadingPromise) return loadingPromise;

  const instance = getFFmpeg();

  loadingPromise = (async () => {
    try {
      const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm';

      await instance.load({
        coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
        wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
      });
    } catch (error) {
      loadingPromise = null;
      throw error;
    }
  })();

  return loadingPromise;
}

export function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const ms = Math.floor((seconds % 1) * 100);

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function parseTime(timeStr: string): number {
  const parts = timeStr.split(':');
  if (parts.length === 3) {
    return parseInt(parts[0]) * 3600 + parseInt(parts[1]) * 60 + parseFloat(parts[2]);
  }
  return parseInt(parts[0]) * 60 + parseFloat(parts[1]);
}

// ── Input types ──

export interface AudioClipInput {
  blob: Blob;
  offset: number;
  volume: number;
}

export interface VideoClipInput {
  sourceStart: number;
  sourceEnd: number;
  offset: number;
  duration: number;
  speed?: number;
  transitionIn?: TransitionConfig;
  transitionOut?: TransitionConfig;
  keyframes?: Keyframe[];
}

export interface VoiceoverTrackInput {
  blob: Blob;
  offset: number;
  volume: number;
}

export interface ProcessOptions {
  trimRange?: TrimRange;
  cropRegion?: CropRegion | null;
  voiceoverBlob?: Blob | null;
  voiceoverOffset?: number;
  voiceoverVolume?: number;
  qualitySettings: QualitySettings;
  onProgress?: (progress: number, message: string) => void;
  originalWidth?: number;
  originalHeight?: number;
  tracks?: TimelineTrack[];
  transitionIn?: TransitionConfig;
  transitionOut?: TransitionConfig;
  keyframes?: Keyframe[];
  textOverlays?: TextOverlay[];
  speed?: number;
  audioClips?: AudioClipInput[];
  colorAdjustments?: ColorAdjustments;
  stickers?: Sticker[];
  videoClips?: VideoClipInput[];
  voiceoverTracks?: VoiceoverTrackInput[];
}

export async function processVideo(
  videoFile: File,
  options: ProcessOptions
): Promise<Blob> {
  const instance = getFFmpeg();
  if (!instance.loaded) {
    await loadFFmpeg();
  }

  const qs = { ...DEFAULT_QUALITY_SETTINGS, ...options.qualitySettings };

  const {
    trimRange,
    cropRegion,
    onProgress,
    originalWidth,
    originalHeight,
    textOverlays,
    audioClips = [],
    colorAdjustments,
  } = options;

  const inputName = 'input' + getExtension(videoFile.name);
  const outputName = 'output.' + (qs.format === 'webm' ? 'webm' : 'mp4');

  const vClips = options.videoClips;
  const isMultiClip = vClips && vClips.length > 0;

  const voTracks = options.voiceoverTracks ||
    (options.voiceoverBlob
      ? [{ blob: options.voiceoverBlob, offset: options.voiceoverOffset ?? 0, volume: options.voiceoverVolume ?? 1.0 }]
      : []);

  // Write input files
  await instance.writeFile(inputName, await fetchFile(videoFile));

  for (let i = 0; i < voTracks.length; i++) {
    await instance.writeFile(`voiceover_${i}.wav`, await fetchFile(voTracks[i].blob));
  }

  for (let i = 0; i < audioClips.length; i++) {
    const fileName = `audio_${i}.${getAudioExtension(audioClips[i].blob)}`;
    await instance.writeFile(fileName, await fetchFile(audioClips[i].blob));
  }

  // Check if input has an audio stream
  let inputHasAudio = true;
  try {
    const probeExitCode = await instance.exec(['-v', 'error', '-i', inputName, '-map', '0:a:0', '-t', '0.001', '-f', 'null', '-', '-y']);
    inputHasAudio = probeExitCode === 0;
  } catch {
    inputHasAudio = true;
  }

  // Build voiceover metadata
  const voiceovers: VoiceoverMeta[] = voTracks.map(v => ({
    offset: v.offset,
    volume: v.volume,
  }));

  // Build audio clip metadata
  const audioClipMetas: AudioClipMeta[] = audioClips.map((c, _i) => ({
    ext: getAudioExtension(c.blob),
    offset: c.offset,
    volume: c.volume,
  }));

  // Build video clip input for multi-clip path
  const videoClipInputs = vClips?.map(c => ({
    sourceStart: c.sourceStart,
    sourceEnd: c.sourceEnd,
    offset: c.offset,
    duration: c.duration,
    speed: c.speed,
    transitionIn: c.transitionIn,
    transitionOut: c.transitionOut,
    keyframes: c.keyframes,
  }));

  // Build the command args
  const buildInput: BuildArgsInput = {
    inputFilename: inputName,
    outputFilename: outputName,
    qualitySettings: qs,
    cropRegion: cropRegion ?? undefined,
    originalWidth,
    originalHeight,
    textOverlays: textOverlays || [],
    colorAdjustments,
    stickers: options.stickers || [],
    videoClips: isMultiClip ? videoClipInputs : undefined,
    voiceovers,
    audioClips: audioClipMetas,
    inputHasAudio,
    trimRange: isMultiClip ? undefined : trimRange,
    transitionIn: isMultiClip ? undefined : options.transitionIn,
    transitionOut: isMultiClip ? undefined : options.transitionOut,
    keyframes: isMultiClip ? undefined : options.keyframes,
    speed: isMultiClip ? undefined : options.speed,
  };

  const args = buildFFmpegCommand(buildInput);

  onProgress?.(0, 'Processing video...');

  let lastProgress = 0;
  const progressHandler = ({ progress: p }: { progress: number }) => {
    const percent = Math.round(p * 100);
    if (percent > lastProgress) {
      lastProgress = percent;
      onProgress?.(Math.min(percent, 99), `Processing: ${percent}%`);
    }
  };

  let ffmpegLog = '';
  const logHandler = ({ message }: { message: string }) => {
    ffmpegLog += message + '\n';
    if (ffmpegLog.length > 5000) ffmpegLog = ffmpegLog.slice(-5000);
  };

  instance.on('progress', progressHandler);
  instance.on('log', logHandler);

  try {
    const exitCode = await instance.exec(args);
    if (exitCode !== 0) {
      const logPreview = ffmpegLog ? `\n\nFFmpeg output:\n${ffmpegLog.slice(-2000)}` : '';
      throw new Error(`FFmpeg exited with code ${exitCode}${logPreview}`);
    }
    instance.off('progress', progressHandler);
    instance.off('log', logHandler);

    const data = await instance.readFile(outputName);

    // Cleanup
    await instance.deleteFile(inputName);
    for (let i = 0; i < voTracks.length; i++) {
      try { await instance.deleteFile(`voiceover_${i}.wav`); } catch {}
    }
    for (let i = 0; i < audioClips.length; i++) {
      try { await instance.deleteFile(`audio_${i}.${getAudioExtension(audioClips[i].blob)}`); } catch {}
    }
    try { await instance.deleteFile(outputName); } catch {}

    const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : new Uint8Array(data);
    const blob = new Blob([bytes], {
      type: qs.format === 'webm' ? 'video/webm' : 'video/mp4',
    });

    onProgress?.(100, 'Complete!');
    return blob;
  } catch (error) {
    instance.off('progress', progressHandler);
    instance.off('log', logHandler);
    const baseMsg = error instanceof Error ? error.message : 'Processing failed';
    const logPreview = ffmpegLog ? `\n\nFFmpeg output:\n${ffmpegLog.slice(-2000)}` : '';
    onProgress?.(0, `Error: ${baseMsg}`);
    const enhanced = new Error(`${baseMsg}${logPreview}`);
    enhanced.stack = error instanceof Error ? error.stack : undefined;
    throw enhanced;
  }
}

export function getExtension(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  return ext ? `.${ext}` : '.mp4';
}

export function getAudioExtension(blob: Blob): string {
  if (blob.type.includes('wav')) return 'wav';
  if (blob.type.includes('ogg')) return 'ogg';
  if (blob.type.includes('mpeg') || blob.type.includes('mp3')) return 'mp3';
  if (blob.type.includes('aac')) return 'aac';
  if (blob.type.includes('flac')) return 'flac';
  return 'wav';
}
