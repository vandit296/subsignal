'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

// ── Phase sequence ────────────────────────────────────────────────────────────
// loading  → api is still running — show normal loading screen
// shakeS   → gentle rumble, feel something coming (350ms)
// shakeM   → medium shake, building tension (400ms)
// shakeL   → heavy quake (400ms)
// strike   → lightning bolt fires + screen jolts — held for 500ms so you see it
// crack    → cracks radiate out from center, still shaking (600ms)
// flash    → white-out (250ms)
// split    → two white panels slide apart revealing content (900ms)
// done     → component unmounts
type Phase =
  | 'loading'
  | 'shakeS'
  | 'shakeM'
  | 'shakeL'
  | 'strike'
  | 'crack'
  | 'flash'
  | 'split'
  | 'done';

interface CinematicLoaderProps {
  loadingMsg: string;
  subreddit: string;
  /** Flip to true when the analysis data is ready to reveal */
  triggered: boolean;
  onRevealComplete: () => void;
}

function delay(ms: number) {
  return new Promise<void>(r => setTimeout(r, ms));
}

export default function CinematicLoader({
  loadingMsg,
  subreddit,
  triggered,
  onRevealComplete,
}: CinematicLoaderProps) {
  const [phase, setPhase] = useState<Phase>('loading');
  const lightCanvasRef = useRef<HTMLCanvasElement>(null);
  const crackCanvasRef = useRef<HTMLCanvasElement>(null);
  const startedRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    return () => { mountedRef.current = false; };
  }, []);

  // ── Draw a forked lightning bolt on the light canvas ─────────────────────
  const drawLightning = useCallback(() => {
    const canvas = lightCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    function bolt(
      x1: number, y1: number,
      x2: number, y2: number,
      depth: number,
      alpha: number,
    ) {
      if (depth <= 0) return;
      const mx = (x1 + x2) / 2 + (Math.random() - 0.5) * 90 * depth;
      const my = (y1 + y2) / 2 + (Math.random() - 0.5) * 25 * depth;
      ctx!.beginPath();
      ctx!.moveTo(x1, y1);
      ctx!.lineTo(mx, my);
      ctx!.lineTo(x2, y2);
      ctx!.strokeStyle = `rgba(220,220,255,${alpha})`;
      ctx!.lineWidth = depth * 0.9;
      ctx!.shadowColor = 'rgba(180,180,255,0.6)';
      ctx!.shadowBlur = 8;
      ctx!.stroke();
      bolt(x1, y1, mx, my, depth - 1, alpha * 0.75);
      bolt(mx, my, x2, y2, depth - 1, alpha * 0.75);
      // branch fork
      if (Math.random() > 0.45) {
        bolt(
          mx, my,
          mx + (Math.random() - 0.5) * 280,
          my + Math.random() * 180,
          depth - 1, alpha * 0.5,
        );
      }
    }

    // Primary bolt
    const cx = W * 0.35 + Math.random() * W * 0.3;
    bolt(cx, 0, cx + (Math.random() - 0.5) * 180, H, 5, 0.85);

    // Secondary bolt (appears ~60% of the time)
    if (Math.random() > 0.4) {
      const cx2 = W * 0.2 + Math.random() * W * 0.6;
      bolt(cx2, 0, cx2 + (Math.random() - 0.5) * 250, H * 0.75, 4, 0.55);
    }
  }, []);

  // ── Draw radial cracks on the crack canvas ────────────────────────────────
  const drawCracks = useCallback(() => {
    const canvas = crackCanvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const W = window.innerWidth;
    const H = window.innerHeight;
    canvas.width = W;
    canvas.height = H;
    ctx.clearRect(0, 0, W, H);

    const cx = W / 2;
    const cy = H / 2;

    for (let i = 0; i < 16; i++) {
      const baseAngle = (i / 16) * Math.PI * 2;
      const len = 80 + Math.random() * 240;

      ctx.strokeStyle = `rgba(255,255,255,${0.55 + Math.random() * 0.25})`;
      ctx.lineWidth = Math.max(0.5, 2.2 - i * 0.08);
      ctx.shadowColor = 'rgba(255,255,255,0.3)';
      ctx.shadowBlur = 3;
      ctx.beginPath();
      ctx.moveTo(cx, cy);

      let x = cx, y = cy;
      let angle = baseAngle + (Math.random() - 0.5) * 0.35;
      const steps = 4 + Math.floor(Math.random() * 5);
      for (let s = 0; s < steps; s++) {
        angle += (Math.random() - 0.5) * 0.28;
        const segLen = (len / steps) * (0.55 + Math.random() * 0.9);
        x += Math.cos(angle) * segLen;
        y += Math.sin(angle) * segLen;
        ctx.lineTo(x, y);
      }
      ctx.stroke();

      // 40% chance of a sub-crack branching off mid-way
      if (Math.random() > 0.6) {
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 0.6;
        ctx.beginPath();
        const bx = cx + Math.cos(baseAngle) * len * 0.45;
        const by = cy + Math.sin(baseAngle) * len * 0.45;
        ctx.moveTo(bx, by);
        ctx.lineTo(
          bx + Math.cos(baseAngle + Math.PI / 4) * len * 0.35,
          by + Math.sin(baseAngle + Math.PI / 4) * len * 0.35,
        );
        ctx.stroke();
        ctx.globalAlpha = 1;
      }
    }
  }, []);

  // ── Main sequence ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!triggered || startedRef.current) return;
    startedRef.current = true;

    const safe = (fn: () => void) => { if (mountedRef.current) fn(); };

    (async () => {
      // Phase 1: gentle rumble — user notices something is off
      safe(() => setPhase('shakeS'));
      await delay(350);

      // Phase 2: medium shake — tension building
      safe(() => setPhase('shakeM'));
      await delay(400);

      // Phase 3: heavy quake
      safe(() => setPhase('shakeL'));
      await delay(350);

      // Phase 4: STRIKE — draw lightning, hold so user actually sees it
      drawLightning();
      safe(() => setPhase('strike'));
      await delay(200);
      // A second flash burst for drama
      drawLightning();
      await delay(500); // long pause — let the lightning be seen

      // Phase 5: cracks radiate out — still visible for a beat
      drawCracks();
      safe(() => setPhase('crack'));
      await delay(650); // long enough to really see the cracks

      // Phase 6: white flash — quick but distinct
      safe(() => setPhase('flash'));
      await delay(250);

      // Phase 7: panels slide apart — slow satisfying reveal
      safe(() => setPhase('split'));
      await delay(950); // 900ms CSS transition + 50ms buffer

      safe(() => {
        setPhase('done');
        onRevealComplete();
      });
    })();
  }, [triggered, drawLightning, drawCracks, onRevealComplete]);

  if (phase === 'done') return null;

  // ── Derived display flags ─────────────────────────────────────────────────
  const isShaking =
    phase === 'shakeS' ||
    phase === 'shakeM' ||
    phase === 'shakeL' ||
    phase === 'strike' ||
    phase === 'crack';

  const showLoadingContent =
    phase === 'loading' || isShaking;

  const lightVisible =
    phase === 'strike' || phase === 'crack';

  const crackVisible = phase === 'crack';

  const showFlashPanels =
    phase === 'flash' || phase === 'split';

  const isSplit = phase === 'split';

  const shakeClass =
    phase === 'shakeS' ? 'cin-shakeS' :
    phase === 'shakeM' ? 'cin-shakeM' :
    phase === 'shakeL' ? 'cin-shakeL' :
    phase === 'strike' ? 'cin-shakeL' :
    phase === 'crack'  ? 'cin-shakeM' : '';

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 9999, overflow: 'hidden' }}>

        {/* ── Loading content (shakes during quake phases) ── */}
        {showLoadingContent && (
          <div className={shakeClass} style={{ width: '100%', height: '100%' }}>
            <div style={{
              minHeight: '100vh',
              background: 'var(--void)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 28,
              fontFamily: 'var(--font-ui)',
            }}>
              {/* Logo */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5"
                    stroke="var(--blue)" strokeWidth="1.1" fill="none" />
                  <polygon points="10,5 14,7.5 14,12.5 10,15 6,12.5 6,7.5"
                    fill="var(--blue)" opacity="0.15" />
                  <circle cx="10" cy="10" r="2" fill="var(--blue)" />
                </svg>
                <span style={{ color: 'var(--t1)', fontSize: 15, fontWeight: 600, letterSpacing: '-0.01em' }}>
                  Treddit
                </span>
              </div>

              {/* Progress bar */}
              <div style={{ width: 200 }}>
                <div className="scan-loader" style={{ width: '100%' }} />
              </div>

              {/* Status text */}
              <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
                <span style={{ color: 'var(--t2)', fontSize: 14 }}>{loadingMsg}</span>
                <span style={{ color: 'var(--t4)', fontSize: 12 }}>
                  r/{subreddit} · this takes ~15 seconds
                </span>
              </div>
            </div>
          </div>
        )}

        {/* ── Lightning canvas (always in DOM so ref is stable) ── */}
        <canvas
          ref={lightCanvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: lightVisible ? 1 : 0,
            transition: lightVisible ? 'none' : 'opacity 0.15s',
            mixBlendMode: 'screen',
          }}
        />

        {/* ── Crack canvas (always in DOM) ── */}
        <canvas
          ref={crackCanvasRef}
          style={{
            position: 'absolute',
            inset: 0,
            pointerEvents: 'none',
            opacity: crackVisible ? 1 : 0,
            transition: crackVisible ? 'none' : 'opacity 0.2s',
            mixBlendMode: 'screen',
          }}
        />

        {/* ── White flash / split panels ── */}
        {showFlashPanels && (
          <>
            {/* Top half */}
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              height: '50vh',
              background: '#ffffff',
              transform: isSplit ? 'translateY(-100%)' : 'translateY(0)',
              transition: isSplit
                ? 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)'
                : 'none',
              willChange: 'transform',
            }} />
            {/* Bottom half */}
            <div style={{
              position: 'absolute',
              left: 0,
              right: 0,
              bottom: 0,
              height: '50vh',
              background: '#ffffff',
              transform: isSplit ? 'translateY(100%)' : 'translateY(0)',
              transition: isSplit
                ? 'transform 0.9s cubic-bezier(0.22, 1, 0.36, 1)'
                : 'none',
              willChange: 'transform',
            }} />
          </>
        )}
      </div>

      {/* ── CSS keyframes ── */}
      <style>{`
        @keyframes cin-shakeS {
          0%,100% { transform: translate(0,0) }
          25%      { transform: translate(-2px, 1px) }
          50%      { transform: translate(2px,-1px) }
          75%      { transform: translate(-1px, 2px) }
        }
        @keyframes cin-shakeM {
          0%,100% { transform: translate(0,0) rotate(0deg) }
          15%     { transform: translate(-4px, 3px) rotate(-0.3deg) }
          35%     { transform: translate(5px,-3px) rotate(0.3deg) }
          55%     { transform: translate(-3px, 4px) rotate(-0.2deg) }
          75%     { transform: translate(4px,-4px) rotate(0.2deg) }
          90%     { transform: translate(-3px, 2px) rotate(-0.1deg) }
        }
        @keyframes cin-shakeL {
          0%,100% { transform: translate(0,0) rotate(0deg) }
          10%     { transform: translate(-8px, 5px) rotate(-0.5deg) }
          20%     { transform: translate(9px,-6px) rotate(0.6deg) }
          30%     { transform: translate(-7px, 8px) rotate(-0.4deg) }
          40%     { transform: translate(10px,-7px) rotate(0.5deg) }
          50%     { transform: translate(-9px, 6px) rotate(-0.6deg) }
          60%     { transform: translate(8px,-9px) rotate(0.4deg) }
          70%     { transform: translate(-10px,7px) rotate(-0.3deg) }
          80%     { transform: translate(9px,-5px) rotate(0.5deg) }
          90%     { transform: translate(-6px, 9px) rotate(-0.4deg) }
        }
        .cin-shakeS { animation: cin-shakeS 0.22s linear infinite; }
        .cin-shakeM { animation: cin-shakeM 0.16s linear infinite; }
        .cin-shakeL { animation: cin-shakeL 0.1s linear infinite; }
      `}</style>
    </>
  );
}
