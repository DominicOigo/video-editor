import { useState, useRef, useCallback, useEffect } from 'react';
import { Mic, Square, Trash2, Type as TypeIcon } from './Icons';
import type { TextOverlay } from '../types';

interface AutoCaptionsPanelProps {
  duration: number;
  currentTime: number;
  onAddCaption: (overlay: TextOverlay) => void;
  existingOverlays: TextOverlay[];
}

interface CaptionSegment {
  text: string;
  startTime: number;
  endTime: number;
}

export function AutoCaptionsPanel({
  duration,
  currentTime,
  onAddCaption,
  existingOverlays,
}: AutoCaptionsPanelProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [segments, setSegments] = useState<CaptionSegment[]>([]);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fontSize, setFontSize] = useState(42);
  const [color, setColor] = useState('#ffffff');
  const [position, setPosition] = useState<'bottom' | 'top' | 'center'>('bottom');

  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const segmentStartRef = useRef(0);
  const finalTranscriptRef = useRef('');
  const currentTimeRef = useRef(currentTime);
  currentTimeRef.current = currentTime;

  // Cleanup recognition on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try { recognitionRef.current.stop(); } catch {}
        recognitionRef.current = null;
      }
    };
  }, []);

  const SpeechRecognitionAPI =
    typeof window !== 'undefined'
      ? window.SpeechRecognition || window.webkitSpeechRecognition
      : undefined;

  const startRecording = useCallback(() => {
    setError(null);

    if (!SpeechRecognitionAPI) {
      setError('Speech recognition is not supported in this browser. Try Chrome or Edge.');
      return;
    }

    const recognition = new SpeechRecognitionAPI();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    segmentStartRef.current = currentTimeRef.current;
    finalTranscriptRef.current = '';
    setSegments([]);
    setTranscript('');

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let interim = '';
      let final = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }

      if (final) {
        const now = currentTimeRef.current;
        finalTranscriptRef.current += final;
        setSegments((prev) => [
          ...prev,
          {
            text: final.trim(),
            startTime: segmentStartRef.current,
            endTime: now > 0 ? now : segmentStartRef.current + 2,
          },
        ]);
        segmentStartRef.current = now > 0 ? now : segmentStartRef.current + 2;
      }

      setTranscript(finalTranscriptRef.current + interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'not-allowed') {
        setError('Microphone access denied. Please allow microphone access.');
      } else if (event.error === 'no-speech') {
        setError('No speech detected. Try speaking into your microphone.');
      } else {
        setError(`Error: ${event.error}`);
      }
      setIsRecording(false);
    };

    recognition.onend = () => {
      setIsRecording(false);
    };

    try {
      recognition.start();
      recognitionRef.current = recognition;
      setIsRecording(true);
    } catch {
      setError('Failed to start speech recognition.');
      setIsRecording(false);
    }
  }, [SpeechRecognitionAPI]);

  const stopRecording = useCallback(() => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
    setIsRecording(false);
  }, []);

  const addAsTextOverlays = useCallback(() => {
    // Combine all segments into text overlays
    const segmentsToAdd = segments.length > 0 ? segments : [];

    if (segmentsToAdd.length === 0 && !transcript.trim()) return;

    if (segmentsToAdd.length === 0) {
      // Create a single overlay from the full transcript
      const overlay: TextOverlay = {
        id: crypto.randomUUID(),
        text: transcript.trim(),
        fontFamily: 'Arial',
        fontSize,
        color,
        position: {
          x: 50,
          y: position === 'top' ? 12 : position === 'center' ? 50 : 85,
        },
        alignment: 'center',
        startTime: 0,
        endTime: duration || 10,
        background: '#00000080',
        strokeColor: '#000000',
        strokeWidth: 1,
        opacity: 0.9,
        shadow: { color: '#000000', blur: 2, offsetX: 1, offsetY: 1 },
      };
      onAddCaption(overlay);
    } else {
      // Create individual overlays for each segment
      segmentsToAdd.forEach((seg) => {
        if (!seg.text.trim()) return;
        const overlay: TextOverlay = {
          id: crypto.randomUUID(),
          text: seg.text.trim(),
          fontFamily: 'Arial',
          fontSize,
          color,
          position: {
            x: 50,
            y: position === 'top' ? 12 : position === 'center' ? 50 : 85,
          },
          alignment: 'center',
          startTime: seg.startTime,
          endTime: seg.endTime,
          background: '#00000080',
          strokeColor: '#000000',
          strokeWidth: 1,
          opacity: 0.9,
          shadow: { color: '#000000', blur: 2, offsetX: 1, offsetY: 1 },
        };
        onAddCaption(overlay);
      });
    }

    // Reset
    setSegments([]);
    setTranscript('');
  }, [segments, transcript, onAddCaption, fontSize, color, position, duration]);

  const clearTranscript = useCallback(() => {
    setSegments([]);
    setTranscript('');
    finalTranscriptRef.current = '';
  }, []);

  const isSupported = !!SpeechRecognitionAPI;

  return (
    <div className="p-4 space-y-4">
      <h3 className="text-sm font-semibold text-white">Auto-Captions</h3>

      {!isSupported && (
        <div className="p-3 rounded-xl bg-amber-900/20 border border-amber-700/30">
          <p className="text-xs text-amber-300 leading-relaxed">
            Speech recognition is not supported in this browser. Please use Chrome or Edge for auto-captions.
          </p>
        </div>
      )}

      {/* Recording controls */}
      <div className="flex items-center gap-2">
        {!isRecording ? (
          <button
            onClick={startRecording}
            className="btn-primary text-sm py-2 px-4"
          >
            <Mic className="w-4 h-4 mr-2" />
            Start Dictation
          </button>
        ) : (
          <button
            onClick={stopRecording}
            className="btn-secondary text-sm py-2 px-4 border-red-500/30 text-red-400 hover:bg-red-500/10"
          >
            <Square className="w-4 h-4 mr-2" />
            Stop
          </button>
        )}
        {isRecording && (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/30">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs text-red-400 font-medium">Recording...</span>
          </div>
        )}
        {transcript && (
          <button
            onClick={clearTranscript}
            className="p-2 text-surface-500 hover:text-red-400 rounded-lg hover:bg-surface-800 transition-all"
            title="Clear transcript"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="p-3 rounded-xl bg-red-900/20 border border-red-700/30">
          <p className="text-xs text-red-300">{error}</p>
        </div>
      )}

      {/* Live transcript */}
      {transcript && (
        <div className="p-3 rounded-xl bg-surface-900/50 border border-surface-800/50 min-h-[80px] max-h-[200px] overflow-y-auto">
          <p className="text-sm text-white leading-relaxed">{transcript}</p>
          <p className="text-[10px] text-surface-600 mt-2">
            {segments.length} segment{segments.length !== 1 ? 's' : ''} captured
          </p>
        </div>
      )}

      {/* Style options */}
      {transcript && (
        <div className="space-y-3 p-3 rounded-xl bg-surface-900/50 border border-surface-800/50">
          <h4 className="text-xs font-semibold text-surface-400 uppercase tracking-wider">Caption Style</h4>

          {/* Font Size */}
          <div className="space-y-1">
            <label className="text-[10px] text-surface-500">Font Size</label>
            <input
              type="range"
              min="24"
              max="72"
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full slider"
            />
            <span className="text-[10px] text-surface-600 font-mono">{fontSize}px</span>
          </div>

          {/* Color picker */}
          <div className="flex items-center gap-3">
            <label className="text-[10px] text-surface-500">Color</label>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-surface-700/50"
            />
            <span className="text-[10px] text-surface-600 font-mono">{color}</span>
          </div>

          {/* Position */}
          <div className="space-y-1">
            <label className="text-[10px] text-surface-500">Position</label>
            <div className="flex gap-1.5">
              {(['top', 'center', 'bottom'] as const).map((p) => (
                <button
                  key={p}
                  onClick={() => setPosition(p)}
                  className={`flex-1 py-1.5 rounded-lg text-[10px] font-medium transition-all ${
                    position === p
                      ? 'bg-primary-500 text-white'
                      : 'bg-surface-800/80 text-surface-400 hover:text-surface-200'
                  }`}
                >
                  {p.charAt(0).toUpperCase() + p.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Add to timeline */}
          <button
            onClick={addAsTextOverlays}
            className="w-full btn-primary text-sm py-2"
          >
            <TypeIcon className="w-4 h-4 mr-2" />
            Add {segments.length > 0 ? `${segments.length} ` : ''}Captions to Timeline
          </button>
        </div>
      )}

      {/* Existing captions count */}
      {existingOverlays.length > 0 && (
        <div className="flex items-center gap-2 p-2 rounded-lg bg-surface-900/50">
          <TypeIcon className="w-4 h-4 text-primary-400" />
          <span className="text-xs text-surface-400">
            {existingOverlays.length} text overlay{existingOverlays.length !== 1 ? 's' : ''} on timeline
          </span>
        </div>
      )}

      {/* Info */}
      <div className="p-3 rounded-xl bg-surface-900/30 border border-surface-800/30">
        <h4 className="text-xs font-medium text-surface-300 mb-1">How it works</h4>
        <ol className="text-[10px] text-surface-500 space-y-0.5 list-decimal list-inside leading-relaxed">
          <li>Position the playhead at the start of your video</li>
          <li>Click <strong className="text-surface-400">Start Dictation</strong> and allow microphone access</li>
          <li>Play the video and speak the captions aloud as you watch</li>
          <li>Click <strong className="text-surface-400">Stop</strong> when finished</li>
          <li>Adjust the style and click <strong className="text-surface-400">Add Captions</strong></li>
        </ol>
      </div>
    </div>
  );
}
