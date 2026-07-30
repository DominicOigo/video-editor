import type { QualitySettings as QualitySettingsType } from '../types';
import { RESOLUTION_OPTIONS, FORMAT_OPTIONS } from '../types';

interface QualitySettingsProps {
  settings: QualitySettingsType;
  onChange: (settings: QualitySettingsType) => void;
  onUpdate: <K extends keyof QualitySettingsType>(key: K, value: QualitySettingsType[K]) => void;
}

export function QualitySettingsPanel({
  settings,
  onChange,
  onUpdate,
}: QualitySettingsProps) {
  return (
    <div className="p-4 space-y-5">
      <h3 className="text-sm font-semibold text-white">Quality Settings</h3>

      {/* Resolution */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
          Resolution
        </label>
        <div className="grid grid-cols-2 gap-2">
          {RESOLUTION_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate('resolution', opt.value)}
              className={`p-3 rounded-xl text-left transition-all duration-200 ${
                settings.resolution === opt.value
                  ? 'bg-primary-500/10 border-2 border-primary-500/40'
                  : 'bg-surface-900/50 border-2 border-surface-800/50 hover:border-surface-700/50'
              }`}
            >
              <div className={`text-sm font-semibold ${
                settings.resolution === opt.value ? 'text-primary-300' : 'text-white'
              }`}>
                {opt.label}
              </div>
              <div className="text-xs text-surface-500 mt-0.5">{opt.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Format */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
          Format
        </label>
        <div className="grid grid-cols-2 gap-2">
          {FORMAT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onUpdate('format', opt.value)}
              className={`p-3 rounded-xl text-left transition-all duration-200 ${
                settings.format === opt.value
                  ? 'bg-primary-500/10 border-2 border-primary-500/40'
                  : 'bg-surface-900/50 border-2 border-surface-800/50 hover:border-surface-700/50'
              }`}
            >
              <div className={`text-sm font-semibold ${
                settings.format === opt.value ? 'text-primary-300' : 'text-white'
              }`}>
                {opt.label}
              </div>
              <div className="text-xs text-surface-500 mt-0.5">{opt.description}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Bitrate */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
          Quality
        </label>
        <div className="flex gap-2">
          {(['high', 'auto', 'low'] as const).map((bitrate) => (
            <button
              key={bitrate}
              onClick={() => onUpdate('bitrate', bitrate)}
              className={`flex-1 p-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                settings.bitrate === bitrate
                  ? 'bg-primary-500/10 border-2 border-primary-500/40 text-primary-300'
                  : 'bg-surface-900/50 border-2 border-surface-800/50 text-surface-400 hover:border-surface-700/50'
              }`}
            >
              {bitrate === 'high' ? 'High Quality' : bitrate === 'auto' ? 'Balanced' : 'Small File'}
            </button>
          ))}
        </div>
      </div>

      {/* Framerate */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
          Framerate
        </label>
        <div className="flex gap-2">
          {(['original', '60', '30', '24'] as const).map((fps) => (
            <button
              key={fps}
              onClick={() => onUpdate('framerate', fps)}
              className={`flex-1 p-2.5 rounded-xl text-xs font-medium transition-all duration-200 ${
                settings.framerate === fps
                  ? 'bg-primary-500/10 border-2 border-primary-500/40 text-primary-300'
                  : 'bg-surface-900/50 border-2 border-surface-800/50 text-surface-400 hover:border-surface-700/50'
              }`}
            >
              {fps === 'original' ? 'Source' : `${fps} FPS`}
            </button>
          ))}
        </div>
      </div>

      {/* Video Enhancement Toggles */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
          Video Enhancement
        </label>
        <div className="space-y-2">
          {videoEnhancementOptions.map((option) => (
            <ToggleRow
              key={option.key}
              settings={settings}
              option={option}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </div>

      {/* Audio Enhancement Toggles */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-surface-400 uppercase tracking-wider">
          Audio Enhancement
        </label>
        <div className="space-y-2">
          {audioEnhancementOptions.map((option) => (
            <ToggleRow
              key={option.key}
              settings={settings}
              option={option}
              onUpdate={onUpdate}
            />
          ))}
        </div>
      </div>

      {/* Info */}
      <div className="p-3 rounded-xl bg-surface-900/50 border border-surface-800/50">
        <p className="text-xs text-surface-500 leading-relaxed">
          <span className="text-primary-400">Note:</span> Enhancements increase processing time. 
          For best results, start with a high-quality source video.
        </p>
      </div>
    </div>
  );
}

interface ToggleOption {
  key: string;
  icon: string;
  label: string;
  description: string;
}

const videoEnhancementOptions: ToggleOption[] = [
  {
    key: 'enhanceQuality',
    icon: '✨',
    label: 'Quality Enhancement',
    description: 'Sharpening, contrast, and color optimization',
  },
  {
    key: 'denoise',
    icon: '🌊',
    label: 'Denoise',
    description: 'Reduce visual noise and grain',
  },
  {
    key: 'stabilize',
    icon: '🎯',
    label: 'Stabilization',
    description: 'Reduce camera shake and vibration',
  },
  {
    key: 'upscale',
    icon: '🔍',
    label: 'Upscale',
    description: 'Enlarge video with smoother scaling',
  },
];

const audioEnhancementOptions: ToggleOption[] = [
  {
    key: 'audioDenoise',
    icon: '🔇',
    label: 'Noise Reduction',
    description: 'Remove background hiss, hum, and static',
  },
  {
    key: 'audioNormalize',
    icon: '📊',
    label: 'Normalize Volume',
    description: 'Balance loudness across the entire video',
  },
];

function ToggleRow({
  settings,
  option,
  onUpdate,
}: {
  settings: QualitySettingsType;
  option: ToggleOption;
  onUpdate: <K extends keyof QualitySettingsType>(key: K, value: QualitySettingsType[K]) => void;
}) {
  const isActive = (settings as any)[option.key] as boolean;
  return (
    <button
      onClick={() => onUpdate(option.key as keyof QualitySettingsType, !isActive)}
      className={`w-full flex items-center justify-between p-3 rounded-xl transition-all duration-200 ${
        isActive
          ? 'bg-primary-500/10 border border-primary-500/30'
          : 'bg-surface-900/50 border border-surface-800/50 hover:border-surface-700/50'
      }`}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg">{option.icon}</span>
        <div className="text-left">
          <div className={`text-sm font-medium ${
            isActive ? 'text-primary-300' : 'text-white'
          }`}>
            {option.label}
          </div>
          <div className="text-xs text-surface-500">{option.description}</div>
        </div>
      </div>
      <div className={`w-10 h-6 rounded-full transition-all duration-300 ${
        isActive ? 'bg-primary-500' : 'bg-surface-700'
      }`}>
        <div className={`w-4 h-4 rounded-full bg-white shadow-md transition-all duration-300 mt-1 ${
          isActive ? 'ml-5' : 'ml-1'
        }`} />
      </div>
    </button>
  );
}
