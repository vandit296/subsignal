'use client';

import { useState } from 'react';
import { useSession } from 'next-auth/react';

const UI = 'var(--font-ui)';
const OWNER = 'vandit296@gmail.com';

interface Row { query: string; intent: string; icpFit: number; competition: string; verdict: string; angle: string; }
interface Resp { topic: string; usedFallback: boolean; autocompleteCount: number; results: Row[]; best: { query: string; outline: string[] } | null; error?: string; message?: string; }

const verdictColor = (v: string) => v === 'write' ? 'var(--green)' : v === 'maybe' ? 'var(--amber)' : 'var(--t4)';
const compColor = (c: string) => c === 'low' ? 'var(--green)' : c === 'high' ? 'var(--hot)' : 'var(--amber)';

export default function SeoHelper() {
  const { data: session, status } = useSession();
  const [topic, setTopic] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Resp | null>(null);
  const [err, setErr] = useState<string | null>(null);

  if (status === 'loading') return null;
  if (session?.user?.email?.toLowerCase() !== OWNER) {
    return <div style={{ padding: '14vh 20px', textAlign: 'center', color: 'var(--t3)', fontFamily: UI }}>Not authorized.</div>;
  }

  async function run() {
    const q = topic.trim();
    if (!q) return;
    setLoading(true); setErr(null); setData(null);
    try {
      const r = await fetch(`/api/internal/seo?q=${encodeURIComponent(q)}`);
      const j = (await r.json()) as Resp;
      if (j.error) { setErr(j.message || 'Failed — try again.'); return; }
      setData(j);
    } catch { setErr('Network error.'); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ maxWidth: 820, margin: '0 auto', padding: '26px 0 80px', fontFamily: UI }}>
      <h1 style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.015em' }}>SEO Helper</h1>
      <p style={{ fontSize: 13, color: 'var(--t3)', margin: '6px 0 20px' }}>
        Real Google autocomplete, scored for our ICP — the practitioner running Reddit as a channel, not the indie dev.
      </p>

      <div style={{ display: 'flex', gap: 10, marginBottom: 24 }}>
        <input value={topic} onChange={e => setTopic(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') run(); }}
          placeholder="e.g. reddit marketing, F5Bot, lead generation"
          style={{ flex: 1, height: 42, background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, color: 'var(--t1)', fontSize: 14, padding: '0 14px', fontFamily: UI, outline: 'none' }} />
        <button onClick={run} disabled={loading} className="btn-void-primary" style={{ padding: '0 22px', fontSize: 14 }}>
          {loading ? 'Scoring…' : 'Score'}
        </button>
      </div>

      {err && <div style={{ color: 'var(--t2)', fontSize: 14 }}>{err}</div>}

      {data && (
        <>
          <div style={{ fontSize: 12, color: 'var(--t4)', marginBottom: 12 }}>
            {data.usedFallback
              ? 'Autocomplete was blocked — these are AI-suggested queries, not live autocomplete.'
              : `${data.results.length} real autocomplete queries scored.`}
          </div>

          {data.best && (
            <div style={{ background: 'var(--blue-dim)', border: '0.5px solid var(--blue-border)', borderRadius: 12, padding: '16px 18px', marginBottom: 22 }}>
              <div style={{ fontSize: 11, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--blue)', marginBottom: 6 }}>Write this first</div>
              <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--t1)', marginBottom: 10 }}>{data.best.query}</div>
              <ul style={{ margin: 0, paddingLeft: 18, color: 'var(--t2)', fontSize: 13, lineHeight: 1.7 }}>
                {data.best.outline.map((b, i) => <li key={i}>{b}</li>)}
              </ul>
            </div>
          )}

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {data.results.map((r, i) => (
              <div key={i} style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '12px 14px', display: 'grid', gridTemplateColumns: '1fr auto', gap: 8, alignItems: 'center' }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, color: 'var(--t1)', fontWeight: 500 }}>{r.query}</div>
                  <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 2 }}>{r.angle}</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 11, whiteSpace: 'nowrap' }}>
                  <span title="ICP fit" style={{ fontFamily: 'var(--font-mono)', color: r.icpFit >= 70 ? 'var(--green)' : r.icpFit >= 45 ? 'var(--amber)' : 'var(--t4)' }}>fit {r.icpFit}</span>
                  <span title="competition" style={{ color: compColor(r.competition) }}>{r.competition}</span>
                  <span title="intent" style={{ color: 'var(--t3)' }}>{r.intent.slice(0, 4)}</span>
                  <span style={{ color: verdictColor(r.verdict), fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.03em' }}>{r.verdict}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
