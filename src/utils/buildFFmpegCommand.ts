import type { TrimRange, CropRegion, QualitySettings, TransitionConfig, Keyframe, TextOverlay, ColorAdjustments, Sticker } from '../types';
import { DEFAULT_QUALITY_SETTINGS } from '../types';
import { generateKeyframeFilters } from './keyframeFilters';

export interface AudioClipMeta {
  ext: string;
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

export interface VoiceoverMeta {
  offset: number;
  volume: number;
}

export interface BuildArgsInput {
  inputFilename: string;
  outputFilename: string;
  qualitySettings: QualitySettings;
  cropRegion?: CropRegion | null;
  originalWidth?: number;
  originalHeight?: number;
  textOverlays?: TextOverlay[];
  colorAdjustments?: ColorAdjustments;
  stickers?: Sticker[];
  videoClips?: VideoClipInput[];
  voiceovers: VoiceoverMeta[];
  audioClips: AudioClipMeta[];
  inputHasAudio: boolean;
  trimRange?: TrimRange;
  transitionIn?: TransitionConfig;
  transitionOut?: TransitionConfig;
  keyframes?: Keyframe[];
  speed?: number;
}

function getResolutionDimensions(
  resolution: string,
  _originalWidth?: number,
  _originalHeight?: number
): { width: number; height: number } | null {
  switch (resolution) {
    case '1080p': return { width: 1920, height: 1080 };
    case '720p': return { width: 1280, height: 720 };
    case '480p': return { width: 854, height: 480 };
    case '360p': return { width: 640, height: 360 };
    case 'original': default: return null;
  }
}

function buildAtempoFilter(speed: number): string {
  const parts: string[] = [];
  let remaining = speed;
  while (remaining > 2) { parts.push('atempo=2.0'); remaining /= 2; }
  while (remaining < 0.5) { parts.push('atempo=0.5'); remaining /= 0.5; }
  parts.push(`atempo=${remaining.toFixed(3)}`);
  return parts.join(',');
}

function buildTimeMapping(clips: { offset: number; duration: number }[]): (timelineTime: number) => number {
  let currentOutput = 0;
  const segments: { timelineStart: number; timelineEnd: number; outputStart: number; outputEnd: number }[] = [];
  const sorted = [...clips].sort((a, b) => a.offset - b.offset);
  for (const clip of sorted) {
    segments.push({
      timelineStart: clip.offset,
      timelineEnd: clip.offset + clip.duration,
      outputStart: currentOutput,
      outputEnd: currentOutput + clip.duration,
    });
    currentOutput += clip.duration;
  }
  return (timelineTime: number): number => {
    for (const seg of segments) {
      if (timelineTime >= seg.timelineStart && timelineTime <= seg.timelineEnd) {
        return seg.outputStart + (timelineTime - seg.timelineStart);
      }
    }
    return -1;
  };
}

export function buildFFmpegCommand(input: BuildArgsInput): string[] {
  const qs = { ...DEFAULT_QUALITY_SETTINGS, ...input.qualitySettings };
  const args: string[] = [];

  // 1. Input
  args.push('-i', input.inputFilename);

  // Voiceover inputs
  for (let i = 0; i < input.voiceovers.length; i++) {
    const vo = input.voiceovers[i];
    if (vo.offset > 0) args.push('-itsoffset', vo.offset.toString());
    args.push('-i', `voiceover_${i}.wav`);
  }

  // Audio clip inputs
  const audioClipInputLabels: string[] = [];
  for (let i = 0; i < input.audioClips.length; i++) {
    const clip = input.audioClips[i];
    if (clip.offset > 0) args.push('-itsoffset', clip.offset.toString());
    args.push('-i', `audio_${i}.${clip.ext}`);
    audioClipInputLabels.push(`[${1 + input.voiceovers.length + i}:a]`);
  }

  // 2. Build global video filters
  const globalVF: string[] = [];

  if (input.cropRegion) {
    globalVF.push(`crop=${input.cropRegion.width}:${input.cropRegion.height}:${input.cropRegion.x}:${input.cropRegion.y}`);
  }

  if (qs.resolution !== 'original') {
    const dims = getResolutionDimensions(qs.resolution, input.originalWidth, input.originalHeight);
    if (dims) globalVF.push(`scale=${dims.width}:${dims.height}:flags=lanczos`);
  }

  if (qs.upscale && qs.resolution === 'original') {
    globalVF.push('scale=iw*2:ih*2:flags=spline');
  }

  if (input.colorAdjustments) {
    const { brightness: b = 0, contrast: c = 0, saturation: s = 0, hue: h = 0, shadows: sh = 0, highlights: hi = 0 } = input.colorAdjustments;
    const eqParts: string[] = [];
    if (b !== 0) eqParts.push(`brightness=${b.toFixed(2)}`);
    if (c !== 0) eqParts.push(`contrast=${(1 + c).toFixed(2)}`);
    if (s !== 0) eqParts.push(`saturation=${(1 + s).toFixed(2)}`);
    if (h !== 0) eqParts.push(`hue=${h.toFixed(0)}`);
    if (eqParts.length > 0) globalVF.push('eq=' + eqParts.join(':'));
    if (sh !== 0 || hi !== 0) {
      globalVF.push(`curves=all='0/0 0.25/${(0.25 * (1 + sh)).toFixed(3)} 0.75/${(0.75 + hi * 0.25).toFixed(3)} 1/1'`);
    }
  }

  if (qs.enhanceQuality) globalVF.push('unsharp=5:5:0.8:3:3:0.4');
  if (qs.denoise) globalVF.push('hqdn3d=4:3:6:4');
  if (qs.stabilize) globalVF.push('deshake=rx=64:ry=64');

  const isMultiClip = input.videoClips && input.videoClips.length > 0;

  if (isMultiClip && input.videoClips) {
    const sortedClips = [...input.videoClips].sort((a, b) => a.offset - b.offset);
    const mapTime = buildTimeMapping(sortedClips);
    const filterParts: string[] = [];
    const concatInputLabels: string[] = [];
    const outW = getResolutionDimensions(qs.resolution, input.originalWidth, input.originalHeight)?.width || input.originalWidth || 1920;
    const outH = getResolutionDimensions(qs.resolution, input.originalWidth, input.originalHeight)?.height || input.originalHeight || 1080;

    for (let i = 0; i < sortedClips.length; i++) {
      const clip = sortedClips[i];
      const vLabel = `[cv${i}]`;
      const aLabel = `[ca${i}]`;
      const clipSpeed = clip.speed || 1;
      const clipDur = (clip.sourceEnd - clip.sourceStart) / clipSpeed;

      let vChain = `trim=start=${clip.sourceStart}:end=${clip.sourceEnd},setpts=PTS-STARTPTS`;
      if (clipSpeed !== 1) vChain += `,setpts=${(1 / clipSpeed).toFixed(3)}*PTS`;
      if (clip.transitionIn?.duration && clip.transitionIn.duration > 0) vChain += `,fade=in:st=0:d=${clip.transitionIn.duration}`;
      if (clip.transitionOut?.duration && clip.transitionOut.duration > 0) {
        const foStart = Math.max(0, clipDur - clip.transitionOut.duration);
        vChain += `,fade=out:st=${foStart}:d=${clip.transitionOut.duration}`;
      }
      if (clip.keyframes && clip.keyframes.length >= 2) {
        const kfFilters = generateKeyframeFilters(clip.keyframes, outW, outH);
        if (kfFilters.length > 0) vChain += ',' + kfFilters.join(',');
      }

      filterParts.push(`[0:v]${vChain}${vLabel}`);

      let aChain = `atrim=start=${clip.sourceStart}:end=${clip.sourceEnd},asetpts=PTS-STARTPTS`;
      if (clipSpeed !== 1) aChain += `,${buildAtempoFilter(clipSpeed)}`;
      if (input.inputHasAudio) filterParts.push(`[0:a]${aChain}${aLabel}`);

      concatInputLabels.push(input.inputHasAudio ? vLabel + aLabel : vLabel);
    }

    const concatStr = concatInputLabels.join('');
    const concatA = input.inputHasAudio ? '1' : '0';
    const concatOutLabel = input.inputHasAudio ? `[concatv][concata]` : `[concatv]`;
    filterParts.push(`${concatStr}concat=n=${sortedClips.length}:v=1:a=${concatA}${concatOutLabel}`);

    let videoOutLabel = `[outv]`;
    if (globalVF.length > 0) {
      filterParts.push(`[concatv]${globalVF.join(',')}${videoOutLabel}`);
    } else {
      videoOutLabel = '[concatv]';
    }

    // Stickers
    const stickers = input.stickers || [];
    for (const sticker of stickers) {
      const outStart = mapTime(sticker.startTime);
      const outEnd = mapTime(sticker.endTime);
      if (outStart < 0 || outEnd < 0 || outEnd <= outStart) continue;
      const emojiSize = Math.round(48 * sticker.scale);
      const xPos = `(w-text_w)*${sticker.position.x}/100`;
      const yPos = `(h-text_h)*${sticker.position.y}/100`;
      const stickerFilter = `drawtext=text='${sticker.emoji}':fontsize=${emojiSize}:x=${xPos}:y=${yPos}:enable='between(t,${outStart.toFixed(3)},${outEnd.toFixed(3)})'`;
      const prevLabel = videoOutLabel;
      videoOutLabel = `[sv_${stickers.indexOf(sticker)}]`;
      filterParts.push(`${prevLabel}${stickerFilter}${videoOutLabel}`);
    }

    // Text overlays
    const overlays = input.textOverlays || [];
    for (const overlay of overlays) {
      const outStart = mapTime(overlay.startTime);
      const outEnd = mapTime(overlay.endTime);
      if (outStart < 0 || outEnd < 0 || outEnd <= outStart) continue;
      const escapedText = overlay.text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:').replace(/%/g, '\\%');
      const fontSize = Math.round(overlay.fontSize * (input.originalWidth ? input.originalWidth / 1920 : 1));
      const xPos = `(w-text_w)*${overlay.position.x}/100`;
      const yPos = `(h-text_h)*${overlay.position.y}/100`;
      const shadowPart = overlay.shadow ? `:shadowx=${overlay.shadow.offsetX}:shadowy=${overlay.shadow.offsetY}:shadowcolor=${overlay.shadow.color.replace('#', '')}@${(overlay.shadow.blur / 10).toFixed(1)}` : '';
      const boxPart = overlay.background ? `:box=1:boxcolor=${overlay.background.replace('#', '')}@0.6` : '';
      const borderPart = overlay.strokeWidth > 0 ? `:bordercolor=${overlay.strokeColor.replace('#', '')}@1:borderw=${overlay.strokeWidth.toFixed(1)}` : '';
      const textFilter = `drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${overlay.color.replace('#', '')}@${overlay.opacity.toFixed(2)}:x=${xPos}:y=${yPos}${shadowPart}${boxPart}${borderPart}:enable='between(t,${outStart.toFixed(3)},${outEnd.toFixed(3)})'`;
      const prevLabel = videoOutLabel;
      videoOutLabel = `[to_${overlays.indexOf(overlay)}]`;
      filterParts.push(`${prevLabel}${textFilter}${videoOutLabel}`);
    }

    // Audio mixing
    const audioCleanFilters: string[] = [];
    if (qs.audioDenoise) audioCleanFilters.push('afftdn=nf=-20');
    if (qs.audioNormalize) audioCleanFilters.push('dynaudnorm=f=150:g=15');
    const audioCleanStr = audioCleanFilters.join(',');
    const audioMixLabels: string[] = input.inputHasAudio ? ['[concata]'] : [];
    let audioMixInput = '';
    const voLabelStart = 1;

    for (let i = 0; i < input.voiceovers.length; i++) {
      const vol = input.voiceovers[i].volume.toFixed(2);
      const label = `[vo_${i}_adj]`;
      audioMixInput += `[${voLabelStart + i}:a]volume=${vol}${label};`;
      audioMixLabels.push(label);
    }
    for (let i = 0; i < input.audioClips.length; i++) {
      const vol = input.audioClips[i].volume.toFixed(2);
      const label = `[clip_${i}_adj]`;
      audioMixInput += `${audioClipInputLabels[i]}volume=${vol}${label};`;
      audioMixLabels.push(label);
    }

    const totalAudioInputs = (input.inputHasAudio ? 1 : 0) + input.voiceovers.length + input.audioClips.length;
    let audioOutLabel = '[aout]';

    if (totalAudioInputs > 1) {
      const mixInputStr = audioMixLabels.join('');
      if (audioCleanStr) {
        audioMixInput += `${mixInputStr}amix=inputs=${audioMixLabels.length}:duration=first:dropout_transition=2[a_mixed];[a_mixed]${audioCleanStr}${audioOutLabel}`;
      } else {
        audioMixInput += `${mixInputStr}amix=inputs=${audioMixLabels.length}:duration=first:dropout_transition=2[aout]`;
      }
      filterParts.push(audioMixInput);
    } else if (totalAudioInputs === 1) {
      if (audioMixInput) {
        if (audioCleanStr) {
          filterParts.push(`${audioMixInput}${audioMixLabels[0]}${audioCleanStr}${audioOutLabel}`);
        } else {
          filterParts.push(audioMixInput.slice(0, -1));
          audioOutLabel = audioMixLabels[0];
        }
      } else {
        if (audioCleanStr) {
          filterParts.push(`[concata]${audioCleanStr}${audioOutLabel}`);
        } else {
          audioOutLabel = '[concata]';
        }
      }
    }

    args.push('-filter_complex', filterParts.join(';'));
    args.push('-map', videoOutLabel);
    if (totalAudioInputs > 0) args.push('-map', audioOutLabel);

  } else {
    // Single-clip path
    const videoFilters: string[] = [...globalVF];
    const trimStart = input.trimRange?.start || 0;
    const trimEnd = input.trimRange?.end || 99999;

    if (input.transitionIn && input.transitionIn.duration > 0) {
      switch (input.transitionIn.type) {
        case 'fade': case 'crossfade': videoFilters.push(`fade=in:st=0:d=${input.transitionIn.duration}`); break;
        case 'slide': videoFilters.push(`crop=iw*min(1,t/${input.transitionIn.duration}):ih:iw*(1-min(1,t/${input.transitionIn.duration})):0`); break;
        case 'wipe': videoFilters.push(`fade=in:st=0:d=${input.transitionIn.duration}:color=black`); break;
        case 'zoom': videoFilters.push(`zoompan=z='min(zoom+0.002,1.5)':d=1:s=${input.originalWidth || 1920}x${input.originalHeight || 1080}:fps=30`); break;
      }
    }

    if (input.transitionOut && input.transitionOut.duration > 0) {
      const totalDuration = input.trimRange ? input.trimRange.end - input.trimRange.start : (input.transitionOut.duration * 2);
      const fadeStart = Math.max(0, totalDuration - input.transitionOut.duration);
      switch (input.transitionOut.type) {
        case 'fade': videoFilters.push(`fade=out:st=${fadeStart}:d=${input.transitionOut.duration}`); break;
        case 'slide': videoFilters.push(`crop=iw*max(0,1-(t-${fadeStart})/${input.transitionOut.duration}):ih:0:0`); break;
        case 'wipe': videoFilters.push(`fade=out:st=${fadeStart}:d=${input.transitionOut.duration}:color=black`); break;
        case 'zoom': videoFilters.push(`zoompan=z='max(1-0.002*(t-${fadeStart})*30,0.5)':d=1:s=${input.originalWidth || 1920}x${input.originalHeight || 1080}:fps=30`); break;
      }
    }

    let speedAudioFilter = '';
    if (input.speed && input.speed !== 1) {
      videoFilters.push(`setpts=${(1 / input.speed).toFixed(3)}*PTS`);
      speedAudioFilter = buildAtempoFilter(input.speed);
    }

    if (input.keyframes && input.keyframes.length >= 2) {
      const outW = getResolutionDimensions(qs.resolution, input.originalWidth, input.originalHeight)?.width || input.originalWidth || 1920;
      const outH = getResolutionDimensions(qs.resolution, input.originalWidth, input.originalHeight)?.height || input.originalHeight || 1080;
      videoFilters.push(...generateKeyframeFilters(input.keyframes, outW, outH));
    }

    // Stickers
    for (const sticker of (input.stickers || [])) {
      const enableStart = Math.max(0, sticker.startTime - trimStart);
      const enableEnd = Math.max(0, sticker.endTime - trimStart);
      if (enableEnd <= 0 || enableStart > (trimEnd - trimStart)) continue;
      videoFilters.push(`drawtext=text='${sticker.emoji}':fontsize=${Math.round(48 * sticker.scale)}:x=(w-text_w)*${sticker.position.x}/100:y=(h-text_h)*${sticker.position.y}/100:enable='between(t,${enableStart.toFixed(3)},${enableEnd.toFixed(3)})'`);
    }

    // Text overlays
    for (const overlay of (input.textOverlays || [])) {
      const enableStart = Math.max(0, overlay.startTime - trimStart);
      const enableEnd = Math.max(0, overlay.endTime - trimStart);
      if (enableEnd <= 0 || enableStart > (trimEnd - trimStart)) continue;
      const escapedText = overlay.text.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/:/g, '\\:').replace(/%/g, '\\%');
      const fontSize = Math.round(overlay.fontSize * (input.originalWidth ? input.originalWidth / 1920 : 1));
      const shadowPart = overlay.shadow ? `:shadowx=${overlay.shadow.offsetX}:shadowy=${overlay.shadow.offsetY}:shadowcolor=${overlay.shadow.color.replace('#', '')}@${(overlay.shadow.blur / 10).toFixed(1)}` : '';
      const boxPart = overlay.background ? `:box=1:boxcolor=${overlay.background.replace('#', '')}@0.6` : '';
      const borderPart = overlay.strokeWidth > 0 ? `:bordercolor=${overlay.strokeColor.replace('#', '')}@1:borderw=${overlay.strokeWidth.toFixed(1)}` : '';
      videoFilters.push(`drawtext=text='${escapedText}':fontsize=${fontSize}:fontcolor=${overlay.color.replace('#', '')}@${overlay.opacity.toFixed(2)}:x=(w-text_w)*${overlay.position.x}/100:y=(h-text_h)*${overlay.position.y}/100${shadowPart}${boxPart}${borderPart}:enable='between(t,${enableStart.toFixed(3)},${enableEnd.toFixed(3)})'`);
    }

    if (videoFilters.length > 0) args.push('-vf', videoFilters.join(','));

    // Audio mixing (single-clip)
    const audioCleanFilters: string[] = [];
    if (qs.audioDenoise) audioCleanFilters.push('afftdn=nf=-20');
    if (qs.audioNormalize) audioCleanFilters.push('dynaudnorm=f=150:g=15');
    const audioCleanStr = audioCleanFilters.join(',');
    const adjustedTotalAudio = (input.inputHasAudio ? 1 : 0) + input.voiceovers.length + input.audioClips.length;

    if (adjustedTotalAudio > 1) {
      const mixParts: string[] = [];
      const mixLabels: string[] = [];
      if (input.inputHasAudio) {
        if (speedAudioFilter) {
          mixParts.push(`[0:a]${speedAudioFilter}[a_sped];`);
          mixLabels.push('[a_sped]');
        } else {
          mixLabels.push('[0:a]');
        }
      }
      for (let i = 0; i < input.voiceovers.length; i++) {
        mixParts.push(`[${1 + i}:a]volume=${input.voiceovers[i].volume.toFixed(2)}[vo_${i}_adj];`);
        mixLabels.push(`[vo_${i}_adj]`);
      }
      for (let i = 0; i < input.audioClips.length; i++) {
        mixParts.push(`${audioClipInputLabels[i]}volume=${input.audioClips[i].volume.toFixed(2)}[clip_${i}_adj];`);
        mixLabels.push(`[clip_${i}_adj]`);
      }
      const mixInputStr = mixLabels.join('');
      if (audioCleanStr) {
        mixParts.push(`${mixInputStr}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=2[a_mixed];[a_mixed]${audioCleanStr}[aout]`);
      } else {
        mixParts.push(`${mixInputStr}amix=inputs=${mixLabels.length}:duration=first:dropout_transition=2[aout]`);
      }
      args.push('-filter_complex', mixParts.join(''));
      args.push('-map', '0:v:0');
      args.push('-map', '[aout]');
    } else if (adjustedTotalAudio === 1) {
      args.push('-map', '0:v:0');
      if (input.inputHasAudio && input.voiceovers.length === 0 && input.audioClips.length === 0) {
        const singleAudioFilters: string[] = [];
        if (speedAudioFilter) singleAudioFilters.push(speedAudioFilter);
        if (audioCleanStr) singleAudioFilters.push(audioCleanStr);
        if (singleAudioFilters.length > 0) args.push('-af', singleAudioFilters.join(','));
        args.push('-map', '0:a:0');
      } else if (input.voiceovers.length > 0) {
        const singleAudioFilters: string[] = [`volume=${input.voiceovers[0].volume.toFixed(2)}`];
        if (audioCleanStr) singleAudioFilters.push(audioCleanStr);
        args.push('-af', singleAudioFilters.join(','));
        args.push('-map', '[1:a]');
      } else {
        const singleAudioFilters: string[] = [`volume=${input.audioClips[0].volume.toFixed(2)}`];
        if (audioCleanStr) singleAudioFilters.push(audioCleanStr);
        args.push('-af', singleAudioFilters.join(','));
        args.push('-map', audioClipInputLabels[0]);
      }
    } else {
      args.push('-map', '0:v:0');
    }

    if (input.trimRange) {
      args.push('-ss', formatTrimTime(input.trimRange.start));
      args.push('-t', formatTrimTime(input.trimRange.end - input.trimRange.start));
    }
  }

  // Common codec settings
  if (qs.format === 'webm') {
    args.push('-c:v', 'libvpx-vp9');
    if (qs.bitrate === 'high') { args.push('-b:v', '4M'); args.push('-crf', '18'); }
    else if (qs.bitrate === 'low') { args.push('-b:v', '500k'); args.push('-crf', '35'); }
    else { args.push('-b:v', '2M'); args.push('-crf', '23'); }
  } else {
    args.push('-c:v', 'libx264');
    args.push('-pix_fmt', 'yuv420p');
    if (qs.bitrate === 'high') { args.push('-preset', 'slow'); args.push('-crf', '18'); }
    else if (qs.bitrate === 'low') { args.push('-preset', 'ultrafast'); args.push('-crf', '35'); }
    else { args.push('-preset', 'medium'); args.push('-crf', '23'); }
  }

  if (qs.format === 'webm') {
    args.push('-c:a', 'libvorbis');
  } else {
    args.push('-c:a', 'aac');
    args.push('-b:a', '192k');
  }

  if (qs.framerate !== 'original') args.push('-r', qs.framerate);
  args.push('-y', input.outputFilename);

  return args;
}

function formatTrimTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toFixed(3).padStart(6, '0')}`;
}
