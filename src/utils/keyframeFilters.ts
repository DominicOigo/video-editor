import type { Keyframe } from '../types';

/**
 * Easing function that maps t (0..1) to an eased value (0..1).
 */
function ease(t: number, easing: string): number {
  switch (easing) {
    case 'ease-in':
      return t * t;
    case 'ease-out':
      return t * (2 - t);
    case 'ease-in-out':
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    default:
      return t; // linear
  }
}

/**
 * Interpolate a property value at a given time given the keyframes.
 * Returns the interpolated value.
 */
function interpolateAt(
  time: number,
  keyframes: Keyframe[],
  getValue: (kf: Keyframe) => number
): number {
  if (keyframes.length === 0) return 0;
  if (keyframes.length === 1) return getValue(keyframes[0]);

  // Find the two keyframes we're between
  let prev = keyframes[0];
  let next = keyframes[keyframes.length - 1];

  for (let i = 0; i < keyframes.length - 1; i++) {
    if (time >= keyframes[i].time && time <= keyframes[i + 1].time) {
      prev = keyframes[i];
      next = keyframes[i + 1];
      break;
    }
  }

  if (time <= prev.time) return getValue(prev);
  if (time >= next.time) return getValue(next);

  const range = next.time - prev.time;
  if (range === 0) return getValue(prev);

  const rawT = (time - prev.time) / range;
  const easedT = ease(rawT, prev.easing);
  const v1 = getValue(prev);
  const v2 = getValue(next);

  return v1 + (v2 - v1) * easedT;
}

/**
 * Generate FFmpeg filter strings that apply keyframe animations.
 * Uses FFmpeg's expression system with the `t` (time) variable.
 *
 * For each property (scale, rotation, opacity, position x/y),
 * this generates a piecewise interpolation expression and
 * returns the appropriate filter strings.
 */
export function generateKeyframeFilters(
  keyframes: Keyframe[],
  outputWidth: number,
  outputHeight: number
): string[] {
  if (!keyframes || keyframes.length === 0) return [];

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);

  // We'll build an FFmpeg expression for each property
  // FFmpeg's `t` variable starts from 0 at the trim point, so keyframe times are relative

  /**
   * Build an FFmpeg expression string for piecewise linear interpolation.
   * value at time t = if(between(t, t0, t1), v0 + (v1-v0)*(t-t0)/(t1-t0), if(between(t, t1, t2), ... , vN))
   */
  function buildExpr(getValue: (kf: Keyframe) => number): string {
    const n = sorted.length;
    if (n === 1) return getValue(sorted[0]).toString();

    // Recursively build the expression from the last keyframe backward
    function buildFrom(i: number): string {
      if (i === n - 1) {
        return getValue(sorted[i]).toString();
      }
      const kf = sorted[i];
      const nextKf = sorted[i + 1];
      // Use keyframe time directly since t is relative to output start
      const t0 = kf.time.toFixed(3);
      const t1 = nextKf.time.toFixed(3);
      const v0 = getValue(kf);
      const v1 = getValue(nextKf);

      if (n === 2) {
        return `${v0}+(${v1}-${v0})*(t-${t0})/(${t1}-${t0})`;
      }

      return `if(between(t,${t0},${t1}),${v0}+(${v1}-${v0})*(t-${t0})/(${t1}-${t0}),${buildFrom(i + 1)})`;
    }

    // Clamp: if before first keyframe, use first; if after last, use last
    const firstT = sorted[0].time.toFixed(3);
    const lastT = sorted[n - 1].time.toFixed(3);
    const firstV = getValue(sorted[0]);
    const lastV = getValue(sorted[n - 1]);

    return `if(lt(t,${firstT}),${firstV},if(gt(t,${lastT}),${lastV},${buildFrom(0)}))`;
  }

  const filters: string[] = [];

  // --- SCALE ---
  // Use scale filter with expression
  const scaleExpr = buildExpr((kf) => kf.scale);
  filters.push(`scale=iw*(${scaleExpr}):ih*(${scaleExpr}):flags=bilinear`);

  // --- ROTATION ---
  // Use rotate filter with expression (in radians)
  const rotExpr = buildExpr((kf) => kf.rotation);
  filters.push(
    `rotate=(${rotExpr})*PI/180:ow=rotw(${rotExpr}*PI/180):oh=roth(${rotExpr}*PI/180):c=black@0`
  );

  // --- OPACITY ---
  // Use colorchannelmixer for opacity via alpha channel
  const opacityExpr = buildExpr((kf) => kf.opacity);
  filters.push(`format=rgba,colorchannelmixer=aa=${opacityExpr}`);

  // --- POSITION (X, Y) ---
  // Use pad to shift the frame. Position offsets are percentages of output dimensions.
  const posXExpr = buildExpr((kf) => kf.position.x);
  const posYExpr = buildExpr((kf) => kf.position.y);

  // Convert percentage offset to pixels: offset_px = offset_pct / 100 * output_dim / 2
  // Then pad the frame to create the offset effect
  const padX = `(${posXExpr})/100*${outputWidth}/2`;
  const padY = `(${posYExpr})/100*${outputHeight}/2`;

  // Pad to make room for the offset, then crop back to output size
  // Actually, we can use the `pad` filter with x/y offset
  // x = center_x + padX, y = center_y + padY
  filters.push(
    `pad=w=${outputWidth}:h=${outputHeight}:x=(${outputWidth}-iw)/2+${padX}:y=(${outputHeight}-ih)/2+${padY}:color=black@0`
  );

  return filters;
}

/**
 * Pre-compute all interpolated property values at a given time (for preview).
 */
export function computeKeyframeState(
  keyframes: Keyframe[],
  time: number
): { position: { x: number; y: number }; scale: number; rotation: number; opacity: number } | null {
  if (!keyframes || keyframes.length === 0) return null;

  return {
    position: {
      x: interpolateAt(time, keyframes, (k) => k.position.x),
      y: interpolateAt(time, keyframes, (k) => k.position.y),
    },
    scale: interpolateAt(time, keyframes, (k) => k.scale),
    rotation: interpolateAt(time, keyframes, (k) => k.rotation),
    opacity: interpolateAt(time, keyframes, (k) => k.opacity),
  };
}
