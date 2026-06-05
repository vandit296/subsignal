'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { ScoredThread, ThreadCategory, RiskLevel, SignalConfidence, ThreadPriority } from '@/types';

// ── Local extended type ────────────────────────────────────────────────────────

interface ThreadV3 extends ScoredThread {
  priority?: ThreadPriority;
  strategyMove?: string;
  strategyAngle?: string;
  strategyAvoid?: string;
  strategyPositioning?: string;
}

interface EngageResult {
  threads: ThreadV3[];
  subreddits: string[];
  productDescription: string;
  goal: string;
  generatedAt: string;
  isAnon?: boolean;
  isFreeTier?: boolean;
  error?: string;
}

type CardLayer = 'scan' | 'tactical' | 'deep';

const CACHE_KEY = 'treddit:feed:last';

// ── Signal metadata ────────────────────────────────────────────────────────────

const SIGNAL_META: Record<string, { label: string; color: string; synthesis: string }> = {
  switching_intent:      { label: 'Switching Intent',      color: '#d4604a', synthesis: 'Users actively migrating — high conversion window open.' },
  buying_exploration:    { label: 'Buying Exploration',    color: '#c97820', synthesis: 'Active evaluation mode — first credible voice sets the frame.' },
  founder_vulnerability: { label: 'Founder Vulnerability', color: '#9d6cd4', synthesis: 'Founders exposing real pain — trust-building opportunity.' },
  workflow_frustration:  { label: 'Workflow Frustration',  color: '#c99820', synthesis: 'Team-level friction surfacing — systemic pain creates openings.' },
  competitive_intel:     { label: 'Competitive Intel',     color: '#5b9bd4', synthesis: 'Market re-evaluating alternatives — competitive positioning window.' },
  pain_signal:           { label: 'Pain Signal',           color: '#d48c4a', synthesis: 'Clear problem awareness — nurture and timing play.' },
  churn_risk:            { label: 'Churn Risk',            color: '#d44a6a', synthesis: 'Competitor dissatisfaction surfacing — displacement opportunity.' },
  ideal_user:            { label: 'Ideal User',            color: '#4a9e6a', synthesis: 'ICP is active — relationship-building opportunity.' },
  competition:           { label: 'Competition',           color: '#5b9bd4', synthesis: 'Competitor landscape active — monitor and position.' },
  industry:              { label: 'Industry',              color: '#6a8aaa', synthesis: 'Relevant trend in the broader space.' },
  interesting:           { label: 'Interesting',           color: '#7a7f8e', synthesis: 'Worth monitoring for emerging patterns.' },
};

const PRIORITY_META: Record<ThreadPriority, { label: string; color: string; bg: string }> = {
  respond_now:   { label: 'RESPOND NOW',   color: '#ff5555', bg: 'rgba(255,85,85,0.08)'    },
  high_leverage: { label: 'HIGH LEVERAGE', color: '#00c8a0', bg: 'rgba(0,200,160,0.08)'    },
  observe_only:  { label: 'OBSERVE',       color: '#5b9bd4', bg: 'rgba(91,155,212,0.08)'   },
  long_term:     { label: 'LONG GAME',     color: '#9d6cd4', bg: 'rgba(157,108,212,0.08)'  },
  educational:   { label: 'EDUCATIONAL',   color: '#c99820', bg: 'rgba(201,152,32,0.08)'   },
  wait:          { label: 'WAIT',          color: '#4a5060', bg: 'rgba(74,80,96,0.08)'     },
  avoid:         { label: 'AVOID',         color: '#7a3030', bg: 'rgba(122,48,48,0.08)'    },
};

const CONFIDENCE_META: Record<string, { label: string; color: string }> = {
  conviction:        { label: 'CONVICTION',    color: '#00c8a0' },
  strong_signal:     { label: 'STRONG',        color: '#4a9e6a' },
  emerging:          { label: 'EMERGING',      color: '#c99820' },
  momentum_building: { label: 'MOMENTUM',      color: '#c97820' },
  early_pattern:     { label: 'EARLY PATTERN', color: '#5b9bd4' },
  speculative:       { label: 'SPECULATIVE',   color: '#6a7080' },
};

const CATEGORY_LABELS: Record<string, string> = {
  all: 'All Signals',
  switching_intent: 'Switching Intent',
  buying_exploration: 'Buying Exploration',
  founder_vulnerability: 'Founder Vulnerability',
  workflow_frustration: 'Workflow Frustration',
  competitive_intel: 'Competitive Intel',
  pain_signal: 'Pain Signal',
  churn_risk: 'Churn Risk',
  ideal_user: 'Ideal User',
  competition: 'Competition',
  industry: 'Industry',
  interesting: 'Interesting',
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function inferPriority(t: ThreadV3): ThreadPriority {
  if (t.priority) return t.priority;
  if (t.riskLevel === 'severe') return 'avoid';
  if (t.riskLevel === 'high') return 'observe_only';
  if (t.relevanceScore >= 9 && t.riskLevel === 'low') return 'respond_now';
  if (t.relevanceScore >= 8 && ['switching_intent', 'buying_exploration', 'churn_risk'].includes(t.category)) return 'respond_now';
  if (t.relevanceScore >= 7) return 'high_leverage';
  if (['industry', 'interesting'].includes(t.category)) return 'observe_only';
  return 'observe_only';
}

function riskColor(level?: RiskLevel): string {
  if (level === 'low')    return '#4a9e6a';
  if (level === 'medium') return '#c99820';
  if (level === 'high')   return '#d4604a';
  if (level === 'severe') return '#e83535';
  return '#4a5060';
}

function timeAgo(utc: number): string {
  const diff = Math.floor(Date.now() / 1000 - utc);
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

function firstSentence(text: string, max = 150): string {
  const dot = text.indexOf('. ');
  const s = dot > 0 && dot < max ? text.slice(0, dot + 1) : text.slice(0, max);
  return s.length < text.length ? s + (s.endsWith('.') ? '' : '…') : s;
}

function getSynthesisObservations(threads: ThreadV3[]): string[] {
  if (threads.length < 2) return [];
  const obs: string[] = [];

  const counts: Record<string, number> = {};
  threads.slice(0, 15).forEach(t => { counts[t.category] = (counts[t.category] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (sorted[0][1] >= 2) {
    const [cat, cnt] = sorted[0];
    const m = SIGNAL_META[cat];
    if (m) obs.push(`${m.label} is the dominant signal — ${cnt} threads detected across monitored communities`);
  }

  const urgent = threads.filter(t => {
    const p = inferPriority(t);
    return p === 'respond_now' || p === 'high_leverage';
  });
  if (urgent.length >= 2) {
    obs.push(`${urgent.length} high-leverage opportunities in active engagement window`);
  }

  const subs = [...new Set(threads.slice(0, 12).map(t => t.subreddit))];
  if (subs.length >= 2 && sorted.length > 0) {
    const [cat2] = sorted[0];
    const m2 = SIGNAL_META[cat2];
    if (m2) obs.push(`${m2.label.toLowerCase()} conversations active across ${subs.length} subreddits`);
  }

  return [...new Set(obs)].slice(0, 3);
}

// ── FeedLoader ────────────────────────────────────────────────────────────────

const LOADER_LINES = [
  'initializing intelligence engine...',
  'connecting to Reddit corpus...',
  'fetching recent thread activity...',
  'running strategic scoring model...',
  'analyzing signal patterns...',
  'computing engagement vectors...',
  'synthesizing market intelligence...',
  'preparing signal feed...',
];

function FeedLoader() {
  const [lineIdx, setLineIdx] = useState(0);
  const [progress, setProgress] = useState(0);
  const [blink, setBlink] = useState(true);

  useEffect(() => {
    const li = setInterval(() => setLineIdx(p => Math.min(p + 1, LOADER_LINES.length - 1)), 900);
    const pi = setInterval(() => setProgress(p => Math.min(p + Math.random() * 4, 84)), 400);
    const bi = setInterval(() => setBlink(p => !p), 500);
    return () => { clearInterval(li); clearInterval(pi); clearInterval(bi); };
  }, []);

  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{
        width: 480, background: '#0d1117',
        border: '1px solid rgba(0,200,160,0.15)',
        borderRadius: 8, overflow: 'hidden',
        boxShadow: '0 0 40px rgba(0,200,160,0.04)',
      }}>
        <div style={{
          background: '#080b0f', borderBottom: '1px solid rgba(255,255,255,0.06)',
          padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {['#d44a4a','#c99820','#4a9e6a'].map((c, i) => (
            <div key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: c, opacity: 0.7 }} />
          ))}
          <span style={{ marginLeft: 8, fontSize: 10, color: '#3a3f4e', letterSpacing: '0.08em' }}>
            SIGNAL INTELLIGENCE ENGINE
          </span>
        </div>
        <div style={{ padding: '20px 20px 16px' }}>
          <div style={{ fontSize: 11, lineHeight: 1.7, marginBottom: 16 }}>
            {LOADER_LINES.slice(0, lineIdx + 1).map((l, i) => (
              <div key={i} style={{ color: i === lineIdx ? '#00c8a0' : '#1e3a2a' }}>
                {'> '}{l}{i === lineIdx && <span style={{ opacity: blink ? 1 : 0 }}>_</span>}
              </div>
            ))}
          </div>
          <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 2, height: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', width: `${progress}%`,
              background: 'linear-gradient(90deg, #00c8a0, #4a9e6a)',
              transition: 'width 0.4s ease',
            }} />
          </div>
          <div style={{ marginTop: 8, fontSize: 10, color: '#1e3a2a', letterSpacing: '0.06em' }}>
            {Math.round(progress)}% — analyzing signal patterns
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

// ── Trial helpers ──────────────────────────────────────────────────────────────

function getTrialState(session: ReturnType<typeof useSession>['data']): {
  isExpired: boolean;
  daysLeft: number | null;
} {
  if (!session?.user) return { isExpired: false, daysLeft: null }; // anonymous
  const u = session.user as any;
  if (u.subscriptionStatus === 'active') return { isExpired: false, daysLeft: null };
  const trialStart = u.trialStartAt as string | undefined;
  if (!trialStart) return { isExpired: false, daysLeft: null };
  const trialEnd = new Date(trialStart).getTime() + 3 * 86_400_000;
  const msLeft = trialEnd - Date.now();
  const daysLeft = Math.max(0, Math.ceil(msLeft / 86_400_000));
  return { isExpired: msLeft <= 0, daysLeft };
}

export default function FeedPage() {
  const { data: session } = useSession();
  const { isExpired, daysLeft } = getTrialState(session);

  const [data, setData] = useState<EngageResult | null>(() => {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      return raw ? (JSON.parse(raw) as EngageResult) : null;
    } catch { return null; }
  });
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [showExtended, setShowExtended] = useState(false);
  const [cardLayers, setCardLayers] = useState<Record<string, CardLayer>>({});

  function setCardLayer(id: string, layer: CardLayer) {
    setCardLayers(prev => ({ ...prev, [id]: layer }));
  }

  function load(bust = false) {
    setRefreshing(true);
    fetch(bust ? '/api/engage?bust=1' : '/api/engage')
      .then(r => r.json())
      .then(d => {
        setData(d);
        setRefreshing(false);
        try { localStorage.setItem(CACHE_KEY, JSON.stringify(d)); } catch { }
      })
      .catch(() => setRefreshing(false));
  }

  useEffect(() => { if (!data) load(); }, []);

  if (!data) return <FeedLoader />;

  const threads = (data.threads ?? []) as ThreadV3[];
  const filtered = activeTab === 'all' ? threads : threads.filter(t => t.category === activeTab);
  const priorityThreads = filtered.slice(0, 5);
  const extendedThreads = filtered.slice(5);

  const categoryCounts: Record<string, number> = { all: threads.length };
  threads.forEach(t => { categoryCounts[t.category] = (categoryCounts[t.category] || 0) + 1; });
  const availableCats = ['all', ...Object.keys(categoryCounts).filter(k => k !== 'all' && categoryCounts[k] > 0)];

  const synthObs = getSynthesisObservations(threads);

  // ── Card renderer ───────────────────────────────────────────────────────────

  function renderCard(t: ThreadV3, isPriority: boolean) {
    const layer = cardLayers[t.id] ?? 'scan';
    const priority = inferPriority(t);
    const pMeta = PRIORITY_META[priority];
    const sMeta = SIGNAL_META[t.category] ?? SIGNAL_META.interesting;
    const cMeta = t.signalConfidence ? CONFIDENCE_META[t.signalConfidence] : null;
    const hasStructured = !!(t.strategyMove);

    const strategyRows = hasStructured
      ? [
          { key: 'RECOMMENDED MOVE', val: t.strategyMove },
          { key: 'ANGLE',            val: t.strategyAngle },
          { key: 'AVOID',            val: t.strategyAvoid },
          { key: 'POSITIONING',      val: t.strategyPositioning },
        ].filter(r => r.val)
      : [];

    return (
      <div key={t.id} style={{
        background: isPriority ? '#0d1117' : '#0a0d12',
        border: `1px solid ${isPriority ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.05)'}`,
        borderLeft: `2px solid ${sMeta.color}`,
        borderRadius: 5,
        marginBottom: 9,
        overflow: 'hidden',
      }}>

        {/* ── INTELLIGENCE HEADER ──────────────────── */}
        <div style={{
          display: 'flex', alignItems: 'center', gap: 7,
          padding: '7px 13px',
          background: 'rgba(0,0,0,0.3)',
          borderBottom: '0.5px solid rgba(255,255,255,0.05)',
          flexWrap: 'wrap',
        }}>
          {/* Signal type tag */}
          <span style={{
            fontSize: 9, letterSpacing: '0.1em', fontWeight: 600,
            color: sMeta.color,
            background: `${sMeta.color}14`,
            border: `1px solid ${sMeta.color}38`,
            borderRadius: 3, padding: '2px 8px',
            textTransform: 'uppercase',
            boxShadow: `0 0 10px ${sMeta.color}16`,
          }}>
            ● {sMeta.label}
          </span>

          {/* Confidence */}
          {cMeta && (
            <span style={{
              fontSize: 9, letterSpacing: '0.08em',
              color: cMeta.color, opacity: 0.8,
              textTransform: 'uppercase',
            }}>
              {cMeta.label}
            </span>
          )}

          {/* Score */}
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.06em',
            color: '#00c8a0',
          }}>
            ◆ {t.relevanceScore.toFixed(1)}
          </span>

          <div style={{ flex: 1 }} />

          {/* Priority badge */}
          <span style={{
            fontSize: 9, fontWeight: 700, letterSpacing: '0.1em',
            color: pMeta.color,
            background: pMeta.bg,
            border: `1px solid ${pMeta.color}30`,
            borderRadius: 3, padding: '2px 8px',
            textTransform: 'uppercase',
          }}>
            {pMeta.label}
          </span>
        </div>

        {/* ── TITLE + METADATA ─────────────────────── */}
        <div style={{ padding: '11px 13px 8px' }}>
          <a
            href={t.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              fontSize: 13.5, fontWeight: 600, color: '#d8dce8',
              textDecoration: 'none', lineHeight: 1.45, display: 'block',
            }}
          >
            {t.title}
          </a>
          <div style={{
            display: 'flex', gap: 12, marginTop: 6,
            fontSize: 10, color: '#3a3f4e', letterSpacing: '0.04em',
          }}>
            <span>r/{t.subreddit}</span>
            <span>↑{t.score}</span>
            <span>◌{t.numComments}</span>
            <span>{timeAgo(t.createdUtc)}</span>
          </div>
        </div>

        {/* ── SCAN LAYER — strategic insight ──────── */}
        {t.relevanceReason && (
          <div style={{
            padding: '0 13px 11px',
            fontSize: 11.5, color: '#7a8a9a', lineHeight: 1.62,
            borderBottom: layer !== 'scan' ? '0.5px solid rgba(255,255,255,0.05)' : undefined,
          }}>
            {layer === 'scan' ? firstSentence(t.relevanceReason) : t.relevanceReason}
          </div>
        )}

        {/* ── TACTICAL LAYER ───────────────────────── */}
        {(layer === 'tactical' || layer === 'deep') && (
          <div style={{
            padding: '12px 13px',
            borderBottom: layer === 'deep' ? '0.5px solid rgba(255,255,255,0.05)' : undefined,
            display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            {/* Engagement strategy block */}
            <div style={{
              background: '#0b1410',
              border: '0.5px solid rgba(0,200,160,0.12)',
              borderLeft: '2px solid #00c8a0',
              borderRadius: '0 4px 4px 0',
              padding: '10px 13px',
            }}>
              <div style={{
                fontSize: 9, letterSpacing: '0.12em',
                color: 'rgba(0,200,160,0.45)', textTransform: 'uppercase',
                marginBottom: 11, fontWeight: 600,
              }}>
                Engagement Strategy
              </div>

              {hasStructured ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {strategyRows.map(({ key, val }) => (
                    <div key={key}>
                      <div style={{
                        fontSize: 9, letterSpacing: '0.1em',
                        color: 'rgba(0,200,160,0.32)', textTransform: 'uppercase',
                        marginBottom: 4, fontWeight: 600,
                      }}>
                        {key}
                      </div>
                      <p style={{ fontSize: 11.5, color: '#b0ccc4', lineHeight: 1.65, margin: 0 }}>
                        {val}
                      </p>
                    </div>
                  ))}
                </div>
              ) : t.engagementAngle ? (
                <p style={{ fontSize: 11.5, color: '#b0ccc4', lineHeight: 1.68, margin: 0 }}>
                  {t.engagementAngle}
                </p>
              ) : null}
            </div>

            {/* Risk block */}
            {(t.riskLevel || t.engagementRisk) && (
              <div style={{
                background: `${riskColor(t.riskLevel)}07`,
                border: `0.5px solid ${riskColor(t.riskLevel)}22`,
                borderLeft: `2px solid ${riskColor(t.riskLevel)}`,
                borderRadius: '0 4px 4px 0',
                padding: '9px 12px',
              }}>
                <div style={{
                  fontSize: 9, letterSpacing: '0.1em',
                  color: riskColor(t.riskLevel), textTransform: 'uppercase',
                  marginBottom: t.engagementRisk ? 4 : 0, fontWeight: 600,
                }}>
                  Risk · {(t.riskLevel ?? 'unknown').toUpperCase()}
                </div>
                {t.engagementRisk && (
                  <p style={{ fontSize: 11, color: '#6a7080', lineHeight: 1.55, margin: 0 }}>
                    {t.engagementRisk}
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── DEEP LAYER ──────────────────────────── */}
        {layer === 'deep' && (
          <div style={{ padding: '12px 13px', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              { label: 'Person Signal',         text: t.personSignal },
              { label: 'Conversation Openness', text: t.conversationOpenness },
              { label: 'Trajectory',            text: t.trajectory },
            ].filter(x => x.text).map(({ label, text }) => (
              <div key={label} style={{
                background: 'rgba(255,255,255,0.022)',
                border: '0.5px solid rgba(255,255,255,0.07)',
                borderRadius: 4,
                padding: '9px 12px',
              }}>
                <div style={{
                  fontSize: 9, letterSpacing: '0.1em',
                  color: '#3a4455', textTransform: 'uppercase',
                  marginBottom: 5, fontWeight: 600,
                }}>
                  {label}
                </div>
                <p style={{ fontSize: 11.5, color: '#8a9aaa', lineHeight: 1.62, margin: 0 }}>
                  {text}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* ── LAYER CONTROLS ──────────────────────── */}
        <div style={{ display: 'flex', borderTop: '0.5px solid rgba(255,255,255,0.05)' }}>
          {(['scan', 'tactical', 'deep'] as CardLayer[]).map((l, i) => (
            <button
              key={l}
              onClick={() => setCardLayer(t.id, l)}
              style={{
                flex: 1, padding: '7px 0',
                background: layer === l ? 'rgba(0,200,160,0.05)' : 'transparent',
                border: 'none',
                borderRight: i < 2 ? '0.5px solid rgba(255,255,255,0.05)' : 'none',
                cursor: 'pointer',
                fontSize: 9, letterSpacing: '0.1em',
                color: layer === l ? '#00c8a0' : '#2a2f3e',
                textTransform: 'uppercase',
                fontFamily: 'inherit',
                transition: 'color 0.15s',
              }}
            >
              {l === 'scan' ? 'SCAN' : l === 'tactical' ? 'TACTICAL' : 'DEEP INTEL'}
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Page render ─────────────────────────────────────────────────────────────

  // Feed content (used both normally and blurred under the lock overlay)
  const feedContent = (
    <div style={{
      maxWidth: 780, margin: '0 auto',
      padding: '24px 16px 60px',
      fontFamily: 'ui-monospace, "Cascadia Code", "SF Mono", Menlo, monospace',
    }}>

        {/* ── HEADER ─────────────────────────────── */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <div style={{
                fontSize: 10, letterSpacing: '0.16em', color: 'rgba(0,200,160,0.6)',
                textTransform: 'uppercase', marginBottom: 5,
              }}>
                ◆ Signal Intelligence Feed
              </div>
              <h1 style={{ fontSize: 18, fontWeight: 700, color: '#d0d4e0', margin: '0 0 6px' }}>
                Live GTM Opportunities
              </h1>
              <div style={{ fontSize: 10, color: '#2e3240', letterSpacing: '0.05em' }}>
                {threads.length} signals
                {data.generatedAt && ` · scored ${timeAgo(Math.floor(new Date(data.generatedAt).getTime() / 1000))} ago`}
                {data.subreddits?.length ? ` · ${data.subreddits.length} subreddits` : ''}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', paddingTop: 2 }}>
              {refreshing && (
                <span style={{ fontSize: 9, color: '#00c8a0', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  SCANNING...
                </span>
              )}
              <button
                onClick={() => load(true)}
                disabled={refreshing}
                style={{
                  background: 'transparent',
                  border: '1px solid rgba(0,200,160,0.2)',
                  color: '#00c8a0',
                  fontSize: 10, letterSpacing: '0.1em',
                  padding: '6px 12px',
                  borderRadius: 4,
                  cursor: refreshing ? 'not-allowed' : 'pointer',
                  opacity: refreshing ? 0.5 : 1,
                  fontFamily: 'inherit',
                  textTransform: 'uppercase',
                }}
              >
                Refresh
              </button>
            </div>
          </div>
        </div>

        {/* ── LIVE MARKET INTELLIGENCE ────────────── */}
        {synthObs.length > 0 && (
          <div style={{
            background: '#070a0d',
            border: '1px solid rgba(0,200,160,0.1)',
            borderLeft: '2px solid rgba(0,200,160,0.35)',
            borderRadius: 5,
            marginBottom: 16,
            overflow: 'hidden',
          }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '6px 13px',
              borderBottom: '0.5px solid rgba(0,200,160,0.07)',
              background: 'rgba(0,200,160,0.025)',
            }}>
              <span
                className="live-dot"
                style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: '#00c8a0', display: 'inline-block', flexShrink: 0,
                }}
              />
              <span style={{
                fontSize: 9, letterSpacing: '0.14em',
                color: 'rgba(0,200,160,0.55)', textTransform: 'uppercase', fontWeight: 600,
              }}>
                Live Market Intelligence
              </span>
            </div>
            <div style={{ padding: '10px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
              {synthObs.map((obs, i) => (
                <div key={i} style={{
                  fontSize: 11.5, color: '#6a8a7a', lineHeight: 1.5,
                  display: 'flex', alignItems: 'flex-start', gap: 9,
                }}>
                  <span style={{ color: 'rgba(0,200,160,0.3)', flexShrink: 0, marginTop: 1 }}>→</span>
                  <span>{obs}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── FILTER CHANNELS ─────────────────────── */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 20 }}>
          {availableCats.map(cat => {
            const isActive = activeTab === cat;
            const sMeta = cat !== 'all' ? (SIGNAL_META[cat] ?? SIGNAL_META.interesting) : null;
            const color = sMeta?.color ?? '#00c8a0';
            return (
              <button
                key={cat}
                onClick={() => setActiveTab(cat)}
                style={{
                  background: isActive ? `${color}10` : 'transparent',
                  border: `1px solid ${isActive ? color + '45' : 'rgba(255,255,255,0.07)'}`,
                  borderRadius: 4, padding: '4px 10px',
                  cursor: 'pointer',
                  fontSize: 9.5, letterSpacing: '0.08em',
                  color: isActive ? color : '#3a3f4e',
                  textTransform: 'uppercase',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s',
                  boxShadow: isActive ? `0 0 10px ${color}12` : 'none',
                }}
              >
                {CATEGORY_LABELS[cat] ?? cat}
                {categoryCounts[cat] !== undefined && (
                  <span style={{ marginLeft: 5, opacity: 0.55 }}>{categoryCounts[cat]}</span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── PRIORITY SIGNALS ────────────────────── */}
        {priorityThreads.length > 0 && (
          <div style={{ marginBottom: 22 }}>
            <div style={{
              fontSize: 9, letterSpacing: '0.14em', color: '#2e3240',
              textTransform: 'uppercase', marginBottom: 10,
              display: 'flex', alignItems: 'center', gap: 8,
            }}>
              <span style={{ color: '#00c8a0' }}>●</span>
              Priority Signals
              <span style={{ flex: 1, height: '0.5px', background: 'rgba(255,255,255,0.04)' }} />
              <span style={{ color: '#1e2430' }}>{priorityThreads.length} threads</span>
            </div>
            {priorityThreads.map(t => renderCard(t, true))}
          </div>
        )}

        {/* ── EXTENDED SIGNALS ────────────────────── */}
        {extendedThreads.length > 0 && (
          <div>
            <button
              onClick={() => setShowExtended(p => !p)}
              style={{
                width: '100%', background: 'transparent',
                border: '0.5px solid rgba(255,255,255,0.06)',
                borderRadius: 4, padding: '8px 13px',
                cursor: 'pointer', marginBottom: showExtended ? 10 : 0,
                display: 'flex', alignItems: 'center', gap: 8,
                fontSize: 9, letterSpacing: '0.12em', color: '#2e3240',
                textTransform: 'uppercase', fontFamily: 'inherit',
                transition: 'border-color 0.15s',
              }}
            >
              <span style={{ flex: 1, textAlign: 'left' }}>
                {showExtended ? '▾' : '▸'} Extended Signals
              </span>
              <span>{extendedThreads.length} threads</span>
            </button>
            {showExtended && extendedThreads.map(t => renderCard(t, false))}
          </div>
        )}

        {/* ── EMPTY STATE ──────────────────────────── */}
        {threads.length === 0 && (
          <div style={{
            textAlign: 'center', padding: '72px 24px', maxWidth: 440, margin: '0 auto',
          }}>
            <div style={{
              fontSize: 30, color: '#4A8FFF', marginBottom: 18,
              filter: 'drop-shadow(0 0 16px rgba(74,143,255,0.45))',
            }}>◆</div>
            <div style={{
              fontSize: 17, fontWeight: 600, color: '#F0ECE4',
              letterSpacing: '0.02em', marginBottom: 10,
            }}>
              No signals yet
            </div>
            <div style={{
              fontSize: 13, lineHeight: 1.6, color: 'rgba(240,236,228,0.5)',
              marginBottom: 26,
            }}>
              Your feed surfaces high-intent Reddit threads from the subreddits you track.
              Add a few to start seeing signals here.
            </div>
            <Link
              href="/command"
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-1px)';
                e.currentTarget.style.boxShadow = '0 6px 26px rgba(74,143,255,0.5)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 18px rgba(74,143,255,0.32)';
              }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                padding: '13px 24px', borderRadius: 10,
                background: '#4A8FFF', color: '#0C0C0F',
                fontSize: 12, fontWeight: 700, letterSpacing: '0.08em',
                textTransform: 'uppercase', textDecoration: 'none',
                boxShadow: '0 4px 18px rgba(74,143,255,0.32)',
                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
              }}
            >
              Add subreddits →
            </Link>
            <div style={{ marginTop: 16, fontSize: 11, color: 'rgba(240,236,228,0.3)' }}>
              Takes ~30 seconds in Command settings
            </div>
          </div>
        )}
      </div>
  );

  return (
    <>
      <style>{`
        @keyframes pulse-live {
          0%, 100% { opacity: 1; box-shadow: 0 0 6px #00c8a0; }
          50%       { opacity: 0.4; box-shadow: 0 0 12px #00c8a0; }
        }
        .live-dot { animation: pulse-live 2.4s ease-in-out infinite; }
      `}</style>

      {/* ── Trial countdown banner ─────────────────────────────────────────── */}
      {!isExpired && daysLeft !== null && daysLeft <= 3 && (
        <div style={{
          background: '#100e06',
          borderBottom: '1px solid rgba(201,152,32,0.2)',
          padding: '9px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          fontFamily: 'ui-monospace, "Cascadia Code", "SF Mono", Menlo, monospace',
        }}>
          <span style={{ fontSize: 11, color: '#c99820', letterSpacing: '0.06em' }}>
            ◆ {daysLeft === 0 ? 'Last day of trial' : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left on trial`}
          </span>
          <Link href="/upgrade" style={{
            fontSize: 10, color: '#c97820', letterSpacing: '0.1em',
            textDecoration: 'none', textTransform: 'uppercase',
            border: '1px solid rgba(201,120,32,0.3)', borderRadius: 3, padding: '3px 10px',
          }}>
            Upgrade →
          </Link>
        </div>
      )}

      {/* ── Free tier banner ──────────────────────────────────────────────── */}
      {(isExpired || data?.isFreeTier) && (
        <div style={{
          background: '#08100d',
          borderBottom: '1px solid rgba(0,200,160,0.12)',
          padding: '10px 24px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
          fontFamily: 'ui-monospace, "Cascadia Code", "SF Mono", Menlo, monospace',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 9, letterSpacing: '0.12em', color: 'rgba(0,200,160,0.4)', textTransform: 'uppercase' }}>
              FREE PLAN
            </span>
            <span style={{ fontSize: 11, color: '#3a5040' }}>
              Default feed only — upgrade for personalised signals, email digests, and real-time monitoring
            </span>
          </div>
          <Link href="/upgrade" style={{
            fontSize: 10, color: '#00c8a0', letterSpacing: '0.1em',
            textDecoration: 'none', textTransform: 'uppercase', flexShrink: 0,
            border: '1px solid rgba(0,200,160,0.25)', borderRadius: 3, padding: '3px 10px',
          }}>
            Upgrade →
          </Link>
        </div>
      )}

      {feedContent}
    </>
  );
}
