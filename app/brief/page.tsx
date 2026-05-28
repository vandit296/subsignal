'use client';

import { useEffect, useState } from 'react';
import type { DailyBrief, BriefNarrative, BriefThread } from '@/types';

// ── helpers ────────────────────────────────────────────────────────────────────

function narrativeDir(n: BriefNarrative): 'up' | 'down' | 'flat' {
  if (n.strength >= 4) return 'up';
  if (n.strength <= 2) return 'down';
  return 'flat';
}

function briefSignal(b: DailyBrief): { label: string; dir: 'up' | 'down' | 'flat' } {
  const s = b.hero?.strength ?? 3;
  if (s >= 4) return { label: 'Rising', dir: 'up' };
  if (s <= 2) return { label: 'Declining', dir: 'down' };
  return { label: 'Steady', dir: 'flat' };
}

function briefTension(b: DailyBrief): { label: string; level: 'high' | 'med' | 'low' } {
  const t = (b.signals ?? []).find((s) => s.type === 'tension');
  if (!t) return { label: 'Low', level: 'low' };
  if (t.strength >= 4) return { label: 'High', level: 'high' };
  if (t.strength >= 3) return { label: 'Medium', level: 'med' };
  return { label: 'Low', level: 'low' };
}

function briefMood(b: DailyBrief): string {
  const m = (b.signals ?? []).find((s) => s.type === 'mood');
  if (!m?.headline) return 'Neutral';
  const first = m.headline.split(/\s+/)[0] ?? 'Neutral';
  return first.replace(/[^a-zA-Z]/g, '') || 'Neutral';
}

function briefVolume(b: DailyBrief): number {
  let v = b.hero?.totalUpvotes ?? 0;
  for (const s of b.signals ?? []) v += s.totalUpvotes ?? 0;
  return v;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-GB', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

// ── micro-components ───────────────────────────────────────────────────────────

function DirBadge({ dir }: { dir: 'up' | 'down' | 'flat' }) {
  if (dir === 'up')
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, letterSpacing: '.04em', background: '#EAF3DE', color: '#27500A' }}>
        ↑ rising
      </span>
    );
  if (dir === 'down')
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, letterSpacing: '.04em', background: '#FCEBEB', color: '#791F1F' }}>
        ↓ declining
      </span>
    );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, letterSpacing: '.04em', background: 'var(--muted)', color: 'var(--muted-foreground)', border: '0.5px solid var(--border)' }}>
      → stable
    </span>
  );
}

function TensionBadge({ level }: { level: 'high' | 'med' }) {
  if (level === 'high')
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, letterSpacing: '.04em', background: '#FAEEDA', color: '#633806' }}>
        tension: high
      </span>
    );
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, letterSpacing: '.04em', background: '#E6F1FB', color: '#0C447C' }}>
      tension: med
    </span>
  );
}

function SourceChip({ t }: { t: BriefThread }) {
  return (
    <a
      href={t.url}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        fontSize: 11,
        fontFamily: 'inherit',
        color: 'var(--muted-foreground)',
        background: 'var(--muted)',
        border: '0.5px solid var(--border)',
        borderRadius: 4,
        padding: '2px 7px',
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
    >
      <span style={{ color: '#185FA5' }}>r/{t.subreddit}</span>
      {t.score > 0 && <span>· {t.score}↑</span>}
      {t.numComments > 0 && <span>· {t.numComments}t</span>}
    </a>
  );
}

// ── signal row ─────────────────────────────────────────────────────────────────

function SignalRow({ n }: { n: BriefNarrative }) {
  const dir = narrativeDir(n);
  const tensionLevel: 'high' | 'med' | 'low' =
    n.strength >= 4 ? 'high' : n.strength >= 3 ? 'med' : 'low';
  const synthesis = n.synthesis?.split('\n\n')[0] ?? '';

  return (
    <div
      style={{
        padding: '.7rem 0',
        borderBottom: '0.5px solid var(--border)',
      }}
    >
      <div
        style={{
          fontSize: 13,
          fontWeight: 500,
          lineHeight: 1.45,
          color: 'var(--foreground)',
          marginBottom: 4,
          fontFamily: 'var(--font-sans, system-ui)',
        }}
      >
        {n.headline}
      </div>
      {synthesis && (
        <div
          style={{
            fontSize: 12,
            lineHeight: 1.65,
            color: 'var(--muted-foreground)',
            marginBottom: 6,
            fontFamily: 'var(--font-sans, system-ui)',
          }}
        >
          {synthesis}
        </div>
      )}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 6 }}>
        {(n.threads ?? []).slice(0, 3).map((t) => (
          <SourceChip key={t.id} t={t} />
        ))}
        <DirBadge dir={dir} />
        {tensionLevel !== 'low' && <TensionBadge level={tensionLevel} />}
      </div>
    </div>
  );
}

// ── main page ──────────────────────────────────────────────────────────────────

export default function BriefPage() {
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetch('/api/brief')
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setBrief(d.brief || null);
      })
      .catch(() => setError('Failed to load brief'))
      .finally(() => setLoading(false));
  }, []);

  async function generate() {
    setGenerating(true);
    setError(null);
    try {
      const r = await fetch('/api/brief/generate', { method: 'POST' });
      const d = await r.json();
      if (d.error) setError(d.error);
      else setBrief(d.brief || d);
    } catch {
      setError('Generation failed');
    } finally {
      setGenerating(false);
    }
  }

  // ── loading ──
  if (loading) {
    return (
      <div style={{ padding: '3rem 1.5rem', display: 'flex', gap: 6, alignItems: 'center' }}>
        {[0, 200, 400].map((d) => (
          <span
            key={d}
            style={{
              width: 6,
              height: 6,
              background: 'var(--muted-foreground)',
              borderRadius: '50%',
              display: 'inline-block',
              animation: `blink 1.2s ease-in-out ${d}ms infinite`,
            }}
          />
        ))}
        <style>{`@keyframes blink{0%,80%,100%{opacity:.15}40%{opacity:1}}`}</style>
      </div>
    );
  }

  // ── derived market data ──
  const signal = brief ? briefSignal(brief) : null;
  const tension = brief ? briefTension(brief) : null;
  const mood = brief ? briefMood(brief) : null;
  const volume = brief ? briefVolume(brief) : 0;

  const signalNarratives = (brief?.signals ?? []).filter(
    (s) => s.type === 'signal'
  );
  const tensionNarratives = (brief?.signals ?? []).filter(
    (s) => s.type === 'tension'
  );
  const moodNarratives = (brief?.signals ?? []).filter(
    (s) => s.type === 'mood'
  );
  const otherNarratives = (brief?.signals ?? []).filter(
    (s) => !['signal', 'tension', 'mood'].includes(s.type)
  );

  const btnStyle: React.CSSProperties = {
    fontSize: 11,
    padding: '4px 10px',
    border: '0.5px solid var(--border)',
    background: 'transparent',
    color: 'var(--foreground)',
    borderRadius: 4,
    cursor: 'pointer',
    fontFamily: 'var(--font-mono, monospace)',
    letterSpacing: '.04em',
  };

  const sectionHeadStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    marginBottom: '.75rem',
    paddingBottom: 6,
    borderBottom: '0.5px solid var(--border)',
  };

  const sectionLabelStyle: React.CSSProperties = {
    fontSize: 10,
    letterSpacing: '.1em',
    textTransform: 'uppercase',
    color: 'var(--muted-foreground)',
    fontWeight: 500,
  };

  return (
    <div
      style={{
        padding: '1.5rem',
        maxWidth: 720,
        fontFamily: 'var(--font-mono, "SF Mono", monospace)',
      }}
    >
      <style>{`@keyframes blink{0%,80%,100%{opacity:.15}40%{opacity:1}}`}</style>

      {/* top bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingBottom: '.75rem',
          borderBottom: '0.5px solid var(--border)',
          marginBottom: '1.25rem',
        }}
      >
        <span
          style={{
            fontSize: 11,
            color: 'var(--muted-foreground)',
            letterSpacing: '.08em',
            textTransform: 'uppercase',
          }}
        >
          subsignal · daily brief
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {brief?.date && (
            <span style={{ fontSize: 11, color: 'var(--muted-foreground)' }}>
              {fmtDate(brief.date)}
            </span>
          )}
          <button style={btnStyle} onClick={generate} disabled={generating}>
            {generating ? 'generating...' : '↻ generate'}
          </button>
        </div>
      </div>

      {error && (
        <div style={{ fontSize: 12, color: '#A32D2D', marginBottom: '.75rem' }}>
          {error}
        </div>
      )}

      {/* empty state */}
      {!brief && (
        <div style={{ padding: '3rem 0', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: 'var(--muted-foreground)', marginBottom: '1rem' }}>
            No brief yet for today.
          </p>
          <button style={btnStyle} onClick={generate} disabled={generating}>
            {generating ? 'generating...' : '↻ generate brief'}
          </button>
        </div>
      )}

      {brief && (
        <>
          {/* market conditions strip */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              gap: 8,
              marginBottom: '1.25rem',
            }}
          >
            <div style={{ background: 'var(--muted)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 4 }}>Signal</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: signal!.dir === 'up' ? '#3B6D11' : signal!.dir === 'down' ? '#A32D2D' : 'var(--foreground)' }}>
                {signal!.dir === 'up' ? '↑' : signal!.dir === 'down' ? '↓' : '→'} {signal!.label}
              </div>
            </div>
            <div style={{ background: 'var(--muted)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 4 }}>Tension</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: tension!.level !== 'low' ? '#BA7517' : 'var(--muted-foreground)' }}>
                {tension!.level === 'high' ? '▲' : tension!.level === 'med' ? '─' : '▽'} {tension!.label}
              </div>
            </div>
            <div style={{ background: 'var(--muted)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 4 }}>Mood</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#993556' }}>{mood}</div>
            </div>
            <div style={{ background: 'var(--muted)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
              <div style={{ fontSize: 10, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: 4 }}>Volume</div>
              <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--foreground)' }}>
                {volume.toLocaleString()}{' '}
                <span style={{ fontSize: 10, color: 'var(--muted-foreground)' }}>↑</span>
              </div>
            </div>
          </div>

          {/* hero narrative */}
          <div style={{ background: 'var(--muted)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '1.1rem 1.25rem', marginBottom: '1.25rem' }}>
            <div style={{ fontSize: 10, letterSpacing: '.1em', textTransform: 'uppercase', color: 'var(--muted-foreground)', marginBottom: '.4rem' }}>
              Today&apos;s signal
            </div>
            <div style={{ fontSize: 15, fontFamily: 'var(--font-sans, system-ui)', lineHeight: 1.5, color: 'var(--foreground)', fontWeight: 500, marginBottom: '.5rem' }}>
              {brief.hero.headline}
            </div>
            {brief.hero.synthesis && (
              <div style={{ fontSize: 13, fontFamily: 'var(--font-sans, system-ui)', lineHeight: 1.7, color: 'var(--muted-foreground)', marginBottom: '.75rem' }}>
                {brief.hero.synthesis.split('\n\n').map((p, i) => (
                  <p key={i} style={{ marginBottom: i < brief.hero.synthesis.split('\n\n').length - 1 ? '.5rem' : 0 }}>{p}</p>
                ))}
              </div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              <DirBadge dir={narrativeDir(brief.hero)} />
              {brief.hero.strength >= 4 && <TensionBadge level="high" />}
              {(brief.hero.threads ?? []).slice(0, 3).map((t) => (
                <SourceChip key={t.id} t={t} />
              ))}
            </div>
          </div>

          {signalNarratives.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={sectionHeadStyle}><span style={sectionLabelStyle}>Signals</span></div>
              {signalNarratives.map((n) => <SignalRow key={n.id} n={n} />)}
            </div>
          )}

          {tensionNarratives.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={sectionHeadStyle}>
                <span style={sectionLabelStyle}>Friction</span>
                <span style={{ display: 'inline-flex', alignItems: 'center', fontSize: 10, fontWeight: 500, padding: '2px 7px', borderRadius: 4, background: '#FAEEDA', color: '#633806' }}>tension</span>
              </div>
              {tensionNarratives.map((n) => <SignalRow key={n.id} n={n} />)}
            </div>
          )}

          {moodNarratives.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={sectionHeadStyle}><span style={sectionLabelStyle}>Mood</span></div>
              {moodNarratives.map((n) => <SignalRow key={n.id} n={n} />)}
            </div>
          )}

          {otherNarratives.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={sectionHeadStyle}><span style={sectionLabelStyle}>More signals</span></div>
              {otherNarratives.map((n) => <SignalRow key={n.id} n={n} />)}
            </div>
          )}

          {(brief.pulse ?? []).length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <div style={sectionHeadStyle}><span style={sectionLabelStyle}>Market pulse</span></div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 8 }}>
                {brief.pulse.map((p, i) => (
                  <div key={i} style={{ background: 'var(--muted)', border: '0.5px solid var(--border)', borderRadius: 6, padding: '10px 12px' }}>
                    <div style={{ fontSize: 11, color: 'var(--muted-foreground)', marginBottom: 4, fontFamily: 'var(--font-sans, system-ui)' }}>{p.label}</div>
                    <div style={{ fontSize: 15, fontWeight: 500, color: p.change > 0 ? '#3B6D11' : p.change < 0 ? '#A32D2D' : 'var(--foreground)' }}>
                      {p.change > 0 ? '+' : ''}{p.change}%
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
