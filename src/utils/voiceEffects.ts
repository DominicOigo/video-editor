/**
 * Voice Effects Processing Engine
 *
 * Uses Web Audio API for:
 * - Pitch shift (via detune — preserves original duration)
 * - Speed control (playbackRate)
 * - Gender presets (pitch + EQ)
 * - Reverb (ConvolverNode with generated impulse response)
 * - Robot (WaveShaper + periodic modulation)
 * - Volume (GainNode)
 * - Combined personalities
 *
 * Two modes:
 * 1. Real-time preview: connectAudioNodes(audioBuffer, effects) → destination
 * 2. Offline rendering: renderEffects(audioBuffer, effects) → Blob
 */

export interface VoiceEffects {
  /** Pitch shift in semitones (-12 to +12). 0 = no change. */
  pitch: number;
  /** Playback speed (0.5 to 2.0). 1 = normal. */
  speed: number;
  /** Reverb wet mix (0 to 1). 0 = dry. */
  reverb: number;
  /** Robot/distortion intensity (0 to 1). 0 = off. */
  robot: number;
  /** Volume multiplier (0 to 2). 1 = normal. */
  volume: number;
  /** Named preset. 'custom' when user tweaks individual sliders. */
  preset: VoicePreset;
}

export type VoicePreset =
  | 'natural'
  | 'deep'
  | 'chipmunk'
  | 'robot'
  | 'alien'
  | 'helium'
  | 'monster'
  | 'whisper'
  | 'radio'
  | 'echo'
  | 'custom';

/** Preset definitions — each tweaks specific parameters */
export const VOICE_PRESETS: Record<Exclude<VoicePreset, 'custom'>, Partial<VoiceEffects>> = {
  natural: { pitch: 0, speed: 1, reverb: 0, robot: 0, volume: 1 },
  deep: { pitch: -7, speed: 0.85, reverb: 0.3, robot: 0, volume: 1.2 },
  chipmunk: { pitch: 10, speed: 1.3, reverb: 0, robot: 0, volume: 0.9 },
  robot: { pitch: -2, speed: 1, reverb: 0.15, robot: 0.7, volume: 1 },
  alien: { pitch: 8, speed: 0.7, reverb: 0.4, robot: 0.3, volume: 0.9 },
  helium: { pitch: 12, speed: 1.5, reverb: 0, robot: 0, volume: 0.8 },
  monster: { pitch: -10, speed: 0.6, reverb: 0.5, robot: 0.4, volume: 1.3 },
  whisper: { pitch: 3, speed: 0.9, reverb: 0.1, robot: 0, volume: 0.7 },
  radio: { pitch: 0, speed: 1, reverb: 0.3, robot: 0, volume: 1.15 },
  echo: { pitch: 0, speed: 1, reverb: 0.7, robot: 0, volume: 1 },
};

/** Apply a preset on top of existing effects (merges, doesn't fully replace) */
export function applyPreset(
  preset: VoicePreset,
  current?: VoiceEffects
): VoiceEffects {
  if (preset === 'custom') {
    return current || DEFAULT_EFFECTS;
  }
  const base = current || DEFAULT_EFFECTS;
  const presetValues = VOICE_PRESETS[preset];
  return { ...base, ...presetValues, preset };
}

export const DEFAULT_EFFECTS: VoiceEffects = {
  pitch: 0,
  speed: 1,
  reverb: 0,
  robot: 0,
  volume: 1,
  preset: 'natural',
};

/**
 * Pitch shift in semitones to cents.
 * 1 semitone = 100 cents. Web Audio detune uses cents.
 */
function semitonesToCents(semitones: number): number {
  return semitones * 100;
}

/**
 * Create a simple impulse response for reverb.
 * Generates a decaying noise burst.
 */
function createReverbImpulse(
  context: BaseAudioContext,
  duration: number,
  decay: number
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = Math.floor(sampleRate * duration);
  const buffer = context.createBuffer(2, length, sampleRate);

  for (let channel = 0; channel < 2; channel++) {
    const data: Float32Array = buffer.getChannelData(channel) as unknown as Float32Array;
    for (let i = 0; i < length; i++) {
      const t = i / sampleRate;
      // Exponentially decaying white noise
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t / duration, decay);
    }
  }

  return buffer;
}

/**
 * Create a waveshaping curve for robot/distortion effect.
 */
function createRobotCurve(steps: number, intensity: number): Float32Array {
  const samples = 256;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i / samples) * 2 - 1;
    // Quantize + distort based on intensity
    const quantized = Math.round(x * steps) / steps;
    curve[i] = x * (1 - intensity) + quantized * intensity;
  }
  return curve;
}

/**
 * Helper: decode an audio blob into an AudioBuffer
 */
async function decodeAudioData(
  audioCtx: AudioContext | OfflineAudioContext,
  blob: Blob
): Promise<AudioBuffer> {
  const arrayBuffer = await blob.arrayBuffer();
  return audioCtx.decodeAudioData(arrayBuffer);
}

/**
 * Helper: encode an AudioBuffer to a WAV blob
 */
function audioBufferToWav(buffer: AudioBuffer): Blob {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const format = 1; // PCM
  const bitsPerSample = 16;

  const data: Float32Array = buffer.getChannelData(0) as unknown as Float32Array;
  const dataLength = data.length * numChannels * (bitsPerSample / 8);
  const headerLength = 44;
  const totalLength = headerLength + dataLength;

  const arrayBuffer = new ArrayBuffer(totalLength);
  const view = new DataView(arrayBuffer);

  // RIFF header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, totalLength - 8, true);
  writeString(view, 8, 'WAVE');

  // fmt chunk
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * (bitsPerSample / 8), true);
  view.setUint16(32, numChannels * (bitsPerSample / 8), true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  writeString(view, 36, 'data');
  view.setUint32(40, dataLength, true);

  let offset = 44;
  for (let i = 0; i < data.length; i++) {
    const sample = Math.max(-1, Math.min(1, data[i]));
    const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
    view.setInt16(offset, intSample, true);
    offset += 2;
  }

  return new Blob([arrayBuffer], { type: 'audio/wav' });
}

function writeString(view: DataView, offset: number, str: string): void {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

/**
 * Apply voice effects in REAL-TIME by connecting audio nodes to a destination.
 * Returns a cleanup function to disconnect/stop everything.
 *
 * Use this for previewing effects while tweaking sliders.
 */
export function connectEffectsNodes(
  audioCtx: AudioContext,
  audioBuffer: AudioBuffer,
  effects: VoiceEffects,
  destination: AudioNode
): () => void {
  const nodes: AudioNode[] = [];

  // Source
  const source = audioCtx.createBufferSource();
  source.buffer = audioBuffer;
  source.detune.value = semitonesToCents(effects.pitch);
  source.playbackRate.value = effects.speed;
  nodes.push(source);

  let lastNode: AudioNode = source;

  // Robot / distortion
  if (effects.robot > 0) {
    const shaper = audioCtx.createWaveShaper();
    // @ts-expect-error - TS Float32Array generic version mismatch with DOM types
    shaper.curve = createRobotCurve(12, effects.robot);
    lastNode.connect(shaper);
    lastNode = shaper;
    nodes.push(shaper);

    // Add LFO modulation for robot warble
    const lfo = audioCtx.createOscillator();
    lfo.frequency.value = 4 + effects.robot * 6; // 4-10 Hz
    const lfoGain = audioCtx.createGain();
    lfoGain.gain.value = effects.robot * 0.15; // subtle pitch modulation
    lfo.connect(lfoGain);
    // LFO modulates source detune
    lfoGain.connect(source.detune);
    lfo.start();
    nodes.push(lfo, lfoGain);
  }

  // Reverb
  if (effects.reverb > 0) {
    const convolver = audioCtx.createConvolver();
    convolver.buffer = createReverbImpulse(audioCtx, 1.5, 3);
    const reverbGain = audioCtx.createGain();
    reverbGain.gain.value = effects.reverb;
    const dryGain = audioCtx.createGain();
    dryGain.gain.value = 1 - effects.reverb * 0.5;

    lastNode.connect(dryGain);
    lastNode.connect(convolver);
    convolver.connect(reverbGain);

    const mixGain = audioCtx.createGain();
    dryGain.connect(mixGain);
    reverbGain.connect(mixGain);

    lastNode = mixGain;
    nodes.push(convolver, reverbGain, dryGain, mixGain);
  }

  // Volume
  const volumeGain = audioCtx.createGain();
  volumeGain.gain.value = effects.volume;
  lastNode.connect(volumeGain);
  lastNode = volumeGain;
  nodes.push(volumeGain);

  // Connect to destination
  lastNode.connect(destination);

  // Start playback
  source.start();

  return () => {
    try { source.stop(); } catch { /* already stopped */ }
    for (const node of nodes) {
      try { node.disconnect(); } catch { /* already disconnected */ }
    }
  };
}

/**
 * Render voice effects to a new audio blob using OfflineAudioContext.
 * This bakes all effects into the audio so it can be saved.
 *
 * @returns The processed audio as a WAV blob
 */
export async function renderEffects(
  audioBuffer: AudioBuffer,
  effects: VoiceEffects
): Promise<Blob> {
  const sampleRate = audioBuffer.sampleRate;
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;

  // Step 1: Apply pitch shift + speed using detune (preserves duration)
  // We render at original length with detune applied
  const pitchCents = semitonesToCents(effects.pitch);

  // For speed changes that aren't 1:1, we need to adjust length
  // If speed = 2, the audio plays twice as fast, so we need half the length
  const speedAdjustedLength = Math.round(length / effects.speed);

  const offline1 = new OfflineAudioContext(
    numChannels,
    speedAdjustedLength,
    sampleRate
  );

  const source1 = offline1.createBufferSource();
  source1.buffer = audioBuffer;
  source1.detune.value = pitchCents;
  source1.playbackRate.value = effects.speed;

  // Apply robot effect offline
  let lastNode1: AudioNode = source1;

  if (effects.robot > 0) {
    const shaper = offline1.createWaveShaper();
    // @ts-expect-error - TS Float32Array generic version mismatch with DOM types
    shaper.curve = createRobotCurve(12, effects.robot);
    lastNode1.connect(shaper);
    lastNode1 = shaper;

    // LFO for modulation (offline-compatible rendering)
    const lfo = offline1.createOscillator();
    lfo.frequency.value = 4 + effects.robot * 6;
    const lfoGain = offline1.createGain();
    lfoGain.gain.value = effects.robot * 0.15;
    lfo.connect(lfoGain);
    lfoGain.connect(source1.detune);
    lfo.start(lfoGain.context.currentTime);
    lfo.stop(lfoGain.context.currentTime + (length / sampleRate / effects.speed));
  }

  lastNode1.connect(offline1.destination);
  source1.start();

  const pitchedBuffer = await offline1.startRendering();

  // Step 2: Apply reverb
  let reverbBuffer = pitchedBuffer;
  if (effects.reverb > 0) {
    const offline2 = new OfflineAudioContext(
      numChannels,
      pitchedBuffer.length + Math.floor(sampleRate * 2), // extra 2s for reverb tail
      sampleRate
    );

    const source2 = offline2.createBufferSource();
    source2.buffer = pitchedBuffer;

    const convolver = offline2.createConvolver();
    convolver.buffer = createReverbImpulse(offline2, 1.5, 3);

    const dryGain = offline2.createGain();
    dryGain.gain.value = 1 - effects.reverb * 0.5;
    const reverbGain = offline2.createGain();
    reverbGain.gain.value = effects.reverb;

    const mixGain = offline2.createGain();
    mixGain.gain.value = effects.volume; // apply volume here

    source2.connect(dryGain);
    source2.connect(convolver);
    convolver.connect(reverbGain);
    dryGain.connect(mixGain);
    reverbGain.connect(mixGain);
    mixGain.connect(offline2.destination);

    source2.start();
    reverbBuffer = await offline2.startRendering();
  } else if (effects.volume !== 1) {
    // Just apply volume
    const offline2 = new OfflineAudioContext(
      numChannels,
      pitchedBuffer.length,
      sampleRate
    );

    const source2 = offline2.createBufferSource();
    source2.buffer = pitchedBuffer;
    const gain = offline2.createGain();
    gain.gain.value = effects.volume;
    source2.connect(gain);
    gain.connect(offline2.destination);
    source2.start();
    reverbBuffer = await offline2.startRendering();
  }

  return audioBufferToWav(reverbBuffer);
}

/**
 * Get duration info for preview: renders quickly just to get timing
 */
export function estimateDuration(
  originalDuration: number,
  effects: VoiceEffects
): number {
  const speedAdjusted = originalDuration / effects.speed;
  const reverbTail = effects.reverb > 0 ? 0.3 : 0;
  return speedAdjusted + reverbTail;
}

/**
 * Play processed audio through the AudioContext for preview.
 * Returns a cleanup function.
 */
export function playProcessedAudio(
  audioCtx: AudioContext,
  processedBlob: Blob,
  destination: AudioNode
): Promise<() => void> {
  return new Promise(async (resolve, reject) => {
    try {
      const arrayBuffer = await processedBlob.arrayBuffer();
      const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

      const source = audioCtx.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(destination);
      source.start();

      resolve(() => {
        try { source.stop(); } catch { }
        try { source.disconnect(); } catch { }
      });
    } catch (err) {
      reject(err);
    }
  });
}
