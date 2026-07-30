import type { VercelRequest, VercelResponse } from '@vercel/node';
import { put } from '@vercel/blob';
import { spawn } from 'child_process';
import { writeFile, mkdtemp, readFile } from 'fs/promises';
import { createWriteStream, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { buildFFmpegCommand } from '../src/utils/buildFFmpegCommand';
import type { BuildArgsInput } from '../src/utils/buildFFmpegCommand';
import type { QualitySettings, CropRegion, TransitionConfig, Keyframe, TextOverlay, ColorAdjustments, Sticker } from '../src/types';

interface ExportRequestBody {
  videoUrl: string;
  qualitySettings: QualitySettings;
  cropRegion?: CropRegion | null;
  originalWidth?: number;
  originalHeight?: number;
  textOverlays?: TextOverlay[];
  colorAdjustments?: ColorAdjustments;
  stickers?: Sticker[];
  voiceovers: { url: string; offset: number; volume: number }[];
  audioClips: { url: string; ext?: string; offset: number; volume: number }[];
  inputHasAudio: boolean;
  trimRange?: { start: number; end: number };
  transitionIn?: TransitionConfig;
  transitionOut?: TransitionConfig;
  keyframes?: Keyframe[];
  speed?: number;
  videoClips?: {
    sourceStart: number;
    sourceEnd: number;
    offset: number;
    duration: number;
    speed?: number;
    transitionIn?: TransitionConfig;
    transitionOut?: TransitionConfig;
    keyframes?: Keyframe[];
  }[];
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const body = req.body as ExportRequestBody;
  if (!body.videoUrl || !body.qualitySettings) {
    return res.status(400).json({ error: 'Missing videoUrl or qualitySettings' });
  }

  let workDir: string | null = null;

  try {
    workDir = await mkdtemp(join(tmpdir(), 'video-export-'));
    const inputExt = body.videoUrl.match(/\.(\w+)(\?|$)/)?.[1] || 'mp4';
    const inputPath = join(workDir, `input.${inputExt}`);
    const outputPath = join(workDir, 'output.mp4');

    // Download video
    const videoResp = await fetch(body.videoUrl);
    if (!videoResp.ok) throw new Error(`Failed to fetch video: ${videoResp.status}`);
    const videoBuf = new Uint8Array(await videoResp.arrayBuffer());
    await writeFile(inputPath, videoBuf);

    // Download audio clips
    const audioExtensions: string[] = [];
    for (let i = 0; i < body.audioClips.length; i++) {
      const clip = body.audioClips[i];
      const resp = await fetch(clip.url);
      if (!resp.ok) {
        console.warn(`Failed to fetch audio clip ${i}, skipping: ${resp.status}`);
        continue;
      }
      const ext = clip.url.match(/\.(\w+)(\?|$)/)?.[1] || 'mp3';
      const buf = new Uint8Array(await resp.arrayBuffer());
      await writeFile(join(workDir, `audio_${i}.${ext}`), buf);
      audioExtensions.push(ext);
    }

    // Download voiceovers
    const voiceoverMetas: { offset: number; volume: number }[] = [];
    for (let i = 0; i < body.voiceovers.length; i++) {
      const vo = body.voiceovers[i];
      try {
        const resp = await fetch(vo.url);
        if (!resp.ok) { console.warn(`Failed to fetch voiceover ${i}: ${resp.status}`); continue; }
        const buf = new Uint8Array(await resp.arrayBuffer());
        await writeFile(join(workDir, `voiceover_${i}.wav`), buf);
        voiceoverMetas.push({ offset: vo.offset, volume: vo.volume });
      } catch (e) {
        console.warn(`Failed to download voiceover ${i}:`, e);
      }
    }

    // Build command input
    const qs = { ...body.qualitySettings };
    const audioClips = body.audioClips.map((c, i) => ({
      ext: c.ext || audioExtensions[i] || 'mp3',
      offset: c.offset,
      volume: c.volume,
    }));

    const buildInput: BuildArgsInput = {
      inputFilename: `input.${inputExt}`,
      outputFilename: 'output.mp4',
      qualitySettings: qs,
      cropRegion: body.cropRegion ?? undefined,
      originalWidth: body.originalWidth,
      originalHeight: body.originalHeight,
      textOverlays: body.textOverlays || [],
      colorAdjustments: body.colorAdjustments,
      stickers: body.stickers || [],
      videoClips: body.videoClips,
      voiceovers: voiceoverMetas,
      audioClips,
      inputHasAudio: body.inputHasAudio,
      trimRange: body.trimRange,
      transitionIn: body.transitionIn,
      transitionOut: body.transitionOut,
      keyframes: body.keyframes,
      speed: body.speed,
    };

    const args = buildFFmpegCommand(buildInput);

    // Find the ffmpeg binary from ffmpeg-static
    let ffmpegPath: string;
    try {
      ffmpegPath = require('ffmpeg-static') as string;
    } catch {
      ffmpegPath = 'ffmpeg';
    }

    // Run FFmpeg
    await new Promise<void>((resolve, reject) => {
      const proc = spawn(ffmpegPath, args, { cwd: workDir! });

      let stderr = '';
      proc.stderr?.on('data', (chunk: Buffer) => {
        stderr += chunk.toString();
      });

      proc.on('error', (err) => {
        reject(new Error(`FFmpeg spawn error: ${err.message}`));
      });

      proc.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg exited with code ${code}\n${stderr.slice(-2000)}`));
      });
    });

    // Read output and upload to blob
    const outputBuf = new Uint8Array(await readFile(outputPath));

    const blob = await put('export/output.mp4', Buffer.from(outputBuf), {
      access: 'public',
      contentType: 'video/mp4',
      addRandomSuffix: true,
    });

    return res.status(200).json({
      url: blob.url,
      size: outputBuf.length,
    });
  } catch (error) {
    console.error('Export failed:', error);
    const msg = error instanceof Error ? error.message : 'Export failed';
    return res.status(500).json({ error: msg });
  }
}
