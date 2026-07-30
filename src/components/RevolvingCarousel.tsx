import { useState, useEffect, useRef, useCallback } from 'react';
import { Scissors, Crop, Mic, Sparkles, Zap, Shield, Package, Music, Globe } from './Icons';

const features = [
  { icon: <Scissors />, title: 'Precision Trimming', description: 'Cut your videos frame-by-frame with an intuitive timeline. Drag to set exact start and end points.' },
  { icon: <Crop />, title: 'Smart Cropping', description: 'Crop to any aspect ratio with a visual overlay. Remove unwanted edges and reframe your content.' },
  { icon: <Mic />, title: 'Voiceover Recording', description: 'Record narration while your video plays. Your voice syncs perfectly with the timeline.' },
  { icon: <Sparkles />, title: 'Quality Enhancement', description: 'Sharpen, denoise, and stabilize your footage. Make every frame look its best.' },
  { icon: <Zap />, title: 'Fast Processing', description: 'Everything runs locally on your machine — no waiting for uploads or server queues.' },
  { icon: <Shield />, title: '100% Private', description: 'Your footage never leaves your device. No uploads, no servers, no prying eyes.' },
  { icon: <Package />, title: 'Multiple Formats', description: 'Export to MP4 or WebM with custom resolution, quality, and framerate settings.' },
  { icon: <Music />, title: 'Audio Mixing', description: 'Mix voiceover tracks with original audio. Adjust levels and timing for a polished result.' },
  { icon: <Globe />, title: 'Works Anywhere', description: 'Open in any modern browser and start editing. No installation, no setup, no accounts.' },
];

const CARD_COUNT = features.length;
const STEP_MS = 2000; // 2 seconds per card
const TRANSITION_DURATION = 600; // ms for the rotation animation

export function RevolvingCarousel() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const ringRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLDivElement>(null);
  const radiusRef = useRef(250);

  // Step to next card every 2 seconds — index keeps growing for seamless loop
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex((prev) => prev + 1);
    }, STEP_MS);
    return () => clearInterval(interval);
  }, []);

  // Responsive radius
  const updateRadius = useCallback(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const w = scene.clientWidth;
    // Larger radius on desktop, smaller on mobile — always big enough to prevent overlap
    const r = Math.max(180, Math.min(320, Math.round(w * 0.85)));
    radiusRef.current = r;
    scene.style.perspective = `${Math.round(r * 3.2)}px`;
  }, []);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const observer = new ResizeObserver(() => updateRadius());
    observer.observe(scene);
    updateRadius();
    return () => observer.disconnect();
  }, [updateRadius]);

  // Rotation: bring currentIndex card to front
  const rotation = -(currentIndex / CARD_COUNT) * 360;
  const radius = radiusRef.current;

  return (
    <>
      <style>{`
        .orbit-scene {
          width: min(340px, calc(100vw - 32px));
          aspect-ratio: 340 / 380;
          margin: 0 auto;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        @media (min-width: 640px) {
          .orbit-scene {
            width: min(420px, calc(100vw - 64px));
            aspect-ratio: 420 / 440;
          }
        }
        .orbit-ring {
          width: 100%;
          height: 100%;
          transform-style: preserve-3d;
          position: relative;
          transition: transform ${TRANSITION_DURATION}ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .orbit-card {
          position: absolute;
          width: 50%;
          top: 50%;
          left: 25%;
          pointer-events: none;
        }
        @media (min-width: 640px) {
          .orbit-card {
            width: 52%;
            left: 24%;
          }
        }
        .orbit-card-inner {
          background: linear-gradient(135deg, rgba(28,28,35,0.95), rgba(20,20,25,0.95));
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 14px;
          padding: clamp(10px, 2vw, 18px) clamp(10px, 2vw, 16px);
          transition: opacity 500ms ease, transform 500ms ease, box-shadow 500ms ease;
          will-change: transform, opacity;
        }
        .orbit-icon {
          width: clamp(22px, 3.5vw, 34px);
          height: clamp(22px, 3.5vw, 34px);
          border-radius: clamp(6px, 1vw, 10px);
          background: linear-gradient(135deg, rgba(249,115,22,0.18), rgba(251,191,36,0.18));
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: clamp(5px, 0.8vw, 9px);
          flex-shrink: 0;
        }
        .orbit-icon svg {
          width: clamp(14px, 2vw, 20px);
          height: clamp(14px, 2vw, 20px);
          stroke-width: 1.5;
        }
        .orbit-title {
          font-size: clamp(10px, 1.5vw, 14px);
          font-weight: 600;
          color: #fff;
          margin-bottom: clamp(2px, 0.4vw, 5px);
          line-height: 1.3;
        }
        .orbit-desc {
          font-size: clamp(8px, 1.2vw, 11px);
          color: rgba(255,255,255,0.45);
          line-height: 1.5;
        }
      `}</style>

      <div
        ref={sceneRef}
        className="orbit-scene"
      >
        <div
          ref={ringRef}
          className="orbit-ring"
          style={{
            transform: `rotateX(5deg) rotateY(${rotation}deg)`,
          }}
        >
          {features.map((feature, i) => {
            // Card's angle in the ring
            const angle = (i / CARD_COUNT) * 360;
            // Which card is at the front right now? (wrap the growing index)
            const frontIndex = currentIndex % CARD_COUNT;
            // How far from front? 0 = front, negative values toward back
            let diff = ((i - frontIndex + CARD_COUNT / 2) % CARD_COUNT + CARD_COUNT) % CARD_COUNT - CARD_COUNT / 2;
            const absDiff = Math.abs(diff);

            return (
              <div
                key={feature.title}
                className="orbit-card"
                style={{
                  transform: `rotateY(${angle}deg) translateZ(${radius}px) translateY(-50%)`,
                  zIndex: Math.round(100 - absDiff * 10),
                }}
              >
                <div
                  className="orbit-card-inner"
                  style={{
                    opacity: Math.max(0.12, 1 - absDiff * 0.22),
                    transform: absDiff < 0.5 ? 'scale(1.05)' : 'scale(1)',
                    boxShadow: absDiff < 0.5 ? '0 0 24px rgba(249,115,22,0.12)' : 'none',
                  }}
                >
                  <div className="orbit-icon">
                    <span className="text-primary-400">{feature.icon}</span>
                  </div>
                  <div className="orbit-title">{feature.title}</div>
                  <div className="orbit-desc">{feature.description}</div>
                </div>
              </div>
            );
          })}
        </div>


      </div>
    </>
  );
}
