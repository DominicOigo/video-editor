import { useState } from 'react';
import type { TransitionConfig, TransitionType, TimelineTrack } from '../types';

interface TransitionPanelProps {
  tracks: TimelineTrack[];
  onSetClipTransitionIn: (trackId: string, clipId: string, config: TransitionConfig) => void;
  onSetClipTransitionOut: (trackId: string, clipId: string, config: TransitionConfig) => void;
}

const TRANSITION_TYPES: { value: TransitionType; label: string; icon: string }[] = [
  { value: 'none', label: 'None', icon: '✕' },
  { value: 'fade', label: 'Fade', icon: '🌅' },
  { value: 'crossfade', label: 'Crossfade', icon: '🔄' },
  { value: 'slide', label: 'Slide', icon: '➡️' },
  { value: 'wipe', label: 'Wipe', icon: '🏁' },
  { value: 'zoom', label: 'Zoom', icon: '🔍' },
];

export function TransitionPanel({
  tracks,
  onSetClipTransitionIn,
  onSetClipTransitionOut,
}: TransitionPanelProps) {
  const [selectedTrackId, setSelectedTrackId] = useState<string>(
    tracks.find((t) => t.type === 'video')?.id || ''
  );
  const [selectedClipId, setSelectedClipId] = useState<string>('');
  const [activeSide, setActiveSide] = useState<'in' | 'out'>('in');

  const allClips = tracks.flatMap((t) =>
    t.clips.map((c) => ({ ...c, trackId: t.id }))
  );

  const selectedClip = allClips.find((c) => c.id === selectedClipId);
  const selectedTrack = tracks.find((t) => t.id === selectedTrackId);

  const handleTypeChange = (type: TransitionType) => {
    if (!selectedClip) return;
    const config: TransitionConfig = {
      type,
      duration: selectedClip[
        activeSide === 'in' ? 'transitionIn' : 'transitionOut'
      ].duration || 0.5,
    };
    if (activeSide === 'in') {
      onSetClipTransitionIn(selectedClip.trackId, selectedClip.id, config);
    } else {
      onSetClipTransitionOut(selectedClip.trackId, selectedClip.id, config);
    }
  };

  const handleDurationChange = (duration: number) => {
    if (!selectedClip) return;
    const current = selectedClip[
      activeSide === 'in' ? 'transitionIn' : 'transitionOut'
    ];
    const config: TransitionConfig = { ...current, duration: Math.max(0.1, Math.min(5, duration)) };
    if (activeSide === 'in') {
      onSetClipTransitionIn(selectedClip.trackId, selectedClip.id, config);
    } else {
      onSetClipTransitionOut(selectedClip.trackId, selectedClip.id, config);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">Transitions</h3>

      {/* Track selector */}
      <div className="space-y-1.5">
        <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Track</label>
        <div className="flex flex-wrap gap-1.5">
          {tracks.map((track) => (
            <button
              key={track.id}
              onClick={() => {
                setSelectedTrackId(track.id);
                setSelectedClipId(track.clips[0]?.id || '');
              }}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                selectedTrackId === track.id
                  ? 'bg-primary-500 text-white'
                  : 'bg-surface-800/80 text-surface-400 border border-surface-700/50 hover:text-surface-200'
              }`}
            >
              {track.name} ({track.clips.length})
            </button>
          ))}
        </div>
      </div>

      {/* Clip selector */}
      {selectedTrack && selectedTrack.clips.length > 0 && (
        <div className="space-y-1.5">
          <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Clip</label>
          <select
            value={selectedClipId}
            onChange={(e) => setSelectedClipId(e.target.value)}
            className="w-full px-3 py-2 bg-surface-800/80 border border-surface-700/50 rounded-xl text-xs text-white outline-none focus:border-primary-500/50 transition-all"
          >
            {selectedTrack.clips.map((clip) => (
              <option key={clip.id} value={clip.id}>
                {clip.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* No clips state */}
      {(!selectedTrack || selectedTrack.clips.length === 0) && (
        <div className="p-4 rounded-xl bg-surface-900/50 border border-surface-800/50 text-center">
          <p className="text-surface-500 text-xs">Add media to a track to configure transitions</p>
        </div>
      )}

      {/* Transition settings */}
      {selectedClip && (
        <>
          {/* In/Out toggle */}
          <div className="flex rounded-xl bg-surface-800/80 border border-surface-700/50 p-1">
            <button
              onClick={() => setActiveSide('in')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSide === 'in'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              Start
            </button>
            <button
              onClick={() => setActiveSide('out')}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSide === 'out'
                  ? 'bg-primary-500 text-white shadow-sm'
                  : 'text-surface-400 hover:text-surface-200'
              }`}
            >
              End
            </button>
          </div>

          {/* Current config info */}
          <div className="p-3 rounded-xl bg-surface-900/50 border border-surface-800/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-surface-400">
                {activeSide === 'in' ? 'Start' : 'End'} transition
              </span>
              <span className="text-xs text-primary-300 font-medium">
                {selectedClip[
                  activeSide === 'in' ? 'transitionIn' : 'transitionOut'
                ].type === 'none'
                  ? 'No transition'
                  : `${selectedClip[activeSide === 'in' ? 'transitionIn' : 'transitionOut'].type} — ${selectedClip[activeSide === 'in' ? 'transitionIn' : 'transitionOut'].duration}s`}
              </span>
            </div>
          </div>

          {/* Transition type picker */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Type</label>
            <div className="grid grid-cols-3 gap-1.5">
              {TRANSITION_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => handleTypeChange(t.value)}
                  className={`p-2.5 rounded-xl text-center transition-all ${
                    selectedClip[activeSide === 'in' ? 'transitionIn' : 'transitionOut'].type === t.value
                      ? 'bg-primary-500/10 border-2 border-primary-500/40'
                      : 'bg-surface-900/50 border-2 border-surface-800/50 hover:border-surface-700/50'
                  }`}
                >
                  <div className="text-lg mb-0.5">{t.icon}</div>
                  <div className={`text-[11px] font-medium ${
                    selectedClip[activeSide === 'in' ? 'transitionIn' : 'transitionOut'].type === t.value
                      ? 'text-primary-300'
                      : 'text-surface-400'
                  }`}>
                    {t.label}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Duration slider */}
          {selectedClip[activeSide === 'in' ? 'transitionIn' : 'transitionOut'].type !== 'none' && (
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
                  Duration
                </label>
                <span className="text-xs text-primary-300 font-mono">
                  {selectedClip[activeSide === 'in' ? 'transitionIn' : 'transitionOut'].duration.toFixed(1)}s
                </span>
              </div>
              <input
                type="range"
                min="0.1"
                max="5"
                step="0.1"
                value={selectedClip[activeSide === 'in' ? 'transitionIn' : 'transitionOut'].duration}
                onChange={(e) => handleDurationChange(parseFloat(e.target.value))}
                className="w-full slider"
              />
              <div className="flex justify-between text-[10px] text-surface-600">
                <span>0.1s</span>
                <span>5s</span>
              </div>
            </div>
          )}

          {/* Preview info */}
          <div className="p-3 rounded-xl bg-surface-900/50 border border-surface-800/50">
            <p className="text-[11px] text-surface-500 leading-relaxed">
              {selectedClip[activeSide === 'in' ? 'transitionIn' : 'transitionOut'].type === 'fade' && (
                <>Fade will smoothly transition between the clip and a black frame over the specified duration.</>
              )}
              {selectedClip[activeSide === 'in' ? 'transitionIn' : 'transitionOut'].type === 'crossfade' && (
                <>Crossfade blends the end of one clip with the start of the next for a smooth transition.</>
              )}
              {selectedClip[activeSide === 'in' ? 'transitionIn' : 'transitionOut'].type === 'none' && (
                <>No transition applied. Clip will cut abruptly at its boundaries.</>
              )}
            </p>
          </div>
        </>
      )}
    </div>
  );
}
