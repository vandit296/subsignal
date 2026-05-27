'use client';
import { useState, useEffect, useRef } from 'react';
import { DailyBrief, BriefNarrative, BriefThread, MarketPulseItem } from '@/lib/upstash';

// ── Scroll Reveal Hook ────────────────────────────────────────────────────────

function useReveal(delay = 0) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.08 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return {
    ref,
    style: {
      opacity: visible ? 1 : 0,
      transform: visible ? 'translateY(0)' : 'translateY(22px)',
      transition: `opacity 0.45s ease ${delay}ms, transform 0.45s ease ${delay}ms`,
    } as React.CSSProperties,
  };
}

// ── Strength Meter ────────────────────────────────────────────────────────────

function StrengthMeter({ strength }: { strength: 1 | 2 | 3 | 4 | 5 }) {
  return (
    <div style={{ display: 'flex', gap: 3, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} style={{
          width: 16, height: 3, borderRadius: 2,
          background: i <= strength ? 'var(--hot)' : 'rgba(255,255,255,0.08)',
        }} />
      ))}
    </div>
  );
}

// ── Type Badge ────────────────────────────────────────────────────────────────

function TypeBadge({ type }: { type: BriefNarrative['type'] }) {
  const map: Record<BriefNarrative['type'], { bg: string; text: string; label: string }> = {
    hero:    { bg: 'rgba(255,100,32,0.14)', text: 'var(--hot)',  label: 'LEAD STORY' },
    signal:  { bg: 'rgba(74,143,255,0.14)', text: '#6ab0ff',    label: 'SIGNAL' },
    tension: { bg: 'rgba(220,50,50,0.14)',  text: '#e06060',    label: 'TENSION' },
    mood:    { bg: 'rgba(160,120,255,0.14)',text: '#c0a0ff',    label: 'MOOD' },
  };
  const c = map[type];
  return (
    <span style={{
      display: 'inline-block', background: c.bg, color: c.text,
      fontSize: 9, fontWeight: 700, letterSpacing: '0.12em',
      padding: '3px 8px', borderRadius: 3,
      textTransform: 'uppercase', fontFamily: 'var(--font-ui)',
    }}>
      {c.label}
    </span>
  );
}

// ── Thread Row ────────────────────────────────────────────────────────────────

function ThreadRow({ thread }: { thread: BriefThread }) {
  const diff = Date.now() / 1000 - thread.createdUtc;
  const timeAgo = diff < 3600 ? `${Math.round(diff / 60)}m ago`
    : diff < 86400 ? `${Math.round(diff / 3600)}h ago`
    : `${Math.round(diff / 86400)}d ago`;

  return (
    <a href={thread.url} target="_blank" rel="noopener noreferrer" style={{
      display: 'flex', alignItems: 'flex-start', gap: 12,
      padding: '9px 0', borderBottom: '0.5px solid var(--border)',
      textDecoration: 'none', color: 'inherit',
    }}>
      <span style={{
        flexShrink: 0, minWidth: 38, textAlign: 'right', paddingTop: 1,
        fontSize: 11.5, fontWeight: 600, color: 'var(--hot)', fontFamily: 'var(--font-ui)',
      }}>
        {thread.score >= 1000 ? `${(thread.score / 1000).toFixed(1)}k` : thread.score}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12.5, color: 'var(--t2)', lineHeight: 1.45, marginBottom: 3 }}>
          {thread.title}
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <span style={{ fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>r/{thread.subreddit}</span>
          <span style={{ fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>{thread.numComments} comments</span>
          <span style={{ fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>{timeAgo}</span>
        </div>
      </div>
      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
        style={{ flexShrink: 0, marginTop: 3, color: 'var(--t4)' }}>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/>
        <polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>
      </svg>
    </a>
  );
}

// ── Hero Card ─────────────────────────────────────────────────────────────────

function HeroCard({ narrative, delay = 0 }: { narrative: BriefNarrative; delay?: number }) {
  const [expanded, setExpanded] = useState(false);
  const reveal = useReveal(delay);
  const paragraphs = narrative.synthesis.split('\n\n').filter(Boolean);

  return (
    <div ref={reveal.ref} style={reveal.style}>
      <article style={{
        padding: '36px 0',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <TypeBadge type={narrative.type} />
          <StrengthMeter strength={narrative.strength} />
          <span style={{ fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)', marginLeft: 4 }}>
            {narrative.totalUpvotes.toLocaleString()} upvotes · {narrative.threads.length} threads
          </span>
        </div>

        <h1 style={{
          fontSize: 30, fontWeight: 700, lineHeight: 1.2,
          color: 'var(--t1)', letterSpacing: '-0.025em',
          marginBottom: 22,
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>
          {narrative.headline}
        </h1>

        {paragraphs.map((p, i) => (
          <p key={i} style={{
            fontSize: 16, lineHeight: 1.68, color: 'var(--t2)',
            marginBottom: 14,
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}>{p}</p>
        ))}

        <div style={{
          padding: '14px 18px',
          borderLeft: '2.5px solid var(--hot)',
          background: 'rgba(255,100,32,0.04)',
          borderRadius: '0 6px 6px 0',
          margin: '20px 0',
        }}>
          <p style={{
            fontSize: 14, lineHeight: 1.55, color: 'var(--t2)',
            fontStyle: 'italic', margin: 0,
            fontFamily: 'Georgia, "Times New Roman", serif',
          }}>{narrative.implication}</p>
        </div>

        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16 }}>
          {narrative.subreddits.map(sub => (
            <span key={sub} style={{
              fontSize: 10.5, color: 'var(--t3)',
              background: 'rgba(255,255,255,0.04)',
              border: '0.5px solid var(--border)',
              borderRadius: 4, padding: '2px 7px',
              fontFamily: 'var(--font-ui)',
            }}>r/{sub}</span>
          ))}
        </div>

        {narrative.threads.length > 0 && (
          <>
            <button onClick={() => setExpanded(e => !e)} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--t3)', fontSize: 11.5, fontFamily: 'var(--font-ui)',
              fontWeight: 500, letterSpacing: '0.04em', padding: 0,
              textTransform: 'uppercase',
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              {expanded ? 'Hide' : 'Show'} {narrative.threads.length} source {narrative.threads.length === 1 ? 'thread' : 'threads'}
            </button>
            {expanded && (
              <div style={{ marginTop: 12 }}>
                {narrative.threads.map(t => <ThreadRow key={t.id} thread={t} />)}
              </div>
            )}
          </>
        )}
      </article>
    </div>
  );
}

// ── Signal Card ───────────────────────────────────────────────────────────────

function SignalCard({ narrative, delay = 0 }: { narrative: BriefNarrative; delay?: number }) {
  const [expanded, setExpanded] = useState(false);
  const reveal = useReveal(delay);

  const accent: Record<BriefNarrative['type'], string> = {
    hero: 'var(--hot)', signal: '#6ab0ff', tension: '#e06060', mood: '#c0a0ff',
  };

  return (
    <div ref={reveal.ref} style={reveal.style}>
      <article style={{
        padding: '24px 0 24px 20px',
        borderBottom: '0.5px solid var(--border)',
        borderLeft: `2px solid ${accent[narrative.type]}`,
        paddingLeft: 20,
        marginBottom: 2,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
          <TypeBadge type={narrative.type} />
          <StrengthMeter strength={narrative.strength} />
        </div>

        <h3 style={{
          fontSize: 18, fontWeight: 600, lineHeight: 1.3,
          color: 'var(--t1)', letterSpacing: '-0.015em',
          marginBottom: 10,
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>
          {narrative.headline}
        </h3>

        <p style={{
          fontSize: 13.5, lineHeight: 1.6, color: 'var(--t3)',
          marginBottom: 10,
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>
          {narrative.synthesis.split('\n\n')[0]}
        </p>

        <p style={{
          fontSize: 12.5, lineHeight: 1.45, color: 'var(--t4)',
          fontStyle: 'italic', marginBottom: 14,
          fontFamily: 'Georgia, "Times New Roman", serif',
        }}>
          {narrative.implication}
        </p>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
            {narrative.totalUpvotes.toLocaleString()} upvotes · {narrative.threads.length} {narrative.threads.length === 1 ? 'thread' : 'threads'}
          </span>
          {narrative.threads.length > 0 && (
            <button onClick={() => setExpanded(e => !e)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--t4)', fontSize: 10.5, fontFamily: 'var(--font-ui)',
              display: 'flex', alignItems: 'center', gap: 4,
              textTransform: 'uppercase', letterSpacing: '0.04em', padding: 0,
            }}>
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                style={{ transform: expanded ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}>
                <polyline points="6 9 12 15 18 9"/>
              </svg>
              Sources
            </button>
          )}
        </div>

        {expanded && (
          <div style={{ marginTop: 10 }}>
            {narrative.threads.map(t => <ThreadRow key={t.id} thread={t} />)}
          </div>
        )}
      </article>
    </div>
  );
}

// ── Market Pulse Grid ─────────────────────────────────────────────────────────

function MarketPulseGrid({ items }: { items: MarketPulseItem[] }) {
  const reveal = useReveal(100);
  if (!items.length) return null;
  return (
    <div ref={reveal.ref} style={reveal.style}>
      <div style={{
        padding: '20px 0',
        borderBottom: '0.5px solid var(--border)',
      }}>
        <div style={{
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em',
          color: 'var(--t4)', fontFamily: 'var(--font-ui)',
          textTransform: 'uppercase', marginBottom: 12,
        }}>
          Market Pulse
        </div>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '8px 20px',
        }}>
          {items.map((item, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '8px 12px',
              background: 'rgba(255,255,255,0.03)',
              border: '0.5px solid var(--border)',
              borderRadius: 6,
            }}>
              <span style={{ fontSize: 11.5, color: 'var(--t3)', fontFamily: 'var(--font-ui)' }}>
                {item.label}
              </span>
              <span style={{
                fontSize: 12, fontWeight: 600,
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
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function BriefSkeleton() {
  return (
    <div style={{ padding: '40px 0' }}>
      <style>{`
        @keyframes shimmer { 0%,100% { opacity: 0.35; } 50% { opacity: 0.7; } }
        .sk { background: rgba(255,255,255,0.06); border-radius: 4px; animation: shimmer 1.6s ease-in-out infinite; }
      `}</style>
      <div className="sk" style={{ height: 11, width: 120, marginBottom: 24 }} />
      <div className="sk" style={{ height: 36, width: '80%', marginBottom: 10 }} />
      <div className="sk" style={{ height: 36, width: '60%', marginBottom: 28 }} />
      <div className="sk" style={{ height: 15, width: '95%', marginBottom: 10 }} />
      <div className="sk" style={{ height: 15, width: '88%', marginBottom: 10 }} />
      <div className="sk" style={{ height: 15, width: '75%', marginBottom: 36 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[1,2,3,4].map(i => <div key={i} className="sk" style={{ height: 100, borderRadius: 8 }} />)}
      </div>
    </div>
  );
}

// ── Empty State ───────────────────────────────────────────────────────────────

function EmptyState({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '60vh', textAlign: 'center',
      padding: '60px 40px',
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
        fontSize: 14, color: 'var(--t3)', lineHeight: 1.6,
        maxWidth: 380, marginBottom: 28,
        fontFamily: 'Georgia, "Times New Roman", serif',
      }}>
        Your Morning Brief synthesizes the past week of Reddit intelligence across your subreddits into strategic market narratives.
      </p>
      <button onClick={onGenerate} disabled={generating} style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding: '11px 24px',
        background: generating ? 'rgba(255,100,32,0.1)' : 'var(--hot)',
        color: generating ? 'var(--hot)' : '#000',
        border: generating ? '0.5px solid var(--hot)' : 'none',
        borderRadius: 8, cursor: generating ? 'not-allowed' : 'pointer',
        fontWeight: 600, fontSize: 13.5, fontFamily: 'var(--font-ui)',
        letterSpacing: '0.01em', transition: 'all 0.15s',
      }}>
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
    setLoading(true); setError(null);
    try {
      const res = await fetch(`/api/brief?date=${today}`);
      if (!res.ok) { setError('Failed to load brief.'); return; }
      const data = await res.json() as { brief: DailyBrief | null; hasToday: boolean };
      setBrief(data.brief);
    } catch { setError('Network error.'); }
    finally { setLoading(false); }
  }

  async function handleGenerate() {
    setGenerating(true); setError(null);
    try {
      const res = await fetch('/api/brief/generate', { method: 'POST' });
      const data = await res.json() as { ok: boolean; brief?: DailyBrief; error?: string };
      if (data.ok && data.brief) setBrief(data.brief);
      else setError(data.error ?? 'Generation failed. Try adding more subreddits in /command.');
    } catch { setError('Network error during generation.'); }
    finally { setGenerating(false); }
  }

  useEffect(() => { fetchBrief(); }, []);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)' }}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

      {/* Content wrapper — max width for readability */}
      <div style={{ maxWidth: 780, margin: '0 auto', padding: '0 28px' }}>

        {/* Masthead */}
        <header style={{
          borderBottom: '0.5px solid var(--border)',
          padding: '24px 0 18px',
          display: 'flex', alignItems: 'flex-end',
          justifyContent: 'space-between', gap: 20,
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
              fontSize: 26, fontWeight: 800, color: 'var(--t1)',
              letterSpacing: '-0.025em', margin: 0,
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}>
              Morning Brief
            </h1>
          </div>
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: 12, color: 'var(--t2)', fontFamily: 'var(--font-ui)', marginBottom: 3 }}>
              {todayFormatted}
            </div>
            {brief && (
              <div style={{ fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
                Edition #{brief.edition} · {brief.threadCount} threads · {brief.narrativeCount} narratives
              </div>
            )}
          </div>
        </header>

        {/* Double rule */}
        <div style={{ height: 1, background: 'var(--t1)', opacity: 0.06, marginBottom: 1 }} />
        <div style={{ height: 3, background: 'var(--t1)', opacity: 0.04, marginBottom: 0 }} />

        {/* Main content */}
        {loading ? (
          <BriefSkeleton />
        ) : error ? (
          <div style={{ padding: '32px 0' }}>
            <p style={{ color: '#e05050', fontSize: 14, fontFamily: 'var(--font-ui)' }}>{error}</p>
          </div>
        ) : !brief ? (
          <EmptyState onGenerate={handleGenerate} generating={generating} />
        ) : (
          <>
            {/* Market Pulse */}
            {brief.pulse.length > 0 && (
              <MarketPulseGrid items={brief.pulse} />
            )}

            {/* Hero narrative */}
            <HeroCard narrative={brief.hero} delay={0} />

            {/* Signals section */}
            {brief.signals.length > 0 && (
              <>
                <div style={{
                  padding: '18px 0 14px',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <span style={{
                    fontSize: 9.5, fontWeight: 700, letterSpacing: '0.12em',
                    color: 'var(--t4)', fontFamily: 'var(--font-ui)',
                    textTransform: 'uppercase',
                  }}>
                    Market Signals
                  </span>
                  <div style={{ flex: 1, height: '0.5px', background: 'var(--border)' }} />
                  <span style={{ fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)' }}>
                    {brief.signals.length} signal{brief.signals.length !== 1 ? 's' : ''}
                  </span>
                </div>
                {brief.signals.map((signal, i) => (
                  <SignalCard key={signal.id} narrative={signal} delay={i * 60} />
                ))}
              </>
            )}

            {/* Footer */}
            <footer style={{
              padding: '20px 0',
              borderTop: '0.5px solid var(--border)',
              marginTop: 8,
              display: 'flex', alignItems: 'center',
              gap: 8, flexWrap: 'wrap',
            }}>
              <span style={{
                fontSize: 10, fontWeight: 700, letterSpacing: '0.08em',
                color: 'var(--t4)', fontFamily: 'var(--font-ui)',
                textTransform: 'uppercase', marginRight: 4,
              }}>
                Sources
              </span>
              {brief.subreddits.map(sub => (
                <a key={sub} href={`https://reddit.com/r/${sub}`} target="_blank" rel="noopener noreferrer"
                  style={{
                    fontSize: 11, color: 'var(--t3)',
                    background: 'rgba(255,255,255,0.04)',
                    border: '0.5px solid var(--border)',
                    borderRadius: 4, padding: '2px 8px',
                    textDecoration: 'none', fontFamily: 'var(--font-ui)',
                  }}>
                  r/{sub}
                </a>
              ))}
              <span style={{
                fontSize: 10.5, color: 'var(--t4)', fontFamily: 'var(--font-ui)', marginLeft: 'auto',
              }}>
                Generated {new Date(brief.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              </span>
              <button onClick={handleGenerate} disabled={generating} style={{
                display: 'inline-flex', alignItems: 'center', gap: 5,
                background: 'none', border: '0.5px solid var(--border)',
                borderRadius: 5, cursor: generating ? 'not-allowed' : 'pointer',
                color: 'var(--t4)', fontSize: 10.5, fontFamily: 'var(--font-ui)',
                padding: '4px 10px', transition: 'all 0.15s',
              }}>
                {generating ? (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
                    style={{ animation: 'spin 1s linear infinite' }}>
                    <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
                  </svg>
                ) : (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="23 4 23 10 17 10"/>
                    <path d="M20.49 15a9 9 0 1 1-.02-5.17"/>
                  </svg>
                )}
                Regenerate
              </button>
            </footer>
          </>
        )}
      </div>
    </div>
  );
}
