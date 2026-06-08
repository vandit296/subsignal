'use client';

import { useState } from 'react';

const C = { void: '#0C0C0F', surface: '#131317', line: '#22222A', blue: '#4A8FFF', green: '#00C8A0', amber: '#FFB400', purple: '#A78BFA', t1: '#F0ECE4', t2: 'rgba(240,236,228,0.6)', t3: 'rgba(240,236,228,0.34)', mono: 'var(--font-mono, ui-monospace, Menlo, monospace)' };

interface Item { sub: string; short: string; long: string; }
interface Res { fit?: Item[]; gems?: Item[]; error?: string; }

export default function ToolPage() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Res | null>(null);
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const run = async () => {
    if (!q.trim() || loading) return;
    setLoading(true); setRes(null); setCopiedKey(null);
    try {
      const r = await fetch(`/api/tool-subreddits?q=${encodeURIComponent(q.trim())}`, { cache: 'no-store' });
      setRes(await r.json() as Res);
    } catch { setRes({ error: 'Failed — try again.' }); }
    finally { setLoading(false); }
  };

  const copy = (key: string, text: string) => { navigator.clipboard.writeText(text); setCopiedKey(key); setTimeout(() => setCopiedKey(null), 1800); };
  const ok = res && !res.error && ((res.fit?.length ?? 0) + (res.gems?.length ?? 0) > 0);
  const formats = ok ? [
    { key: 'names', label: 'Names only', text: buildNames(res!) },
    { key: 'short', label: 'Short', text: buildShort(res!) },
    { key: 'long', label: 'Long', text: buildLong(res!) },
  ] : [];

  return (
    <div style={{ minHeight: '100vh', background: C.void, color: C.t1, fontFamily: 'var(--font-ui, system-ui, sans-serif)', padding: '28px 18px 70px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.t3, marginBottom: 8 }}>◆ Subreddit Reply Tool <span style={{ color: C.amber }}>· internal</span></div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Paste a startup → get subreddits to reply with</h1>
        <p style={{ fontSize: 13, color: C.t2, marginBottom: 16 }}>Paste a description <b style={{ color: C.t1 }}>or a company URL</b>. Runs Radar + Go Crazy, then hands you a copy-paste reply.</p>

        <textarea value={q} onChange={e => setQ(e.target.value)} placeholder="Paste their startup description — or just their URL (e.g. acme.com)…"
          rows={5} style={{ width: '100%', background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, color: C.t1, fontSize: 14, padding: '12px 14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
        <button onClick={run} disabled={!q.trim() || loading} style={{ marginTop: 10, background: q.trim() && !loading ? C.blue : C.line, color: q.trim() && !loading ? C.void : C.t3, border: 'none', borderRadius: 9, fontFamily: C.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '11px 20px', cursor: q.trim() && !loading ? 'pointer' : 'not-allowed' }}>
          {loading ? 'Analyzing… (~20s)' : 'Get subreddits →'}
        </button>

        {res?.error && <div style={{ color: C.amber, fontSize: 13, marginTop: 20 }}>{res.error}</div>}

        {formats.map(f => (
          <div key={f.key} style={{ marginTop: 22 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.t3 }}>{f.label}</span>
              <button onClick={() => copy(f.key, f.text)} style={{ marginLeft: 'auto', background: copiedKey === f.key ? C.green : C.surface, color: copiedKey === f.key ? C.void : C.t1, border: `1px solid ${copiedKey === f.key ? C.green : C.line}`, borderRadius: 8, fontFamily: C.mono, fontSize: 11, fontWeight: 700, padding: '7px 14px', cursor: 'pointer' }}>{copiedKey === f.key ? '✓ Copied' : 'Copy'}</button>
            </div>
            <textarea readOnly value={f.text} rows={Math.min(f.key === 'long' ? 22 : 8, f.text.split('\n').length + 1)} style={{ width: '100%', background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, color: C.t2, fontSize: 13, padding: '12px 14px', fontFamily: C.mono, lineHeight: 1.6, resize: 'vertical' }} />
          </div>
        ))}
      </div>
    </div>
  );
}

function allSubs(res: Res): Item[] {
  const seen = new Set<string>(); const out: Item[] = [];
  for (const m of [...(res.fit ?? []), ...(res.gems ?? [])]) {
    const k = m.sub.toLowerCase();
    if (!seen.has(k)) { seen.add(k); out.push(m); }
  }
  return out;
}

// "Names only" — plain r/sub, comma-separated
function buildNames(res: Res): string {
  return allSubs(res).map(m => `r/${m.sub}`).join(', ');
}

// "Short" — one terse line per sub
function buildShort(res: Res): string {
  return allSubs(res).map(m => `r/${m.sub}${m.short ? ` — ${m.short}` : ''}`).join('\n');
}

// "Long" — sectioned, fuller reasoning
function buildLong(res: Res): string {
  const lines: string[] = [];
  if (res.fit?.length) {
    lines.push('Best-fit subreddits for you:', '');
    res.fit.forEach(m => lines.push(`• r/${m.sub}${m.long ? ` — ${m.long}` : ''}`));
  }
  if (res.gems?.length) {
    lines.push('', 'A few non-obvious ones worth testing:', '');
    res.gems.forEach(m => lines.push(`• r/${m.sub}${m.long ? ` — ${m.long}` : ''}`));
  }
  return lines.join('\n');
}
