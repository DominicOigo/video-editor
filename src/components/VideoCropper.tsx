import { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import type { CropRegion } from '../types';

interface VideoCropperProps {
  videoSrc: string;
  cropRegion: CropRegion | null;
  onCropChange: (region: CropRegion | null) => void;
  videoWidth: number;
  videoHeight: number;
}

interface AspectRatioPreset {
  label: string;
  ratio: number | null; // null = free / no constraint
  w: number;
  h: number;
}

const ASPECT_PRESETS: AspectRatioPreset[] = [
  { label: '16:9', ratio: 16 / 9, w: 16, h: 9 },
  { label: '9:16', ratio: 9 / 16, w: 9, h: 16 },
  { label: '4:5', ratio: 4 / 5, w: 4, h: 5 },
  { label: '1:1', ratio: 1, w: 1, h: 1 },
  { label: '4:3', ratio: 4 / 3, w: 4, h: 3 },
  { label: 'Free', ratio: null, w: 0, h: 0 },
];

function snapToRatio(
  currentRegion: CropRegion,
  videoWidth: number,
  videoHeight: number,
  ratio: number | null
): CropRegion {
  if (ratio === null) {
    const w = Math.round(videoWidth * 0.8);
    const h = Math.round(videoHeight * 0.8);
    return {
      x: Math.round((videoWidth - w) / 2),
      y: Math.round((videoHeight - h) / 2),
      width: w,
      height: h,
    };
  }

  const centerX = currentRegion.x + currentRegion.width / 2;
  const centerY = currentRegion.y + currentRegion.height / 2;
  const maxLeft = centerX;
  const maxRight = videoWidth - centerX;
  const maxTop = centerY;
  const maxBottom = videoHeight - centerY;
  const maxPossibleWidth = 2 * Math.min(maxLeft, maxRight);
  const maxPossibleHeight = 2 * Math.min(maxTop, maxBottom);

  let newWidth = maxPossibleWidth;
  let newHeight = maxPossibleWidth / ratio;

  if (newHeight > maxPossibleHeight) {
    newHeight = maxPossibleHeight;
    newWidth = maxPossibleHeight * ratio;
  }

  newWidth = Math.min(newWidth, videoWidth);
  newHeight = Math.min(newHeight, videoHeight);

  return {
    x: Math.max(0, Math.round(centerX - newWidth / 2)),
    y: Math.max(0, Math.round(centerY - newHeight / 2)),
    width: Math.round(newWidth),
    height: Math.round(newHeight),
  };
}

export function VideoCropper({
  videoSrc,
  cropRegion,
  onCropChange,
  videoWidth,
  videoHeight,
}: VideoCropperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const previewCanvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const isMobile = useIsMobile();

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [resizeCorner, setResizeCorner] = useState<string | null>(null);
  const dragStartRegionRef = useRef<CropRegion | null>(null);

  // Default crop region (80% of video)
  const defaultRegion: CropRegion = {
    x: Math.round(videoWidth * 0.1),
    y: Math.round(videoHeight * 0.1),
    width: Math.round(videoWidth * 0.8),
    height: Math.round(videoHeight * 0.8),
  };

  const region = cropRegion || defaultRegion;

  // Ref to latest region for the RAF draw loop (avoids recreating the callback)
  const regionRef = useRef(region);
  regionRef.current = region;

  // Detect which preset (if any) matches the current region ratio
  const activePreset = useMemo(() => {
    const currentRatio = region.width / region.height;
    for (const preset of ASPECT_PRESETS) {
      if (preset.ratio === null) continue;
      if (Math.abs(currentRatio / preset.ratio - 1) < 0.01) {
        return preset.label;
      }
    }
    return null;
  }, [region]);

  const containerWidth = containerRef.current?.clientWidth || 400;
  const displayScale = containerWidth / videoWidth;

  // ── Real-time crop preview canvas draw loop ──
  const drawPreviewFrame = useCallback(() => {
    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    if (!video || !canvas || video.readyState < 2) return;

    const rect = canvas.getBoundingClientRect();
    const cw = Math.round(rect.width * (window.devicePixelRatio || 1));
    const ch = Math.round(rect.height * (window.devicePixelRatio || 1));

    // Resize canvas backing store only when needed
    if (canvas.width !== cw || canvas.height !== ch) {
      canvas.width = cw;
      canvas.height = ch;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const r = regionRef.current;

    ctx.clearRect(0, 0, cw, ch);

    // Dark rounded background
    ctx.fillStyle = '#0a0a0f';
    ctx.beginPath();
    ctx.roundRect(0, 0, cw, ch, 8);
    ctx.fill();

    // Draw the cropped region from the video, scaled to fill the canvas
    ctx.drawImage(video, r.x, r.y, r.width, r.height, 0, 0, cw, ch);

    // Subtle border
    ctx.strokeStyle = 'rgba(251, 146, 60, 0.4)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.roundRect(0.5, 0.5, cw - 1, ch - 1, 8);
    ctx.stroke();

    rafRef.current = requestAnimationFrame(drawPreviewFrame);
  }, []);

  // Start / stop the draw loop based on video state
  useEffect(() => {
    const video = videoRef.current;
    const canvas = previewCanvasRef.current;
    if (!video || !canvas) return;

    const startLoop = () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(drawPreviewFrame);
    };

    const stopLoop = () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      // Draw one last frame on pause
      drawPreviewFrame();
    };

    video.addEventListener('play', startLoop);
    video.addEventListener('pause', stopLoop);
    video.addEventListener('seeked', drawPreviewFrame);

    // Initial frame (video might already be playing)
    if (!video.paused) {
      startLoop();
    } else {
      drawPreviewFrame();
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      video.removeEventListener('play', startLoop);
      video.removeEventListener('pause', stopLoop);
      video.removeEventListener('seeked', drawPreviewFrame);
    };
  }, [drawPreviewFrame]);

  // Draw one frame whenever crop region changes (for instant feedback while dragging)
  useEffect(() => {
    if (rafRef.current === 0) {
      drawPreviewFrame();
    }
  }, [region, drawPreviewFrame]);

  const handleDragStart = useCallback(
    (e: React.MouseEvent | React.TouchEvent, action: 'drag' | 'resize', corner?: string) => {
      e.preventDefault();
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Save the region at drag start so all deltas are computed from this original position
      dragStartRegionRef.current = { ...region };

      if (action === 'drag') {
        setIsDragging(true);
        setDragStart({ x: clientX, y: clientY });
      } else {
        setIsResizing(true);
        setResizeCorner(corner || null);
        setDragStart({ x: clientX, y: clientY });
      }
    },
    [region]
  );

  // Mouse events
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      e.preventDefault();
      const dx = (e.clientX - dragStart.x) / displayScale;
      const dy = (e.clientY - dragStart.y) / displayScale;
      updateRegion(dx, dy);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeCorner(null);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, isResizing]);

  // Touch events for mobile
  useEffect(() => {
    if (!isDragging && !isResizing) return;

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const touch = e.touches[0];
      const dx = (touch.clientX - dragStart.x) / displayScale;
      const dy = (touch.clientY - dragStart.y) / displayScale;
      updateRegion(dx, dy);
    };

    const handleTouchEnd = () => {
      setIsDragging(false);
      setIsResizing(false);
      setResizeCorner(null);
    };

    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
    window.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
      window.removeEventListener('touchcancel', handleTouchEnd);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDragging, isResizing]);

  // Shared region update logic — always computes from the ORIGINAL drag-start region
  const updateRegion = useCallback(
    (dx: number, dy: number) => {
      const orig = dragStartRegionRef.current;
      if (!orig) return;

      if (isDragging) {
        const newRegion: CropRegion = {
          x: Math.max(0, Math.min(orig.x + dx, videoWidth - orig.width)),
          y: Math.max(0, Math.min(orig.y + dy, videoHeight - orig.height)),
          width: orig.width,
          height: orig.height,
        };
        onCropChange(newRegion);
      } else if (isResizing) {
        let { x, y, width, height } = orig;

        switch (resizeCorner) {
          case 'nw':
            x = Math.max(0, Math.min(x + dx, x + width - 50));
            y = Math.max(0, Math.min(y + dy, y + height - 50));
            width = orig.width + (orig.x - x);
            height = orig.height + (orig.y - y);
            break;
          case 'ne':
            y = Math.max(0, Math.min(y + dy, y + height - 50));
            width = Math.max(50, Math.min(width + dx, videoWidth - x));
            height = orig.height + (orig.y - y);
            break;
          case 'sw':
            x = Math.max(0, Math.min(x + dx, x + width - 50));
            width = orig.width + (orig.x - x);
            height = Math.max(50, Math.min(height + dy, videoHeight - y));
            break;
          case 'se':
            width = Math.max(50, Math.min(width + dx, videoWidth - x));
            height = Math.max(50, Math.min(height + dy, videoHeight - y));
            break;
        }

        onCropChange({ x, y, width, height });
      }
    },
    [isDragging, isResizing, dragStart, displayScale, videoWidth, videoHeight, onCropChange, resizeCorner]
  );

  const handleReset = () => onCropChange(null);

  const handlePresetClick = useCallback(
    (preset: AspectRatioPreset) => {
      const snapped = snapToRatio(region, videoWidth, videoHeight, preset.ratio);
      onCropChange(snapped);
    },
    [region, videoWidth, videoHeight, onCropChange]
  );

  const left = region.x * displayScale;
  const top = region.y * displayScale;
  const width = region.width * displayScale;
  const height = region.height * displayScale;

  // Preview canvas dimensions
  const previewRatio = region.width / region.height;
  const previewMaxHeight = isMobile ? 100 : 120;
  let previewWidth = containerWidth;
  let previewHeight = containerWidth / previewRatio;
  if (previewHeight > previewMaxHeight) {
    previewHeight = previewMaxHeight;
    previewWidth = previewHeight * previewRatio;
  }

  if (!videoSrc) {
    return (
      <div className="p-4">
        <div className="aspect-video rounded-xl bg-surface-900/50 border border-surface-800/50 flex items-center justify-center">
          <p className="text-surface-500 text-sm">Upload a video to crop</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-white">Crop Video</h3>
        <button
          onClick={handleReset}
          className="text-xs text-primary-400 hover:text-primary-300 transition-colors"
        >
          Reset
        </button>
      </div>

      {/* Aspect Ratio Presets */}
      <div className="flex flex-wrap gap-1.5">
        {ASPECT_PRESETS.map((preset) => (
          <button
            key={preset.label}
            onClick={() => handlePresetClick(preset)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 ${
              activePreset === preset.label
                ? 'bg-primary-500 text-white shadow-lg shadow-primary-500/30'
                : 'bg-surface-800/80 text-surface-400 border border-surface-700/50 hover:border-surface-600/50 hover:text-surface-200'
            }`}
          >
            {preset.label}
            {preset.ratio !== null && (
              <span className="ml-1 opacity-60">({preset.w}:{preset.h})</span>
            )}
          </button>
        ))}
      </div>

      {/* Cropper Canvas */}
      <div
        ref={containerRef}
        className="relative rounded-xl overflow-hidden bg-black select-none touch-none"
        style={{ maxHeight: isMobile ? '180px' : '260px' }}
      >
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain"
          muted
          loop
          autoPlay
          playsInline
        />

        {/* Dark overlay */}
        <svg
          className="absolute inset-0 w-full h-full"
          viewBox={`0 0 ${videoWidth} ${videoHeight}`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs>
            <mask id="cropMask">
              <rect width={videoWidth} height={videoHeight} fill="white" />
              <rect
                x={region.x}
                y={region.y}
                width={region.width}
                height={region.height}
                fill="black"
              />
            </mask>
          </defs>
          <rect
            width={videoWidth}
            height={videoHeight}
            fill="rgba(0,0,0,0.5)"
            mask="url(#cropMask)"
          />
        </svg>

        {/* Crop region overlay */}
        <div
          className={`absolute border-2 border-primary-400/80 ${
            isMobile ? 'cursor-default' : 'cursor-move'
          }`}
          style={{ left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` }}
          onMouseDown={(e) => handleDragStart(e, 'drag')}
          onTouchStart={(e) => handleDragStart(e, 'drag')}
        >
          {['nw', 'ne', 'sw', 'se'].map((corner) => (
            <div
              key={corner}
              className={`absolute bg-primary-500 border-2 border-white rounded-sm shadow-lg transition-transform ${
                isMobile ? 'w-6 h-6 cursor-default' : 'w-4 h-4 cursor-nw-resize hover:scale-125'
              }`}
              style={{
                [corner.includes('n') ? 'top' : 'bottom']: isMobile ? -12 : -8,
                [corner.includes('w') ? 'left' : 'right']: isMobile ? -12 : -8,
              }}
              onMouseDown={(e) => { e.stopPropagation(); handleDragStart(e, 'resize', corner); }}
              onTouchStart={(e) => { e.stopPropagation(); handleDragStart(e, 'resize', corner); }}
            />
          ))}

          {/* Grid lines */}
          <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
            <div className="border-r border-b border-white/20" />
            <div className="border-r border-b border-white/20" />
            <div className="border-b border-white/20" />
            <div className="border-r border-white/20" />
            <div className="border-r border-white/20" />
            <div className="border-white/20" />
            <div className="border-r border-white/20" />
            <div className="border-r border-white/20" />
            <div />
          </div>

          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pointer-events-none">
            <span className="text-white/70 text-[11px] font-medium bg-black/50 px-2 py-0.5 rounded">
              {Math.round(region.width)}×{Math.round(region.height)}
            </span>
          </div>
        </div>
      </div>

      {/* ── Real-time Crop Preview ── */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] font-semibold text-surface-500 uppercase tracking-wider">
            Preview
          </span>
          <span className="chip text-[10px]">
            {region.width.toFixed(0)} × {region.height.toFixed(0)}
          </span>
        </div>
        <div
          className="relative mx-auto"
          style={{ width: `${previewWidth}px`, height: `${previewHeight}px` }}
        >
          <canvas
            ref={previewCanvasRef}
            className="w-full h-full rounded-lg"
            style={{ imageRendering: 'auto' }}
          />
          {/* Glow ring while dragging */}
          {(isDragging || isResizing) && (
            <div className="absolute inset-0 rounded-lg ring-2 ring-primary-500/40 ring-offset-1 ring-offset-surface-950 pointer-events-none animate-pulse-slow" />
          )}
        </div>
      </div>

      {/* Dimensions & ratio display */}
      <div className="flex items-center gap-2 sm:gap-3 text-[11px] sm:text-xs text-surface-400 flex-wrap">
        {cropRegion && (
          <span className="chip">
            Ratio: {(region.width / region.height).toFixed(2)}
          </span>
        )}
        {cropRegion && (
          <span className="chip">
            Offset: ({region.x.toFixed(0)}, {region.y.toFixed(0)})
          </span>
        )}
      </div>
    </div>
  );
}
