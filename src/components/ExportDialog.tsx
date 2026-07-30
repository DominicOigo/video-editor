import { useState } from 'react';
import type { ExportProgress, PlatformPreset, PlatformPresetConfig } from '../types';
import { PLATFORM_PRESETS } from '../types';
import { X, Download, Check, AlertCircle } from './Icons';

interface ExportDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (preset?: PlatformPreset) => Promise<void>;
  onFastExport?: () => Promise<void>;
  exportProgress: ExportProgress | null;
  isMobile?: boolean;
}

export function ExportDialog({ isOpen, onClose, onExport, onFastExport, exportProgress, isMobile }: ExportDialogProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPreset, setSelectedPreset] = useState<PlatformPreset | null>(null);
  const [fastExport, setFastExport] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      if (fastExport && onFastExport) {
        await onFastExport();
      } else {
        await onExport(selectedPreset || undefined);
      }
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const isComplete = exportProgress?.stage === 'complete';
  const isError = exportProgress?.stage === 'error';
  const activePreset = selectedPreset
    ? PLATFORM_PRESETS.find((p) => p.id === selectedPreset)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm">
      <div
        className={`animate-fade-in ${
          isMobile
            ? 'w-full rounded-t-2xl bg-surface-900 border-t border-surface-800/50 p-5 max-h-[90vh] overflow-y-auto'
            : 'card max-w-lg w-full mx-4 max-h-[85vh] overflow-y-auto'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar for mobile */}
        {isMobile && (
          <div className="flex justify-center mb-3">
            <div className="w-10 h-1 rounded-full bg-surface-700" />
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg sm:text-xl font-bold text-white">
              {isComplete ? 'Export Complete!' : 'Export Video'}
            </h2>
            <p className="text-surface-400 text-xs sm:text-sm mt-0.5">
              {isComplete
                ? 'Your video is ready to download'
                : 'Choose a platform preset or customize in Quality settings'}
            </p>
          </div>
          {!isExporting && !exportProgress && (
            <button onClick={onClose} className="p-2 text-surface-500 hover:text-white rounded-lg hover:bg-surface-800 transition-all flex-shrink-0 ml-3">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {!exportProgress && !isExporting && !isComplete && !isError && (
          <div className="space-y-3">
            {/* Platform Presets */}
              <div>
                <h3 className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider mb-1.5">
                  Export
                </h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {onFastExport && (
                    <button
                      onClick={() => setFastExport(!fastExport)}
                      className={`p-2.5 rounded-xl text-left transition-all duration-200 border ${fastExport
                        ? 'bg-purple-500/10 border-purple-500/40 ring-1 ring-purple-500/30'
                        : 'bg-surface-900/50 border-surface-800/40 hover:border-surface-700/50 hover:bg-surface-900/80'
                      }`}
                    >
                      <div className="text-lg mb-1">🚀</div>
                      <div className={`text-[10px] font-semibold ${fastExport ? 'text-purple-300' : 'text-white'}`}>
                        Fast Export
                      </div>
                      <div className="text-[9px] text-surface-500">Server-side</div>
                      <div className={`text-[8px] mt-0.5 font-mono ${fastExport ? 'text-purple-400/70' : 'text-surface-600'}`}>
                        ~15-30s
                      </div>
                    </button>
                  )}
                  {/* Save to Device — always first */}
                  <button
                    onClick={() => { setSelectedPreset(selectedPreset === null ? null : null); setFastExport(false); }}
                    className={`p-2.5 rounded-xl text-left transition-all duration-200 border ${
                      selectedPreset === null
                        ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                        : 'bg-surface-900/50 border-surface-800/40 hover:border-surface-700/50 hover:bg-surface-900/80'
                    }`}
                  >
                    <div className="text-lg mb-1">💾</div>
                    <div className={`text-[10px] font-semibold ${
                      selectedPreset === null ? 'text-emerald-300' : 'text-white'
                    }`}>
                      Save to Device
                    </div>
                    <div className="text-[9px] text-surface-500">Current Settings</div>
                    <div className={`text-[8px] mt-0.5 font-mono ${
                      selectedPreset === null ? 'text-emerald-400/70' : 'text-surface-600'
                    }`}>
                      No preset
                    </div>
                  </button>
                  {/* Platform presets */}
                  {(['instagram-reels', 'instagram-feed', 'instagram-story', 'youtube-standard', 'youtube-shorts', 'tiktok'] as PlatformPreset[]).map((presetId) => {
                    const preset = PLATFORM_PRESETS.find((p) => p.id === presetId)!;
                    const isSelected = selectedPreset === presetId;
                    return (
                      <button
                        key={presetId}
                        onClick={() => setSelectedPreset(isSelected ? null : presetId)}
                        className={`p-2.5 rounded-xl text-left transition-all duration-200 border ${
                          isSelected
                            ? 'bg-primary-500/10 border-primary-500/40 ring-1 ring-primary-500/30'
                            : 'bg-surface-900/50 border-surface-800/40 hover:border-surface-700/50 hover:bg-surface-900/80'
                        }`}
                      >
                        <div className="text-lg mb-1">{preset.icon}</div>
                        <div className={`text-[10px] font-semibold ${
                          isSelected ? 'text-primary-300' : 'text-white'
                        }`}>
                          {preset.platform}
                        </div>
                        <div className="text-[9px] text-surface-500">{preset.label}</div>
                        <div className={`text-[8px] mt-0.5 font-mono ${
                          isSelected ? 'text-primary-400/70' : 'text-surface-600'
                        }`}>
                          {preset.aspectRatio}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

            {/* Selected preset details + tips */}
            {selectedPreset !== null && activePreset && (
              <div className="p-3 rounded-xl bg-surface-900/50 border border-surface-800/40 space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">{activePreset.icon}</span>
                    <div>
                      <span className="text-xs font-semibold text-white">
                        {activePreset.platform} — {activePreset.label}
                      </span>
                      <span className="text-[10px] text-surface-500 ml-2">
                        {activePreset.description}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setSelectedPreset(null)}
                    className="text-[10px] text-surface-500 hover:text-surface-300 underline"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex flex-wrap gap-1">
                  <span className="chip text-[9px]">{activePreset.width}×{activePreset.height}</span>
                  <span className="chip text-[9px]">{activePreset.framerate}fps</span>
                  <span className="chip text-[9px]">{activePreset.aspectRatio}</span>
                  <span className="chip text-[9px]">{activePreset.format.toUpperCase()}</span>
                  <span className="chip text-[9px]">
                    {activePreset.bitrate === 'high' ? 'High Quality' : 'Balanced'}
                  </span>
                </div>

                {activePreset.tips.length > 0 && (
                  <div className="space-y-0.5">
                    {activePreset.tips.map((tip, i) => (
                      <p key={i} className="text-[10px] text-surface-400 flex items-start gap-1.5">
                        <span className="text-primary-400 mt-0.5">•</span>
                        {tip}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Save to Device details */}
            {selectedPreset === null && !fastExport && (
              <div className="p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">💾</span>
                  <div>
                    <span className="text-xs font-semibold text-white">Save to Device</span>
                    <span className="text-[10px] text-surface-500 ml-2">
                      Uses your current Quality settings
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-emerald-300/70 leading-relaxed">
                  Exports with your current resolution, bitrate, format, and enhancement settings — no platform-specific adjustments applied.
                </p>
              </div>
            )}

            {/* Fast Export details */}
            {fastExport && (
              <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="text-lg">🚀</span>
                  <div>
                    <span className="text-xs font-semibold text-white">Fast Export (Server)</span>
                    <span className="text-[10px] text-surface-500 ml-2">
                      Uses server-side FFmpeg
                    </span>
                  </div>
                </div>
                <p className="text-[10px] text-purple-300/70 leading-relaxed">
                  Processes your video on our server for faster export times. Your video is uploaded, processed, and the result is streamed back to you.
                </p>
              </div>
            )}

            {/* Processing info */}
            <div className="p-2.5 rounded-xl bg-amber-500/5 border border-amber-500/20 flex items-start gap-2">
              <span className="text-amber-400 flex-shrink-0 mt-0.5">⚡</span>
              <p className="text-[10px] text-amber-300/70 leading-relaxed">
                Processing happens entirely in your browser. Your footage stays on your computer.
              </p>
            </div>

            {/* Action buttons */}
            <div className={`flex gap-2 ${isMobile ? 'flex-col' : 'justify-end pt-1'}`}>
              <button onClick={onClose} className={`btn-secondary text-sm ${isMobile ? 'w-full' : ''}`}>
                Cancel
              </button>
              <button onClick={handleExport} className={`btn-primary text-sm ${isMobile ? 'w-full' : ''}`}>
                <Download className="w-4 h-4 mr-1.5" />
                {fastExport
                  ? 'Fast Export'
                  : selectedPreset
                    ? `Export for ${activePreset?.platform}`
                    : 'Save to Device'}
              </button>
            </div>
          </div>
        )}

        {/* Progress */}
        {(isExporting || exportProgress) && !isComplete && !isError && (
          <div className="space-y-5 py-3">
            <div className="flex justify-center">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20 animate-spin" viewBox="0 0 80 80">
                  <circle
                    cx="40" cy="40" r="32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-surface-800"
                  />
                  <circle
                    cx="40" cy="40" r="32"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={`${exportProgress ? exportProgress.progress * 2 : 0} 200`}
                    strokeLinecap="round"
                    className="text-primary-500"
                    style={{
                      transition: 'stroke-dasharray 0.3s ease',
                      transform: 'rotate(-90deg)',
                      transformOrigin: 'center',
                    }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-lg font-bold text-white">
                    {exportProgress ? exportProgress.progress : 0}%
                  </span>
                </div>
              </div>
            </div>

            <div className="text-center">
              <p className="text-white font-medium text-sm">{exportProgress?.message || 'Preparing...'}</p>
              <p className="text-surface-500 text-xs mt-1">Please keep this tab active</p>
            </div>

            <div className="w-full bg-surface-800 rounded-full h-1.5 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-primary-500 to-primary-400 rounded-full transition-all duration-500 ease-out"
                style={{ width: `${exportProgress?.progress || 0}%` }}
              />
            </div>
          </div>
        )}

        {/* Complete */}
        {isComplete && exportProgress?.outputUrl && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                <Check className="w-8 h-8 text-green-400" />
              </div>
            </div>
            <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2`}>
              <a
                href={exportProgress.outputUrl}
                download="Coreograph-Output.mp4"
                className="btn-primary flex-1 text-sm"
              >
                <Download className="w-4 h-4 mr-1.5" />
                Download Video
              </a>
              <button onClick={onClose} className="btn-secondary text-sm">
                Close
              </button>
            </div>
          </div>
        )}

        {/* Error */}
        {isError && (
          <div className="space-y-3">
            <div className="flex justify-center">
              <div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
                <AlertCircle className="w-8 h-8 text-red-400" />
              </div>
            </div>
            <div className="text-center">
              <p className="text-white font-medium text-sm">Export Failed</p>
              <p className="text-surface-400 text-xs mt-0.5">
                {exportProgress?.message || 'An unexpected error occurred'}
              </p>
            </div>
            <button onClick={onClose} className="btn-secondary w-full text-sm">
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
