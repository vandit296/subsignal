'use client';
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

interface BriefSignal {
  headline: string;
  synthesis?: string;
  implication?: string;
  subreddits?: string[];
  totalUpvotes?: number;
  pulse?: string;
  threadCount?: number;
}

interface DailyBrief {
  userId: string;
  date: string;
  edition?: number;
  generatedAt: string;
  hero: BriefSignal;
  signals?: BriefSignal[];
  pulse?: string;
  subreddits?: string[];
  threadCount?: number;
  narrativeCount?: number;
}

function splitParas(text: string): string[] {
  if (!text) return [];
  const parts = text.split(/\.\s+/);
  const sentences = parts.map((s, i) => i < parts.length - 1 ? s + '.' : s).filter(Boolean);
  const paras: string[] = [];
  for (let i = 0; i < sentences.length; i += 2) {
    const p = sentences.slice(i, i + 2).join(' ').trim();
    if (p) paras.push(p);
  }
  return paras.slice(0, 4);
}

function firstTwo(text: string): string {
  if (!text) return '';
  const parts = text.split(/\.\s+/);
  return parts.slice(0, 2).map((s, i) => i < parts.length - 1 ? s + '.' : s).join(' ');
}

function pulseDir(p: string | undefined): 'up' | 'down' | 'flat' {
  const s = (p || '').toLowerCase();
  if (/rising|acceler|increas|growing|surge|spiking/.test(s)) return 'up';
  if (/declin|falling|decreas|drop|slow|fading/.test(s)) return 'down';
  return 'flat';
}

function Arrow({ pulse }: { pulse?: string }) {
  const dir = pulseDir(pulse);
  const ch = dir === 'up' ? '↑' : dir === 'down' ? '↓' : '→';
  const color = dir === 'up' ? '#4ade80' : dir === 'down' ? '#f87171' : '#64748b';
  return <span style={{ color, fontWeight: 700, fontFamily: 'var(--font-mono)' }}>{ch}</span>;
}

function fmtDate(s: string) {
  try { return new Date(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase(); }
  catch { return s; }
}

const S = {
  serif: { fontFamily: '"Georgia","Times New Roman",serif' } as React.CSSProperties,
  mono: { fontFamily: 'var(--font-mono,"SF Mono",monospace)' } as React.CSSProperties,
  label: { fontFamily: 'var(--font-mono,"SF Mono",monospace)', fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: 'var(--text-muted)' } as React.CSSProperties,
};

export default function BriefPage() {
  const { data: session, status } = useSession();
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function loadBrief() {
    fetch('/api/brief')
      .then(r => r.json())
      .then(d => { if (d.error) setError(d.error); else setBrief(d.brief || null); })
      .catch(() => setError('Failed to load brief.'))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (status === 'loading') return;
    if (!session) { setLoading(false); return; }
    loadBrief();
  }, [session, status]);

  async function generateNow() {
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch('/api/brief/trigger', { method: 'POST' });
      const d = await r.json();
      if (d.error) setError(d.error);
      else { setLoading(true); loadBrief(); }
    } catch { setError('Generation failed. Try again.'); }
    finally { setGenerating(false); }
  }

  if (status === 'loading' || loading) {
    return <div style={{ padding: '64px 24px', ...S.label, fontSize: 10 }}>LOADING INTELLIGENCE...</div>;
  }

  if (!session) {
    return <div style={{ padding: '64px 24px', ...S.mono, fontSize: 12, color: 'var(--text-muted)' }}>Sign in to access your market brief.</div>;
  }

  if (error || !brief || !brief.hero) {
    return (
      <div style={{ padding: '64px 24px', maxWidth: 480 }}>
        <div style={{ ...S.label, marginBottom: 16 }}>MARKET BRIEF</div>
        <p style={{ ...S.serif, fontSize: 15, color: 'var(--text-muted)', lineHeight: 1.7, margin: '0 0 28px' }}>
          {error || 'No brief yet. Your digest generates each morning at 6AM.'}
        </p>
        <button
          onClick={generateNow}
          disabled={generating}
          style={{
            ...S.mono,
            fontSize: 11,
            letterSpacing: '0.12em',
            padding: '10px 20px',
            background: 'transparent',
            border: '1px solid var(--text)',
            color: 'var(--text)',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.5 : 1,
            textTransform: 'uppercase',
          }}
        >
          {generating ? 'GENERATING...' : 'GENERATE NOW'}
        </button>
      </div>
    );
  }

  const hero = brief.hero;
  const signals = brief.signals || [];
  const heroParagraphs = splitParas(hero.synthesis || '');
  const undercurrents = signals.map(s => s.implication).filter(Boolean) as string[];
  const allPulse = [hero, ...signals];

  return (
    <div style={{ maxWidth: 660, margin: '0 auto', padding: '0 20px 80px', color: 'var(--text)' }}>

      <div style={{ marginTop: 32, paddingBottom: 7, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '2px solid var(--text)' }}>
        <span style={{ ...S.mono, fontSize: 10, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text)', fontWeight: 500 }}>TREDDIT INTELLIGENCE</span>
        <span style={S.label}>{brief.narrativeCount || allPulse.length} SIGNALS</span>
      </div>
      <div style={{ padding: '7px 0 12px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)' }}>
        <span style={S.label}>MARKET BRIEF {brief.edition ? '#' + brief.edition : ''}</span>
        <span style={{ ...S.label, fontSize: 9 }}>{fmtDate(brief.date)}</span>
      </div>

      <div style={{ marginTop: 36 }}>
        <div style={{ ...S.label, marginBottom: 14 }}>LEAD STORY</div>
        <h1 style={{ ...S.serif, fontSize: 'clamp(26px,6vw,40px)', fontWeight: 700, lineHeight: 1.1, letterSpacing: '-0.02em', margin: '0 0 26px' }}>
          {hero.headline}
        </h1>
        {heroParagraphs.map((p, i) => (
          <p key={i} style={{ ...S.serif, fontSize: 16, lineHeight: 1.75, color: i === 0 ? 'var(--text)' : 'var(--text-muted)', margin: '0 0 16px' }}>{p}</p>
        ))}
        {!heroParagraphs.length && hero.synthesis && (
          <p style={{ ...S.serif, fontSize: 16, lineHeight: 1.75, color: 'var(--text-muted)', margin: 0 }}>{hero.synthesis}</p>
        )}
      </div>

      {hero.implication && (
        <div style={{ borderLeft: '3px solid var(--text)', borderRadius: 0, paddingLeft: 18, margin: '32px 0 0' }}>
          <div style={{ ...S.label, marginBottom: 8 }}>IMPLICATION</div>
          <p style={{ ...S.serif, fontSize: 15, fontStyle: 'italic', lineHeight: 1.65, color: 'var(--text)', margin: 0 }}>{hero.implication}</p>
        </div>
      )}

      {allPulse.length > 0 && (
        <div style={{ marginTop: 52 }}>
          <div style={{ ...S.label, paddingBottom: 10, marginBottom: 18, borderBottom: '1px solid var(--border)' }}>MARKET PULSE</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {allPulse.map((n, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                <span style={{ fontSize: 13, flexShrink: 0, width: 14, marginTop: 1 }}>
                  <Arrow pulse={n.pulse || brief.pulse} />
                </span>
                <span style={{ ...S.mono, fontSize: 11, lineHeight: 1.5, color: 'var(--text-muted)', letterSpacing: '0.01em' }}>{n.headline}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {signals.length > 0 && (
        <div style={{ marginTop: 52 }}>
          <div style={{ ...S.label, paddingBottom: 10, marginBottom: 24, borderBottom: '1px solid var(--border)' }}>FAST SIGNALS</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {signals.map((n, i) => (
              <div key={i} style={{ paddingBottom: 26, marginBottom: 26, borderBottom: i < signals.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <h3 style={{ ...S.serif, fontSize: 18, fontWeight: 700, lineHeight: 1.25, letterSpacing: '-0.01em', color: 'var(--text)', margin: '0 0 9px' }}>{n.headline}</h3>
                {n.synthesis && <p style={{ ...S.serif, fontSize: 13, lineHeight: 1.65, color: 'var(--text-muted)', margin: '0 0 10px' }}>{firstTwo(n.synthesis)}</p>}
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 14px', ...S.label, fontSize: 9 }}>
                  {(n.threadCount || 0) > 0 && <span>{n.threadCount} THREADS</span>}
                  {(n.totalUpvotes || 0) > 0 && <span>{n.totalUpvotes!.toLocaleString()} UPVOTES</span>}
                  {(n.subreddits || []).slice(0, 2).map((s, j) => <span key={j}>r/{s}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {undercurrents.length > 0 && (
        <div style={{ marginTop: 48 }}>
          <div style={{ ...S.label, paddingBottom: 10, marginBottom: 20, borderBottom: '1px solid var(--border)' }}>UNDERCURRENTS</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
            {undercurrents.map((u, i) => (
              <div key={i} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <span style={{ ...S.mono, fontSize: 11, color: 'var(--text-muted)', flexShrink: 0, marginTop: 2 }}>&mdash;</span>
                <p style={{ ...S.serif, fontSize: 13, lineHeight: 1.65, color: 'var(--text-muted)', margin: 0, fontStyle: 'italic' }}>{u}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={{ marginTop: 64, paddingTop: 14, borderTop: '2px solid var(--border)', display: 'flex', justifyContent: 'space-between', ...S.label, fontSize: 9 }}>
        <span>TREDDIT.LIVE</span>
        <span>GENERATED {(() => { try { return new Date(brief.generatedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }); } catch { return ''; } })()}</span>
      </div>

    </div>
  );
}
