import { useState } from 'react';
import type { TextOverlay } from '../types';
import { Plus, X } from './Icons';
import { FONT_OPTIONS } from '../types';

interface TextOverlayPanelProps {
  textOverlays: TextOverlay[];
  duration: number;
  currentTime: number;
  onAdd: (overlay: TextOverlay) => void;
  onUpdate: (id: string, updates: Partial<TextOverlay>) => void;
  onRemove: (id: string) => void;
}

const COLORS = [
  '#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff',
  '#ffff00', '#ff00ff', '#00ffff', '#ff8800', '#ff4488',
  '#88ff44', '#4488ff', '#888888', '#444444',
];

const ALIGNMENTS = [
  { value: 'left' as const, icon: '⬅' },
  { value: 'center' as const, icon: '⬡' },
  { value: 'right' as const, icon: '➡' },
];

export function TextOverlayPanel({
  textOverlays,
  duration,
  currentTime,
  onAdd,
  onUpdate,
  onRemove,
}: TextOverlayPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showColorPicker, setShowColorPicker] = useState<string | null>(null);

  const selected = textOverlays.find((t) => t.id === selectedId);

  const handleAdd = () => {
    const overlay = {
      id: crypto.randomUUID(),
      text: 'Title',
      fontFamily: 'Arial',
      fontSize: 48,
      color: '#ffffff',
      position: { x: 50, y: 30 },
      alignment: 'center' as const,
      startTime: Math.max(0, currentTime),
      endTime: Math.min(currentTime + 4, duration),
      background: '',
      strokeColor: '#000000',
      strokeWidth: 0,
      opacity: 1,
      shadow: { color: '#00000080', blur: 4, offsetX: 2, offsetY: 2 },
    };
    onAdd(overlay);
    setSelectedId(overlay.id);
  };

  return (
    <div className="space-y-3 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">
          Text Overlays ({textOverlays.length})
        </h3>
        <button onClick={handleAdd} className="btn-primary text-xs py-1.5 px-3">
          <Plus className="w-3.5 h-3.5 mr-1 inline" />
          Add Text
        </button>
      </div>

      {/* Overlay list / empty state */}
      {textOverlays.length === 0 ? (
        <div className="p-4 rounded-xl bg-surface-900/50 border border-surface-800/50 text-center">
          <div className="text-2xl mb-2">📝</div>
          <p className="text-surface-500 text-xs">Click "Add Text" to create a text overlay</p>
        </div>
      ) : (
        <div className="space-y-1.5 max-h-40 overflow-y-auto">
          {textOverlays.map((overlay) => (
            <button
              key={overlay.id}
              onClick={() => setSelectedId(overlay.id)}
              className={`w-full flex items-center gap-2 p-2 rounded-lg text-left transition-all ${
                selectedId === overlay.id
                  ? 'bg-primary-500/10 border border-primary-500/30'
                  : 'bg-surface-900/50 border border-surface-800/30 hover:bg-surface-800/50'
              }`}
            >
              <div
                className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold flex-shrink-0"
                style={{ backgroundColor: overlay.color + '20', color: overlay.color }}
              >
                T
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs text-white truncate">{overlay.text}</p>
                <p className="text-[10px] text-surface-500">
                  {overlay.startTime.toFixed(1)}s – {overlay.endTime.toFixed(1)}s
                </p>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); onRemove(overlay.id); }}
                className="p-1 rounded text-surface-600 hover:text-red-400 hover:bg-red-500/10 opacity-0 group-hover:opacity-100"
              >
                <X className="w-3 h-3" />
              </button>
            </button>
          ))}
        </div>
      )}

      {/* Selected overlay editor */}
      {selected && (
        <div className="space-y-3 p-3 rounded-xl bg-surface-900/50 border border-surface-800/50">
          {/* Text input */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Text</label>
            <input
              value={selected.text}
              onChange={(e) => onUpdate(selected.id, { text: e.target.value })}
              className="w-full px-3 py-1.5 bg-surface-800/80 border border-surface-700/50 rounded-lg text-xs text-white outline-none focus:border-primary-500/50"
            />
          </div>

          {/* Font picker */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Font</label>
            <select
              value={selected.fontFamily}
              onChange={(e) => onUpdate(selected.id, { fontFamily: e.target.value })}
              className="w-full px-3 py-1.5 bg-surface-800/80 border border-surface-700/50 rounded-lg text-xs text-white outline-none focus:border-primary-500/50"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
          </div>

          {/* Font size */}
          <div className="space-y-1">
            <div className="flex justify-between">
              <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Size</label>
              <span className="text-[11px] text-primary-300 font-mono">{selected.fontSize}px</span>
            </div>
            <input
              type="range" min={12} max={200} step={2}
              value={selected.fontSize}
              onChange={(e) => onUpdate(selected.id, { fontSize: parseInt(e.target.value) })}
              className="w-full slider h-1"
            />
          </div>

          {/* Position X, Y */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">X</label>
                <span className="text-[10px] text-primary-300">{selected.position.x}%</span>
              </div>
              <input
                type="range" min={0} max={100} step={1}
                value={selected.position.x}
                onChange={(e) => onUpdate(selected.id, { position: { ...selected.position, x: parseInt(e.target.value) } })}
                className="w-full slider h-1"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Y</label>
                <span className="text-[10px] text-primary-300">{selected.position.y}%</span>
              </div>
              <input
                type="range" min={0} max={100} step={1}
                value={selected.position.y}
                onChange={(e) => onUpdate(selected.id, { position: { ...selected.position, y: parseInt(e.target.value) } })}
                className="w-full slider h-1"
              />
            </div>
          </div>

          {/* Alignment */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Alignment</label>
            <div className="flex gap-1">
              {ALIGNMENTS.map((a) => (
                <button
                  key={a.value}
                  onClick={() => onUpdate(selected.id, { alignment: a.value })}
                  className={`flex-1 py-1 rounded-lg text-xs font-medium transition-all ${
                    selected.alignment === a.value
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-800/80 text-surface-400'
                  }`}
                >
                  {a.icon} {a.value}
                </button>
              ))}
            </div>
          </div>

          {/* Color picker */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Color</label>
            <div className="flex flex-wrap gap-1.5">
              {COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => onUpdate(selected.id, { color: c })}
                  className={`w-6 h-6 rounded-full border-2 transition-all ${
                    selected.color === c ? 'border-white scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
              <input
                type="color"
                value={selected.color}
                onChange={(e) => onUpdate(selected.id, { color: e.target.value })}
                className="w-6 h-6 rounded-full cursor-pointer border-0 p-0"
              />
            </div>
          </div>

          {/* Opacity */}
          <PropSlider
            label="Opacity" value={selected.opacity} min={0} max={1} step={0.05}
            onChange={(v) => onUpdate(selected.id, { opacity: v })}
            display={`${Math.round(selected.opacity * 100)}%`}
          />

          {/* Background */}
          <div className="space-y-1">
            <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Background</label>
            <div className="flex gap-2">
              <div className="flex flex-wrap gap-1">
                {['', '#000000', '#00000080', '#ffffff20', '#ff000040'].map((c) => (
                  <button
                    key={c || 'none'}
                    onClick={() => onUpdate(selected.id, { background: c })}
                    className={`w-6 h-6 rounded border ${selected.background === c ? 'border-white scale-110' : 'border-surface-600'} transition-all`}
                    style={{ backgroundColor: c || 'transparent' }}
                    title={c || 'No background'}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Stroke */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Stroke</label>
              <input
                type="range" min={0} max={5} step={0.5}
                value={selected.strokeWidth}
                onChange={(e) => onUpdate(selected.id, { strokeWidth: parseFloat(e.target.value) })}
                className="w-full slider h-1"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Stroke Color</label>
              <div className="flex gap-1">
                {['#000000', '#ffffff', '#ff0000'].map((c) => (
                  <button
                    key={c}
                    onClick={() => onUpdate(selected.id, { strokeColor: c })}
                    className={`w-5 h-5 rounded-full border ${selected.strokeColor === c ? 'border-white' : 'border-transparent'}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-2">
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">Start</label>
                <span className="text-[10px] text-primary-300 font-mono">{selected.startTime.toFixed(1)}s</span>
              </div>
              <input
                type="range" min={0} max={duration} step={0.1}
                value={selected.startTime}
                onChange={(e) => onUpdate(selected.id, { startTime: parseFloat(e.target.value) })}
                className="w-full slider h-1"
              />
            </div>
            <div className="space-y-1">
              <div className="flex justify-between">
                <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">End</label>
                <span className="text-[10px] text-primary-300 font-mono">{selected.endTime.toFixed(1)}s</span>
              </div>
              <input
                type="range" min={0} max={duration} step={0.1}
                value={selected.endTime}
                onChange={(e) => onUpdate(selected.id, { endTime: parseFloat(e.target.value) })}
                className="w-full slider h-1"
              />
            </div>
          </div>

          {/* Preview */}
          <div className="p-3 rounded-lg bg-black/60 border border-surface-700/30">
            <p className="text-[10px] text-surface-500 mb-1">Preview</p>
            <div
              className="p-2 rounded min-h-[40px] flex items-center justify-center overflow-hidden"
              style={{
                fontFamily: selected.fontFamily,
                fontSize: Math.min(selected.fontSize / 3, 28),
                color: selected.color,
                textAlign: selected.alignment,
                backgroundColor: selected.background || 'transparent',
                opacity: selected.opacity,
                textShadow: selected.strokeWidth > 0
                  ? `0 0 ${selected.strokeWidth}px ${selected.strokeColor}`
                  : selected.shadow
                    ? `${selected.shadow.offsetX}px ${selected.shadow.offsetY}px ${selected.shadow.blur}px ${selected.shadow.color}`
                    : 'none',
              }}
            >
              {selected.text}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PropSlider({
  label, value, min, max, step, onChange, display,
}: {
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; display?: string;
}) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between">
        <label className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">{label}</label>
        <span className="text-[10px] text-primary-300">{display || value}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full slider h-1" />
    </div>
  );
}
