'use client';

import { track } from '@/lib/posthog';
import { useState, useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { DistributionResult, DistributionMatch, PostDNA } from '@/types';

const UI = 'var(--font-ui)';

const LOADING_MSGS = [
  'Parsing narrative structure…',
  'Classifying emotional energy…',
  'Scoring promotion risk…',
  'Mapping audience maturity…',
  'Analysing engagement compatibility…',
  'Running narrative-community matching…',
  'Calculating strategic fit vectors…',
  'Synthesising distribution brief…',
  'Finalising intelligence report…',
];

// ── DNA bar ───────────────────────────────────────────────────────────────────

function DnaCard({ label, value, bar, color }: { label: string; value: string; bar: number; color: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px' }}>
      <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--t4)', marginBottom: 5 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--t1)', marginBottom: 6 }}>{value}</div>
      <div style={{ height: 2, background: 'var(--overlay)', borderRadius: 99, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${bar * 100}%`, background: color, borderRadius: 99 }} />
      </div>
    </div>
  );
}

// ── Score pill ────────────────────────────────────────────────────────────────

function ScorePill({ label, val, color, bg, border }: { label: string; val: number; color: string; bg: string; border: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '6px 12px', borderRadius: 7, border: `0.5px solid ${border}`, background: bg, color }}>
      <span style={{ fontSize: 15, fontWeight: 700 }}>{val.toFixed(1)}</span>
      <span style={{ fontSize: 11, color: 'var(--t4)' }}>{label}</span>
    </div>
  );
}

// ── Fit badge ─────────────────────────────────────────────────────────────────

function FitBadge({ score, label, color, bg, border }: { score: number; label: string; color: string; bg: string; border: string }) {
  return (
    <div style={{ flexShrink: 0, textAlign: 'center', padding: '6px 11px', borderRadius: 8, border: `0.5px solid ${border}`, background: bg }}>
      <span style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase' as const, color, opacity: 0.65, display: 'block', marginBottom: 2 }}>{label}</span>
      <span style={{ fontSize: 20, fontWeight: 700, color, display: 'block', lineHeight: 1.1 }}>{score.toFixed(1)}</span>
      <span style={{ fontSize: 10, color: 'var(--t4)' }}>/ 10</span>
    </div>
  );
}

// ── Distribution card ─────────────────────────────────────────────────────────

function DistCard({ match, rank, isCommand }: { match: DistributionMatch; rank: number; isCommand: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const isGC = !!match.isGoCrazy;
  const score = isGC ? (match.asymScore ?? match.narrativeFit) : match.narrativeFit;
  const scoreLabel = isGC ? 'Asymmetry' : 'Narrative Fit';

  const { color, bg, border } = isGC
    ? { color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.22)' }
    : score >= 8.5
    ? { color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.22)' }
    : { color: 'var(--blue)', bg: 'rgba(74,143,255,0.08)', border: 'rgba(74,143,255,0.22)' };

  const RISK_C: Record<string, string> = { high: '#F87171', medium: '#FBBF24', low: '#34D399' };
  const insight = isCommand && match.insightCommand ? match.insightCommand : match.insight;

  return (
    <div
      style={{
        background: 'var(--surface)',
        border: `0.5px solid ${isGC ? 'rgba(167,139,250,0.15)' : 'var(--border)'}`,
        borderRadius: 12, overflow: 'hidden', marginBottom: 12,
        backgroundImage: isGC ? 'linear-gradient(180deg,rgba(129,140,248,0.04) 0%,transparent 120px)' : 'none',
        transition: 'border-color 0.15s',
      }}
      onMouseEnter={e => (e.currentTarget.style.borderColor = isGC ? 'rgba(167,139,250,0.28)' : 'rgba(240,236,228,0.12)')}
      onMouseLeave={e => (e.currentTarget.style.borderColor = isGC ? 'rgba(167,139,250,0.15)' : 'var(--border)')}
    >
      {/* Header */}
      <div style={{ padding: '18px 20px 14px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <div style={{ marginBottom: 3 }}>
            <span style={{ fontSize: 11, color: 'var(--t4)', fontFamily: "'SF Mono','Fira Code',monospace", marginRight: 6 }}>#{rank}</span>
            <button
              onClick={() => router.push(`/scout/${match.subreddit}`)}
              style={{ fontSize: 15, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.01em', background: 'none', border: 'none', cursor: 'pointer', fontFamily: UI, transition: 'color 0.12s', padding: 0 }}
              onMouseEnter={e => (e.currentTarget.style.color = isGC ? '#A78BFA' : 'var(--blue)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--t1)')}
            >
              r/{match.subreddit}
            </button>
          </div>
          {match.members ? (
            <div style={{ fontSize: 11, color: 'var(--t4)', marginBottom: 8 }}>
              {match.members >= 1_000_000 ? `${(match.members / 1_000_000).toFixed(1)}M` : match.members >= 1_000 ? `${Math.round(match.members / 1_000)}k` : match.members} members
            </div>
          ) : null}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const }}>
            {match.tags.map((t, i) => (
              <span key={i} style={{
                fontSize: 10.5, fontWeight: 600, padding: '2px 8px', borderRadius: 4,
                border: `0.5px solid ${isGC ? 'rgba(167,139,250,0.22)' : 'rgba(74,143,255,0.22)'}`,
                background: isGC ? 'rgba(167,139,250,0.08)' : 'rgba(74,143,255,0.08)',
                color: isGC ? 'rgba(167,139,250,0.85)' : 'var(--blue)',
              }}>{t}</span>
            ))}
          </div>
        </div>
        <FitBadge score={score} label={scoreLabel} color={color} bg={bg} border={border} />
      </div>

      {/* Body */}
      <div style={{ padding: '0 20px 6px' }}>
        {/* Insight */}
        <div style={{
          padding: '10px 13px', marginBottom: 12,
          borderLeft: `2px solid ${isGC ? '#A78BFA' : 'var(--blue)'}`,
          background: isGC ? 'rgba(167,139,250,0.05)' : 'rgba(74,143,255,0.04)',
          borderRadius: '0 7px 7px 0',
        }}>
          <p style={{ fontSize: 12.5, color: 'var(--t1)', lineHeight: 1.55, fontWeight: 500, margin: 0 }}>{insight}</p>
        </div>

        {/* Expected reactions */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' as const, marginBottom: 12 }}>
          {match.expectedReactions.map((r, i) => (
            <span key={i} style={{ fontSize: 11, padding: '3px 9px', borderRadius: 5, background: 'var(--overlay)', border: '0.5px solid var(--border)', color: 'var(--t3)' }}>{r}</span>
          ))}
        </div>

        {/* Expand */}
        <button
          onClick={() => setOpen(v => !v)}
          style={{ background: 'none', border: 'none', cursor: 'pointer', fontFamily: UI, fontSize: 11.5, color: 'var(--t4)', padding: 0, marginBottom: 12, transition: 'color 0.12s' }}
          onMouseEnter={e => (e.currentTarget.style.color = 'var(--t2)')}
          onMouseLeave={e => (e.currentTarget.style.color = 'var(--t4)')}
        >
          {open ? '▲ Collapse' : '▼ Full analysis'}
        </button>

        {open && (
          <div style={{ marginBottom: 8 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 12 }}>
              <div style={{ padding: '10px 12px', background: 'var(--overlay)', border: '0.5px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--t4)', marginBottom: 5 }}>Positioning angle</div>
                <div style={{ fontSize: 12, color: 'var(--t2)', lineHeight: 1.5 }}>{match.positioning}</div>
              </div>
              <div style={{ padding: '10px 12px', background: 'var(--overlay)', border: '0.5px solid var(--border)', borderRadius: 8 }}>
                <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--t4)', marginBottom: 5 }}>Strategic risks</div>
                {match.risks.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 7, marginBottom: 5 }}>
                    <div style={{ width: 4, height: 4, borderRadius: '50%', background: RISK_C[r.level] || '#F87171', flexShrink: 0, marginTop: 5 }} />
                    <span style={{ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.4 }}>{r.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ fontSize: 9.5, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase' as const, color: 'var(--t4)', marginBottom: 8 }}>Title variations for this community</div>
            <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 6, marginBottom: 12 }}>
              {match.titleVariations.map((t, i) => (
                <div key={i} style={{ padding: '9px 12px', background: 'var(--overlay)', border: '0.5px solid var(--border)', borderRadius: 7, fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.4, cursor: 'pointer', transition: 'border-color 0.12s' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(74,143,255,0.25)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
                  "{t}"
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop: '0.5px solid var(--border)', padding: '10px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 7, flex: 1 }}>
          <span style={{ color: isGC ? '#A78BFA' : '#34D399', fontSize: 12, flexShrink: 0, marginTop: 1 }}>→</span>
          <span style={{ fontSize: 11.5, color: 'var(--t3)', lineHeight: 1.45 }}>{match.firstMove}</span>
        </div>
        <button
          onClick={() => router.push(`/scout/${match.subreddit}`)}
          style={{ fontSize: 11.5, fontWeight: 500, color: isGC ? '#A78BFA' : 'var(--hot)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: UI, padding: 0, whiteSpace: 'nowrap', flexShrink: 0, transition: 'opacity 0.12s' }}
          onMouseEnter={e => (e.currentTarget.style.opacity = '0.7')}
          onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
        >
          Scout r/{match.subreddit} →
        </button>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function DistributePage() {
  const { data: session } = useSession();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [mode, setMode] = useState<'standalone' | 'command'>('standalone');
  const [gcOn, setGcOn] = useState(false);
  const [status, setStatus] = useState<'idle' | 'loading' | 'done' | 'error'>('idle');
  const [loadingMsg, setLoadingMsg] = useState(LOADING_MSGS[0]);
  const [result, setResult] = useState<DistributionResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const company = (session as any)?.user;

  const analyze = useCallback(async () => {
    if (!title.trim()) return;
    setStatus('loading');
    setError(null);
    setResult(null);

    let i = 0;
    setLoadingMsg(LOADING_MSGS[0]);
    const interval = setInterval(() => {
      i = (i + 1) % LOADING_MSGS.length;
      setLoadingMsg(LOADING_MSGS[i]);
    }, 1000);

    try {
      const res = await fetch('/api/distribute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, body, mode, goCrazy: gcOn }),
      });
      const ct = res.headers.get('content-type') || '';
      if (!res.ok || !ct.includes('application/json')) {
        throw new Error(res.status === 401 ? 'Session expired — please sign in again.' : `Server error (${res.status})`);
      }
      const data = await res.json() as DistributionResult;
      if ((data as any).error) throw new Error((data as any).error);
      setResult(data);
      setStatus('done');
      track('distribute_analyzed', { mode, gocrazy: gcOn, hasBody: !!body.trim() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    } finally {
      clearInterval(interval);
    }
  }, [title, body, mode, gcOn]);

  // Auto re-run when Go Crazy is toggled while results are already showing
  const prevGcOn = useRef(gcOn);
  useEffect(() => {
    if (prevGcOn.current !== gcOn && result !== null) {
      prevGcOn.current = gcOn;
      analyze();
    } else {
      prevGcOn.current = gcOn;
    }
  }, [gcOn]); // eslint-disable-line react-hooks/exhaustive-deps

  const dna = result?.dna;

  const dnaCards = dna ? [
    { label: 'Narrative Type', value: dna.narrativeType, bar: 0.85, color: '#A78BFA' },
    { label: 'Emotional Energy', value: dna.emotionalEnergy, bar: 0.72, color: '#34D399' },
    { label: 'Promotion Risk', value: dna.promotionRisk, bar: 1 - dna.promotionRiskScore / 10, color: dna.promotionRisk === 'Low' ? '#34D399' : dna.promotionRisk === 'Medium' ? '#FBBF24' : '#F87171' },
    { label: 'Audience Maturity', value: dna.audienceMaturity, bar: 0.72, color: 'var(--blue)' },
    { label: 'Discussion Potential', value: `${dna.discussionPotential.toFixed(1)} / 10`, bar: dna.discussionPotential / 10, color: 'var(--blue)' },
    { label: 'Authenticity Score', value: `${dna.authenticityScore.toFixed(1)} / 10`, bar: dna.authenticityScore / 10, color: '#34D399' },
  ] : [];

  const scorePills = dna ? [
    { label: 'Authenticity', val: dna.authenticityScore, color: '#34D399', bg: 'rgba(52,211,153,0.08)', border: 'rgba(52,211,153,0.22)' },
    { label: 'Promotion Safety', val: dna.promotionSafety, color: 'var(--blue)', bg: 'rgba(74,143,255,0.08)', border: 'rgba(74,143,255,0.22)' },
    { label: 'Discussion Pull', val: dna.discussionPotential, color: '#A78BFA', bg: 'rgba(167,139,250,0.08)', border: 'rgba(167,139,250,0.22)' },
    { label: 'Controversy', val: dna.controversyScore, color: '#FBBF24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.22)' },
    { label: 'Tactical Depth', val: dna.tacticalDepth, color: 'var(--blue)', bg: 'rgba(74,143,255,0.08)', border: 'rgba(74,143,255,0.22)' },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', fontFamily: UI }}>

      {/* Page header */}
      <div style={{ padding: '28px 32px 0', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.60)', marginBottom: 10 }}>
          <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#A78BFA', opacity: 0.85 }} />
          Narrative Intelligence
        </div>
        <h1 style={{ fontSize: 24, fontWeight: 700, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 6 }}>Distribute</h1>
        <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.55, maxWidth: 520, marginBottom: 20 }}>
          Paste a post. The engine analyses its narrative DNA — emotional energy, authenticity, discussion potential — and finds where it will naturally resonate. Not by keywords. By story.
        </p>

        {/* Mode tabs */}
        <div style={{ display: 'flex', position: 'relative', top: 1 }}>
          {(['standalone', 'command'] as const).map(m => (
            <button key={m} onClick={() => setMode(m)} style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '10px 18px', fontSize: 13, fontWeight: 500,
              cursor: 'pointer', border: 'none', background: 'none', fontFamily: UI,
              color: mode === m ? '#A78BFA' : 'var(--t3)',
              borderBottom: mode === m ? '2px solid #A78BFA' : '2px solid transparent',
              transition: 'color 0.15s',
            }}>
              {m === 'command' && (
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>
              )}
              {m === 'standalone' ? 'Standalone Analysis' : 'Command-Aware'}
              {m === 'command' && (
                <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.06em', padding: '2px 6px', borderRadius: 3, background: 'rgba(167,139,250,0.12)', border: '0.5px solid rgba(167,139,250,0.22)', color: '#A78BFA', textTransform: 'uppercase' }}>smart</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '28px 32px 80px', maxWidth: 860 }}>

        {/* Command-aware context banner */}
        {mode === 'command' && (
          <div style={{ background: 'var(--surface)', border: '0.5px solid rgba(167,139,250,0.22)', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#34D399', flexShrink: 0 }} />
              <p style={{ fontSize: 12.5, color: 'var(--t2)', margin: 0, lineHeight: 1.5 }}>
                Analysing through your company profile — ICP, product context, and Reddit goals will shape the distribution strategy.
              </p>
            </div>
            <a href="/command" style={{ fontSize: 12, color: '#A78BFA', textDecoration: 'none', whiteSpace: 'nowrap', flexShrink: 0 }}>Edit in Command →</a>
          </div>
        )}

        {/* Inputs */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 8 }}>Post title</div>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) analyze(); }}
            placeholder="e.g. We spent 6 months building the wrong thing. Here's what we learned."
            style={{ width: '100%', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px', fontSize: 15, fontWeight: 600, color: 'var(--t1)', fontFamily: UI, outline: 'none', marginBottom: 10, transition: 'border-color 0.15s' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
          <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '0.09em', textTransform: 'uppercase', color: 'var(--t4)', marginBottom: 8 }}>
            Post body <span style={{ color: 'var(--t4)', fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>— optional, improves precision</span>
          </div>
          <textarea
            value={body}
            onChange={e => setBody(e.target.value)}
            placeholder="Paste your post content here. The more context, the sharper the distribution intelligence…"
            rows={5}
            style={{ width: '100%', background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: 'var(--t2)', fontFamily: UI, outline: 'none', resize: 'vertical', lineHeight: 1.6, transition: 'border-color 0.15s' }}
            onFocus={e => (e.currentTarget.style.borderColor = 'rgba(167,139,250,0.35)')}
            onBlur={e => (e.currentTarget.style.borderColor = 'var(--border)')}
          />
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 14, marginBottom: 32 }}>
          <button
            onClick={analyze}
            disabled={!title.trim() || status === 'loading'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '11px 22px', background: '#A78BFA', color: '#fff', border: 'none', borderRadius: 9, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: UI, transition: 'opacity 0.15s', opacity: (!title.trim() || status === 'loading') ? 0.45 : 1 }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
            {status === 'loading' ? 'Analysing…' : 'Analyse Distribution'}
          </button>

          <button
            onClick={() => setGcOn(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', background: gcOn ? 'rgba(167,139,250,0.08)' : 'var(--overlay)', border: `0.5px solid ${gcOn ? 'rgba(167,139,250,0.25)' : 'rgba(167,139,250,0.20)'}`, borderRadius: 8, cursor: 'pointer', fontSize: 12, fontWeight: 500, color: gcOn ? '#A78BFA' : 'var(--t3)', fontFamily: UI, transition: 'all 0.15s' }}
          >
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: gcOn ? '#A78BFA' : 'var(--t4)', transition: 'background 0.15s', flexShrink: 0 }} />
            ✦ Go Crazy mode
          </button>
        </div>

        {/* Loading */}
        {status === 'loading' && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '60px 0', gap: 18 }}>
            <div style={{ width: 34, height: 34, borderRadius: '50%', border: '1.5px solid var(--border)', borderTopColor: '#A78BFA', animation: 'spin 0.9s linear infinite' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#A78BFA', animation: 'pulse 1.2s ease-in-out infinite' }} />
              <span style={{ fontSize: 12, color: 'var(--t4)', letterSpacing: '0.04em' }}>{loadingMsg}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {status === 'error' && (
          <div style={{ background: 'rgba(248,113,113,0.08)', border: '0.5px solid rgba(248,113,113,0.20)', borderRadius: 10, padding: '14px 16px', fontSize: 13, color: '#F87171' }}>{error}</div>
        )}

        {/* Results */}
        {status === 'done' && result && (
          <div>
            {/* DNA panel */}
            <div style={{ marginBottom: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'var(--t4)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Post DNA — narrative fingerprint
              <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 14 }}>
              {dnaCards.map((d, i) => <DnaCard key={i} {...d} />)}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 32 }}>
              {scorePills.map((p, i) => <ScorePill key={i} {...p} />)}
            </div>

            {/* Standard picks */}
            <div style={{ marginBottom: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(52,211,153,0.55)', display: 'flex', alignItems: 'center', gap: 8 }}>
              Strategic distribution brief
              <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
            </div>
            {result.standard.map((m, i) => (
              <DistCard key={m.subreddit} match={m} rank={i + 1} isCommand={mode === 'command'} />
            ))}

            {/* Go Crazy picks */}
            {gcOn && result.goCrazy && result.goCrazy.length > 0 && (
              <>
                <div style={{ marginTop: 24, marginBottom: 10, fontSize: 10, fontWeight: 700, letterSpacing: '0.10em', textTransform: 'uppercase', color: 'rgba(167,139,250,0.55)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  ✦ Go Crazy — asymmetric distribution
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                </div>
                <div style={{ padding: '14px 18px', marginBottom: 20, background: 'linear-gradient(135deg,rgba(129,140,248,0.06),rgba(167,139,250,0.04))', border: '0.5px solid rgba(167,139,250,0.18)', borderRadius: 10, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                  <span style={{ fontSize: 18, flexShrink: 0, marginTop: 1 }}>✦</span>
                  <div>
                    <div style={{ fontSize: 12, fontWeight: 600, color: '#A78BFA', marginBottom: 4 }}>Asymmetric Distribution Intelligence</div>
                    <div style={{ fontSize: 12.5, color: 'var(--t3)', lineHeight: 1.55 }}>These communities weren't built for your post — but your narrative will land with zero competition and outsized resonance. Unexpected, psychologically intelligent, strategically brilliant.</div>
                  </div>
                </div>
                {result.goCrazy.map((m, i) => (
                  <DistCard key={m.subreddit} match={m} rank={i + 1} isCommand={mode === 'command'} />
                ))}
              </>
            )}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:0.35;transform:scale(0.6)} }
      `}</style>
    </div>
  );
}
