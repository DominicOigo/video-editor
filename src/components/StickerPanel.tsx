import { useState } from 'react';
import type { Sticker } from '../types';
import { createDefaultSticker } from '../types';
import { Plus, X } from './Icons';

interface StickerPanelProps {
  stickers: Sticker[];
  duration: number;
  currentTime: number;
  onAdd: (sticker: Sticker) => void;
  onUpdate: (id: string, updates: Partial<Sticker>) => void;
  onRemove: (id: string) => void;
}

const EMOJIS = [
  '😀','😂','🥰','😍','🤩','😎','🔥','💯','✨','⭐',
  '❤️','💜','💙','💚','💛','🧡','🖤','💔','💕','💖',
  '🎉','🎊','🎈','🎁','🥳','🎂','🎶','🎵','🎤','🎧',
  '👍','👎','👏','🙌','🤝','💪','✌️','🤞','🖐️','👋',
  '💡','💰','🔑','🔔','🎯','🚀','📸','🎬','📱','💻',
  '🐱','🐶','🐼','🐸','🦊','🐰','🦄','🐲','🌈','🍀',
  '🏆','🥇','🥈','🥉','🏅','🎮','🕹️','🎲','♟️','🧩',
];

export function StickerPanel({ stickers, duration, currentTime, onAdd, onUpdate, onRemove }: StickerPanelProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const selected = stickers.find((s) => s.id === selectedId);
  const filtered = search ? EMOJIS.filter((e) => e.includes(search)) : EMOJIS;

  const handleAdd = (emoji: string) => {
    const sticker = createDefaultSticker(emoji, Math.max(0, currentTime), Math.min(currentTime + 3, duration));
    onAdd(sticker);
    setSelectedId(sticker.id);
  };

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Stickers ({stickers.length})</h3>
      </div>

      {/* Emoji picker */}
      <div>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search emoji..."
          className="w-full px-3 py-1.5 bg-surface-800/80 border border-surface-700/50 rounded-lg text-xs text-white mb-2 outline-none focus:border-primary-500/50"
        />
        <div className="grid grid-cols-8 gap-1 max-h-28 overflow-y-auto p-2 rounded-lg bg-surface-900/50 border border-surface-800/30">
          {filtered.map((emoji) => (
            <button
              key={emoji}
              onClick={() => handleAdd(emoji)}
              className="text-lg p-1 rounded hover:bg-surface-700/50 transition-all text-center"
              title={emoji}
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>

      {/* Sticker list */}
      {stickers.length > 0 && (
        <div className="space-y-1 max-h-24 overflow-y-auto">
          {stickers.map((s) => (
            <button
              key={s.id}
              onClick={() => setSelectedId(s.id)}
              className={`w-full flex items-center gap-2 p-1.5 rounded-lg text-left transition-all ${
                selectedId === s.id ? 'bg-primary-500/10 border border-primary-500/30' : 'bg-surface-900/50 border border-surface-800/30'
              }`}
            >
              <span className="text-lg">{s.emoji}</span>
              <span className="text-[10px] text-surface-400 flex-1">{s.startTime.toFixed(1)}s – {s.endTime.toFixed(1)}s</span>
              <button onClick={(e) => { e.stopPropagation(); onRemove(s.id); }} className="p-0.5 text-surface-600 hover:text-red-400"><X className="w-3 h-3" /></button>
            </button>
          ))}
        </div>
      )}

      {/* Edit selected */}
      {selected && (
        <div className="p-3 rounded-xl bg-surface-900/50 border border-surface-800/50 space-y-2">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-2xl">{selected.emoji}</span>
            <span className="text-[10px] text-surface-500">Sticker</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PropSlider label="Size" value={selected.scale} min={0.1} max={3} step={0.1}
              display={`${selected.scale.toFixed(1)}×`}
              onChange={(v) => onUpdate(selected.id, { scale: v })} />
            <PropSlider label="Rotation" value={selected.rotation} min={-180} max={180} step={1}
              display={`${selected.rotation}°`}
              onChange={(v) => onUpdate(selected.id, { rotation: v })} />
          </div>
          <PropSlider label="Opacity" value={selected.opacity} min={0} max={1} step={0.05}
            display={`${Math.round(selected.opacity * 100)}%`}
            onChange={(v) => onUpdate(selected.id, { opacity: v })} />
          <div className="grid grid-cols-2 gap-2">
            <PropSlider label="X" value={selected.position.x} min={0} max={100} step={1}
              display={`${selected.position.x}%`}
              onChange={(v) => onUpdate(selected.id, { position: { ...selected.position, x: v } })} />
            <PropSlider label="Y" value={selected.position.y} min={0} max={100} step={1}
              display={`${selected.position.y}%`}
              onChange={(v) => onUpdate(selected.id, { position: { ...selected.position, y: v } })} />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <PropSlider label="Start" value={selected.startTime} min={0} max={duration} step={0.1}
              display={`${selected.startTime.toFixed(1)}s`}
              onChange={(v) => onUpdate(selected.id, { startTime: v })} />
            <PropSlider label="End" value={selected.endTime} min={0} max={duration} step={0.1}
              display={`${selected.endTime.toFixed(1)}s`}
              onChange={(v) => onUpdate(selected.id, { endTime: v })} />
          </div>
        </div>
      )}
    </div>
  );
}

function PropSlider({ label, value, min, max, step, display, onChange }: {
  label: string; value: number; min: number; max: number; step: number;
  display: string; onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-0.5">
      <div className="flex justify-between">
        <span className="text-[9px] text-surface-500 uppercase tracking-wider">{label}</span>
        <span className="text-[9px] text-primary-300 font-mono">{display}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full slider h-1" />
    </div>
  );
}
