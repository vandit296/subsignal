'use client';

import { useState, useEffect } from 'react';

interface BriefThread {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  numComments: number;
  url: string;
  createdUtc: number;
}

interface BriefNarrative {
  id: string;
  type: 'hero' | 'signal' | 'tension' | 'mood';
  headline: string;
  synthesis: string;
  implication: string;
  strength: number;
  threads: BriefThread[];
  subreddits: string[];
  totalUpvotes: number;
}

interface MarketPulseItem {
  label: string;
  change: number;
}

interface DailyBrief {
  hero: BriefNarrative;
  signals: BriefNarrative[];
  pulse: MarketPulseItem[];
  subreddits: string[];
  threadCount: number;
  narrativeCount: number;
  generatedAt?: string;
}

const BEAT: Record<string, { label: string; bg: string; text: string; border: string }> = {
  signal:  { label: 'SIGNAL',    bg: '#0C1E2E', text: '#60A5FA', border: '#1A4060' },
  tension: { label: 'DEBATE',    bg: '#2A1E08', text: '#FBBF24', border: '#5C4010' },
  mood:    { label: 'TRENDING',  bg: '#0C1E12', text: '#4ADE80', border: '#1A4A2E' },
  hero:    { label: 'LEAD STORY',bg: '#2A1A09', text: '#FF6B35', border: '#5C3010' },
};

function getBeat(type: string) {
  return BEAT[type] ?? { label: 'DEEP DIVE', bg: '#1A1A2E', text: '#A78BFA', border: '#3A2A6E' };
}

function BeatTag({ type }: { type: string }) {
  const b = getBeat(type);
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 9,
      fontWeight: 800,
      letterSpacing: '0.1em',
      padding: '2px 7px',
      borderRadius: 2,
      background: b.bg,
      color: b.text,
      border: `1px solid ${b.border}`,
      flexShrink: 0,
    }}>
      {b.label}
    </span>
  );
}

function SourceChips({ threads }: { threads: BriefThread[] }) {
  const top = (threads ?? []).slice(0, 3);
  if (top.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 'auto', paddingTop: 10 }}>
      {top.map(t => (
        <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer" style={{
          display: 'inline-flex', alignItems: 'center', gap: 3,
          fontSize: 10, padding: '2px 8px', borderRadius: 3,
          background: '#141414', color: '#555', border: '1px solid #222',
          textDecoration: 'none', whiteSpace: 'nowrap',
        }}>
          <span style={{ color: '#FF4500', fontWeight: 600 }}>r/{t.subreddit}</span>
          <span style={{ color: '#2E2E2E' }}>·</span>
          <span>{t.score.toLocaleString()}↑</span>
          <span style={{ color: '#2E2E2E' }}>·</span>
          <span>{t.numComments}c</span>
        </a>
      ))}
    </div>
  );
}

function WhyBox({ text, accentColor }: { text: string; accentColor: string }) {
  if (!text) return null;
  return (
    <div style={{
      margin: '10px 0 8px',
      padding: '8px 10px',
      borderLeft: `2px solid ${accentColor}`,
      background: '#090909',
      borderRadius: '0 3px 3px 0',
    }}>
      <div style={{ fontSize: 8, fontWeight: 700, letterSpacing: '0.12em', color: '#3A3A3A', marginBottom: 4 }}>
        WHY IT MATTERS
      </div>
      <div style={{ fontSize: 11, color: '#666', lineHeight: 1.6 }}>{text}</div>
    </div>
  );
}

function LeadCard({ narrative }: { narrative: BriefNarrative }) {
  const beat = getBeat(narrative.type);
  const lede = narrative.synthesis?.split('\n\n')[0] ?? '';
  const threads = narrative.threads ?? [];
  const srcNames = [...new Set(threads.slice(0,3).map(t => `r/${t.subreddit}`))].join(' · ');

  return (
    <div style={{
      background: '#0F0F0F', padding: '22px 22px 18px',
      display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box',
    }}>
      <BeatTag type={narrative.type} />
      <div style={{ fontSize: 10, color: '#444', marginTop: 8, marginBottom: 10 }}>{srcNames}</div>
      <div style={{
        fontSize: 20, fontWeight: 700, color: '#F0EBE0', lineHeight: 1.28,
        fontFamily: 'Georgia, "Times New Roman", serif', letterSpacing: '-0.01em', marginBottom: 12,
      }}>
        {narrative.headline}
      </div>
      <div style={{ fontSize: 13, color: '#7A7268', lineHeight: 1.7, marginBottom: 4 }}>
        {lede}
      </div>
      <WhyBox text={narrative.implication ?? ''} accentColor={beat.border} />
      <SourceChips threads={threads} />
    </div>
  );
}

function SignalCard({ narrative, size = 'md' }: { narrative: BriefNarrative; size?: 'md' | 'sm' }) {
  const beat = getBeat(narrative.type);
  const lede = narrative.synthesis?.split('\n\n')[0] ?? '';
  const threads = narrative.threads ?? [];
  const srcNames = [...new Set(threads.slice(0,2).map(t => `r/${t.subreddit}`))].join(' · ');

  return (
    <div style={{
      background: '#0F0F0F', padding: size === 'sm' ? '14px 16px 12px' : '16px 18px 14px',
      display: 'flex', flexDirection: 'column', height: '100%', boxSizing: 'border-box',
    }}>
      <BeatTag type={narrative.type} />
      <div style={{ fontSize: 10, color: '#444', marginTop: 7, marginBottom: 8 }}>{srcNames}</div>
      <div style={{
        fontSize: size === 'sm' ? 13 : 14, fontWeight: 700,
        color: '#C8C0AD', lineHeight: 1.35,
        fontFamily: 'Georgia, "Times New Roman", serif', marginBottom: 7,
      }}>
        {narrative.headline}
      </div>
      {size === 'md' && (
        <div style={{ fontSize: 12, color: '#606060', lineHeight: 1.65, marginBottom: 4 }}>
          {lede.split('. ').slice(0, 2).join('. ') + (lede.split('. ').length > 2 ? '.' : '')}
        </div>
      )}
      <WhyBox text={narrative.implication ?? ''} accentColor={beat.border} />
      <SourceChips threads={threads} />
    </div>
  );
}

function PulseRow({ items }: { items: MarketPulseItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14, paddingBottom: 12, borderBottom: '1px solid #1A1A1A' }}>
      {items.map((item, i) => {
        const up = item.change >= 0;
        return (
          <div key={i} style={{
            fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 3,
            background: up ? '#0D2B1A' : '#2B0D0D',
            color: up ? '#4ADE80' : '#F87171',
            border: `1px solid ${up ? '#1A4A2E' : '#4A1A1A'}`,
          }}>
            {item.label} {up ? '▲' : '▼'} {Math.abs(item.change).toFixed(1)}%
          </div>
        );
      })}
    </div>
  );
}

export default function BriefPage() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  async function fetchBrief() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/brief');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setBrief(d.brief || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }

  async function generateBrief() {
    setGenerating(true); setError(null);
    try {
      const res = await fetch('/api/brief/generate', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchBrief();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally { setGenerating(false); }
  }

  useEffect(() => { fetchBrief(); }, []);

  const signals = brief?.signals ?? [];
  const pulse = brief?.pulse ?? [];

  const genDate = brief?.generatedAt
    ? new Date(brief.generatedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  // Grid layout: 3-col on desktop, 1-col on mobile
  const gridStyle: React.CSSProperties = isMobile ? {
    display: 'flex', flexDirection: 'column', gap: 1,
    background: '#222', border: '1px solid #222', borderRadius: 6, overflow: 'hidden',
  } : {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr 1fr',
    gridTemplateRows: 'auto auto',
    gap: 1,
    background: '#222',
    border: '1px solid #222',
    borderRadius: 6,
    overflow: 'hidden',
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0C0C0C', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowX: 'hidden' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 16px 48px' }}>

        {/* Header */}
        <div style={{
          display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between',
          padding: '22px 0 12px', borderBottom: '2px solid #FF6B35', marginBottom: 16, gap: 12,
        }}>
          <div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.15em', color: '#FF6B35', marginBottom: 4 }}>
              TREDDIT INTELLIGENCE
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, color: '#F5F0E8', letterSpacing: '-0.04em', fontFamily: 'Georgia, "Times New Roman", serif' }}>
              Daily Brief
            </div>
            <div style={{ fontSize: 11, color: '#555', marginTop: 3 }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
              {brief && brief.narrativeCount > 0 && ` · ${brief.narrativeCount} signals`}
              {brief && brief.threadCount > 0 && ` · ${brief.threadCount} posts`}
            </div>
          </div>
          <button onClick={generateBrief} disabled={generating} style={{
            fontSize: 12, fontWeight: 600, padding: '7px 16px', borderRadius: 4,
            background: 'transparent', color: generating ? '#444' : '#666',
            border: `1px solid ${generating ? '#222' : '#333'}`,
            cursor: generating ? 'not-allowed' : 'pointer', flexShrink: 0,
          }}>
            ↻ {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div style={{ padding: '10px 14px', borderRadius: 5, background: '#2B0D0D', border: '1px solid #4A1A1A', color: '#F87171', fontSize: 13, marginBottom: 14 }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#444', fontSize: 14 }}>
            Loading brief…
          </div>
        )}

        {/* Empty */}
        {!loading && !brief && !error && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 38, marginBottom: 12 }}>📰</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#F0EBE0', marginBottom: 8 }}>No brief yet</div>
            <div style={{ fontSize: 14, color: '#555', marginBottom: 24, lineHeight: 1.6 }}>
              Generate today&apos;s brief from your subreddits.
            </div>
            <button onClick={generateBrief} disabled={generating} style={{
              fontSize: 14, fontWeight: 600, padding: '10px 26px', borderRadius: 5,
              background: '#FF6B35', color: '#0C0C0C', border: 'none', cursor: 'pointer',
            }}>
              {generating ? 'Generating…' : '↻ Generate Brief'}
            </button>
          </div>
        )}

        {/* Brief */}
        {!loading && brief && (
          <>
            <PulseRow items={pulse} />

            <div style={gridStyle}>
              {/* Lead — spans 2 cols on desktop */}
              <div style={isMobile ? { borderBottom: '1px solid #1E1E1E' } : {
                gridColumn: '1 / 3', gridRow: '1 / 2', borderRight: '1px solid #1E1E1E',
              }}>
                {brief.hero && <LeadCard narrative={brief.hero} />}
              </div>

              {/* Secondary — right col, top row */}
              {signals[0] && (
                <div style={isMobile ? { borderBottom: '1px solid #1E1E1E' } : {
                  gridColumn: '3 / 4', gridRow: '1 / 2',
                }}>
                  <SignalCard narrative={signals[0]} size="md" />
                </div>
              )}

              {/* Bottom row — 3 small cards */}
              {signals[1] && (
                <div style={isMobile ? { borderBottom: '1px solid #1E1E1E' } : {
                  gridColumn: '1 / 2', gridRow: '2 / 3', borderRight: '1px solid #1E1E1E', borderTop: '1px solid #1E1E1E',
                }}>
                  <SignalCard narrative={signals[1]} size="sm" />
                </div>
              )}
              {signals[2] && (
                <div style={isMobile ? { borderBottom: '1px solid #1E1E1E' } : {
                  gridColumn: '2 / 3', gridRow: '2 / 3', borderRight: '1px solid #1E1E1E', borderTop: '1px solid #1E1E1E',
                }}>
                  <SignalCard narrative={signals[2]} size="sm" />
                </div>
              )}
              {signals[3] && (
                <div style={isMobile ? {} : {
                  gridColumn: '3 / 4', gridRow: '2 / 3', borderTop: '1px solid #1E1E1E',
                }}>
                  <SignalCard narrative={signals[3]} size="sm" />
                </div>
              )}
            </div>

            {/* Extra signals if more than 4 */}
            {signals.length > 4 && (
              <div style={{ marginTop: 1 }}>
                {signals.slice(4).map(s => (
                  <div key={s.id} style={{ borderTop: '1px solid #1E1E1E', background: '#0F0F0F', padding: '14px 18px 12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <BeatTag type={s.type} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#B0A898', fontFamily: 'Georgia, serif' }}>{s.headline}</span>
                    </div>
                    <div style={{ fontSize: 11, color: '#555', lineHeight: 1.5 }}>{s.implication}</div>
                  </div>
                ))}
              </div>
            )}

            {genDate && (
              <div style={{ marginTop: 20, paddingTop: 12, borderTop: '1px solid #1A1A1A', fontSize: 10, color: '#333', textAlign: 'center' }}>
                Generated {genDate} · Powered by Reddit + Claude
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
