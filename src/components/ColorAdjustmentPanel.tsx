import type { ColorAdjustments } from '../types';
import { DEFAULT_COLOR_ADJUSTMENTS } from '../types';

interface ColorAdjustmentProps {
  adjustments?: ColorAdjustments;
  onUpdate: <K extends keyof ColorAdjustments>(key: K, value: ColorAdjustments[K]) => void;
}

export function ColorAdjustmentPanel({ adjustments, onUpdate }: ColorAdjustmentProps) {
  const adj = adjustments || DEFAULT_COLOR_ADJUSTMENTS;

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">Color Adjustments</h3>
      <p className="text-[10px] text-surface-500 leading-relaxed">
        Adjust brightness, contrast, saturation, and hue of your video.
      </p>

      <AdjSlider label="Brightness" value={adj.brightness} min={-1} max={1} step={0.05}
        display={adj.brightness > 0 ? `+${Math.round(adj.brightness * 100)}%` : `${Math.round(adj.brightness * 100)}%`}
        onChange={(v) => onUpdate('brightness', v)} />
      <AdjSlider label="Contrast" value={adj.contrast} min={-1} max={1} step={0.05}
        display={adj.contrast > 0 ? `+${Math.round(adj.contrast * 100)}%` : `${Math.round(adj.contrast * 100)}%`}
        onChange={(v) => onUpdate('contrast', v)} />
      <AdjSlider label="Saturation" value={adj.saturation} min={-1} max={1} step={0.05}
        display={adj.saturation > 0 ? `+${Math.round(adj.saturation * 100)}%` : `${Math.round(adj.saturation * 100)}%`}
        onChange={(v) => onUpdate('saturation', v)} />
      <AdjSlider label="Hue" value={adj.hue} min={-180} max={180} step={1}
        display={`${adj.hue}°`}
        onChange={(v) => onUpdate('hue', v)} />
      <AdjSlider label="Shadows" value={adj.shadows} min={-1} max={1} step={0.05}
        display={adj.shadows > 0 ? `+${Math.round(adj.shadows * 100)}%` : `${Math.round(adj.shadows * 100)}%`}
        onChange={(v) => onUpdate('shadows', v)} />
      <AdjSlider label="Highlights" value={adj.highlights} min={-1} max={1} step={0.05}
        display={adj.highlights > 0 ? `+${Math.round(adj.highlights * 100)}%` : `${Math.round(adj.highlights * 100)}%`}
        onChange={(v) => onUpdate('highlights', v)} />

      <button
        onClick={() => {
          onUpdate('brightness', 0);
          onUpdate('contrast', 0);
          onUpdate('saturation', 0);
          onUpdate('hue', 0);
          onUpdate('shadows', 0);
          onUpdate('highlights', 0);
        }}
        className="w-full btn-secondary text-xs py-2"
      >
        Reset All
      </button>
    </div>
  );
}

function AdjSlider({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  const valueColor = value > 0 ? 'text-emerald-400' : value < 0 ? 'text-yellow-400' : 'text-primary-300';
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center">
        <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">{label}</label>
        <span className={`text-[10px] font-mono ${valueColor}`}>{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full slider h-1" />
    </div>
  );
}
