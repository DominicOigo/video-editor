import { useState } from 'react';
import type { Keyframe, EasingType } from '../types';
import { Plus, Trash2 } from './Icons';

interface KeyframeEditorProps {
  keyframes: Keyframe[];
  clipDuration: number;
  currentTime: number; // global timeline time
  clipOffset: number;  // when clip starts on timeline
  onAddKeyframe: (time: number) => void;
  onUpdateKeyframe: (id: string, updates: Partial<Keyframe>) => void;
  onRemoveKeyframe: (id: string) => void;
}

const EASING_OPTIONS: { value: EasingType; label: string }[] = [
  { value: 'linear', label: 'Linear' },
  { value: 'ease-in', label: 'Ease In' },
  { value: 'ease-out', label: 'Ease Out' },
  { value: 'ease-in-out', label: 'Ease In-Out' },
];

export function KeyframeEditor({
  keyframes,
  clipDuration,
  currentTime,
  clipOffset,
  onAddKeyframe,
  onUpdateKeyframe,
  onRemoveKeyframe,
}: KeyframeEditorProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Clip-relative time
  const clipTime = Math.max(0, Math.min(currentTime - clipOffset, clipDuration));

  // Find the selected keyframe or the closest to current time
  const selectedKf = keyframes.find((k) => k.id === selectedId);
  const displayKf =
    selectedKf ||
    keyframes.length > 0
      ? keyframes.reduce((prev, curr) =>
          Math.abs(curr.time - clipTime) < Math.abs(prev.time - clipTime)
            ? curr
            : prev
        )
      : null;

  const handleSlider = (field: string, value: number) => {
    if (!displayKf) return;
    const parsed = parseFloat(value.toFixed(2));
    onUpdateKeyframe(displayKf.id, { [field]: parsed } as Partial<Keyframe>);
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Keyframes</h3>
        <span className="text-[10px] text-surface-500">
          {keyframes.length} keyframe{keyframes.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Mini-timeline with keyframe dots */}
      <div className="relative h-8 bg-surface-900/80 rounded-lg border border-surface-800/50 overflow-hidden">
        {/* Clip range background */}
        <div
          className="absolute inset-y-0 bg-primary-500/10"
          style={{ left: '0%', width: '100%' }}
        />
        {/* Keyframe diamond markers */}
        {keyframes.map((kf) => {
          const pct = clipDuration > 0 ? (kf.time / clipDuration) * 100 : 0;
          return (
            <button
              key={kf.id}
              onClick={() => setSelectedId(kf.id)}
              className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rotate-45 rounded-sm transition-all ${
                selectedId === kf.id
                  ? 'bg-primary-400 ring-2 ring-primary-400/40 scale-125'
                  : 'bg-surface-400 hover:bg-primary-400 hover:scale-110'
              }`}
              style={{ left: `${pct}%` }}
              title={`${kf.time.toFixed(1)}s`}
            />
          );
        })}
        {/* Playhead on mini-timeline */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-10 pointer-events-none"
          style={{ left: `${(clipTime / clipDuration) * 100}%` }}
        />
      </div>

      {/* Add keyframe button */}
      <div className="flex gap-2">
        <button
          onClick={() => {
            const t = Math.round(clipTime * 10) / 10;
            // Don't add if one already exists at this time
            if (keyframes.some((k) => Math.abs(k.time - t) < 0.05)) return;
            onAddKeyframe(t);
          }}
          className="flex-1 btn-primary text-xs py-1.5"
        >
          <Plus className="w-3.5 h-3.5 mr-1 inline" />
          Add Keyframe at {clipTime.toFixed(1)}s
        </button>
      </div>

      {/* Selected keyframe properties */}
      {displayKf && (
        <div className="space-y-3 p-3 rounded-xl bg-surface-900/50 border border-surface-800/50">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
              Keyframe at {displayKf.time.toFixed(1)}s
            </span>
            <button
              onClick={() => {
                if (keyframes.length > 1) {
                  onRemoveKeyframe(displayKf.id);
                  setSelectedId(null);
                }
              }}
              disabled={keyframes.length <= 1}
              className="p-1 rounded text-surface-600 hover:text-red-400 hover:bg-red-500/10 transition-all disabled:opacity-30"
              title="Delete keyframe"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Position X */}
          <PropSlider
            label="Position X"
            value={displayKf.position.x}
            min={-100}
            max={100}
            step={1}
            onChange={(v) => onUpdateKeyframe(displayKf.id, { position: { ...displayKf.position, x: v } })}
            unit="%"
          />

          {/* Position Y */}
          <PropSlider
            label="Position Y"
            value={displayKf.position.y}
            min={-100}
            max={100}
            step={1}
            onChange={(v) => onUpdateKeyframe(displayKf.id, { position: { ...displayKf.position, y: v } })}
            unit="%"
          />

          {/* Scale */}
          <PropSlider
            label="Scale"
            value={displayKf.scale}
            min={0.1}
            max={5}
            step={0.05}
            onChange={(v) => handleSlider('scale', v)}
            unit="×"
          />

          {/* Rotation */}
          <PropSlider
            label="Rotation"
            value={displayKf.rotation}
            min={-180}
            max={180}
            step={1}
            onChange={(v) => handleSlider('rotation', v)}
            unit="°"
          />

          {/* Opacity */}
          <PropSlider
            label="Opacity"
            value={displayKf.opacity}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => handleSlider('opacity', v)}
            unit="%"
            displayValue={`${Math.round(displayKf.opacity * 100)}%`}
          />

          {/* Easing */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
              Easing to Next
            </label>
            <div className="flex gap-1">
              {EASING_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => onUpdateKeyframe(displayKf.id, { easing: opt.value })}
                  className={`flex-1 py-1 rounded-lg text-[10px] font-medium transition-all ${
                    displayKf.easing === opt.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-800/80 text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* No keyframes state */}
      {keyframes.length === 0 && (
        <div className="p-4 rounded-xl bg-surface-900/50 border border-surface-800/50 text-center">
          <p className="text-surface-500 text-xs">Add keyframes to animate this clip</p>
        </div>
      )}
    </div>
  );
}

function PropSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  unit,
  displayValue,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  unit: string;
  displayValue?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
          {label}
        </label>
        <span className="text-[11px] text-primary-300 font-mono">
          {displayValue || `${value}${unit}`}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full slider h-1"
      />
    </div>
  );
}
