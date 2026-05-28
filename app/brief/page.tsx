'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface Thread {
  id: string;
  title: string;
  subreddit: string;
  score: number;
  snippet: string;
  url?: string;
}

interface Narrative {
  headline: string;
  synthesis: string;
  implication: string;
  strength: number;
  subreddits: string[];
  totalUpvotes: number;
  pulse: string;
  threadCount: number;
  threads?: Thread[];
}

interface BriefData {
  date: string;
  generatedAt: string;
  narrativeCount: number;
  narratives: Narrative[];
  quote?: string;
}

function splitIntoParas(text: string): string[] {
  const raw = text.split(/\.\s+/);
  const sentences = raw.map((s, i) => (i < raw.length - 1 ? s + '.' : s)).filter(Boolean);
  const paras: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const p = sentences.slice(i, i + 2).join(' ').trim();
    if (p) paras.push(p);
  }
  return paras.slice(0, 4);
}

function firstTwoSentences(text: string): string {
  const raw = text.split(/\.\s+/);
  return raw.slice(0, 2).map((s, i) => (i < raw.length - 1 ? s + '.' : s)).join(' ');
}

function pulseDir(pulse: string): string {
  const p = (pulse || '').toLowerCase();
  if (/rising|acceler|increas|growing|surge|spiking/.test(p)) return 'up';
  if (/declin|falling|decreas|drop|slow|fading/.test(p)) return 'down';
  return 'flat';
}

function PulseArrow({ pulse }: { pulse: string }) {
  const dir = pulseDir(pulse);
  const symbol = dir === 'up' ? '\u2191' : dir === 'down' ? '\u2193' : '\u2192';
  const color = dir === 'up' ? '#4ade80' : dir === 'down' ? '#f87171' : '#64748b';
  return <span style={{ color, fontWeight: 700 }}>{symbol}</span>;
}

function formatEditionDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    }).toUpperCase();
  } catch { return dateStr; }
}

const MONO = {
  fontFamily: 'var(--font-mono, "SF Mono", "Fira Mono", monospace)',
};
const SERIF = {
  fontFamily: '"Georgia", "Times New Roman", serif',
};
const LABEL = {
  ...MONO,
  fontSize: 9,
  letterSpacing: '0.18em',
  color: 'var(--text-muted)',
  textTransform: 'uppercase' as const,
};

export default function BriefPage() {
  const { data: session, status } = useSession();
  const [brief, setBrief] = useState<BriefData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { setLoading(false); return; }
    fetch('/api/brief')
      .then(r => r.json())
      .then(data => { if (data.error) setError(data.error); else setBrief(data); })
      .catch(() => setError('Failed to load brief.'))
      .finally(() => setLoading(false));
  }, [session, status]);

  if (status === 'loading' || loading) {
    return (
      <div style={{ padding: '64px 24px', ...LABEL, fontSize: 10, letterSpacing: '0.2em' }}>
        LOADING INTELLIGENCE...
      </div>
    );
  }

  if (!session) {
    return (
      <div style={{ padding: '64px 24px', ...MONO, fontSize: 12, color: 'var(--text-muted)' }}>
        Sign in to access your market brief.
      </div>
    );
  }

  if (error || !brief || !brief.narratives || brief.narratives.length === 0) {
    return (
      <div style={{ padding: '64px 24px', maxWidth: 480 }}>
        <div style={{ ...LABEL, marginBottom: 16 }}>MARKET BRIEF</div>
        <p style={{ ...SERIF, fontSize: 16, color: 'var(--text-muted)', lineHeight: 1.7, margin: 0 }}>
          {error || 'No brief available. Your intelligence digest generates each morning at 6AM.'}
        </p>
      </div>
    );
  }

  const hero = brief.narratives[0];
  const signals = brief.narratives.slice(1);
  const heroParagraphs = splitIntoParas(hero?.synthesis || '');
  const undercurrents = brief.narratives
    .map(n => n.implication)
    .filter(Boolean)
    .slice(1, 6);

  return (
    <div style={{ maxWidth: 660, margin: '0 auto', padding: '0 20px 80px', color: 'var(--text)' }}>

      {/* MASTHEAD */}
      <div style={{
        marginTop: 32,
        paddingBottom: 8,
        marginBottom: 4,
        borderBottom: '2px solid var(--text)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
      }}>
        <span style={{ ...LABEL, fontSize: 10, color: 'var(--text)' }}>TREDDIT INTELLIGENCE</span>
        <span style={{ ...LABEL, fontSize: 9 }}>{brief.narrativeCount} SIGNALS</span>
      </div>
      <div style={{
        paddingBottom: 12,
        marginBottom: 40,
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={LABEL}>MARKET BRIEF</span>
        <span style={{ ...LABEL, fontSize: 9 }}>{formatEditionDate(brief.date)}</span>
      </div>

      {/* LEAD STORY LABEL */}
      <div style={{ ...LABEL, marginBottom: 14 }}>LEAD STORY</div>

      {/* HERO HEADLINE */}
      <h1 style={{
        ...SERIF,
        fontSize: 'clamp(26px, 6vw, 40px)',
        fontWeight: 700,
        lineHeight: 1.1,
        letterSpacing: '-0.02em',
        color: 'var(--text)',
        margin: '0 0 28px',
      }}>
        {hero.headline}
      </h1>

      {/* HERO BODY — short editorial paragraphs */}
      {heroParagraphs.map((para, i) => (
        <p key={i} style={{
          ...SERIF,
          fontSize: 16,
          lineHeight: 1.75,
          color: i === 0 ? 'var(--text)' : 'var(--text-muted)',
          margin: '0 0 16px',
        }}>{para}</p>
      ))}

      {/* IMPLICATION STRIP */}
      {hero.implication && (
        <div style={{
          borderLeft: '3px solid var(--text)',
          paddingLeft: 18,
          margin: '32px 0 0',
        }}>
          <div style={{ ...LABEL, marginBottom: 8 }}>IMPLICATION</div>
          <p style={{
            ...SERIF,
            fontSize: 15,
            fontStyle: 'italic',
            lineHeight: 1.65,
            color: 'var(--text)',
            margin: 0,
          }}>{hero.implication}</p>
        </div>
      )}

      {/* MARKET PULSE */}
      <div style={{ marginTop: 52 }}>
        <div style={{
          ...LABEL,
          paddingBottom: 10,
          marginBottom: 18,
          borderBottom: '1px solid var(--border)',
        }}>MARKET PULSE</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
          {brief.narratives.map((n, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ ...MONO, fontSize: 13, flexShrink: 0, width: 14, marginTop: 1 }}>
                <PulseArrow pulse={n.pulse} />
              </span>
              <span style={{
                ...MONO,
                fontSize: 11,
                lineHeight: 1.5,
                color: 'var(--text-muted)',
                letterSpacing: '0.01em',
              }}>{n.headline}</span>
            </div>
          ))}
        </div>
      </div>

      {/* FAST SIGNALS */}
      {signals.length > 0 && (
        <div style={{ marginTop: 52 }}>
          <div style={{
            ...LABEL,
            paddingBottom: 10,
            marginBottom: 24,
            borderBottom: '1px solid var(--border)',
          }}>FAST SIGNALS</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {signals.map((n, i) => (
              <div key={i} style={{
                paddingBottom: 26,
                marginBottom: 26,
                borderBottom: i < signals.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <h3 style={{
                  ...SERIF,
                  fontSize: 18,
                  fontWeight: 700,
                  lineHeight: 1.25,
                  letterSpacing: '-0.01em',
                  color: 'var(--text)',
                  margin: '0 0 9px',
                }}>{n.headline}</h3>
                <p style={{
                  ...SERIF,
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: 'var(--text-muted)',
                  margin: '0 0 10px',
                }}>{firstTwoSentences(n.synthesis)}</p>
                <div style={{
                  display: 'flex',
                  flexWrap: 'wrap' as const,
                  gap: '0 16px',
                  ...LABEL,
                  fontSize: 9,
                }}>
                  <span>{n.threadCount} THREADS</span>
                  {(n.totalUpvotes || 0) > 0 && <span>{n.totalUpvotes.toLocaleString()} UPVOTES</span>}
                  {(n.subreddits || []).slice(0, 2).map((s, j) => (
                    <span key={j}>r/{s}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* OPERATOR QUOTE */}
      {brief.quote && (
        <div style={{
          margin: '52px 0',
          padding: '32px 0',
          borderTop: '1px solid var(--border)',
          borderBottom: '1px solid var(--border)',
          textAlign: 'center',
        }}>
          <div style={{ ...LABEL, marginBottom: 20 }}>OPERATOR VOICE</div>
          <blockquote style={{
            ...SERIF,
            fontSize: 'clamp(18px, 3.5vw, 23px)',
            fontStyle: 'italic',
            lineHeight: 1.55,
            color: 'var(--text)',
            margin: 0,
            letterSpacing: '-0.01em',
          }}>"{brief.quote}"</blockquote>
        </div>
      )}

      {/* UNDERCURRENTS */}
      {undercurrents.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <div style={{
            ...LABEL,
            paddingBottom: 10,
            marginBottom: 20,
            borderBottom: '1px solid var(--border)',
          }}>UNDERCURRENTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {undercurrents.map((u, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ ...MONO, fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }}>
                  &mdash;
                </span>
                <p style={{
                  ...SERIF,
                  fontSize: 13,
                  lineHeight: 1.65,
                  color: 'var(--text-muted)',
                  margin: 0,
                  fontStyle: 'italic',
                }}>{u}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FOOTER */}
      <div style={{
        marginTop: 64,
        paddingTop: 14,
        borderTop: '2px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        ...LABEL,
        fontSize: 9,
      }}>
        <span>TREDDIT.LIVE</span>
        <span>
          GENERATED{' '}
          {(() => {
            try {
              return new Date(brief.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
            } catch { return ''; }
          })()}
        </span>
      </div>

    </div>
  );
}
