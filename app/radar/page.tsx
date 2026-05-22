'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SubredditMatch, FinderResult, CompanyProfile } from '@/types';

const UI = 'var(--font-ui)';

const LOADING_MESSAGES = [
  'Initialising intelligence sweep...',
  'Mapping community landscape...',
  'Profiling audience demographics...',
  'Detecting narrative opportunities...',
  'Analysing posting patterns...',
  'Scoring audience fit signals...',
  'Identifying asymmetric targets...',
  'Calculating asymmetry scores...',
  'Cross-referencing community overlap...',
  'Intelligence sweep complete',
];

const RADAR_SUBS = [
  { name: 'r/SaaS',               r: 0.38, a: 0.4,  gc: false },
  { name: 'r/startups',           r: 0.62, a: 1.1,  gc: false },
  { name: 'r/indieHackers',       r: 0.50, a: 2.0,  gc: false },
  { name: 'r/entrepreneur',       r: 0.78, a: 3.0,  gc: false },
  { name: 'r/msp',                r: 0.45, a: 4.2,  gc: true  },
  { name: 'r/cscareerquestions',  r: 0.68, a: 5.0,  gc: true  },
  { name: 'r/ADHD',               r: 0.30, a: 5.8,  gc: true  },
  { name: 'r/freelance',          r: 0.72, a: 0.9,  gc: true  },
  { name: 'r/marketing',          r: 0.55, a: 2.8,  gc: false },
  { name: 'r/devops',             r: 0.42, a: 3.7,  gc: true  },
  { name: 'r/ProductManagement',  r: 0.58, a: 1.6,  gc: false },
  { name: 'r/smallbusiness',      r: 0.82, a: 4.8,  gc: false },
];

// ── RadarLoader ───────────────────────────────────────────────────────────────

function RadarLoader({ message }: { message: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blipStates, setBlipStates] = useState<boolean[]>(RADAR_SUBS.map(() => false));
  const angleRef = useRef(0);
  const blipDataRef = useRef(RADAR_SUBS.map(() => ({ visible: false, lastLit: -9999 })));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animFrame: number;

    function resize() {
      if (!canvas) return;
      const wrap = canvas.parentElement;
      const size = wrap ? Math.min(wrap.offsetWidth, wrap.offsetHeight) : 400;
      canvas.width = size;
      canvas.height = size;
    }
    resize();
    window.addEventListener('resize', resize);

    function tick() {
      if (!canvas || !ctx) return;
      const w = canvas.width, h = canvas.height;
      const cx = w / 2, cy = h / 2, R = Math.min(w, h) / 2 - 4;

      ctx.clearRect(0, 0, w, h);

      // Background circle
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.fillStyle = '#090910'; ctx.fill();

      // Concentric rings
      [0.25, 0.5, 0.75, 1.0].forEach(f => {
        ctx.beginPath(); ctx.arc(cx, cy, R * f, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(52,211,153,0.09)';
        ctx.lineWidth = 0.8; ctx.stroke();
      });

      // Cross-hairs
      ctx.strokeStyle = 'rgba(52,211,153,0.06)'; ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
      const d = R * 0.707;
      ctx.strokeStyle = 'rgba(52,211,153,0.03)';
      ctx.beginPath(); ctx.moveTo(cx - d, cy - d); ctx.lineTo(cx + d, cy + d); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + d, cy - d); ctx.lineTo(cx - d, cy + d); ctx.stroke();

      // Sweep trail
      const trailLen = Math.PI * 0.6;
      const angle = angleRef.current;
      for (let t = 0; t < 50; t++) {
        const ta = angle - (t / 50) * trailLen;
        const alpha = (1 - t / 50) * 0.20;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, ta - trailLen / 50, ta);
        ctx.closePath();
        ctx.fillStyle = `rgba(52,211,153,${alpha.toFixed(3)})`; ctx.fill();
      }

      // Sweep line
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(angle) * R, cy + Math.sin(angle) * R);
      ctx.strokeStyle = 'rgba(52,211,153,0.9)'; ctx.lineWidth = 1.5; ctx.stroke();

      // Outer ring
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(52,211,153,0.20)'; ctx.lineWidth = 1.2; ctx.stroke();

      // Center dot
      ctx.beginPath(); ctx.arc(cx, cy, 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(52,211,153,1)'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(52,211,153,0.10)'; ctx.fill();

      // Advance angle
      angleRef.current += 0.010;

      // Blip hit detection
      const now = Date.now();
      let changed = false;
      const newStates = blipDataRef.current.map(b => b.visible);
      RADAR_SUBS.forEach((s, i) => {
        const blipNorm  = ((s.a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        const sweepNorm = ((angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
        let diff = sweepNorm - blipNorm;
        if (diff < 0) diff += Math.PI * 2;
        if (diff >= 0 && diff < 0.22 && !blipDataRef.current[i].visible) {
          blipDataRef.current[i].visible = true;
          blipDataRef.current[i].lastLit = now;
          newStates[i] = true;
          changed = true;
        }
        if (blipDataRef.current[i].visible && now - blipDataRef.current[i].lastLit > 5500) {
          blipDataRef.current[i].visible = false;
          newStates[i] = false;
          changed = true;
        }
      });
      if (changed) setBlipStates([...newStates]);

      animFrame = requestAnimationFrame(tick);
    }

    animFrame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(animFrame);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '82vh', gap: 32,
      fontFamily: UI,
    }}>
      {/* Radar */}
      <div style={{
        position: 'relative',
        width: 'min(62vw, 62vh)',
        height: 'min(62vw, 62vh)',
        flexShrink: 0,
      }}>
        <canvas
          ref={canvasRef}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', borderRadius: '50%' }}
        />
        {/* Blip overlay */}
        <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
          {RADAR_SUBS.map((s, i) => {
            const px = 50 + Math.cos(s.a) * s.r * 46;
            const py = 50 + Math.sin(s.a) * s.r * 46;
            return (
              <div
                key={s.name}
                style={{
                  position: 'absolute',
                  left: `${px}%`, top: `${py}%`,
                  transform: 'translate(-50%, -50%)',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                  opacity: blipStates[i] ? 1 : 0,
                  transition: 'opacity 0.4s ease',
                }}
              >
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: s.gc ? '#A78BFA' : '#34D399',
                  boxShadow: `0 0 8px 2px ${s.gc ? 'rgba(167,139,250,0.6)' : 'rgba(52,211,153,0.6)'}`,
                }} />
                <div style={{
                  fontSize: 10, fontWeight: 600,
                  color: s.gc ? 'rgba(167,139,250,0.9)' : 'rgba(52,211,153,0.9)',
                  background: 'rgba(0,0,0,0.65)',
                  border: `0.5px solid ${s.gc ? 'rgba(167,139,250,0.25)' : 'rgba(52,211,153,0.25)'}`,
                  borderRadius: 4, padding: '2px 6px',
                  whiteSpace: 'nowrap', letterSpacing: '0.02em',
                }}>
                  {s.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Status */}
      <div style={{ textAlign: 'center' }}>
        <div style={{
          fontSize: 13, fontWeight: 600, color: 'var(--t2)',
          letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 10,
        }}>
          Scanning Communities
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%', background: '#34D399',
            animation: 'rpulse 1.2s ease-in-out infinite',
          }} />
          <span style={{ fontSize: 12, color: 'var(--t4)', letterSpacing: '0.04em' }}>{message}</span>
        </div>
      </div>
      <style>{`@keyframes rpulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.4;transform:scale(0.6)} }`}</style>
    </div>
  );
}

// ── ScoreBadge ────────────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const { color, bg, border } =
    score >= 8.5
      ? { color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.20)' }
      : score >= 7
      ? { color: 'var(--blue)', bg: 'rgba(74,143,255,0.08)', border: 'rgba(74,143,255,0.20)' }
      : { color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.20)' };
  return (
    <div style={{
      flexShrink: 0, textAlign: 'center', padding: '6px 12px',
      borderRadius: 8, border: `0.5px solid ${border}`, background: bg,
    }}>
      <span style={{ fontSize: 18, fontWeight: 700, color, display: 'block', lineHeight: 1.1 }}>
        {score.toFixed(1)}
      </span>
      <span style={{ fontSize: 10, color: 'var(--t4)' }}>/ 10</span>
    </div>
  );
}

// ── Bar ───────────────────────────────────────────────────────────────────────

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: 11, color: 'var(--t3)' }}>{label}</span>
        <span style={{ fontSize: 11, fontWeight: 500, color: 'var(--t2)' }}>{value}</span>
      </div>
      <div style={{ height: 3, background: 'var(--overlay)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${value * 10}%`, background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}

// ── MatchCard ─────────────────────────────────────────────────────────────────

function MatchCard({ match, rank }: { match: SubredditMatch; rank: number }) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        background: 'var(--surface)', border: '0.5px solid var(--border)',
        borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(240,236,228,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
    >
      <div style={{ padding: '16px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: "'SF Mono','Fira Code',monospace", minWidth: 18 }}>
                #{rank}
              </span>
              <button
                onClick={() => router.push(`/dashboard/${match.subreddit}`)}
                style={{
                  fontSize: 15, fontWeight: 600, color: 'var(--t1)',
                  letterSpacing: '-0.01em', background: 'none', border: 'none',
                  cursor: 'pointer', padding: 0, fontFamily: UI, transition: 'color 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.color = 'var(--blue)')}
                onMouseLeave={e => (e.currentTarget.style.color = 'var(--t1)')}
              >
                r/{match.subreddit}
              </button>
            </div>
            {match.subscribers ? (
              <div style={{ fontSize: 11.5, color: 'var(--t4)', marginTop: 2, paddingLeft: 28 }}>
                {match.subscribers >= 1_000_000
                  ? `${(match.subscribers / 1_000_000).toFixed(1)}M`
                  : match.subscribers >= 1_000
                  ? `${Math.round(match.subscribers / 1_000)}k`
                  : match.subscribers} members
              </div>
            ) : null}
          </div>
          <ScoreBadge score={match.overallScore} />
        </div>

        <div style={{
          background: 'var(--overlay)', borderRadius: 7,
          padding: '9px 12px', marginBottom: 12, display: 'flex', gap: 8,
        }}>
          <span style={{ color: 'var(--blue)', fontSize: 12, flexShrink: 0, marginTop: 1 }}>→</span>
          <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.5, fontWeight: 500, margin: 0 }}>
            {match.assessment}
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 24px', marginBottom: 10 }}>
          <Bar label="Audience Fit"    value={match.audienceFit}     color="#34D399" />
          <Bar label="Engagement"      value={match.engagement}      color="var(--blue)" />
          <Bar label="Low Competition" value={match.competition}     color="#A78BFA" />
          <Bar label="Founder Friendly" value={match.founderFriendly} color="#FBBF24" />
        </div>

        <button
          onClick={() => setExpanded(v => !v)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--t4)', fontSize: 12, padding: 0,
            display: 'flex', alignItems: 'center', gap: 4,
            fontFamily: UI, transition: 'color 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}
        >
          {expanded ? '▲ Hide reasoning' : '▼ Why this subreddit?'}
        </button>
        {expanded && (
          <p style={{ fontSize: 12.5, color: 'var(--t3)', lineHeight: 1.6, marginTop: 8 }}>
            {match.why}
          </p>
        )}
      </div>

      <div style={{
        borderTop: '0.5px solid var(--border)', padding: '10px 18px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <span style={{ fontSize: 11.5, color: 'var(--t4)' }}>Get the full intelligence report</span>
        <button
          onClick={() => router.push(`/dashboard/${match.subreddit}`)}
          style={{
            fontSize: 12, fontWeight: 500, color: 'var(--hot)',
            background: 'none', border: 'none', cursor: 'pointer',
            fontFamily: UI, padding: 0, transition: 'opacity 0.12s',
          }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Analyze r/{match.subreddit} →
        </button>
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState() {
  const router = useRouter();
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', textAlign: 'center',
      padding: '80px 32px', gap: 18,
    }}>
      <div style={{
        width: 52, height: 52, background: 'var(--surface)',
        border: '0.5px solid var(--border)', borderRadius: 14,
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
      }}>
        🧭
      </div>
      <div style={{ fontSize: 17, fontWeight: 600, color: 'var(--t1)', letterSpacing: '-0.02em' }}>
        Set up your product profile first
      </div>
      <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6, maxWidth: 320 }}>
        To find the right communities for you, Treddit needs to understand your product, target user, and ICP. Set these up in Command — takes about 2 minutes.
      </p>
      <button
        onClick={() => router.push('/command')}
        style={{
          background: 'var(--blue)', color: '#fff', border: 'none', borderRadius: 8,
          padding: '10px 22px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          fontFamily: UI, transition: 'opacity 0.15s',
        }}
        onMouseEnter={e => (e.currentTarget.style.opacity = '0.85')}
        onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
      >
        Set up in Command →
      </button>
      <p style={{ fontSize: 11.5, color: 'var(--t4)', lineHeight: 1.5 }}>
        Your profile powers Scout, Signal Feed, and Keyword Watch too.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

interface SubredditsResponse extends FinderResult {
  noProfile?: boolean;
  cached?: boolean;
  company?: CompanyProfile;
  generatedAt?: string;
  error?: string;
}

export default function RadarPage() {
  const router = useRouter();
  const [status, setStatus] = useState<'loading' | 'no-profile' | 'generating' | 'done' | 'error'>('loading');
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MESSAGES[0]);
  const [result, setResult] = useState<SubredditsResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const RADAR_DURATION = 10000;

  const load = useCallback(async (refresh = false) => {
    setStatus(refresh ? 'generating' : 'loading');
    setError(null);

    let i = 0;
    setLoadingMsg(LOADING_MESSAGES[0]);
    const msgInterval = setInterval(() => {
      i = (i + 1) % LOADING_MESSAGES.length;
      setLoadingMsg(LOADING_MESSAGES[i]);
    }, RADAR_DURATION / LOADING_MESSAGES.length);

    // Run API fetch and minimum display timer in parallel — both must complete
    const minDelay = new Promise(res => setTimeout(res, RADAR_DURATION));
    const url = refresh ? '/api/subreddits?refresh=1' : '/api/subreddits';
    const apiFetch = fetch(url).then(async r => {
      const contentType = r.headers.get('content-type') || '';
      if (!r.ok || !contentType.includes('application/json')) {
        // Got HTML back — likely an auth redirect or 500
        if (r.status === 401 || r.url.includes('/auth/signin') || r.redirected) {
          throw new Error('Session expired — please sign in again.');
        }
        throw new Error(`Server error (${r.status}) — please try refreshing.`);
      }
      return r.json() as Promise<SubredditsResponse>;
    });

    try {
      const [data] = await Promise.all([apiFetch, minDelay]) as [SubredditsResponse, unknown];
      clearInterval(msgInterval);
      if (data.error) throw new Error(data.error);
      if (data.noProfile) { setStatus('no-profile'); return; }
      setResult(data);
      setStatus('done');
    } catch (err: unknown) {
      clearInterval(msgInterval);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const company = result?.company;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', fontFamily: UI }}>
      {/* Page header */}
      <div style={{
        padding: '28px 32px 20px', borderBottom: '0.5px solid var(--border)',
        display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
      }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.02em', color: 'var(--t1)', marginBottom: 4 }}>
            Radar
          </h1>
          <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.5 }}>
            Strategic intelligence on Reddit communities — matched to your product, ICP, and goal.
          </p>
        </div>
        {status === 'done' && (
          <button
            onClick={() => load(true)}
            style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '7px 13px', fontSize: 12, fontWeight: 500,
              background: 'var(--overlay)', border: '0.5px solid var(--border)',
              borderRadius: 8, color: 'var(--t3)', cursor: 'pointer',
              fontFamily: UI, transition: 'color 0.12s, border-color 0.12s', flexShrink: 0,
            }}
            onMouseEnter={e => { e.currentTarget.style.color = 'var(--t1)'; e.currentTarget.style.borderColor = 'rgba(240,236,228,0.14)'; }}
            onMouseLeave={e => { e.currentTarget.style.color = 'var(--t3)'; e.currentTarget.style.borderColor = 'var(--border)'; }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="23 4 23 10 17 10"/>
              <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
            </svg>
            Refresh
          </button>
        )}
      </div>

      {/* Radar loader */}
      {(status === 'loading' || status === 'generating') && (
        <RadarLoader message={loadingMsg} />
      )}

      {status === 'no-profile' && <EmptyState />}

      {status === 'error' && (
        <div style={{ padding: '24px 32px' }}>
          <div style={{
            background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.20)',
            borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#F87171',
          }}>
            {error}
          </div>
        </div>
      )}

      {status === 'done' && result && (
        <div>
          {company && (
            <div style={{
              margin: '20px 32px 0',
              background: 'var(--surface)', border: '0.5px solid rgba(74,143,255,0.18)',
              borderRadius: 10, padding: '12px 16px',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', flexShrink: 0 }} />
                <p style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.5, margin: 0 }}>
                  <strong style={{ color: 'var(--t1)', fontWeight: 600 }}>{company.name}</strong>
                  {company.description ? ` — ${company.description.slice(0, 80)}${company.description.length > 80 ? '…' : ''}` : ''}
                  {company.goal ? <> · Goal: <strong style={{ color: 'var(--t1)', fontWeight: 600 }}>{company.goal}</strong></> : null}
                </p>
              </div>
              <button
                onClick={() => router.push('/command')}
                style={{
                  fontSize: 12, color: 'var(--blue)', background: 'none', border: 'none',
                  cursor: 'pointer', whiteSpace: 'nowrap', padding: 0, flexShrink: 0,
                  fontFamily: UI, transition: 'opacity 0.12s',
                }}
                onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
                onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
              >
                Edit in Command →
              </button>
            </div>
          )}

          {result.targetPersona && (
            <div style={{
              margin: '16px 32px 0',
              background: 'rgba(13,13,31,0.8)', border: '0.5px solid rgba(99,102,241,0.15)',
              borderRadius: 10, padding: '12px 16px',
            }}>
              <div style={{
                display: 'flex', alignItems: 'center', gap: 6,
                fontSize: 10, fontWeight: 600, letterSpacing: '0.07em',
                color: 'rgba(165,180,252,0.7)', textTransform: 'uppercase', marginBottom: 6,
              }}>
                <span>✦</span> Target persona
              </div>
              <p style={{ fontSize: 13, color: 'var(--t1)', lineHeight: 1.55, margin: 0 }}>
                {result.targetPersona}
              </p>
            </div>
          )}

          <div style={{ padding: '20px 32px 60px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <span style={{ fontSize: 11.5, fontWeight: 500, color: 'var(--t4)', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
                {result.matches.length} communities — ranked by strategic fit
              </span>
              {result.cached && result.generatedAt && (
                <span style={{ fontSize: 11.5, color: 'var(--t4)' }}>
                  Cached · {new Date(result.generatedAt).toLocaleDateString()}
                </span>
              )}
            </div>

            <div style={{ marginBottom: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.5)' }}>
              Primary targets
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {result.matches.slice(0, 3).map((match, i) => (
                <MatchCard key={match.subreddit} match={match} rank={i + 1} />
              ))}
            </div>

            {result.matches.length > 3 && (
              <>
                <div style={{ marginBottom: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--t4)' }}>
                  Secondary targets
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {result.matches.slice(3).map((match, i) => (
                    <MatchCard key={match.subreddit} match={match} rank={i + 4} />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
