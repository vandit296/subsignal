'use client';

import { useState } from 'react';

const C = { void: '#0C0C0F', surface: '#131317', line: '#22222A', blue: '#4A8FFF', green: '#00C8A0', amber: '#FFB400', purple: '#A78BFA', t1: '#F0ECE4', t2: 'rgba(240,236,228,0.6)', t3: 'rgba(240,236,228,0.34)', mono: 'var(--font-mono, ui-monospace, Menlo, monospace)' };

interface Item { sub: string; why: string; }
interface Res { fit?: Item[]; gems?: Item[]; error?: string; }

export default function ToolPage() {
  const [q, setQ] = useState('');
  const [res, setRes] = useState<Res | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const run = async () => {
    if (!q.trim() || loading) return;
    setLoading(true); setRes(null); setCopied(false);
    try {
      const r = await fetch(`/api/tool-subreddits?q=${encodeURIComponent(q.trim())}`, { cache: 'no-store' });
      setRes(await r.json() as Res);
    } catch { setRes({ error: 'Failed — try again.' }); }
    finally { setLoading(false); }
  };

  const reply = res && !res.error ? buildReply(res) : '';
  const copy = () => { navigator.clipboard.writeText(reply); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  return (
    <div style={{ minHeight: '100vh', background: C.void, color: C.t1, fontFamily: 'var(--font-ui, system-ui, sans-serif)', padding: '28px 18px 70px' }}>
      <div style={{ maxWidth: 760, margin: '0 auto' }}>
        <div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.t3, marginBottom: 8 }}>◆ Subreddit Reply Tool <span style={{ color: C.amber }}>· internal</span></div>
        <h1 style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-0.02em', margin: '0 0 4px' }}>Paste a startup → get subreddits to reply with</h1>
        <p style={{ fontSize: 13, color: C.t2, marginBottom: 16 }}>Runs Radar + Go Crazy on the pasted description. Copy the reply, paste it on Reddit.</p>

        <textarea value={q} onChange={e => setQ(e.target.value)} placeholder="Paste their startup description here…"
          rows={5} style={{ width: '100%', background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, color: C.t1, fontSize: 14, padding: '12px 14px', outline: 'none', fontFamily: 'inherit', resize: 'vertical' }} />
        <button onClick={run} disabled={!q.trim() || loading} style={{ marginTop: 10, background: q.trim() && !loading ? C.blue : C.line, color: q.trim() && !loading ? C.void : C.t3, border: 'none', borderRadius: 9, fontFamily: C.mono, fontSize: 12, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '11px 20px', cursor: q.trim() && !loading ? 'pointer' : 'not-allowed' }}>
          {loading ? 'Analyzing… (~20s)' : 'Get subreddits →'}
        </button>

        {res?.error && <div style={{ color: C.amber, fontSize: 13, marginTop: 20 }}>{res.error}</div>}

        {reply && (
          <>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: 26, marginBottom: 8 }}>
              <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.t3 }}>Copy-paste reply</span>
              <button onClick={copy} style={{ marginLeft: 'auto', background: copied ? C.green : C.surface, color: copied ? C.void : C.t1, border: `1px solid ${copied ? C.green : C.line}`, borderRadius: 8, fontFamily: C.mono, fontSize: 11, fontWeight: 700, padding: '7px 14px', cursor: 'pointer' }}>{copied ? '✓ Copied' : 'Copy'}</button>
            </div>
            <textarea readOnly value={reply} rows={Math.min(20, reply.split('\n').length + 1)} style={{ width: '100%', background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, color: C.t2, fontSize: 13, padding: '12px 14px', fontFamily: C.mono, lineHeight: 1.6, resize: 'vertical' }} />
          </>
        )}
      </div>
    </div>
  );
}

function buildReply(res: Res): string {
  const lines: string[] = [];
  if (res.fit?.length) {
    lines.push('Best-fit subreddits for you:', '');
    res.fit.forEach(m => lines.push(`• r/${m.sub}${m.why ? ` — ${m.why}` : ''}`));
  }
  if (res.gems?.length) {
    lines.push('', 'A few non-obvious ones worth testing:', '');
    res.gems.forEach(m => lines.push(`• r/${m.sub}${m.why ? ` — ${m.why}` : ''}`));
  }
  return lines.join('\n');
}
