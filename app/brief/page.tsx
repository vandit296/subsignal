'use client';
import { useState, useEffect } from 'react';
import { DailyBrief, BriefNarrative, BriefThread, MarketPulseItem } from '@/lib/upstash';

// ── Strength Meter ────────────────────────────────────────────────────────────

function StrengthMeter({ strength }: { strength: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div
          key={i}
          style={{
            width: 18,
            height: 3,
            borderRadius: 2,
            background: i <= strength ? 'var(--hot)' : 'rgba(255,255,255,0.08)',
            transition: 'background 0.2s',
          }}
        />
      ))}
    </div>
  );
}

// ── Type Badge ────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: BriefNarrative['type'] }) {
  const colors: Record<BriefNarrative['type'], { bg: string; text: string; label: string }> = {
    hero:    { bg: 'rgba(255,100,32,0.12)', text: 'var(--hot)',  label: 'LEAD STORY' },
    signal:  { bg: 'rgba(74,143,255,0.12)', text: 'var(--blue)', label: 'SIGNAL' },
    tension: { bg: 'rgba(220,50,50,0.12)',  text: '#e05050',     label: 'TENSION' },
    mood:    { bg: 'rgba(160,120,255,0.12)',text: '#b090ff',     label: 'MOOD' },
  };
  const c = colors[type];
  return (
    <span style={{
      display: 'inline-block',
      background: c.bg,
      color: c.text,
      fontSize: 9,
      fontWeight: 700,
      letterSpacing: '0.1em',
      padding: '2px 7px',
      borderRadius: 3,
      textTransform: 'uppercase',
      fontFamily: 'var(--font-ui)',
    }}>
      {c.label}
    </span>
  );
}

// ── Thread Row ────────────────────────────────────────────────────────────────

function ThreadRow({ thread }: { thread: BriefThread }) {
  const timeAgo = (() => {
    const diff = Date.now() / 1000 - thread.createdUtc;
    if (diff < 3600) return `${Math.round(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.round(diff / 3600)}h ago`;
    return `${Math.round(diff / 86400)}d ago`;
  })();

  return (
    <a
      href={thread.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 12,
        padding: '10px 0',
        borderBottom: '0.5px solid var(--border)',
        textDecoration: 'none',
        color: 'inherit',
      }}
    >
      <div style={{
        flexShrink: 0,
        minWidth: 42,
        textAlign: 'right',
        paddingTop: 1,
      }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--hot)', fontFamily: 'var(--font-ui)' }}>
          {thread.score >= 1000 ? `${(thread.score / 1000).toFixed(1)}k` : thread.score}
        </span>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.45, marginBottom: 3 }}>
          {thread.title}
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
            r/{thread.subreddit}
          </span>
          <span style={{ fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
            {thread.numComments} comments
          </span>
          <span style={{ fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
            {timeAgo}
          </span>
        </div>
      </div>
      <div style={{ flexShrink: 0, paddingTop: 2 }}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--t4)' }}>
          <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
          <polyline points="15 3 21 3 21 9"/>
          <line x1="10" y1="14" x2="21" y2="3"/>
        </svg>
      </div>
    </a>
  );
}

// ── Hero Story ────────────────────────────────────────────────────────────────

function HeroStory({ narrative }: { narrative: BriefNarrative }) {
  const [expanded, setExpanded] = useState(false);
  const paragraphs = narrative.synthesis.split('\n\n').filter(Boolean);

  return (
    <article style={{
      padding: '32px 36px',
      borderBottom: '0.5px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <TypeBadge type={narrative.type} />
        <StrengthMeter strength={narrative.strength} />
        <span style={{ fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)', marginLeft: 4 }}>
          {narrative.totalUpvotes.toLocaleString()} upvotes · {narrative.threads.length} threads
        </span>
      </div>

      <h1 style={{
        fontSize: 28,
        fontWeight: 700,
        lineHeight: 1.22,
        color: 'var(--t1)',
        letterSpacing: '-0.02em',
        marginBottom: 20,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>
        {narrative.headline}
      </h1>

      <div style={{ marginBottom: 20 }}>
        {paragraphs.map((p, i) => (
          <p key={i} style={{
            fontSize: 15.5,
            lineHeight: 1.65,
            color: 'var(--t2)',
            marginBottom: 14,
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}>
            {p}
          </p>
        ))}
      </div>

      <div style={{
        padding: '12px 16px',
        borderLeft: '2px solid var(--hot)',
        background: 'rgba(255,100,32,0.04)',
        borderRadius: '0 6px 6px 0',
        marginBottom: 20,
      }}>
        <p style={{
          fontSize: 13.5,
          lineHeight: 1.5,
          color: 'var(--t2)',
          fontStyle: 'italic',
          margin: 0,
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>
          {narrative.implication}
        </p>
      </div>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
        {narrative.subreddits.map(sub => (
          <span key={sub} style={{
            fontSize: 10.5,
            color: 'var(--t3)',
            background: 'rgba(255,255,255,0.04)',
            border: '0.5px solid var(--border)',
            borderRadius: 4,
            padding: '2px 7px',
            fontFamily: 'var(--font-ui)',
          }}>
            r/{sub}
          </span>
        ))}
      </div>

      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          color: 'var(--t3)',
          fontSize: 11.5,
          fontFamily: 'var(--font-ui)',
          fontWeight: 500,
          letterSpacing: '0.04em',
          padding: 0,
          textTransform: 'uppercase',
        }}
      >
        <svg
          width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
        {expanded ? 'Hide' : 'Show'} {narrative.threads.length} source threads
      </button>

      {expanded && (
        <div style={{ marginTop: 12 }}>
          {narrative.threads.map(t => <ThreadRow key={t.id} thread={t} />)}
        </div>
      )}
    </article>
  );
}

// ── Signal Card ───────────────────────────────────────────────────────────────

function SignalCard({ narrative }: { narrative: BriefNarrative }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <article style={{
      padding: '20px',
      borderBottom: '0.5px solid var(--border)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
        <TypeBadge type={narrative.type} />
        <StrengthMeter strength={narrative.strength} />
      </div>

      <h3 style={{
        fontSize: 16,
        fontWeight: 600,
        lineHeight: 1.3,
        color: 'var(--t1)',
        letterSpacing: '-0.01em',
        marginBottom: 10,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>
        {narrative.headline}
      </h3>

      <p style={{
        fontSize: 13,
        lineHeight: 1.55,
        color: 'var(--t3)',
        marginBottom: 10,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>
        {narrative.synthesis.split('\n\n')[0]}
      </p>

      <p style={{
        fontSize: 12,
        lineHeight: 1.4,
        color: 'var(--t4)',
        fontStyle: 'italic',
        marginBottom: 12,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>
        {narrative.implication}
      </p>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
          {narrative.totalUpvotes.toLocaleString()} upvotes · {narrative.threads.length} threads
        </span>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--t4)', fontSize: 10.5, fontFamily: 'var(--font-ui)',
            display: 'flex', alignItems: 'center', gap: 4,
            textTransform: 'uppercase', letterSpacing: '0.04em', padding: 0,
          }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
            <polyline points="6 9 12 15 18 9"/>
          </svg>
          Sources
        </button>
      </div>

      {expanded && (
        <div style={{ marginTop: 10 }}>
          {narrative.threads.map(t => <ThreadRow key={t.id} thread={t} />)}
        </div>
      )}
    </article>
  );
}

// ── Market Pulse ──────────────────────────────────────────────────────────────

function MarketPulse({ items }: { items: MarketPulseItem[] }) {
  if (!items.length) return null;
  return (
    <div style={{
      padding: '16px 24px',
      borderBottom: '0.5px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      overflowX: 'auto',
      background: 'rgba(255,255,255,0.015)',
    }}>
      <span style={{
        fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em',
        color: 'var(--t4)', fontFamily: 'var(--font-ui)',
        textTransform: 'uppercase', flexShrink: 0, marginRight: 20,
      }}>
        Market Pulse
      </span>
      <div style={{ display: 'flex', gap: 0, flexWrap: 'nowrap', overflow: 'hidden' }}>
        {items.map((item, i) => (
          <div key={i} style={{
            display: 'flex', alignItems: 'center', gap: 6,
            paddingRight: 24,
            borderRight: i < items.length - 1 ? '0.5px solid var(--border)' : 'none',
            marginRight: i < items.length - 1 ? 24 : 0,
            flexShrink: 0,
          }}>
            <span style={{ fontSize: 11.5, color: 'var(--t2)', fontFamily: 'var(--font-ui)', whiteSpace: 'nowrap' }}>
              {item.label}
            </span>
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: item.change >= 0 ? 'var(--hot)' : '#e05050',
              fontFamily: 'var(--font-ui)',
              fontVariantNumeric: 'tabular-nums',
            }}>
              {item.change >= 0 ? '+' : ''}{item.change}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function BriefSkeleton() {
  return (
    <div style={{ padding: '40px 36px' }}>
      <style>{`
        @keyframes shimmer {
          0% { opacity: 0.4; }
          50% { opacity: 0.8; }
          100% { opacity: 0.4; }
        }
        .sk { background: rgba(255,255,255,0.06); border-radius: 4px; animation: shimmer 1.6s ease-in-out infinite; }
      `}</style>
      <div className="sk" style={{ height: 12, width: 140, marginBottom: 24 }} />
      <div className="sk" style={{ height: 32, width: '75%', marginBottom: 12 }} />
      <div className="sk" style={{ height: 32, width: '55%', marginBottom: 28 }} />
      <div className="sk" style={{ height: 14, width: '90%', marginBottom: 10 }} />
      <div className="sk" style={{ height: 14, width: '82%', marginBottom: 10 }} />
      <div className="sk" style={{ height: 14, width: '70%', marginBottom: 32 }} />
      <div style={{ display: 'flex', gap: 12 }}>
        <div className="sk" style={{ height: 110, flex: 1, borderRadius: 8 }} />
        <div className="sk" style={{ height: 110, flex: 1, borderRadius: 8 }} />
        <div className="sk" style={{ height: 110, flex: 1, borderRadius: 8 }} />
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      minHeight: '60vh', padding: '60px 40px', textAlign: 'center',
    }}>
      <div style={{
        width: 52, height: 52, borderRadius: 12,
        border: '0.5px solid var(--border)',
        background: 'rgba(255,255,255,0.03)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 20,
      }}>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--t3)" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
          <line x1="8" y1="10" x2="16" y2="10"/>
          <line x1="8" y1="14" x2="16" y2="14"/>
          <line x1="8" y1="6" x2="12" y2="6"/>
        </svg>
      </div>
      <h2 style={{
        fontSize: 22, fontWeight: 700, color: 'var(--t1)',
        letterSpacing: '-0.02em', marginBottom: 10,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>
        No Brief Yet Today
      </h2>
      <p style={{
        fontSize: 14, color: 'var(--t3)', lineHeight: 1.55,
        maxWidth: 400, marginBottom: 28,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>
        Your Morning Brief synthesizes the past 48 hours of Reddit intelligence across your tracked subreddits into strategic market narratives.
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '11px 24px',
          background: generating ? 'rgba(255,100,32,0.1)' : 'var(--hot)',
          color: generating ? 'var(--hot)' : '#000',
          border: generating ? '0.5px solid var(--hot)' : 'none',
          borderRadius: 8,
          cursor: generating ? 'not-allowed' : 'pointer',
          fontWeight: 600, fontSize: 13.5,
          fontFamily: 'var(--font-ui)',
          letterSpacing: '0.01em',
          transition: 'all 0.15s',
        }}
      >
        {generating ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
              style={{ animation: 'spin 1s linear infinite' }}>
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Generating Brief…
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
              <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1z"/>
            </svg>
            Generate Morning Brief
          </>
        )}
      </button>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function BriefPage() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = new Date().toISOString().slice(0, 10);
  const todayFormatted = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  async function fetchBrief() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/brief?date=${today}`);
      if (!res.ok) {
        setError('Failed to load brief.');
        return;
      }
      const data = await res.json() as { brief: DailyBrief | null; hasToday: boolean };
      setBrief(data.brief);
    } catch {
      setError('Network error loading brief.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGenerate() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/brief/generate', { method: 'POST' });
      const data = await res.json() as { ok: boolean; brief?: DailyBrief; error?: string };
      if (data.ok && data.brief) {
        setBrief(data.brief);
      } else {
        setError(data.error ?? 'Generation failed. Make sure you have subreddits set up in /command.');
      }
    } catch {
      setError('Network error during generation.');
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => {
    fetchBrief();
  }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)' }}>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .brief-section { animation: fadeInUp 0.35s ease both; }
        .brief-section:nth-child(2) { animation-delay: 0.05s; }
        .brief-section:nth-child(3) { animation-delay: 0.10s; }
        .brief-section:nth-child(4) { animation-delay: 0.15s; }
        .brief-section:nth-child(5) { animation-delay: 0.20s; }
      `}</style>

      {/* Masthead */}
      <header className="brief-section" style={{
        borderBottom: '0.5px solid var(--border)',
        padding: '20px 36px 16px',
        display: 'flex',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        gap: 20,
      }}>
        <div>
          <div style={{
            fontSize: 9.5, fontWeight: 700, letterSpacing: '0.14em',
            color: 'var(--t4)', fontFamily: 'var(--font-ui)',
            textTransform: 'uppercase', marginBottom: 5,
          }}>
            Treddit Intelligence
          </div>
          <h1 style={{
            fontSize: 24, fontWeight: 800, color: 'var(--t1)',
            letterSpacing: '-0.025em', margin: 0,
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}>
            Morning Brief
          </h1>
        </div>

        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div style={{
            fontSize: 12, color: 'var(--t2)', fontFamily: 'var(--font-ui)',
            marginBottom: 3,
          }}>
            {todayFormatted}
          </div>
          {brief && (
            <div style={{
              fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)',
            }}>
              Edition #{brief.edition} &nbsp;·&nbsp; {brief.threadCount} threads &nbsp;·&nbsp; {brief.narrativeCount} narratives
            </div>
          )}
        </div>
      </header>

      {/* Divider rule */}
      <div style={{
        height: 2,
        background: 'var(--t1)',
        opacity: 0.08,
      }} />

      {/* Content */}
      {loading ? (
        <BriefSkeleton />
      ) : error ? (
        <div style={{ padding: '32px 36px' }}>
          <p style={{ color: '#e05050', fontSize: 14, fontFamily: 'var(--font-ui)' }}>{error}</p>
        </div>
      ) : !brief ? (
        <EmptyState onGenerate={handleGenerate} generating={generating} />
      ) : (
        <>
          {/* Market Pulse ticker */}
          {brief.pulse.length > 0 && (
            <div className="brief-section">
              <MarketPulse items={brief.pulse} />
            </div>
          )}

          {/* Main two-column layout */}
          <div className="brief-section" style={{
            display: 'grid',
            gridTemplateColumns: '1fr 360px',
            minHeight: 0,
          }}>
            {/* Left: Hero */}
            <div style={{ borderRight: '0.5px solid var(--border)' }}>
              <HeroStory narrative={brief.hero} />
            </div>

            {/* Right: Signals sidebar */}
            <div>
              <div style={{
                padding: '14px 20px 10px',
                borderBottom: '0.5px solid var(--border)',
                background: 'rgba(255,255,255,0.015)',
              }}>
                <span style={{
                  fontSize: 9.5, fontWeight: 700, letterSpacing: '0.1em',
                  color: 'var(--t4)', fontFamily: 'var(--font-ui)',
                  textTransform: 'uppercase',
                }}>
                  Market Signals
                </span>
              </div>
              {brief.signals.length > 0 ? (
                brief.signals.map(signal => (
                  <SignalCard key={signal.id} narrative={signal} />
                ))
              ) : (
                <div style={{ padding: '20px', color: 'var(--t4)', fontSize: 13, fontFamily: 'var(--font-ui)' }}>
                  No additional signals today.
                </div>
              )}
            </div>
          </div>

          {/* Sources footer */}
          <footer className="brief-section" style={{
            padding: '16px 36px',
            borderTop: '0.5px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            flexWrap: 'wrap',
          }}>
            <span style={{
              fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
              color: 'var(--t4)', fontFamily: 'var(--font-ui)',
              textTransform: 'uppercase', marginRight: 8,
            }}>
              Community Sources
            </span>
            {brief.subreddits.map(sub => (
              <a
                key={sub}
                href={`https://reddit.com/r/${sub}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  fontSize: 11, color: 'var(--t3)',
                  background: 'rgba(255,255,255,0.04)',
                  border: '0.5px solid var(--border)',
                  borderRadius: 4, padding: '2px 8px',
                  textDecoration: 'none', fontFamily: 'var(--font-ui)',
                  transition: 'color 0.12s',
                }}
              >
                r/{sub}
              </a>
            ))}
            <span style={{
              fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)',
              marginLeft: 'auto',
            }}>
              Generated {new Date(brief.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </footer>
        </>
      )}
    </div>
  );
}
