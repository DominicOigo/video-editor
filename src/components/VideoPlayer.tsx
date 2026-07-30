import { useEffect, useRef, useCallback, useState, useMemo } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import { Play, Pause, Volume2, VolumeX, Maximize2 } from './Icons';
import { computeKeyframeState } from '../utils/keyframeFilters';
import type { TextOverlay, CropRegion, Keyframe, VoiceoverTrack, TrimRange, PreviewClip, ColorAdjustments } from '../types';

interface VideoPlayerProps {
  src: string;
  onTimeUpdate?: (time: number) => void;
  onDuration?: (duration: number) => void;
  onPlayStateChange?: (playing: boolean) => void;
  isPlaying: boolean;
  currentTime: number;
  seekTo?: number | null;
  onSeekDone?: () => void;
  textOverlays?: TextOverlay[];
  videoWidth?: number;
  videoHeight?: number;
  cropRegion?: CropRegion | null;
  trimRange?: TrimRange;
  playbackSpeed?: number;
  keyframes?: Keyframe[];
  clipOffset?: number;
  voiceoverTracks?: VoiceoverTrack[];
  audioTrackClips?: { blobUrl: string; offset: number; volume: number; duration: number }[];
  videoClips?: PreviewClip[];
  colorAdjustments?: ColorAdjustments;
}

function timeToSource(clips: PreviewClip[], timelineTime: number): { sourceTime: number; speed: number } {
  for (const clip of clips) {
    if (timelineTime >= clip.offset && timelineTime < clip.offset + clip.duration) {
      const elapsed = (timelineTime - clip.offset) * clip.speed;
      return { sourceTime: clip.sourceStart + elapsed, speed: clip.speed };
    }
  }
  return { sourceTime: timelineTime, speed: 1 };
}

function sourceToTimeline(clips: PreviewClip[], sourceTime: number): number {
  for (const clip of clips) {
    if (sourceTime >= clip.sourceStart && sourceTime < clip.sourceEnd) {
      return clip.offset + (sourceTime - clip.sourceStart) / clip.speed;
    }
  }
  return sourceTime;
}

function getClipAtTime(clips: PreviewClip[], timelineTime: number): PreviewClip | null {
  for (const clip of clips) {
    if (timelineTime >= clip.offset && timelineTime < clip.offset + clip.duration) return clip;
  }
  return null;
}

export function VideoPlayer({
  src,
  onTimeUpdate,
  onDuration,
  onPlayStateChange,
  isPlaying,
  currentTime,
  seekTo,
  onSeekDone,
  textOverlays = [],
  videoWidth,
  videoHeight,
  cropRegion,
  trimRange,
  playbackSpeed = 1,
  keyframes,
  clipOffset = 0,
  voiceoverTracks = [],
  audioTrackClips = [],
  videoClips,
  colorAdjustments,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const isMobile = useIsMobile();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>();
  const voiceoverCtxRef = useRef<AudioContext | null>(null);
  const voiceoverGainRef = useRef<GainNode | null>(null);
  const voiceoverSourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const voiceoverSourceGainRef = useRef<GainNode | null>(null);
  const voiceoverSetupDoneRef = useRef(false);
  const activeSourcesRef = useRef<AudioBufferSourceNode[]>([]);
  const decodedBuffersRef = useRef<Map<string, AudioBuffer>>(new Map());
  const lastSeekTimeRef = useRef<number>(0);
  const isMultiClip = !!(videoClips && videoClips.length > 1);

  const colorFilter = useMemo(() => {
    if (!colorAdjustments) return '';
    const parts: string[] = [];
    const { brightness = 0, contrast = 0, saturation = 0, hue = 0 } = colorAdjustments;
    if (brightness !== 0) parts.push(`brightness(${1 + brightness})`);
    if (contrast !== 0) parts.push(`contrast(${1 + contrast})`);
    if (saturation !== 0) parts.push(`saturate(${1 + saturation})`);
    if (hue !== 0) parts.push(`hue-rotate(${hue}deg)`);
    return parts.join(' ');
  }, [colorAdjustments]);

  const seekBarRef = useRef<HTMLInputElement>(null);
  const [seekHoverTime, setSeekHoverTime] = useState<number | null>(null);
  const [seekHoverX, setSeekHoverX] = useState(0);

  const reportTimelineTime = useCallback((sourceTime: number) => {
    if (isMultiClip && videoClips) {
      onTimeUpdate?.(sourceToTimeline(videoClips, sourceTime));
    } else {
      onTimeUpdate?.(sourceTime);
    }
  }, [isMultiClip, videoClips, onTimeUpdate]);

  const applySeek = useCallback((timelineTime: number) => {
    const video = videoRef.current;
    if (!video) return;
    const srcTime = isMultiClip && videoClips ? timeToSource(videoClips, timelineTime).sourceTime : timelineTime;
    video.currentTime = srcTime;
    if (isMultiClip && videoClips) {
      const active = getClipAtTime(videoClips, timelineTime);
      video.playbackRate = active?.speed ?? 1;
    }
    lastSeekTimeRef.current = Date.now();
  }, [isMultiClip, videoClips]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (isPlaying && video.paused) {
      video.play().catch(() => {});
    } else if (!isPlaying && !video.paused) {
      video.pause();
    }
  }, [isPlaying]);

  useEffect(() => {
    if (seekTo !== null && seekTo !== undefined && videoRef.current) {
      applySeek(seekTo);
      onSeekDone?.();
      syncVoiceoverAudio();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seekTo]);

  const activeClipSpeed = useCallback(() => {
    if (isMultiClip && videoClips) {
      const active = getClipAtTime(videoClips, currentTime);
      return active?.speed ?? 1;
    }
    return playbackSpeed;
  }, [isMultiClip, videoClips, currentTime, playbackSpeed]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.playbackRate = activeClipSpeed();
    }
  }, [activeClipSpeed]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => reportTimelineTime(video.currentTime);
    const handleDuration = () => onDuration?.(video.duration);
    const handlePlay = () => onPlayStateChange?.(true);
    const handlePause = () => onPlayStateChange?.(false);
    const handleEnded = () => onPlayStateChange?.(false);

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, [reportTimelineTime, onDuration, onPlayStateChange]);

  const showControlsTemporarily = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (isPlaying) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, [isPlaying]);

  const toggleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      await containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handleFSChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handleFSChange);
    return () => document.removeEventListener('fullscreenchange', handleFSChange);
  }, []);

  const toggleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !videoRef.current.muted;
      setIsMuted(videoRef.current.muted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = parseFloat(e.target.value);
    setVolume(v);
    if (videoRef.current) {
      videoRef.current.volume = v;
      videoRef.current.muted = v === 0;
      setIsMuted(v === 0);
    }
  };

  const handlePlayPause = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) video.play();
    else video.pause();
  }, []);

  const syncVoiceoverAudio = useCallback(() => {
    const ctx = voiceoverCtxRef.current;
    const mixGain = voiceoverGainRef.current;
    const video = videoRef.current;
    if (!ctx || !mixGain || !video) return;

    for (const src of activeSourcesRef.current) {
      try { src.stop(); } catch {}
      try { src.disconnect(); } catch {}
    }
    activeSourcesRef.current = [];

    if (voiceoverTracks.length === 0 && audioTrackClips.length === 0) return;

    ctx.resume();
    const currentVideoTime = video.currentTime;

    const schedule = async () => {
      for (const track of voiceoverTracks) {
        try {
          let audioBuffer = decodedBuffersRef.current.get(track.url);
          if (!audioBuffer) {
            const response = await fetch(track.url);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            decodedBuffersRef.current.set(track.url, audioBuffer);
          }

          const bufferSource = ctx.createBufferSource();
          bufferSource.buffer = audioBuffer;

          const trackGain = ctx.createGain();
          trackGain.gain.value = track.volume;

          bufferSource.connect(trackGain);
          trackGain.connect(mixGain);

          const startTime = ctx.currentTime + Math.max(0, track.offset - currentVideoTime);
          bufferSource.start(startTime);
          activeSourcesRef.current.push(bufferSource);
        } catch (err) {
          console.warn('Failed to schedule voiceover:', track.name, err);
        }
      }

      for (const clip of audioTrackClips) {
        try {
          let audioBuffer = decodedBuffersRef.current.get(clip.blobUrl);
          if (!audioBuffer) {
            const response = await fetch(clip.blobUrl);
            const blob = await response.blob();
            const arrayBuffer = await blob.arrayBuffer();
            audioBuffer = await ctx.decodeAudioData(arrayBuffer);
            decodedBuffersRef.current.set(clip.blobUrl, audioBuffer);
          }

          const bufferSource = ctx.createBufferSource();
          bufferSource.buffer = audioBuffer;

          const trackGain = ctx.createGain();
          trackGain.gain.value = clip.volume;

          bufferSource.connect(trackGain);
          trackGain.connect(mixGain);

          const startTime = ctx.currentTime + Math.max(0, clip.offset - currentVideoTime);
          bufferSource.start(startTime);
          activeSourcesRef.current.push(bufferSource);
        } catch (err) {
          console.warn('Failed to schedule audio clip:', err);
        }
      }
    };

    schedule();
  }, [voiceoverTracks, audioTrackClips]);

  // Monitor for clip boundary changes during playback
  useEffect(() => {
    if (!isPlaying || !isMultiClip || !videoClips) return;
    const video = videoRef.current;
    if (!video) return;

    let lastClipId = getClipAtTime(videoClips, currentTime)?.sourceStart ?? -1;

    const interval = setInterval(() => {
      if (video.paused) return;
      const timeline = sourceToTimeline(videoClips, video.currentTime);
      const active = getClipAtTime(videoClips, timeline);
      const clipId = active?.sourceStart ?? -1;
      if (clipId !== lastClipId) {
        lastClipId = clipId;
        if (active) {
          const clipElapsed = (timeline - active.offset) * active.speed;
          const expectedSource = active.sourceStart + clipElapsed;
          const drift = Math.abs(video.currentTime - expectedSource);
          if (drift > 0.05) {
            video.currentTime = expectedSource;
          }
          video.playbackRate = active.speed;
        }
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isPlaying, isMultiClip, videoClips, currentTime]);

  useEffect(() => {
    const video = videoRef.current;
    const ctx = voiceoverCtxRef.current;
    const mixGain = voiceoverGainRef.current;
    if (!video || !ctx || !mixGain) return;

    if (!isPlaying) {
      for (const src of activeSourcesRef.current) {
        try { src.stop(); } catch {}
        try { src.disconnect(); } catch {}
      }
      activeSourcesRef.current = [];
      return;
    }

    syncVoiceoverAudio();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // Set up AudioContext once (video element can only have ONE
  // createMediaElementSource call in its lifetime, so persist setup across mounts)
  useEffect(() => {
    if (voiceoverSetupDoneRef.current) return;
    const video = videoRef.current;
    if (!video) return;

    try {
      const ctx = new AudioContext();
      voiceoverCtxRef.current = ctx;

      const source = ctx.createMediaElementSource(video);
      voiceoverSourceRef.current = source;

      const mixGain = ctx.createGain();
      mixGain.gain.value = 1;
      voiceoverGainRef.current = mixGain;

      const srcGain = ctx.createGain();
      srcGain.gain.value = 1;
      voiceoverSourceGainRef.current = srcGain;

      source.connect(srcGain);
      srcGain.connect(mixGain);
      mixGain.connect(ctx.destination);

      voiceoverSetupDoneRef.current = true;
    } catch (err) {
      if (err instanceof DOMException && err.name === 'InvalidStateError') {
        voiceoverSetupDoneRef.current = true;
      } else {
        console.warn('Failed to setup voiceover audio context:', err);
      }
    }
    // No cleanup — AudioContext survives component unmount so
    // createMediaElementSource is never called twice on the same <video>
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasPreview = !!(cropRegion || (keyframes && keyframes.length >= 2));

  const fitToCanvas = useCallback((srcW: number, srcH: number, cw: number, ch: number) => {
    const srcRatio = srcW / srcH;
    const canRatio = cw / ch;
    let dw: number, dh: number, dx: number, dy: number;
    if (srcRatio > canRatio) {
      dw = cw;
      dh = cw / srcRatio;
      dx = 0;
      dy = (ch - dh) / 2;
    } else {
      dh = ch;
      dw = ch * srcRatio;
      dx = (cw - dw) / 2;
      dy = 0;
    }
    return { dx, dy, dw, dh };
  }, []);

  const drawPreview = useCallback(() => {
    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const hasCrop = !!cropRegion;
    const hasAnim = !!(keyframes && keyframes.length >= 2);
    if (!hasCrop && !hasAnim) return;

    const rect = canvas.getBoundingClientRect();
    const cw = Math.round(rect.width * (window.devicePixelRatio || 1));
    const ch = Math.round(rect.height * (window.devicePixelRatio || 1));

    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, cw, ch);

    if (hasCrop && hasAnim) {
      const { dx, dy, dw, dh } = fitToCanvas(cropRegion!.width, cropRegion!.height, cw, ch);
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cw;
      tempCanvas.height = ch;
      const offCtx = tempCanvas.getContext('2d')!;
      offCtx.drawImage(video, cropRegion!.x, cropRegion!.y, cropRegion!.width, cropRegion!.height, dx, dy, dw, dh);

      const clipTime = Math.max(0, currentTime - clipOffset);
      const state = computeKeyframeState(keyframes!, clipTime);
      if (state) {
        ctx.save();
        ctx.globalAlpha = state.opacity;
        ctx.translate(cw / 2 + (state.position.x / 100) * cw, ch / 2 + (state.position.y / 100) * ch);
        ctx.scale(state.scale, state.scale);
        ctx.rotate((state.rotation * Math.PI) / 180);
        ctx.drawImage(tempCanvas, -cw / 2, -ch / 2, cw, ch);
        ctx.restore();
      }
    } else if (hasCrop) {
      const { dx, dy, dw, dh } = fitToCanvas(cropRegion!.width, cropRegion!.height, cw, ch);
      ctx.drawImage(video, cropRegion!.x, cropRegion!.y, cropRegion!.width, cropRegion!.height, dx, dy, dw, dh);
    } else if (hasAnim) {
      const clipTime = Math.max(0, currentTime - clipOffset);
      const state = computeKeyframeState(keyframes!, clipTime);
      if (state) {
        ctx.save();
        ctx.globalAlpha = state.opacity;
        ctx.translate(cw / 2 + (state.position.x / 100) * cw, ch / 2 + (state.position.y / 100) * ch);
        ctx.scale(state.scale, state.scale);
        ctx.rotate((state.rotation * Math.PI) / 180);
        ctx.drawImage(video, -cw / 2, -ch / 2, cw, ch);
        ctx.restore();
      }
    }
  }, [cropRegion, keyframes, currentTime, clipOffset, fitToCanvas]);

  useEffect(() => {
    if (!hasPreview) return;

    const loop = () => {
      drawPreview();
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hasPreview, drawPreview]);

  const handleSeekHover = (e: React.MouseEvent<HTMLInputElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const max = videoRef.current?.duration || 100;
    setSeekHoverTime(x * max);
    setSeekHoverX(e.clientX - rect.left);
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawTime = parseFloat(e.target.value);
    applySeek(rawTime);
    syncVoiceoverAudio();
  };

  const currentDisplayTime = (() => {
    if (isMultiClip && videoClips) return currentTime;
    return currentTime;
  })();

  const maxDuration = videoRef.current?.duration || 100;
  const seekPercent = maxDuration > 0 ? (currentDisplayTime / maxDuration) * 100 : 0;
  const volumePercent = volume * 100;

  return (
    <div
      ref={containerRef}
      className={`relative bg-black rounded-xl overflow-hidden group ${
        isMobile ? '' : 'aspect-video'
      }`}
      style={isMobile ? { aspectRatio: '16/9' } : undefined}
      onMouseEnter={() => setShowControls(true)}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      onTouchStart={showControlsTemporarily}
    >
      <video
        ref={videoRef}
        src={src}
        className="w-full h-full object-contain"
        style={{ filter: colorFilter || undefined }}
        playsInline
        preload="auto"
      />

      {hasPreview && (
        <canvas
          ref={previewCanvasRef}
          className="absolute inset-0 w-full h-full z-[5]"
          style={{ filter: colorFilter || undefined }}
        />
      )}

      {trimRange && (
        <>
          {trimRange.start > 0 && (
            <div
              className="absolute top-0 bottom-0 left-0 bg-black/50 z-[4] pointer-events-none transition-all duration-150"
              style={{
                width: `${(trimRange.start / (videoRef.current?.duration || 1)) * 100}%`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white/30 text-[10px] font-medium uppercase tracking-wider rotate-90 origin-center">
                  Trimmed
                </span>
              </div>
            </div>
          )}
          {trimRange.end < (videoRef.current?.duration || 0) && (
            <div
              className="absolute top-0 bottom-0 right-0 bg-black/50 z-[4] pointer-events-none transition-all duration-150"
              style={{
                width: `${(( (videoRef.current?.duration || 1) - trimRange.end) / (videoRef.current?.duration || 1)) * 100}%`,
              }}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-white/30 text-[10px] font-medium uppercase tracking-wider -rotate-90 origin-center">
                  Trimmed
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {activeClipSpeed() !== 1 && (
        <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-md bg-black/60 backdrop-blur-sm border border-white/10">
          <span className="text-white/80 text-xs font-mono font-medium">
            {activeClipSpeed().toFixed(1)}×
          </span>
        </div>
      )}

      {cropRegion && (
        <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-md bg-primary-500/20 backdrop-blur-sm border border-primary-500/30">
          <span className="text-primary-300 text-xs font-medium">Crop</span>
        </div>
      )}

      {voiceoverTracks.length > 0 && (
        <div className="absolute top-3 right-3 z-10 px-2 py-1 rounded-md bg-sky-500/20 backdrop-blur-sm border border-sky-500/30"
          style={{ right: cropRegion ? '60px' : '12px' }}
        >
          <span className="text-sky-300 text-xs font-medium">
            VO {voiceoverTracks.length}
          </span>
        </div>
      )}

      {isMultiClip && videoClips && (
        <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded-md bg-amber-500/20 backdrop-blur-sm border border-amber-500/30"
          style={{ left: activeClipSpeed() !== 1 ? '60px' : '12px' }}
        >
          <span className="text-amber-300 text-xs font-medium">
            {videoClips.length} clips
          </span>
        </div>
      )}

      <div
        className="absolute inset-0 cursor-pointer z-[7]"
        onClick={handlePlayPause}
      />

      {textOverlays.length > 0 && (
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden">
          {textOverlays
            .filter((t) => currentDisplayTime >= t.startTime && currentDisplayTime <= t.endTime)
            .map((overlay) => (
              <div
                key={overlay.id}
                className="absolute px-4 py-2"
                style={{
                  left: `${overlay.position.x}%`,
                  top: `${overlay.position.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontFamily: overlay.fontFamily,
                  fontSize: `${Math.max(12, overlay.fontSize * (videoWidth ? videoWidth / 1920 : 1))}px`,
                  color: overlay.color,
                  textAlign: overlay.alignment,
                  opacity: overlay.opacity,
                  backgroundColor: overlay.background || 'transparent',
                  textShadow: overlay.strokeWidth > 0
                    ? `0 0 ${overlay.strokeWidth * 2}px ${overlay.strokeColor}`
                    : overlay.shadow
                      ? `${overlay.shadow.offsetX}px ${overlay.shadow.offsetY}px ${overlay.shadow.blur}px ${overlay.shadow.color}`
                      : 'none',
                  WebkitTextStroke: overlay.strokeWidth > 0
                    ? `${overlay.strokeWidth}px ${overlay.strokeColor}`
                    : 'none',
                  whiteSpace: 'pre-wrap',
                  maxWidth: '80%',
                  lineHeight: 1.3,
                }}
              >
                {overlay.text}
              </div>
            ))}
        </div>
      )}

      {!isPlaying && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-[8]">
          <div className={`rounded-full bg-black/60 backdrop-blur-sm flex items-center justify-center ${
            isMobile ? 'w-20 h-20' : 'w-16 h-16'
          }`}>
            <Play className={`text-white ${isMobile ? 'w-10 h-10' : 'w-8 h-8'}`} />
          </div>
        </div>
      )}

      <div
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent transition-opacity duration-300 z-10 ${
          showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
        } ${isMobile ? 'p-3 pt-12' : 'p-4 pt-12'}`}
      >
        <div className="mb-3 relative">
          <input
            ref={seekBarRef}
            type="range"
            min="0"
            max={maxDuration}
            step="0.033"
            value={currentDisplayTime}
            onChange={handleSeekChange}
            onMouseMove={handleSeekHover}
            onMouseLeave={() => setSeekHoverTime(null)}
            onClick={(e) => e.stopPropagation()}
            className={`w-full slider ${isMobile ? 'h-2' : ''}`}
            style={{ background: `linear-gradient(to right, #f97316 ${seekPercent}%, rgb(55 65 81 / 0.5) ${seekPercent}%)` }}
          />
          {seekHoverTime !== null && (
            <div
              className="absolute -top-7 px-2 py-0.5 rounded bg-black/80 text-white text-[10px] font-mono pointer-events-none whitespace-nowrap"
              style={{ left: `${seekHoverX}px`, transform: 'translateX(-50%)' }}
            >
              {formatTimeFull(seekHoverTime)}
            </div>
          )}
        </div>

        <div className={`flex items-center gap-3 ${isMobile ? 'gap-4' : ''}`}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handlePlayPause();
            }}
            className={`text-white hover:text-primary-400 transition-colors ${
              isMobile ? 'p-2' : 'p-1.5'
            }`}
          >
            {isPlaying ? (
              <Pause className={isMobile ? 'w-6 h-6' : 'w-5 h-5'} />
            ) : (
              <Play className={isMobile ? 'w-6 h-6' : 'w-5 h-5'} />
            )}
          </button>

          <div className={`flex items-center gap-1.5 ${isMobile ? '' : ''}`}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleMute();
              }}
              className="p-1.5 text-white hover:text-primary-400 transition-colors"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={volume}
              onChange={handleVolumeChange}
              onClick={(e) => e.stopPropagation()}
              className="w-20 sm:w-28 slider"
              style={{ background: `linear-gradient(to right, #f97316 ${volumePercent}%, rgb(55 65 81 / 0.5) ${volumePercent}%)` }}
              aria-label="Volume"
            />
            <span className="text-white/50 text-[10px] font-mono w-8 text-right hidden sm:block">
              {Math.round(volume * 100)}%
            </span>
          </div>

          <span className={`text-surface-300 font-mono ${
            isMobile ? 'text-sm' : 'text-xs'
          } ml-auto`}>
            {formatFull(currentDisplayTime, maxDuration)}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              toggleFullscreen();
            }}
            className={`text-white hover:text-primary-400 transition-colors ${
              isMobile ? 'p-2' : 'p-1.5'
            }`}
          >
            <Maximize2 className={isMobile ? 'w-5 h-5' : 'w-5 h-5'} />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function formatTimeFull(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toFixed(1).padStart(4, '0')}`;
}

function formatFull(current: number, total: number): string {
  return `${formatTime(current)} / ${formatTime(total)}`;
}
