import { useState, useRef, useCallback, useEffect } from 'react';
import { useIsMobile } from '../hooks/useMediaQuery';
import {
  Mic,
  Square,
  Play,
  Pause,
  Check,
  RotateCcw,
  Trash2,
  ArrowLeft,
} from './Icons';
import type { VoiceoverTrack } from '../types';

interface VoiceoverStudioProps {
  videoSrc: string;
  currentTime: number;
  onBack: () => void;
  onSave: (track: VoiceoverTrack) => void;
  existingCount: number;
}

type StudioStage = 'idle' | 'recording' | 'paused' | 'stopped';

interface Take {
  id: string;
  blob: Blob;
  url: string;
  duration: number;
}

export function VoiceoverStudio({
  videoSrc,
  currentTime,
  onBack,
  onSave,
  existingCount,
}: VoiceoverStudioProps) {
  const isMobile = useIsMobile();

  const [stage, setStage] = useState<StudioStage>('idle');
  const [recordTime, setRecordTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const [takes, setTakes] = useState<Take[]>([]);
  const [activeTakeId, setActiveTakeId] = useState<string | null>(null);
  const [isPlayingTake, setIsPlayingTake] = useState(false);
  const activeTake = takes.find((t) => t.id === activeTakeId) || null;

  const videoRef = useRef<HTMLVideoElement>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef(0);
  const recordStartVideoTimeRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const previewCleanupRef = useRef<(() => void) | null>(null);
  const levelRafRef = useRef<number>(0);
  const analyserRef = useRef<AnalyserNode | null>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = currentTime;
    }
  }, [currentTime]);

  useEffect(() => {
    return () => {
      stopRecording(true);
      if (audioCtxRef.current) {
        audioCtxRef.current.close();
      }
      if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
      takes.forEach((t) => URL.revokeObjectURL(t.url));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startLevelMonitor = useCallback((stream: MediaStream) => {
    try {
      const ctx = new AudioContext();
      audioCtxRef.current = ctx;
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const data = new Uint8Array(analyser.frequencyBinCount);
      const loop = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteTimeDomainData(data);
        let max = 0;
        for (let i = 0; i < data.length; i++) {
          const v = Math.abs(data[i] - 128);
          if (v > max) max = v;
        }
        setAudioLevel(max / 128);
        levelRafRef.current = requestAnimationFrame(loop);
      };
      loop();
    } catch {
      // Non-critical
    }
  }, []);

  const stopLevelMonitor = useCallback(() => {
    if (levelRafRef.current) cancelAnimationFrame(levelRafRef.current);
    if (audioCtxRef.current) {
      audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    analyserRef.current = null;
    setAudioLevel(0);
  }, []);

  const startRecording = useCallback(async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';

      const recorder = new MediaRecorder(stream, { mimeType });
      recorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onerror = () => {
        setError('Recording failed');
        stopRecording(true);
      };

      recorder.start(100);
      startTimeRef.current = Date.now();

      timerRef.current = setInterval(() => {
        setRecordTime((Date.now() - startTimeRef.current) / 1000);
      }, 100);

      startLevelMonitor(stream);

      recordStartVideoTimeRef.current = videoRef.current?.currentTime || 0;

      videoRef.current?.play();

      setStage('recording');
    } catch (err) {
      if (err instanceof DOMException && err.name === 'NotAllowedError') {
        setError('Microphone access denied. Please allow microphone access.');
      } else {
        setError('Could not access microphone.');
      }
    }
  }, [startLevelMonitor]);

  const pauseRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.pause();
      videoRef.current?.pause();
      if (timerRef.current) clearInterval(timerRef.current);
      setStage('paused');
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'paused') {
      recorderRef.current.resume();
      videoRef.current?.play();
      timerRef.current = setInterval(() => {
        setRecordTime((Date.now() - startTimeRef.current) / 1000);
      }, 100);
      setStage('recording');
    }
  }, []);

  const stopRecording = useCallback(
    async (cancel = false) => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
      stopLevelMonitor();
      videoRef.current?.pause();

      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        if (cancel) {
          recorderRef.current.onstop = null;
          recorderRef.current.stop();
        } else {
          await new Promise<void>((resolve) => {
            if (!recorderRef.current) { resolve(); return; }
            recorderRef.current.onstop = () => resolve();
            recorderRef.current.stop();
          });
        }
      }

      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }

      if (!cancel) {
        const duration = (Date.now() - startTimeRef.current) / 1000;
        const blob = new Blob(audioChunksRef.current, {
          type: recorderRef.current?.mimeType || 'audio/webm',
        });
        const url = URL.createObjectURL(blob);

        const newTake: Take = {
          id: crypto.randomUUID(),
          blob,
          url,
          duration,
        };

        setTakes((prev) => [...prev, newTake]);
        setActiveTakeId(newTake.id);
        setRecordTime(0);
        setStage('stopped');
      } else {
        setRecordTime(0);
        setStage('idle');
      }

      recorderRef.current = null;
    },
    [stopLevelMonitor]
  );

  const cancelRecording = useCallback(() => {
    stopRecording(true);
  }, [stopRecording]);

  const deleteTake = useCallback(
    (takeId: string) => {
      setTakes((prev) => {
        const deleted = prev.find((t) => t.id === takeId);
        if (deleted) URL.revokeObjectURL(deleted.url);
        const filtered = prev.filter((t) => t.id !== takeId);
        if (activeTakeId === takeId) {
          const next = filtered[filtered.length - 1] || null;
          setActiveTakeId(next?.id || null);
          if (!next) setStage('idle');
        }
        return filtered;
      });
    },
    [activeTakeId]
  );

  const playTake = useCallback(() => {
    if (!activeTake) return;

    if (isPlayingTake) {
      if (previewCleanupRef.current) {
        previewCleanupRef.current();
        previewCleanupRef.current = null;
      }
      setIsPlayingTake(false);
      return;
    }

    try {
      const audio = new Audio(activeTake.url);
      audio.onended = () => setIsPlayingTake(false);
      previewCleanupRef.current = () => {
        audio.pause();
        audio.src = '';
      };
      audio.play();
      setIsPlayingTake(true);
    } catch {
      setError('Failed to play');
    }
  }, [activeTake, isPlayingTake]);

  const handleSave = useCallback(() => {
    if (!activeTake) return;

    const track: VoiceoverTrack = {
      id: crypto.randomUUID(),
      name: `Voiceover ${existingCount + 1}`,
      blob: activeTake.blob,
      url: activeTake.url,
      duration: activeTake.duration,
      createdAt: Date.now(),
      volume: 1,
      offset: Math.max(0, recordStartVideoTimeRef.current),
    };

    onSave(track);
    onBack();
  }, [activeTake, existingCount, onSave, onBack]);

  return (
    <div className={`flex flex-col gap-3 ${isMobile ? 'p-2' : 'p-4'} w-full h-full overflow-y-auto`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <button
            onClick={onBack}
            className="p-1.5 rounded-lg text-surface-400 hover:text-white hover:bg-surface-800/50 transition-all"
            title="Back to Editor"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <h2 className="text-sm font-semibold text-white">Voiceover Studio</h2>
        </div>

        <div className="flex items-center gap-2 text-[10px] text-surface-500">
          <span className={`w-2 h-2 rounded-full ${
            stage === 'recording' ? 'bg-red-500 animate-pulse'
            : stage === 'paused' ? 'bg-yellow-500'
            : 'bg-surface-600'
          }`} />
          {stage === 'recording' ? 'Recording'
            : stage === 'paused' ? 'Paused'
            : stage === 'idle' ? 'Ready'
            : 'Recorded'}
        </div>
      </div>

      {/* Video preview */}
      <div className="relative bg-black rounded-xl overflow-hidden shadow-lg" style={{ aspectRatio: '16/9' }}>
        <video
          ref={videoRef}
          src={videoSrc}
          className="w-full h-full object-contain"
          playsInline
          preload="auto"
        />
        {stage === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <p className="text-white/60 text-xs">Video will play while you record</p>
          </div>
        )}
      </div>

      {/* Live waveform during recording/paused */}
      {(stage === 'recording' || stage === 'paused') && (
        <div className="h-12 rounded-lg bg-black/40 border border-surface-800/30 overflow-hidden flex items-center justify-center">
          <div className="flex items-center gap-[2px] h-full w-full px-3">
            {Array.from({ length: isMobile ? 40 : 80 }).map((_, i) => (
              <div
                key={i}
                className="flex-1 bg-red-500/80 rounded-full transition-all duration-75"
                style={{
                  height: `${Math.max(4, 20 + Math.sin(i * 0.3 + Date.now() * 0.008) * 30 + audioLevel * 50)}%`,
                  opacity: stage === 'paused' ? 0.3 : 0.5 + audioLevel * 0.5,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Takes */}
      {takes.length > 0 && stage !== 'recording' && stage !== 'paused' && (
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-surface-500 mr-1 font-semibold uppercase tracking-wider">Takes:</span>
          {takes.map((take, i) => (
            <button
              key={take.id}
              onClick={() => {
                setActiveTakeId(take.id);
                if (isPlayingTake && previewCleanupRef.current) {
                  previewCleanupRef.current();
                  setIsPlayingTake(false);
                }
              }}
              className={`px-2.5 py-1 rounded-lg text-[10px] font-medium transition-all flex items-center gap-1.5 ${
                activeTakeId === take.id
                  ? 'bg-primary-500/20 text-primary-300 border border-primary-500/30'
                  : 'bg-surface-800/60 text-surface-400 border border-surface-700/40 hover:border-surface-600/50'
              }`}
            >
              <span>Take {i + 1}</span>
              <span className="opacity-60">({take.duration.toFixed(1)}s)</span>
              {takes.length > 1 && (
                <button
                  onClick={(e) => { e.stopPropagation(); deleteTake(take.id); }}
                  className="text-surface-600 hover:text-red-400 transition-colors"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Controls */}
      <div className={`flex items-center gap-2 flex-wrap ${isMobile ? 'justify-center' : ''}`}>
        {stage === 'idle' && (
          <>
            <button
              onClick={startRecording}
              className="btn-primary text-sm px-6 py-2.5 bg-red-600 hover:bg-red-500 border-red-500/30 shadow-lg shadow-red-600/20"
            >
              <Mic className="w-4 h-4 mr-2" />
              Start Recording
            </button>
            {takes.length > 0 && (
              <span className="text-[10px] text-surface-500 ml-1">
                {takes.length} take{takes.length > 1 ? 's' : ''} available
              </span>
            )}
          </>
        )}

        {stage === 'recording' && (
          <>
            <button onClick={pauseRecording} className="btn-secondary text-sm px-4 py-2">
              <Pause className="w-4 h-4 mr-1.5" />
              Pause
            </button>
            <button onClick={() => stopRecording(false)} className="btn-primary text-sm px-4 py-2 bg-red-600 hover:bg-red-500">
              <Square className="w-4 h-4 mr-1.5" />
              Stop
            </button>
            <button onClick={cancelRecording} className="btn-secondary text-sm px-3 py-2 opacity-60 hover:opacity-100">
              Cancel
            </button>
            <span className="font-mono text-lg text-red-400 ml-2 tabular-nums">
              {formatTime(recordTime)}
            </span>
          </>
        )}

        {stage === 'paused' && (
          <>
            <button onClick={resumeRecording} className="btn-primary text-sm px-4 py-2 bg-red-600 hover:bg-red-500">
              <Mic className="w-4 h-4 mr-1.5" />
              Resume
            </button>
            <button onClick={() => stopRecording(false)} className="btn-primary text-sm px-4 py-2 bg-red-600 hover:bg-red-500">
              <Square className="w-4 h-4 mr-1.5" />
              Finish
            </button>
            <button onClick={cancelRecording} className="btn-secondary text-sm px-3 py-2">
              Discard
            </button>
            <span className="font-mono text-lg text-yellow-400 ml-2 tabular-nums">
              {formatTime(recordTime)}
            </span>
          </>
        )}

        {stage === 'stopped' && activeTake && (
          <>
            <button
              onClick={playTake}
              className="btn-primary text-sm px-4 py-2"
            >
              {isPlayingTake ? (
                <><Square className="w-4 h-4 mr-1.5" /> Stop</>
              ) : (
                <><Play className="w-4 h-4 mr-1.5" /> Play Take</>
              )}
            </button>

            <button onClick={handleSave} className="btn-primary text-sm px-4 py-2 bg-emerald-600 hover:bg-emerald-500 shadow-lg shadow-emerald-600/20">
              <Check className="w-4 h-4 mr-1.5" />
              Save & Exit
            </button>

            <button onClick={() => { setStage('idle'); }} className="btn-secondary text-sm px-3 py-2">
              <RotateCcw className="w-4 h-4 mr-1" />
              Record New
            </button>

            {activeTake && (
              <span className="font-mono text-sm text-surface-400 tabular-nums">
                {activeTake.duration.toFixed(1)}s
              </span>
            )}
          </>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[11px]">
          {error}
        </div>
      )}
    </div>
  );
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}
