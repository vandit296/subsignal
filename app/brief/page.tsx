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
  signal:  { label: 'SIGNAL',   bg: '#E6F1FB', text: '#0C447C', border: '#85B7EB' },
  tension: { label: 'DEBATE',   bg: '#FAEEDA', text: '#633806', border: '#EF9F27' },
  mood:    { label: 'TRENDING', bg: '#EAF3DE', text: '#27500A', border: '#97C459' },
  hero:    { label: 'LEAD',     bg: '#EEEDFE', text: '#3C3489', border: '#AFA9EC' },
};

function getBeat(type: string) {
  return BEAT[type] ?? { label: 'DEEP DIVE', bg: '#EEEDFE', text: '#3C3489', border: '#AFA9EC' };
}

function BeatTag({ type }: { type: string }) {
  const b = getBeat(type);
  return (
    <span style={{
      display: 'inline-block',
      fontSize: 10,
      fontWeight: 700,
      letterSpacing: '0.08em',
      padding: '2px 7px',
      borderRadius: 3,
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
  const top = threads.slice(0, 3);
  if (top.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12 }}>
      {top.map(t => (
        <a
          key={t.id}
          href={t.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 4,
            fontSize: 11,
            padding: '3px 9px',
            borderRadius: 4,
            background: '#F4F4F5',
            color: '#52525B',
            textDecoration: 'none',
            border: '1px solid #E4E4E7',
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
          }}
        >
          <span style={{ color: '#FF4500', fontWeight: 600 }}>r/{t.subreddit}</span>
          <span style={{ color: '#D4D4D8' }}>·</span>
          <span>{t.score.toLocaleString()}↑</span>
          <span style={{ color: '#D4D4D8' }}>·</span>
          <span>{t.numComments} comments</span>
        </a>
      ))}
    </div>
  );
}

function WhyItMatters({ text, accentColor }: { text: string; accentColor: string }) {
  if (!text) return null;
  return (
    <div style={{
      marginTop: 12,
      padding: '10px 13px',
      borderLeft: `3px solid ${accentColor}`,
      background: '#FAFAFA',
      borderRadius: '0 5px 5px 0',
    }}>
      <div style={{
        fontSize: 10,
        fontWeight: 700,
        letterSpacing: '0.1em',
        color: '#A1A1AA',
        marginBottom: 5,
      }}>
        WHY IT MATTERS
      </div>
      <div style={{ fontSize: 13, color: '#3F3F46', lineHeight: 1.65 }}>{text}</div>
    </div>
  );
}

function NarrativeCard({ narrative, isLead = false }: { narrative: BriefNarrative; isLead?: boolean }) {
  const beat = getBeat(narrative.type);
  const lede = narrative.synthesis?.split('\n\n')[0] ?? '';
  const threads = narrative.threads ?? [];
  const sourceNames = [...new Set(threads.slice(0, 3).map(t => `r/${t.subreddit}`))].join(' · ');

  return (
    <div style={{
      background: '#FFFFFF',
      border: '1px solid #E4E4E7',
      borderRadius: 8,
      padding: isLead ? '22px 24px' : '16px 20px',
      marginBottom: 10,
    }}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
        <BeatTag type={narrative.type} />
        {sourceNames && (
          <span style={{ fontSize: 11, color: '#A1A1AA' }}>{sourceNames}</span>
        )}
        {narrative.totalUpvotes > 0 && (
          <span style={{ fontSize: 11, color: '#D4D4D8', marginLeft: 'auto' }}>
            {narrative.totalUpvotes.toLocaleString()} upvotes
          </span>
        )}
      </div>

      {/* Headline */}
      <div style={{
        fontSize: isLead ? 22 : 16,
        fontWeight: 700,
        color: '#18181B',
        lineHeight: 1.3,
        marginBottom: 10,
        fontFamily: 'Georgia, "Times New Roman", serif',
        letterSpacing: '-0.01em',
      }}>
        {narrative.headline}
      </div>

      {/* Lede */}
      {lede && (
        <div style={{
          fontSize: isLead ? 15 : 14,
          color: '#52525B',
          lineHeight: 1.7,
        }}>
          {lede}
        </div>
      )}

      {/* Why it matters */}
      {narrative.implication && (
        <WhyItMatters text={narrative.implication} accentColor={beat.border} />
      )}

      {/* Source chips */}
      <SourceChips threads={threads} />
    </div>
  );
}

function MarketPulse({ items }: { items: MarketPulseItem[] }) {
  if (!items || items.length === 0) return null;
  return (
    <div style={{
      display: 'flex',
      gap: 8,
      flexWrap: 'wrap',
      paddingBottom: 14,
      marginBottom: 14,
      borderBottom: '1px solid #E4E4E7',
    }}>
      {items.map((item, i) => {
        const up = item.change >= 0;
        return (
          <div key={i} style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 5,
            fontSize: 12,
            padding: '4px 10px',
            borderRadius: 4,
            background: up ? '#F0FDF4' : '#FEF2F2',
            color: up ? '#166534' : '#991B1B',
            border: `1px solid ${up ? '#BBF7D0' : '#FECACA'}`,
            fontWeight: 500,
          }}>
            <span style={{ fontWeight: 700 }}>{item.label}</span>
            <span>{up ? '▲' : '▼'} {Math.abs(item.change).toFixed(1)}%</span>
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

  async function fetchBrief() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/brief');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      setBrief(d.brief || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load brief');
    } finally {
      setLoading(false);
    }
  }

  async function generateBrief() {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch('/api/brief/generate', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchBrief();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  useEffect(() => { fetchBrief(); }, []);

  const signals = brief?.signals ?? [];
  const pulse = brief?.pulse ?? [];

  const genDate = brief?.generatedAt
    ? new Date(brief.generatedAt).toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
      })
    : null;

  return (
    <div style={{
      minHeight: '100vh',
      background: '#F9F9F9',
      fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto', padding: '0 16px 48px' }}>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          padding: '24px 0 14px',
          borderBottom: '2px solid #18181B',
          marginBottom: 18,
        }}>
          <div>
            <div style={{
              fontSize: 24,
              fontWeight: 800,
              color: '#18181B',
              letterSpacing: '-0.03em',
              fontFamily: 'Georgia, "Times New Roman", serif',
            }}>
              Daily Brief
            </div>
            <div style={{ fontSize: 12, color: '#A1A1AA', marginTop: 3 }}>
              {new Date().toLocaleDateString('en-US', {
                weekday: 'long', month: 'long', day: 'numeric', year: 'numeric',
              })}
              {brief && brief.narrativeCount > 0 && ` · ${brief.narrativeCount} signals`}
              {brief && brief.threadCount > 0 && ` · ${brief.threadCount} posts scanned`}
            </div>
          </div>

          <button
            onClick={generateBrief}
            disabled={generating}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 13,
              fontWeight: 600,
              padding: '8px 18px',
              borderRadius: 6,
              background: generating ? '#E4E4E7' : '#18181B',
              color: generating ? '#A1A1AA' : '#FFFFFF',
              border: 'none',
              cursor: generating ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            <span style={{ fontSize: 15, lineHeight: 1 }}>↻</span>
            {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>

        {/* Error banner */}
        {error && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 6,
            background: '#FEF2F2',
            border: '1px solid #FECACA',
            color: '#991B1B',
            fontSize: 13,
            marginBottom: 14,
          }}>
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{
            textAlign: 'center',
            padding: '80px 0',
            color: '#A1A1AA',
            fontSize: 14,
          }}>
            Loading brief…
          </div>
        )}

        {/* Empty state */}
        {!loading && !brief && !error && (
          <div style={{ textAlign: 'center', padding: '80px 0' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📰</div>
            <div style={{ fontSize: 17, fontWeight: 700, color: '#18181B', marginBottom: 8 }}>
              No brief yet
            </div>
            <div style={{ fontSize: 14, color: '#71717A', marginBottom: 24, lineHeight: 1.6 }}>
              Generate today&apos;s brief to see what&apos;s happening<br />across your subreddits.
            </div>
            <button
              onClick={generateBrief}
              disabled={generating}
              style={{
                fontSize: 14,
                fontWeight: 600,
                padding: '11px 28px',
                borderRadius: 7,
                background: '#18181B',
                color: '#FFFFFF',
                border: 'none',
                cursor: generating ? 'not-allowed' : 'pointer',
              }}
            >
              {generating ? 'Generating…' : '↻ Generate Brief'}
            </button>
          </div>
        )}

        {/* Brief content */}
        {!loading && brief && (
          <>
            <MarketPulse items={pulse} />

            {brief.hero && <NarrativeCard narrative={brief.hero} isLead />}

            {signals.length > 0 && (
              <>
                <div style={{
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: '0.1em',
                  color: '#A1A1AA',
                  margin: '22px 0 10px',
                  textTransform: 'uppercase' as const,
                }}>
                  More Signals
                </div>
                {signals.map(s => (
                  <NarrativeCard key={s.id} narrative={s} />
                ))}
              </>
            )}

            {genDate && (
              <div style={{
                marginTop: 28,
                paddingTop: 14,
                borderTop: '1px solid #E4E4E7',
                fontSize: 11,
                color: '#A1A1AA',
                textAlign: 'center' as const,
              }}>
                Generated {genDate} · Powered by Reddit + Claude
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
