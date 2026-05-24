'use client';

import { useEffect, useRef, useState } from 'react';
import { ScoredThread, ThreadCategory, RiskLevel, SignalConfidence } from '@/types';
import Link from 'next/link';

interface EngageResult {
  threads: ScoredThread[];
  subreddits: string[];
  productDescription: string;
  goal: string;
  generatedAt: string;
  error?: string;
}

const CACHE_KEY = 'treddit:feed:last';

// ── Signal metadata ────────────────────────────────────────────────────────────

const SIGNAL_META: Record<string, { label: string; synthesis: string }> = {
  switching_intent:     { label: 'Switching intent',     synthesis: 'People are actively evaluating alternatives. Entry window is open.' },
  buying_exploration:   { label: 'Buying exploration',   synthesis: 'Decision-making is active. First credible voice sets the frame.' },
  founder_vulnerability:{ label: 'Founder vulnerability',synthesis: 'Founders are sharing real struggles. Trust-building opportunity.' },
  workflow_frustration: { label: 'Workflow frustration', synthesis: 'Operational pain is surfacing. Solution-ready audience present.' },
  competitive_intel:    { label: 'Competitive intel',    synthesis: 'Competitor landscape is being re-evaluated.' },
  pain_signal:          { label: 'Pain signal',          synthesis: 'Clear problem awareness without active solution search yet.' },
  churn_risk:           { label: 'Churn risk',           synthesis: 'Competitor dissatisfaction is surfacing — displacement opportunity.' },
  ideal_user:           { label: 'Ideal user',           synthesis: 'Your ICP is active in this thread.' },
  competition:          { label: 'Competition',          synthesis: 'Competitor discussions are present.' },
  industry:             { label: 'Industry',             synthesis: 'Relevant industry conversations are active.' },
  interesting:          { label: 'Interesting',          synthesis: 'Worth monitoring for emerging patterns.' },
};

const CONFIDENCE_LABEL: Record<SignalConfidence, string> = {
  conviction:        '· Conviction',
  strong_signal:     '· Strong signal',
  emerging:          '· Emerging',
  early_pattern:     '· Early pattern',
  momentum_building: '· Momentum building',
  speculative:       '· Speculative',
};

// ── Utilities ──────────────────────────────────────────────────────────────────

function timeAgo(utc: number): string {
  const diff = Math.floor(Date.now() / 1000 - utc);
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

function getSynthesisBanner(threads: ScoredThread[]): string | null {
  if (threads.length < 3) return null;
  const counts: Record<string, number> = {};
  threads.slice(0, 10).forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
  const [topCat, count] = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  if (count < 2) return null;
  const meta = SIGNAL_META[topCat];
  if (!meta) return null;
  return `${meta.label} is the dominant signal today — ${count} threads detected. ${meta.synthesis}`;
}

// ── FeedLoader ─────────────────────────────────────────────────────────────────

const LOADER_LINES = [
  'Scanning subreddits for active threads…',
  'Reading conversation context…',
  'Scoring strategic opportunity…',
  'Analyzing psychological signals…',
  'Assessing entry difficulty…',
  'Generating engagement strategy…',
  'Detecting cross-thread patterns…',
  'Ranking priority signals…',
];

function FeedLoader() {
  const [lineIdx, setLineIdx] = useState(0);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const lineTimer = setInterval(() => setLineIdx(i => (i + 1) % LOADER_LINES.length), 1400);
    const progTimer = setInterval(() => setProgress(p => Math.min(p + Math.random() * 4, 84)), 300);
    return () => { clearInterval(lineTimer); clearInterval(progTimer); };
  }, []);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 28, fontFamily: 'var(--font-mono, monospace)', padding: '0 32px' }}>
      <div style={{ width: 320, maxWidth: '100%' }}>
        {/* Terminal chrome */}
        <div style={{ background: 'rgba(255,255,255,0.03)', border: '0.5px solid rgba(255,255,255,0.08)', borderRadius: 8, overflow: 'hidden' }}>
          <div style={{ padding: '8px 12px', borderBottom: '0.5px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', letterSpacing: '0.08em' }}>treddit · signal-feed</span>
          </div>
          <div style={{ padding: '16px 14px', minHeight: 80 }}>
            {LOADER_LINES.slice(0, lineIdx + 1).map((line, i) => (
              <div key={i} style={{ fontSize: 11, lineHeight: '20px', color: i === lineIdx ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ color: i === lineIdx ? '#00c8a0' : 'rgba(255,255,255,0.12)' }}>›</span>
                {line}
                {i === lineIdx && <span style={{ animation: 'blink 1s step-end infinite', color: '#00c8a0' }}>_</span>}
              </div>
            ))}
          </div>
          {/* Progress bar */}
          <div style={{ margin: '0 14px 14px', background: 'rgba(255,255,255,0.04)', borderRadius: 3, height: 3, overflow: 'hidden' }}>
            <div style={{ height: '100%', background: '#00c8a0', width: `${progress}%`, transition: 'width 0.3s ease', borderRadius: 3, opacity: 0.7 }} />
          </div>
        </div>
      </div>
      <style>{`@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }`}</style>
    </div>
  );
}

// ── Risk display ───────────────────────────────────────────────────────────────

function riskColor(level?: RiskLevel): string {
  if (level === 'low')    return '#4a9e6a';
  if (level === 'medium') return '#c99820';
  if (level === 'high')   return '#d4604a';
  if (level === 'severe') return '#e83535';
  return '#8a8d9a';
}

function riskLabel(level?: RiskLevel): string {
  if (level === 'low')    return 'Low risk';
  if (level === 'medium') return 'Medium risk';
  if (level === 'high')   return 'High risk';
  if (level === 'severe') return 'Severe risk';
  return 'Risk unassessed';
}

// ── Thread card ────────────────────────────────────────────────────────────────

function ThreadCard({ t }: { t: ScoredThread }) {
  const [open, setOpen] = useState(false);
  const sigMeta = SIGNAL_META[t.category];
  const rc = riskColor(t.riskLevel);
  const rl = riskLabel(t.riskLevel);
  const confLabel = t.signalConfidence ? CONFIDENCE_LABEL[t.signalConfidence] : '';

  return (
    <div style={{
      background: '#12141f',
      border: '0.5px solid rgba(255,255,255,0.07)',
      borderRadius: 8,
      overflow: 'hidden',
      marginBottom: 6,
      fontFamily: 'var(--font-mono, monospace)',
    }}>
      {/* Card header: signal type + confidence + score */}
      <div style={{ padding: '11px 14px 8px', display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{
          fontSize: 10, letterSpacing: '0.07em', color: '#00c8a0',
          border: '0.5px solid rgba(0,200,160,0.2)', padding: '3px 8px',
          borderRadius: 3, textTransform: 'uppercase', flexShrink: 0,
        }}>
          {sigMeta?.label ?? t.category}
        </span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', letterSpacing: '0.05em', flex: 1 }}>
          {confLabel}
        </span>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, flexShrink: 0 }}>
          <span style={{ fontSize: 15, fontWeight: 500, color: '#e8b44c', letterSpacing: '0.02em' }}>
            {t.relevanceScore.toFixed(1)}
          </span>
          <span style={{ fontSize: 9, color: 'rgba(232,180,76,0.4)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            strategic
          </span>
        </div>
      </div>

      {/* Thread title — hero element */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer',
          padding: '2px 14px 12px', display: 'block', borderBottom: '0.5px solid rgba(255,255,255,0.04)',
        }}
      >
        <p style={{
          fontSize: 14, fontWeight: 500, color: '#eceff7', lineHeight: 1.55,
          margin: 0, letterSpacing: '-0.01em',
          fontFamily: 'var(--font-mono, monospace)',
        }}>
          {t.title}
        </p>
      </button>

      {/* ENGAGE hero block */}
      <div style={{
        background: '#0c1813',
        borderLeft: '2px solid #00c8a0',
        borderTop: '0.5px solid rgba(0,200,160,0.09)',
        borderBottom: '0.5px solid rgba(0,200,160,0.07)',
        padding: '11px 14px',
      }}>
        <div style={{
          fontSize: 9, letterSpacing: '0.12em', color: 'rgba(0,200,160,0.45)',
          textTransform: 'uppercase', marginBottom: 7,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          Engagement strategy
          <span style={{ flex: 1, height: 1, background: 'rgba(0,200,160,0.08)', display: 'block' }} />
        </div>
        <p style={{ fontSize: 12, color: '#bcd8d0', lineHeight: 1.68, margin: 0 }}>
          {t.engagementAngle}
        </p>
      </div>

      {/* Risk row */}
      <div style={{
        padding: '8px 14px',
        display: 'flex', alignItems: 'flex-start', gap: 8,
        borderBottom: '0.5px solid rgba(255,255,255,0.04)',
      }}>
        <span style={{
          width: 6, height: 6, borderRadius: '50%', background: rc,
          flexShrink: 0, marginTop: 4,
        }} />
        <p style={{ fontSize: 11, color: rc, lineHeight: 1.5, margin: 0 }}>
          <span style={{ fontWeight: 500, textTransform: 'uppercase', fontSize: 9, letterSpacing: '0.1em', marginRight: 5 }}>
            {rl}
          </span>
          {t.engagementRisk}
        </p>
      </div>

      {/* Expandable intel grid */}
      {open && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', borderBottom: '0.5px solid rgba(255,255,255,0.04)' }}>
            <div style={{ padding: '10px 14px', borderRight: '0.5px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.19)', textTransform: 'uppercase', marginBottom: 5 }}>Why this moment</div>
              <p style={{ fontSize: 11, color: 'rgba(210,218,238,0.72)', lineHeight: 1.55, margin: 0 }}>{t.relevanceReason}</p>
            </div>
            <div style={{ padding: '10px 14px' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.19)', textTransform: 'uppercase', marginBottom: 5 }}>Person signal</div>
              <p style={{ fontSize: 11, color: 'rgba(210,218,238,0.72)', lineHeight: 1.55, margin: 0 }}>{t.personSignal ?? '—'}</p>
            </div>
            <div style={{ padding: '10px 14px', borderRight: '0.5px solid rgba(255,255,255,0.04)', borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.19)', textTransform: 'uppercase', marginBottom: 5 }}>Conversation openness</div>
              <p style={{ fontSize: 11, color: 'rgba(210,218,238,0.72)', lineHeight: 1.55, margin: 0 }}>{t.conversationOpenness ?? '—'}</p>
            </div>
            <div style={{ padding: '10px 14px', borderTop: '0.5px solid rgba(255,255,255,0.04)' }}>
              <div style={{ fontSize: 9, letterSpacing: '0.1em', color: 'rgba(255,255,255,0.19)', textTransform: 'uppercase', marginBottom: 5 }}>Trajectory</div>
              <p style={{ fontSize: 11, color: 'rgba(210,218,238,0.72)', lineHeight: 1.55, margin: 0 }}>{t.trajectory ?? '—'}</p>
            </div>
          </div>

          {/* Actions */}
          <div style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>
            <a
              href={t.url}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 4,
                fontSize: 11, color: '#00c8a0', textDecoration: 'none',
                border: '0.5px solid rgba(0,200,160,0.2)', borderRadius: 4,
                padding: '5px 12px', letterSpacing: '0.04em',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              Open thread ↗
            </a>
            <button
              onClick={() => setOpen(false)}
              style={{
                fontSize: 11, color: 'rgba(255,255,255,0.25)', background: 'none',
                border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 4,
                padding: '5px 12px', cursor: 'pointer', letterSpacing: '0.04em',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              Collapse
            </button>
          </div>
        </>
      )}

      {/* Metadata ticker */}
      <div style={{
        padding: open ? '0 14px 8px' : '7px 14px',
        display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0,
        fontSize: 10, color: 'rgba(255,255,255,0.17)', letterSpacing: '0.03em',
        borderTop: open ? '0.5px solid rgba(255,255,255,0.04)' : 'none',
        cursor: !open ? 'pointer' : 'default',
      }}
        onClick={!open ? () => setOpen(true) : undefined}
      >
        <span style={{ color: 'rgba(0,200,160,0.32)' }}>r/{t.subreddit}</span>
        <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.09)' }}>·</span>
        <span>↑{t.score}</span>
        <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.09)' }}>·</span>
        <span>{t.numComments} comments</span>
        <span style={{ margin: '0 6px', color: 'rgba(255,255,255,0.09)' }}>·</span>
        <span>{timeAgo(t.createdUtc)}</span>
        {!open && (
          <>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)' }}>expand ↓</span>
          </>
        )}
      </div>
    </div>
  );
}

// ── Synthesis banner ───────────────────────────────────────────────────────────

function SynthesisBanner({ text }: { text: string }) {
  const [patternLabel, ...rest] = text.split(' is the dominant');
  return (
    <div style={{
      background: '#0f1018',
      border: '0.5px solid rgba(110,110,200,0.1)',
      borderRadius: 6,
      padding: '9px 14px',
      display: 'flex', gap: 10, alignItems: 'flex-start',
      marginBottom: 8,
      fontFamily: 'var(--font-mono, monospace)',
    }}>
      <span style={{
        fontSize: 9, letterSpacing: '0.09em', color: '#9090cc',
        border: '0.5px solid rgba(144,144,204,0.22)', padding: '2px 6px',
        borderRadius: 3, whiteSpace: 'nowrap', marginTop: 1, textTransform: 'uppercase',
      }}>Pattern</span>
      <p style={{ fontSize: 11, color: 'rgba(200,205,235,0.6)', lineHeight: 1.55, margin: 0 }}>
        <strong style={{ color: 'rgba(200,205,235,0.88)', fontWeight: 500 }}>{patternLabel} is the dominant</strong>
        {rest.join(' is the dominant')}
      </p>
    </div>
  );
}

// ── Section label ──────────────────────────────────────────────────────────────

function SectionLabel({ text }: { text: string }) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '10px 0 6px',
      fontFamily: 'var(--font-mono, monospace)',
    }}>
      <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(255,255,255,0.16)', textTransform: 'uppercase' }}>
        {text}
      </span>
      <span style={{ flex: 1, height: 0, borderTop: '0.5px solid rgba(255,255,255,0.05)' }} />
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

export default function FeedPage() {
  const [data, setData] = useState<EngageResult | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? (JSON.parse(raw) as EngageResult) : null;
    } catch { return null; }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<ThreadCategory | 'all'>('all');
  const [extendedOpen, setExtendedOpen] = useState(false);
  const isMounted = useRef(false);

  function load(bust = false) {
    setRefreshing(true);
    fetch(bust ? '/api/engage?bust=1' : '/api/engage')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setRefreshing(false);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch { /* ignore */ }
      })
      .catch(() => setRefreshing(false));
  }

  useEffect(() => {
    isMounted.current = true;
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // First-ever visit with no cache: show loader
  if (!data && refreshing) return <FeedLoader />;

  if (!data || data.error || !data.subreddits) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 16, padding: '0 32px', textAlign: 'center', fontFamily: 'var(--font-ui)' }}>
        <div style={{ fontSize: 36 }}>📡</div>
        <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--t1)', letterSpacing: '-0.03em' }}>Set up Command first</h2>
        <p style={{ fontSize: 13, color: 'var(--t2)', maxWidth: 340, lineHeight: 1.6 }}>
          Add your product description, ideal user, and subreddits to monitor.{' '}
          <span style={{ color: 'var(--t3)' }}>Feed will then surface strategic engagement opportunities automatically.</span>
        </p>
        <Link href="/command" style={{ background: 'var(--blue)', color: '#fff', fontSize: 13, fontWeight: 600, padding: '8px 18px', borderRadius: 7, textDecoration: 'none', fontFamily: 'var(--font-ui)' }}>
          Go to Command →
        </Link>
      </div>
    );
  }

  const threads = data.threads ?? [];

  // Build dynamic tab list from available categories
  const categoryCounts: Record<string, number> = { all: threads.length };
  threads.forEach(t => { categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1; });
  const availableCats = ['all', ...Object.keys(categoryCounts).filter(k => k !== 'all' && categoryCounts[k] > 0)];

  // Filter + tier
  const filtered = activeTab === 'all' ? threads : threads.filter(t => t.category === activeTab);
  const priorityThreads = filtered.slice(0, 5);
  const extendedThreads = filtered.slice(5);

  // Synthesis banner
  const synthesis = getSynthesisBanner(filtered.length > 0 ? filtered : threads);

  return (
    <div style={{ background: 'var(--void)', minHeight: '100vh', fontFamily: 'var(--font-ui)' }}>

      {/* Sticky top bar */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        height: 52, background: 'rgba(9,9,11,0.96)', borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        backdropFilter: 'blur(16px)',
        fontFamily: 'var(--font-mono, monospace)',
      }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 500, letterSpacing: '0.02em', color: 'var(--t1)' }}>Signal Feed</div>
          <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.22)', marginTop: 1, letterSpacing: '0.04em' }}>
            {data.subreddits.length} subreddits · {threads.length} signals
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {data.generatedAt && (
            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.18)', padding: '3px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 4, border: '0.5px solid rgba(255,255,255,0.06)', letterSpacing: '0.04em' }}>
              {new Date(data.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {refreshing && (
            <span style={{ fontSize: 10, color: '#00c8a0', letterSpacing: '0.06em' }}>↺ Syncing…</span>
          )}
          {!refreshing && (
            <button
              onClick={() => load(true)}
              style={{
                fontSize: 10, color: 'rgba(255,255,255,0.3)', background: 'none',
                border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 4,
                padding: '5px 11px', cursor: 'pointer',
                fontFamily: 'var(--font-mono, monospace)', letterSpacing: '0.06em',
              }}
            >
              ↺ Refresh
            </button>
          )}
        </div>
      </div>

      {/* Signal channel filters */}
      <div style={{
        borderBottom: '0.5px solid rgba(255,255,255,0.06)',
        display: 'flex', overflowX: 'auto', padding: '0 24px',
        fontFamily: 'var(--font-mono, monospace)',
        scrollbarWidth: 'none',
      }}>
        {availableCats.map(cat => {
          const isActive = activeTab === cat;
          const label = cat === 'all' ? 'All signals' : (SIGNAL_META[cat]?.label ?? cat);
          const count = categoryCounts[cat] ?? 0;
          return (
            <button
              key={cat}
              onClick={() => { setActiveTab(cat as ThreadCategory | 'all'); setExtendedOpen(false); }}
              style={{
                padding: '9px 12px', fontSize: 10, cursor: 'pointer',
                whiteSpace: 'nowrap', background: 'none',
                border: 'none', borderBottom: isActive ? '1.5px solid #00c8a0' : '1.5px solid transparent',
                color: isActive ? '#00c8a0' : 'rgba(255,255,255,0.28)',
                letterSpacing: '0.07em', textTransform: 'uppercase',
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {label}
              {count > 0 && (
                <span style={{
                  display: 'inline-block', marginLeft: 5, fontSize: 9,
                  color: isActive ? 'rgba(0,200,160,0.5)' : 'rgba(255,255,255,0.18)',
                  border: `0.5px solid ${isActive ? 'rgba(0,200,160,0.2)' : 'rgba(255,255,255,0.1)'}`,
                  padding: '0 4px', borderRadius: 2,
                }}>
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Main content */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '16px 24px 64px' }}>

        {/* Synthesis banner */}
        {synthesis && <SynthesisBanner text={synthesis} />}

        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '64px 0', fontFamily: 'var(--font-mono, monospace)' }}>
            <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, letterSpacing: '0.05em' }}>
              No signals in this category right now.
            </p>
          </div>
        ) : (
          <>
            {/* Priority signals */}
            <SectionLabel text={`Priority signals · ${priorityThreads.length} of ${filtered.length}`} />
            {priorityThreads.map(t => <ThreadCard key={t.id} t={t} />)}

            {/* Extended signals toggle + cards */}
            {extendedThreads.length > 0 && (
              <>
                <button
                  onClick={() => setExtendedOpen(o => !o)}
                  style={{
                    width: '100%', background: 'rgba(255,255,255,0.015)',
                    border: '0.5px solid rgba(255,255,255,0.07)', borderRadius: 6,
                    padding: '9px 14px', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontSize: 10, color: 'rgba(255,255,255,0.26)',
                    letterSpacing: '0.08em', textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono, monospace)',
                    marginBottom: extendedOpen ? 0 : 8,
                  }}
                >
                  <span>Extended signals · {extendedOpen ? 'collapse' : `${extendedThreads.length} more`}</span>
                  <span style={{ transform: extendedOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s', display: 'inline-block' }}>▼</span>
                </button>

                {extendedOpen && (
                  <div style={{ marginTop: 8, opacity: 0.78 }}>
                    {extendedThreads.map(t => <ThreadCard key={t.id} t={t} />)}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
