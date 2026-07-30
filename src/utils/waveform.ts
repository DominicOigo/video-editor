/**
 * Extract real audio waveform peak data from an audio blob using the Web Audio API.
 * Results are cached per blob URL to avoid re-decoding.
 */

// Simple in-memory cache: key is `${blobUrl}|${numBars}`
const waveformCache = new Map<string, Float32Array>();

let sharedAudioContext: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!sharedAudioContext || sharedAudioContext.state === 'closed') {
    sharedAudioContext = new AudioContext();
  }
  return sharedAudioContext;
}

/**
 * Given an audio blob and a target number of bars, returns a Float32Array
 * of length `numBars` with peak amplitude values normalized to 0..1.
 */
export async function extractAudioPeaks(
  blob: Blob,
  numBars: number
): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = getAudioContext();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Get the first channel's PCM data
  const channelData = audioBuffer.getChannelData(0); // Float32Array, values -1..1
  const totalSamples = channelData.length;

  if (totalSamples === 0) {
    return new Float32Array(numBars).fill(0);
  }

  // Downsample to numBars by taking the peak (max absolute value) per chunk
  const peaks = new Float32Array(numBars);
  const samplesPerBar = Math.max(1, Math.floor(totalSamples / numBars));

  for (let bar = 0; bar < numBars; bar++) {
    let peak = 0;
    const start = bar * samplesPerBar;
    const end = Math.min(start + samplesPerBar, totalSamples);
    for (let i = start; i < end; i++) {
      const abs = Math.abs(channelData[i]);
      if (abs > peak) peak = abs;
    }
    peaks[bar] = Math.min(1, peak * 1.2); // slight amplification for visibility
  }

  return peaks;
}

/**
 * Fetch a blob from a URL (if needed) and extract waveform peaks.
 * Uses caching to avoid re-decoding the same blob.
 */
export async function getWaveformPeaks(
  blobOrUrl: Blob | string,
  numBars: number
): Promise<Float32Array> {
  const cacheKey =
    typeof blobOrUrl === 'string'
      ? `${blobOrUrl}|${numBars}`
      : `${(blobOrUrl as Blob).size}|${numBars}`;

  const cached = waveformCache.get(cacheKey);
  if (cached) return cached;

  const blob =
    typeof blobOrUrl === 'string'
      ? await fetch(blobOrUrl).then((r) => r.blob())
      : blobOrUrl;

  const peaks = await extractAudioPeaks(blob, numBars);

  // Cache it
  waveformCache.set(cacheKey, peaks);

  return peaks;
}

/**
 * Clear the waveform cache (useful when memory is a concern).
 */
export function clearWaveformCache(): void {
  waveformCache.clear();
}
