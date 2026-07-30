import React from 'react';

type IconProps = {
  className?: string;
  size?: number;
};

function createIcon(children: React.ReactNode): React.FC<IconProps> {
  const Icon: React.FC<IconProps> = ({ className = '', size = 24 }) => (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
  Icon.displayName = 'Icon';
  return Icon;
}

/* ── Core UI ── */

export const Plus = createIcon(
  <path d="M12 5v14M5 12h14" />
);

export const Minus = createIcon(
  <path d="M5 12h14" />
);

export const X = createIcon(
  <path d="M18 6 6 18M6 6l12 12" />
);

export const Check = createIcon(
  <path d="M20 6 9 17l-5-5" />
);

export const ChevronLeft = createIcon(
  <path d="m15 18-6-6 6-6" />
);

export const ChevronRight = createIcon(
  <path d="m9 18 6-6-6-6" />
);

export const GripVertical = createIcon(
  <><circle cx="9" cy="5.5" r="1" /><circle cx="15" cy="5.5" r="1" /><circle cx="9" cy="12" r="1" /><circle cx="15" cy="12" r="1" /><circle cx="9" cy="18.5" r="1" /><circle cx="15" cy="18.5" r="1" /></>
);

export const SlidersHorizontal = createIcon(
  <><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3" /><path d="M1 14h6M9 8h6M17 16h6" /></>
);

export const Search = createIcon(
  <><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>
);

/* ── Media / Video ── */

export const Play = createIcon(
  <polygon points="5 3 19 12 5 21 5 3" />
);

export const Pause = createIcon(
  <><rect x="6" y="4" width="4" height="16" /><rect x="14" y="4" width="4" height="16" /></>
);

export const Film = createIcon(
  <><rect width="18" height="18" x="3" y="3" rx="2" /><path d="M7 3v18M17 3v18M3 7h18M3 17h18" /></>
);

export const Square = createIcon(
  <rect width="10" height="10" x="7" y="7" rx="1" />
);

export const Maximize2 = createIcon(
  <><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" x2="14" y1="3" y2="10" /><line x1="3" x2="10" y1="21" y2="14" /></>
);

export const Minimize2 = createIcon(
  <><polyline points="4 14 10 14 10 20" /><polyline points="20 10 14 10 14 4" /><line x1="14" x2="21" y1="10" y2="3" /><line x1="3" x2="10" y1="21" y2="14" /></>
);

export const Scissors = createIcon(
  <><circle cx="6" cy="6" r="3" /><circle cx="6" cy="18" r="3" /><line x1="20" x2="8.12" y1="4" y2="15.88" /><line x1="14.47" x2="20" y1="14.48" y2="20" /><line x1="8.12" x2="12" y1="8.12" y2="12" /></>
);

export const Crop = createIcon(
  <><path d="M6 2v14a2 2 0 0 0 2 2h14" /><path d="M18 22V8a2 2 0 0 0-2-2H2" /></>
);

export const Rewind = createIcon(
  <><polygon points="1 12 11 19 11 5 1 12" /><polygon points="11 12 21 19 21 5 11 12" /></>
);

export const FastForward = createIcon(
  <><polygon points="13 19 22 12 13 5 13 19" /><polygon points="2 19 11 12 2 5 2 19" /></>
);

export const SkipBack = createIcon(
  <polygon points="19 20 9 12 19 4 19 20" />
);

/* ── Audio / Voice ── */

export const Mic = createIcon(
  <><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" /><path d="M19 10v2a7 7 0 0 1-14 0v-2" /><line x1="12" x2="12" y1="19" y2="22" /></>
);

export const Music = createIcon(
  <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></>
);

export const Volume2 = createIcon(
  <><path d="M3 9v6h4l5 5V4L7 9H3Z" /><path d="M15.54 5.54a7 7 0 0 1 0 12.92" /></>
);

export const Volume1 = createIcon(
  <><path d="M3 9v6h4l5 5V4L7 9H3Z" /><path d="M14 8.17a3 3 0 0 1 0 7.66" /></>
);

export const VolumeX = createIcon(
  <><path d="M3 9v6h4l5 5V4L7 9H3Z" /><line x1="22" x2="17" y1="9" y2="14" /><line x1="17" x2="22" y1="9" y2="14" /></>
);

export const Headphones = createIcon(
  <><path d="M3 11v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1Z" /><path d="M19 11v3a1 1 0 0 0 1 1h2a1 1 0 0 0 1-1v-3a1 1 0 0 0-1-1h-2a1 1 0 0 0-1 1Z" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>
);

export const Waveform = createIcon(
  <path d="M3 12h2v4H3v-4ZM7 8h2v8H7V8ZM11 3h2v18h-2V3ZM15 8h2v8h-2V8ZM19 12h2v4h-2v-4Z" />
);

/* ── Actions ── */

export const Undo2 = createIcon(
  <><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" /></>
);

export const Redo2 = createIcon(
  <><path d="M21 7v6h-6" /><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" /></>
);

export const Trash2 = createIcon(
  <><path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /><line x1="10" x2="10" y1="11" y2="17" /><line x1="14" x2="14" y1="11" y2="17" /></>
);

export const Edit3 = createIcon(
  <><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /></>
);

export const Copy = createIcon(
  <><rect width="14" height="14" x="8" y="8" rx="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></>
);

export const Sparkles = createIcon(
  <><path d="M12 3v4M9 8l-3-3M18 8l3-3M6 16l-2 2M22 12h-4M8 12H4M16 18l2 2M12 21v-4" /><path d="m9 18 3-3 3 3-3 3-3-3Z" /></>
);

export const Layers = createIcon(
  <><path d="M12 2L2 7l10 5 10-5-10-5Z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></>
);

export const Download = createIcon(
  <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" x2="12" y1="15" y2="3" /></>
);

export const Upload = createIcon(
  <><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" x2="12" y1="3" y2="15" /></>
);

export const Save = createIcon(
  <><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></>
);

/* ── Navigation & Misc ── */

export const ArrowLeft = createIcon(
  <><path d="m12 19-7-7 7-7" /><path d="M19 12H5" /></>
);

export const ArrowRight = createIcon(
  <><path d="m5 12h14" /><path d="m12 5 7 7-7 7" /></>
);

export const ArrowUp = createIcon(
  <><path d="M12 19V5" /><path d="m5 12 7-7 7 7" /></>
);

export const ArrowDown = createIcon(
  <><path d="M12 5v14" /><path d="m19 12-7 7-7-7" /></>
);

export const ExternalLink = createIcon(
  <><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" x2="21" y1="14" y2="3" /></>
);

export const Globe = createIcon(
  <><circle cx="12" cy="12" r="10" /><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" /></>
);

export const AlertCircle = createIcon(
  <><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="8" y2="12" /><line x1="12" x2="12.01" y1="16" y2="16" /></>
);

export const Info = createIcon(
  <><circle cx="12" cy="12" r="10" /><line x1="12" x2="12" y1="16" y2="12" /><line x1="12" x2="12.01" y1="8" y2="8" /></>
);

export const Keyboard = createIcon(
  <><rect width="20" height="14" x="2" y="6" rx="2" /><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M8 14h8" /></>
);

export const Move = createIcon(
  <path d="M12 2v20M2 12h20M5 5l7-3 7 3M5 19l7 3 7-3" />
);

export const Zap = createIcon(
  <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
);

export const Shield = createIcon(
  <><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /><path d="m9 12 2 2 4-4" /></>
);

export const Package = createIcon(
  <><path d="M3 9h18v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9Z" /><path d="m3 9 2.45-4.9A2 2 0 0 1 7.24 3h9.52a2 2 0 0 1 1.8 1.1L21 9" /><path d="M12 3v6" /></>
);

export const RotateCw = createIcon(
  <><path d="M21 12a9 9 0 1 1-9-9A9 9 0 0 1 21 12" /><path d="M21 3v5h-5" /></>
);

export const RotateCcw = createIcon(
  <><path d="M3 12a9 9 0 1 0 9-9 9 9 0 0 0-6 2.3" /><path d="M3 3v5h5" /></>
);

export const ZoomIn = createIcon(
  <><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /><line x1="11" x2="11" y1="8" y2="14" /><line x1="8" x2="14" y1="11" y2="11" /></>
);

export const ZoomOut = createIcon(
  <><circle cx="11" cy="11" r="8" /><line x1="21" x2="16.65" y1="21" y2="16.65" /><line x1="8" x2="14" y1="11" y2="11" /></>
);

/* ── Special / Brand ── */

export const Heart = createIcon(
  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
);

export const DollarSign = createIcon(
  <><line x1="12" x2="12" y1="2" y2="22" /><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></>
);

export const MessageCircle = createIcon(
  <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9z" />
);

export const Image = createIcon(
  <><rect width="18" height="18" x="3" y="3" rx="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L14 13" /></>
);

export const Type = createIcon(
  <><polyline points="4 7 4 4 20 4 20 7" /><line x1="9" x2="15" y1="20" y2="20" /><line x1="12" x2="12" y1="4" y2="20" /></>
);

export const Captions = createIcon(
  <><rect width="20" height="14" x="2" y="5" rx="2" /><path d="M7 10.5a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1-3 0v-1Z" /><path d="M14 10.5a1.5 1.5 0 0 1 3 0v1a1.5 1.5 0 0 1-3 0v-1Z" /></>
);

/* ── Social (filled, for colored brand icons) ── */

export const Facebook = ({ className = '' }: IconProps) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
  </svg>
);

export const Instagram = ({ className = '' }: IconProps) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="20" x="2" y="2" rx="5" />
    <circle cx="12" cy="12" r="5" />
    <circle cx="17.5" cy="6.5" r="1.5" />
  </svg>
);

export const WhatsApp = ({ className = '' }: IconProps) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9L3 21z" />
    <path d="M9 11a3 3 0 1 0 6 0 3 3 0 0 0-6 0v0" />
    <line x1="9" x2="15" y1="16" y2="16" />
  </svg>
);

/* ── Logo play icon (filled) ── */

export const Coffee = createIcon(
  <><path d="M17 8h1a4 4 0 1 1 0 8h-1" /><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V8Z" /><line x1="6" x2="6" y1="2" y2="4" /><line x1="10" x2="10" y1="2" y2="4" /><line x1="14" x2="14" y1="2" y2="4" /></>
);

export const Send = createIcon(
  <><path d="M22 2 11 13" /><path d="m22 2-7 20-4-9-9-4 20-7z" /></>
);

export const Mail = createIcon(
  <><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></>
);

export const KenyaFlag = ({ className = '' }: IconProps) => (
  <svg className={className} width="20" height="20" viewBox="0 0 24 16" fill="none">
    <rect width="24" height="5.33" fill="#1a1a1a" />
    <rect y="5.33" width="24" height="1.78" fill="#fff" />
    <rect y="7.11" width="24" height="1.78" fill="#BE2026" />
    <rect y="8.89" width="24" height="1.78" fill="#fff" />
    <rect y="10.67" width="24" height="5.33" fill="#006600" />
    <path d="M12 2.67c-1.33 0-2.67.89-2.67 2.22v6.22c0 1.33 1.34 2.22 2.67 2.22s2.67-.89 2.67-2.22V4.89c0-1.33-1.34-2.22-2.67-2.22z" fill="#BE2026" />
    <path d="M12 3.56c-.67 0-1.33.44-1.33 1.11v5.78c0 .67.66 1.11 1.33 1.11s1.33-.44 1.33-1.11V4.67c0-.67-.66-1.11-1.33-1.11z" fill="none" stroke="#fff" strokeWidth="0.44" />
    <path d="M10.67 5.33h2.66M10.67 8h2.66" stroke="#fff" strokeWidth="0.44" />
  </svg>
);

export const LogoPlay = ({ className = '' }: IconProps) => (
  <svg className={className} width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
    <polygon points="8,5 8,19 19,12" />
  </svg>
);
