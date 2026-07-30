import { useRef, useCallback, useState, useEffect } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import { getWaveformPeaks } from '../utils/waveform';
import { Volume2, VolumeX, ChevronLeft, ChevronRight, Plus } from './Icons';
import type { TimelineTrack as TimelineTrackType, TimelineClip } from '../types';

interface TimelineProps {
  duration: number;
  currentTime: number;
  tracks: TimelineTrackType[];
  trimStart: number;
  trimEnd: number;
  onTrimStartChange: (time: number) => void;
  onTrimEndChange: (time: number) => void;
  onSeek: (time: number) => void;
  onToggleMute: (trackId: string) => void;
  onReorderTracks: (fromIndex: number, toIndex: number) => void;
  onMoveClip: (trackId: string, clipId: string, newOffset: number) => void;
  onMoveClipToTrack?: (fromTrackId: string, toTrackId: string, clipId: string, newOffset: number) => void;
  onSplitClip?: (trackId: string, clipId: string, splitTime: number) => void;
  onDuplicateClip?: (trackId: string, clipId: string) => void;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}

const TRACK_HEIGHT = 36;
const TRACK_COLORS: Record<string, string> = {
  video: 'from-primary-500/20 to-primary-600/10 border-primary-500/30',
  audio: 'from-emerald-500/20 to-emerald-600/10 border-emerald-500/30',
  voiceover: 'from-sky-500/20 to-sky-600/10 border-sky-500/30',
};

const TRACK_LABEL_COLORS: Record<string, string> = {
  video: 'text-primary-400',
  audio: 'text-emerald-400',
  voiceover: 'text-sky-400',
};

export function Timeline({
  duration,
  currentTime,
  tracks,
  trimStart,
  trimEnd,
  onTrimStartChange,
  onTrimEndChange,
  onSeek,
  onToggleMute,
  onReorderTracks,
  onMoveClip,
  onMoveClipToTrack,
  onSplitClip,
  onDuplicateClip,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [dragging, setDragging] = useState<'start' | 'end' | 'playhead' | null>(null);
  const [dragClip, setDragClip] = useState<{ trackId: string; clipId: string } | null>(null);
  const [dragTrackFrom, setDragTrackFrom] = useState<number | null>(null);
  const [hoveredTrackId, setHoveredTrackId] = useState<string | null>(null);
  const dragTargetTrackRef = useRef<string | null>(null);
  const dragSourceTrackRef = useRef<string | null>(null);

  // ── Real waveform data ──
  const [clipWaveforms, setClipWaveforms] = useState<Record<string, Float32Array>>({});
  const [loadingWaveforms, setLoadingWaveforms] = useState<Set<string>>(new Set());

  const getTimeFromPosition = useCallback(
    (clientX: number) => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      return (x / rect.width) * duration;
    },
    [duration]
  );

  // Mouse events for trim handles and playhead
  useEffect(() => {
    if (!dragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const time = getTimeFromPosition(e.clientX);
      if (dragging === 'start') {
        onTrimStartChange(Math.max(0, Math.min(time, trimEnd - 0.1)));
      } else if (dragging === 'end') {
        onTrimEndChange(Math.min(duration, Math.max(time, trimStart + 0.1)));
      } else if (dragging === 'playhead') {
        onSeek(Math.max(0, Math.min(time, duration)));
      }
    };
    const handleMouseUp = () => setDragging(null);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragging, getTimeFromPosition, duration, trimStart, trimEnd, onTrimStartChange, onTrimEndChange, onSeek]);

  // Touch events
  useEffect(() => {
    if (!dragging) return;
    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const time = getTimeFromPosition(touch.clientX);
      if (dragging === 'start') {
        onTrimStartChange(Math.max(0, Math.min(time, trimEnd - 0.1)));
      } else if (dragging === 'end') {
        onTrimEndChange(Math.min(duration, Math.max(time, trimStart + 0.1)));
      } else if (dragging === 'playhead') {
        onSeek(Math.max(0, Math.min(time, duration)));
      }
    };
    const handleTouchEnd = () => setDragging(null);
    const handleTouchCancel = () => setDragging(null);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchCancel);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchCancel);
    };
  }, [dragging, getTimeFromPosition, duration, trimStart, trimEnd, onTrimStartChange, onTrimEndChange, onSeek]);

  const handleTrackClick = (e: React.MouseEvent | React.TouchEvent) => {
    if (dragging || dragClip) return;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    onSeek(getTimeFromPosition(clientX));
  };

  // Clip drag with cross-track support
  useEffect(() => {
    if (!dragClip) return;

    dragSourceTrackRef.current = dragClip.trackId;
    dragTargetTrackRef.current = null;

    const RULER_HEIGHT = 20; // h-5
    const TRACK_H = 36;

    const getTrackIndexFromY = (clientY: number): number => {
      const rect = timelineRef.current?.getBoundingClientRect();
      if (!rect) return -1;
      const relativeY = clientY - rect.top - RULER_HEIGHT;
      return Math.floor(relativeY / TRACK_H);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const time = getTimeFromPosition(e.clientX);

      // Detect which track is being hovered (vertical)
      const trackIndex = getTrackIndexFromY(e.clientY);
      const targetTrack = tracks[trackIndex];

      if (targetTrack && targetTrack.id !== dragClip.trackId) {
        setHoveredTrackId(targetTrack.id);
        dragTargetTrackRef.current = targetTrack.id;
      } else {
        setHoveredTrackId(null);
        dragTargetTrackRef.current = null;
      }

      onMoveClip(dragClip.trackId, dragClip.clipId, time);
    };

    const handleMouseUp = () => {
      const sourceId = dragSourceTrackRef.current;
      const targetId = dragTargetTrackRef.current;

      // If hovering a different track, move the clip across tracks
      if (sourceId && targetId && sourceId !== targetId && onMoveClipToTrack) {
        const sourceTrack = tracks.find((t) => t.id === sourceId);
        const movedClip = sourceTrack?.clips.find((c) => c.id === dragClip.clipId);
        if (movedClip) {
          onMoveClipToTrack(sourceId, targetId, dragClip.clipId, movedClip.offset);
        }
      }

      setHoveredTrackId(null);
      setDragClip(null);
      dragTargetTrackRef.current = null;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragClip, getTimeFromPosition, onMoveClip, tracks, onMoveClipToTrack]);

  // Track drag reorder
  useEffect(() => {
    if (dragTrackFrom === null) return;
    const handleMouseUp = () => setDragTrackFrom(null);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [dragTrackFrom]);

  // ── Load real waveforms for audio/voiceover clips ──
  useEffect(() => {
    const audioClips = tracks.flatMap((t) =>
      t.clips.filter(
        (c) =>
          (c.type === 'audio' || c.type === 'voiceover') &&
          (c.blobUrl || c.blob)
      )
    );

    if (audioClips.length === 0) return;

    const loading = new Set<string>(audioClips.map((c) => c.id));
    setLoadingWaveforms(loading);

    let cancelled = false;

    Promise.all(
      audioClips.map(async (clip) => {
        // Compute a sensible number of bars based on clip duration
        const numBars = Math.min(60, Math.max(10, Math.ceil(clip.duration * 3)));

        try {
          const source = clip.blob || clip.blobUrl;
          if (!source) return null;
          const peaks = await getWaveformPeaks(source, numBars);
          if (!cancelled) return { clipId: clip.id, peaks };
        } catch (err) {
          console.warn('Failed to load waveform for', clip.name, err);
        }
        return null;
      })
    ).then((results) => {
      if (cancelled) return;
      const newWaveforms: Record<string, Float32Array> = {};
      const stillLoading = new Set(loading);
      for (const r of results) {
        if (r) {
          newWaveforms[r.clipId] = r.peaks;
          stillLoading.delete(r.clipId);
        }
      }
      setClipWaveforms((prev) => ({ ...prev, ...newWaveforms }));
      setLoadingWaveforms(stillLoading);
    });

    return () => {
      cancelled = true;
    };
  }, [tracks]);

  const playheadPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const trimStartPercent = duration > 0 ? (trimStart / duration) * 100 : 0;
  const trimEndPercent = duration > 0 ? (trimEnd / duration) * 100 : 100;

  return (
    <div className={`${isMobile ? 'p-3' : 'p-4'} space-y-2 sm:space-y-3`}>
      {/* Time Labels */}
      <div className="flex items-center justify-between text-[11px] sm:text-xs text-surface-500 font-mono">
        <span>{formatTime(trimStart)}</span>
        <span className="text-surface-400">
          -{formatTime(trimEnd - trimStart)} selected
        </span>
        <span>{formatTime(trimEnd)}</span>
      </div>

      {/* Multi-track Timeline area */}
      <div
        ref={timelineRef}
        className="relative bg-surface-900/80 rounded-xl overflow-hidden border border-surface-800/50 cursor-pointer"
        onClick={(e) => {
          if (dragging || dragClip) return;
          handleTrackClick(e);
        }}
      >
        {/* Ruler ticks */}
        <div className="h-5 bg-surface-950/50 border-b border-surface-800/30 flex items-end px-1">
          {Array.from({ length: Math.max(10, Math.ceil(duration / 5)) }).map((_, i) => {
            const sec = i * 5;
            const left = (sec / duration) * 100;
            if (left > 100) return null;
            return (
              <div
                key={i}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: `${left}%`, transform: 'translateX(-50%)' }}
              >
                <div className="w-px h-2 bg-surface-700/50" />
                <span className="text-[9px] text-surface-600 mt-0.5 font-mono">{sec}</span>
              </div>
            );
          })}
        </div>

        {/* Tracks */}
        <div className="relative">
          {tracks.map((track, trackIndex) => {
            const isLast = trackIndex === tracks.length - 1;
            return (
              <div
                key={track.id}
                className={`relative h-[${TRACK_HEIGHT}px] flex items-center ${
                  !isLast ? 'border-b border-surface-800/20' : ''
                } ${track.muted ? 'opacity-40' : ''} ${
                  hoveredTrackId === track.id
                    ? 'bg-primary-500/10 ring-2 ring-primary-500/40 ring-inset'
                    : ''
                } transition-all duration-150`}
              >
                {/* Track label (floating left style) */}
                <div className="absolute left-0 top-0 bottom-0 w-16 flex items-center gap-1 px-1.5 z-10 bg-surface-950/60 backdrop-blur-sm border-r border-surface-800/30">
                  <span className={`text-[10px] font-medium ${TRACK_LABEL_COLORS[track.type] || 'text-surface-400'} truncate`}>
                    {track.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); onToggleMute(track.id); }}
                    className={`p-0.5 rounded flex-shrink-0 ${
                      track.muted ? 'text-red-400' : 'text-surface-600 hover:text-surface-300'
                    }`}
                  >
                    {track.muted ? (
                      <VolumeX className="w-3 h-3" />
                    ) : (
                      <Volume2 className="w-3 h-3" />
                    )}
                  </button>
                </div>

                {/* Clip rendering area */}
                <div className="absolute left-16 right-0 top-0 bottom-0">
                  {track.clips.map((clip) => {
                    const leftPct = (clip.offset / duration) * 100;
                    const widthPct = (clip.duration / duration) * 100;
                    return (
                      <div
                        key={clip.id}
                        className={`absolute top-1 bottom-1 rounded-md bg-gradient-to-r ${TRACK_COLORS[track.type] || 'from-surface-700/30 to-surface-800/30'} border cursor-grab active:cursor-grabbing hover:brightness-110 transition-all overflow-hidden`}
                        style={{
                          left: `${Math.max(0, leftPct)}%`,
                          width: `${Math.min(widthPct, 100 - Math.max(0, leftPct))}%`,
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          setDragClip({ trackId: track.id, clipId: clip.id });
                        }}
                        title={`${clip.name} — ${formatTime(clip.duration)}`}
                      >
                        {/* Clip content indicator */}
                        <div className="absolute inset-0 flex items-center px-2">
                          <span className="text-[10px] text-white/70 truncate">
                            {clip.name}
                          </span>
                        </div>
                        {/* Real audio waveform for audio clips */}
                        {(clip.type === 'audio' || clip.type === 'voiceover') && (
                          <WaveformBars
                                peaks={clipWaveforms[clip.id]}
                                loading={loadingWaveforms.has(clip.id)}
                                trackType={track.type}
                              />
                        )}
                        {/* Speed badge */}
                        {clip.speed && clip.speed !== 1 && (
                          <div className="absolute top-0.5 right-0.5 z-10 px-1 py-0.5 rounded bg-black/60 text-[9px] font-mono text-white/90 leading-none pointer-events-none">
                            {parseFloat(clip.speed.toFixed(1))}×
                          </div>
                        )}

                        {/* Keyframe diamond markers */}
                        {clip.keyframes && clip.keyframes.length > 0 && (
                          <div className="absolute inset-0 pointer-events-none">
                            {clip.keyframes.map((kf) => {
                              const kfPct = clip.duration > 0 ? (kf.time / clip.duration) * 100 : 0;
                              return (
                                <div
                                  key={kf.id}
                                  className="absolute top-0.5 w-2 h-2 rotate-45 rounded-sm bg-white/80 shadow-sm"
                                  style={{ left: `${kfPct}%`, transform: 'translateX(-50%) rotate(45deg)' }}
                                  title={`Kf ${kf.time.toFixed(1)}s`}
                                />
                              );
                            })}
                          </div>
                        )}

                        {/* Transition indicators */}
                        {clip.transitionIn.type !== 'none' && clip.transitionIn.duration > 0 && (
                          <div
                            className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-primary-500/40 to-transparent rounded-l-md"
                            style={{ width: `${(clip.transitionIn.duration / clip.duration) * 100}%` }}
                          />
                        )}
                        {clip.transitionOut.type !== 'none' && clip.transitionOut.duration > 0 && (
                          <div
                            className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-primary-500/40 to-transparent rounded-r-md"
                            style={{ width: `${(clip.transitionOut.duration / clip.duration) * 100}%` }}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Trim region highlight */}
        <div
          className="absolute top-5 bottom-0 bg-primary-500/10 border-x border-primary-500/30 pointer-events-none"
          style={{
            left: `${trimStartPercent}%`,
            width: `${trimEndPercent - trimStartPercent}%`,
          }}
        />

        {/* Trim Start Handle */}
        <div
          className={`absolute top-5 bottom-0 z-20 touch-none ${
            isMobile ? 'w-7' : 'w-4 cursor-col-resize group'
          }`}
          onMouseDown={() => setDragging('start')}
          onTouchStart={(e) => { e.preventDefault(); setDragging('start'); }}
          style={{ left: `${trimStartPercent}%` }}
        >
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-primary-400 group-hover:bg-primary-300 transition-colors" />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-primary-500 shadow-lg shadow-primary-500/30 ${
            isMobile ? 'w-7 h-10' : 'w-5 h-8 group-hover:scale-110'
          } transition-transform flex items-center justify-center`}>
            <ChevronLeft className={isMobile ? 'w-4 h-4' : 'w-3 h-3'} />
          </div>
        </div>

        {/* Playhead */}
        <div
          className={`absolute top-5 bottom-0 w-0.5 z-30 pointer-events-none`}
          style={{ left: `${playheadPercent}%` }}
        >
          <div className="absolute inset-0 bg-white shadow-lg shadow-white/30" />
          <div className={`absolute -top-1 left-1/2 -translate-x-1/2 rounded-full bg-white shadow-lg shadow-white/50 ${
            isMobile ? 'w-4 h-4' : 'w-3 h-3'
          }`} />
        </div>

        {/* Trim End Handle */}
        <div
          className={`absolute top-5 bottom-0 z-20 touch-none ${
            isMobile ? 'w-7' : 'w-4 cursor-col-resize group'
          }`}
          onMouseDown={() => setDragging('end')}
          onTouchStart={(e) => { e.preventDefault(); setDragging('end'); }}
          style={{ left: `${trimEndPercent}%` }}
        >
          <div className="absolute inset-y-0 left-1/2 w-0.5 bg-primary-400 group-hover:bg-primary-300 transition-colors" />
          <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-primary-500 shadow-lg shadow-primary-500/30 ${
            isMobile ? 'w-7 h-10' : 'w-5 h-8 group-hover:scale-110'
          } transition-transform flex items-center justify-center`}>
            <ChevronRight className={isMobile ? 'w-4 h-4' : 'w-3 h-3'} />
          </div>
        </div>
      </div>        {/* Split/Duplicate toolbar */}
        {tracks.flatMap(t => t.clips).length > 0 && (() => {
          const hasClipAtPlayhead = tracks.some(t => t.clips.some(c => currentTime >= c.offset && currentTime <= c.offset + c.duration));
          return (
            <div className="flex items-center gap-1.5 px-3 py-1.5 border-t border-surface-800/30 bg-surface-950/30">
              <span className="text-[10px] text-surface-600 mr-1">Clip:</span>
              <button
                onClick={() => {
                  for (const track of tracks) {
                    for (const clip of track.clips) {
                      if (currentTime >= clip.offset && currentTime <= clip.offset + clip.duration) {
                        onSplitClip?.(track.id, clip.id, currentTime);
                        return;
                      }
                    }
                  }
                }}
                disabled={!hasClipAtPlayhead}
                className={`px-2 py-1 rounded-lg border transition-all text-[10px] font-medium ${
                  hasClipAtPlayhead
                    ? 'bg-surface-800/80 border-surface-700/50 hover:bg-surface-700/80 hover:border-surface-600/50 text-surface-300'
                    : 'bg-surface-900/50 border-surface-800/30 text-surface-600 cursor-not-allowed'
                }`}
                title="Split clip at playhead (S)"
              >
                ✂ Split
              </button>
              <button
                onClick={() => {
                  for (const track of tracks) {
                    for (const clip of track.clips) {
                      if (currentTime >= clip.offset && currentTime <= clip.offset + clip.duration) {
                        onDuplicateClip?.(track.id, clip.id);
                        return;
                      }
                    }
                  }
                }}
                disabled={!hasClipAtPlayhead}
                className={`px-2 py-1 rounded-lg border transition-all text-[10px] font-medium ${
                  hasClipAtPlayhead
                    ? 'bg-surface-800/80 border-surface-700/50 hover:bg-surface-700/80 hover:border-surface-600/50 text-surface-300'
                    : 'bg-surface-900/50 border-surface-800/30 text-surface-600 cursor-not-allowed'
                }`}
                title="Duplicate clip (D)"
              >
                📋 Duplicate
              </button>
            </div>
          );
        })()}

        {/* Info chips */}
      <div className={`flex items-center gap-2 text-[11px] sm:text-xs text-surface-500 ${
        isMobile ? 'overflow-x-auto pb-1 scrollbar-hide' : ''
      }`}>          <span className="chip whitespace-nowrap">
          <Plus className="w-3 h-3" />
          {formatTime(trimEnd - trimStart)}
        </span>
        <span className="chip whitespace-nowrap">
          🎬 {tracks.length} tracks
        </span>
        <span className="chip whitespace-nowrap">
          {duration.toFixed(1)}s total
        </span>
      </div>
    </div>
  );
}

/**
 * Renders waveform bars for an audio clip.
 * Shows a shimmer skeleton while loading, then real peak bars once loaded.
 */
function WaveformBars({
  peaks,
  loading,
  trackType,
}: {
  peaks: Float32Array | undefined;
  loading: boolean;
  trackType: string;
}) {
  // While loading, show a set of flat bars as a skeleton
  if (loading || !peaks) {
    return (
      <div className="absolute inset-0 flex items-end px-1 pb-1 gap-[1.5px] opacity-30 overflow-hidden">
        {Array.from({ length: 24 }).map((_, i) => (
          <div
            key={i}
            className="flex-1 bg-white/30 rounded-t-sm animate-pulse"
            style={{ height: `${30 + ((i * 17) % 40)}%` }}
          />
        ))}
      </div>
    );
  }

  // Color the bars based on track type
  const barColor =
    trackType === 'voiceover'
      ? 'bg-sky-400/50'
      : trackType === 'audio'
        ? 'bg-emerald-400/50'
        : 'bg-white/40';

  return (
    <div className="absolute inset-0 flex items-end px-1 pb-1 gap-[1.5px] overflow-hidden">
      {Array.from(peaks).map((peak, i) => (
        <div
          key={i}
          className={`flex-1 ${barColor} rounded-t-sm`}
          style={{
            height: `${Math.max(4, peak * 100)}%`,
          }}
        />
      ))}
    </div>
  );
}
