import { useState } from 'react';
import type { TimelineTrack } from '../types';
import { GripVertical, Volume2, VolumeX, X } from './Icons';

interface TracksPanelProps {
  tracks: TimelineTrack[];
  onRenameTrack: (trackId: string, name: string) => void;
  onToggleMute: (trackId: string) => void;
  onSetVolume: (trackId: string, volume: number) => void;
  onAddTrack: (type: 'video' | 'audio') => void;
  onRemoveTrack: (trackId: string) => void;
  onReorderTracks: (fromIndex: number, toIndex: number) => void;
  onSetClipSpeed?: (trackId: string, clipId: string, speed: number) => void;
}

export function TracksPanel({
  tracks,
  onRenameTrack,
  onToggleMute,
  onSetVolume,
  onAddTrack,
  onRemoveTrack,
  onReorderTracks,
  onSetClipSpeed,
}: TracksPanelProps) {
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const trackTypeIcon = (type: string) => {
    switch (type) {
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'voiceover': return '🎙️';
      default: return '📁';
    }
  };

  const trackTypeColor = (type: string) => {
    switch (type) {
      case 'video': return 'border-l-primary-500';
      case 'audio': return 'border-l-emerald-500';
      case 'voiceover': return 'border-l-sky-500';
      default: return 'border-l-surface-500';
    }
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    onReorderTracks(dragIndex, index);
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
          Tracks ({tracks.length})
        </span>
        <div className="flex gap-1">
          <button
            onClick={() => onAddTrack('video')}
            className="p-1 rounded text-surface-500 hover:text-white hover:bg-surface-800 transition-all text-xs"
            title="Add video track"
          >
            +🎬
          </button>
          <button
            onClick={() => onAddTrack('audio')}
            className="p-1 rounded text-surface-500 hover:text-white hover:bg-surface-800 transition-all text-xs"
            title="Add audio track"
          >
            +🎵
          </button>
        </div>
      </div>

      {tracks.map((track, index) => (
        <div
          key={track.id}
          draggable
          onDragStart={() => handleDragStart(index)}
          onDragOver={(e) => handleDragOver(e, index)}
          onDragEnd={handleDragEnd}
          className={`group flex items-center gap-2 p-2 rounded-lg bg-surface-900/50 border border-surface-800/30 border-l-2 ${trackTypeColor(track.type)} hover:bg-surface-800/50 transition-all cursor-grab active:cursor-grabbing ${
            dragIndex === index ? 'opacity-50 scale-[0.98]' : ''
          }`}
        >
          {/* Drag handle */}
          <div className="text-surface-600 cursor-grab active:cursor-grabbing flex-shrink-0">
            <GripVertical className="w-3.5 h-3.5" />
          </div>

          {/* Type icon */}
          <span className="text-sm flex-shrink-0">{trackTypeIcon(track.type)}</span>

          {/* Name */}
          <input
            value={track.name}
            onChange={(e) => onRenameTrack(track.id, e.target.value)}
            className="flex-1 min-w-0 bg-transparent text-xs text-white font-medium outline-none border-b border-transparent focus:border-surface-600 truncate"
            onClick={(e) => e.stopPropagation()}
          />

          {/* Volume */}
          <input
            type="range"
            min="0"
            max="2"
            step="0.1"
            value={track.volume}
            onChange={(e) => onSetVolume(track.id, parseFloat(e.target.value))}
            onClick={(e) => e.stopPropagation()}
            className="w-12 slider h-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
            title={`Volume: ${Math.round(track.volume * 100)}%`}
          />
          <span className="text-[10px] text-surface-500 w-7 text-right flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {Math.round(track.volume * 100)}%
          </span>

          {/* Mute button */}
          <button
            onClick={() => onToggleMute(track.id)}
            className={`p-1 rounded transition-all flex-shrink-0 ${
              track.muted
                ? 'text-red-400 bg-red-500/10'
                : 'text-surface-500 hover:text-white hover:bg-surface-800'
            }`}
            title={track.muted ? 'Unmute' : 'Mute'}
          >
            {track.muted ? (
              <VolumeX className="w-3.5 h-3.5" />
            ) : (
              <Volume2 className="w-3.5 h-3.5" />
            )}
          </button>

          {/* Speed control for video clips */}
          {track.clips.length > 0 && (track.type === 'video' || track.type === 'audio') && onSetClipSpeed && (
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <select
                value={track.clips[0].speed}
                onChange={(e) => onSetClipSpeed(track.id, track.clips[0].id, parseFloat(e.target.value))}
                onClick={(e) => e.stopPropagation()}
                className="bg-transparent text-[10px] text-surface-400 border border-surface-700/50 rounded px-1 py-0.5 outline-none cursor-pointer hover:text-white appearance-none"
                title="Clip speed"
              >
                <option value={0.25}>0.25×</option>
                <option value={0.5}>0.5×</option>
                <option value={1}>1×</option>
                <option value={1.5}>1.5×</option>
                <option value={2}>2×</option>
                <option value={3}>3×</option>
                <option value={4}>4×</option>
              </select>
              <span className="text-[10px] text-surface-600">⏱</span>
            </div>
          )}

          {/* Delete track */}
          {tracks.length > 1 && (
            <button
              onClick={() => onRemoveTrack(track.id)}
              className="p-1 rounded text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-all flex-shrink-0 opacity-0 group-hover:opacity-100"
              title="Remove track"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
