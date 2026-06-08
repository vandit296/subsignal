'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

const C = { void: '#0C0C0F', surface: '#131317', line: '#22222A', blue: '#4A8FFF', green: '#00C8A0', amber: '#FFB400', red: '#FF5C5C', purple: '#A78BFA', t1: '#F0ECE4', t2: 'rgba(240,236,228,0.6)', t3: 'rgba(240,236,228,0.34)', mono: 'var(--font-mono, ui-monospace, Menlo, monospace)' };

interface Sub { sub: string; category: string; members: number; fit: number; competition: number; bestFor: string; opp: number; gem: boolean; }
interface Dir { subs?: Sub[]; categories?: string[]; company?: { name?: string }; noProfile?: boolean; error?: string; cached?: boolean; }

const fmt = (n: number) => n >= 1e6 ? (n / 1e6).toFixed(1) + 'M' : n >= 1e3 ? Math.round(n / 1e3) + 'k' : String(n);
const fitC = (v: number) => v >= 75 ? C.green : v >= 55 ? C.amber : C.red;
const compC = (v: number) => v >= 75 ? C.red : v >= 50 ? C.amber : C.green;

const SCAN_LINES = [
  'Reading your product profile…', 'Mapping your ideal customer…', 'Loading community universe…',
  'scanning r/startups', 'scanning r/venturecapital', 'scanning r/SaaS', 'scanning r/indiehackers',
  'scanning r/Entrepreneur', 'scanning r/microsaas', 'scanning r/ycombinator', 'scanning r/marketing',
  'pulling member counts…', 'scoring audience fit…', 'estimating competition…', 'scanning r/SideProject',
  'scanning r/growmybusiness', 'scanning r/buildinpublic', 'scanning r/AngelInvesting', 'tagging by topic…',
  'scanning r/ProductManagement', 'scanning r/ecommerce', 'ranking opportunities…', 'finding hidden gems…',
];

function LoadingStream() {
  const [lines, setLines] = useState<string[]>([]);
  const boxRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    let i = 0;
    const iv = setInterval(() => {
      setLines(prev => [...prev, SCAN_LINES[i % SCAN_LINES.length] + (i >= SCAN_LINES.length ? ' ·' : '')]);
      i++;
      requestAnimationFrame(() => { if (boxRef.current) boxRef.current.scrollTop = boxRef.current.scrollHeight; });
    }, 280);
    return () => clearInterval(iv);
  }, []);
  return (
    <div style={{ marginTop: 28 }}>
      <div style={{ fontFamily: C.mono, fontSize: 12, color: C.blue, marginBottom: 10 }}>◆ Building your directory…</div>
      <div ref={boxRef} style={{ height: 300, overflow: 'hidden', background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 16px', fontFamily: C.mono, fontSize: 12.5, lineHeight: 1.8 }}>
        {lines.map((l, i) => (
          <div key={i} style={{ color: i === lines.length - 1 ? C.t1 : C.t3, animation: 'tDirIn 0.3s ease' }}>
            <span style={{ color: C.green, marginRight: 8 }}>{l.startsWith('scanning') ? '›' : '◆'}</span>{l}
          </div>
        ))}
        <span style={{ display: 'inline-block', width: 8, height: 14, background: C.blue, verticalAlign: 'middle', animation: 'tDirBlink 1s step-end infinite' }} />
      </div>
      <div style={{ fontSize: 11, color: C.t3, marginTop: 8, fontFamily: C.mono }}>First build scores your whole pool — ~30s. Cached after.</div>
      <style>{`@keyframes tDirIn{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:none}}@keyframes tDirBlink{50%{opacity:0}}`}</style>
    </div>
  );
}

export default function DirectoryPage() {
  const [data, setData] = useState<Dir | null>(null);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'table' | 'topic' | 'matrix'>('table');
  const [q, setQ] = useState(''); const [cat, setCat] = useState(''); const [min, setMin] = useState(0);
  const [sortKey, setSortKey] = useState<keyof Sub>('fit'); const [sortDir, setSortDir] = useState(-1);

  const load = useCallback(async (refresh = false) => {
    setLoading(true); setData(null);
    try {
      const res = await fetch(`/api/subreddit-directory${refresh ? '?refresh=1' : ''}`, { cache: 'no-store' });
      setData(await res.json() as Dir);
    } catch { setData({ error: 'Could not load the directory. Try again.' }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(false); }, [load]);

  const all = data?.subs ?? [];
  const rows = all.filter(s => (!q || s.sub.toLowerCase().includes(q.toLowerCase()) || s.bestFor.toLowerCase().includes(q.toLowerCase())) && (!cat || s.category === cat) && s.members >= min);
  const sorted = [...rows].sort((a, b) => (a[sortKey] < b[sortKey] ? 1 : -1) * sortDir);
  const cats = data?.categories ?? [];
  const setSort = (k: keyof Sub) => { if (sortKey === k) setSortDir(d => -d); else { setSortKey(k); setSortDir(-1); } };

  const Bar = ({ v, color }: { v: number; color: string }) => <span><span style={{ display: 'inline-block', height: 6, borderRadius: 3, width: Math.max(6, v * 0.5), background: color, verticalAlign: 'middle', marginRight: 6 }} /><span style={{ fontFamily: C.mono, fontSize: 11, color: C.t2 }}>{v}</span></span>;

  const Row = ({ d }: { d: Sub }) => (
    <tr>
      <td style={td}><a href={`/scout/${encodeURIComponent(d.sub)}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: C.mono, fontSize: 12.5, color: C.blue, fontWeight: 600, textDecoration: 'none' }}>r/{d.sub}</a>{d.gem && <span style={gemS}>gem</span>}</td>
      <td style={td}><span style={catS}>{d.category}</span></td>
      <td style={{ ...td, fontFamily: C.mono, fontSize: 11, color: C.t2 }}>{d.members ? fmt(d.members) : '—'}</td>
      <td style={td}><Bar v={d.fit} color={fitC(d.fit)} /></td>
      <td style={td}><Bar v={d.competition} color={compC(d.competition)} /></td>
      <td style={{ ...td, fontSize: 11.5, color: C.t2 }}>{d.bestFor}</td>
      <td style={td}><a href={`/scout/${encodeURIComponent(d.sub)}`} target="_blank" rel="noopener noreferrer" style={actA}>scout</a><a href={`/watch?topic=${encodeURIComponent(d.sub)}`} target="_blank" rel="noopener noreferrer" style={actA}>watch</a></td>
    </tr>
  );

  const Th = ({ k, l, sortable = true }: { k?: keyof Sub; l: string; sortable?: boolean }) => (
    <th onClick={() => sortable && k && setSort(k)} style={{ ...thS, cursor: sortable ? 'pointer' : 'default' }}>{l}{sortable && k && sortKey === k ? (sortDir < 0 ? ' ▾' : ' ▴') : ''}</th>
  );
  const Table = ({ list }: { list: Sub[] }) => (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead><tr><Th k="sub" l="Subreddit" /><Th k="category" l="Topic" /><Th k="members" l="Members" /><Th k="fit" l="Audience fit" /><Th k="competition" l="Competition" /><Th l="Best for" sortable={false} /><Th l="" sortable={false} /></tr></thead>
      <tbody>{list.map(d => <Row key={d.sub} d={d} />)}</tbody>
    </table>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.void, color: C.t1, fontFamily: 'var(--font-ui, system-ui, sans-serif)', padding: '26px 18px 80px' }}>
      <div style={{ maxWidth: 1080, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <a href="/radar" style={{ fontFamily: C.mono, fontSize: 11, color: C.t3, textDecoration: 'none' }}>← Radar</a>
          <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.t3 }}>· Subreddit Directory</span>
          {!loading && data?.subs && <button onClick={() => load(true)} style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${C.line}`, color: C.t2, fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>↻ Rebuild</button>}
        </div>
        <h1 style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em', margin: '6px 0 4px' }}>Every community that matters</h1>
        <p style={{ fontSize: 13, color: C.t2, marginBottom: 16, maxWidth: 720, lineHeight: 1.5 }}>Your whole relevant pool, scored to your product. Sort the table, browse by topic, or open the matrix to spot <b style={{ color: C.green }}>hidden gems</b> (high fit, low competition).</p>

        {loading && <LoadingStream />}
        {!loading && data?.noProfile && <div style={{ color: C.amber, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>Set up your product in <a href="/command" style={{ color: C.blue }}>Command</a> first, then come back.</div>}
        {!loading && data?.error && <div style={{ color: C.amber, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>{data.error}</div>}

        {!loading && data?.subs && (
          <>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="Search…" style={{ ...inp, flex: 1, minWidth: 180 }} />
              <select value={cat} onChange={e => setCat(e.target.value)} style={inp}><option value="">All topics</option>{cats.map(c => <option key={c} value={c}>{c}</option>)}</select>
              <select value={min} onChange={e => setMin(+e.target.value)} style={inp}><option value={0}>Any size</option><option value={10000}>10k+</option><option value={100000}>100k+</option><option value={1000000}>1M+</option></select>
              <div style={{ display: 'flex', gap: 4, marginLeft: 'auto', background: C.surface, border: `1px solid ${C.line}`, borderRadius: 9, padding: 3 }}>
                {(['table', 'topic', 'matrix'] as const).map(v => (
                  <button key={v} onClick={() => setView(v)} style={{ padding: '7px 13px', borderRadius: 7, fontFamily: C.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', cursor: 'pointer', border: 'none', background: view === v ? C.blue : 'none', color: view === v ? C.void : C.t3 }}>{v === 'topic' ? 'By topic' : v}</button>
                ))}
              </div>
            </div>
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.t3, marginBottom: 10 }}>{rows.length} of {all.length} communities{view === 'matrix' ? ' · hover a dot' : ''}</div>

            {view === 'table' && <Table list={sorted} />}
            {view === 'topic' && cats.filter(c => rows.some(r => r.category === c)).map(c => (
              <div key={c}><div style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.purple, margin: '20px 0 8px' }}>{c} · {rows.filter(r => r.category === c).length}</div><Table list={rows.filter(r => r.category === c).sort((a, b) => b.fit - a.fit)} /></div>
            ))}
            {view === 'matrix' && (
              <div>
                <div style={{ position: 'relative', height: 520, background: 'rgba(255,255,255,0.015)', border: `1px solid ${C.line}`, borderRadius: 12, marginTop: 8 }}>
                  <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: 1, background: '#1d1d24' }} />
                  <div style={{ position: 'absolute', top: '50%', left: 0, right: 0, height: 1, background: '#1d1d24' }} />
                  <div style={{ position: 'absolute', left: 14, top: 12, fontFamily: C.mono, fontSize: 9.5, color: C.green }}>◆ Hidden gems<br /><span style={{ color: C.t3 }}>high fit · low competition</span></div>
                  <div style={{ position: 'absolute', right: 14, top: 12, textAlign: 'right', fontFamily: C.mono, fontSize: 9.5, color: C.t3 }}>Crowded<br />high fit · high competition</div>
                  <div style={{ position: 'absolute', left: 14, bottom: 12, fontFamily: C.mono, fontSize: 9.5, color: C.t3 }}>Quiet / niche</div>
                  <div style={{ position: 'absolute', right: 14, bottom: 12, textAlign: 'right', fontFamily: C.mono, fontSize: 9.5, color: C.t3 }}>Skip</div>
                  {rows.map(d => {
                    const size = Math.max(9, Math.min(26, Math.log10(Math.max(d.members, 1000)) * 4));
                    const color = d.gem ? C.green : d.fit >= 55 ? C.blue : C.t3;
                    return (
                      <a key={d.sub} href={`/scout/${encodeURIComponent(d.sub)}`} target="_blank" rel="noopener noreferrer" title={`r/${d.sub} · fit ${d.fit} · comp ${d.competition}`}
                        style={{ position: 'absolute', left: `${d.fit}%`, bottom: `${d.opp}%`, width: size, height: size, transform: 'translate(-50%,50%)', borderRadius: '50%', background: color, opacity: 0.82 }} />
                    );
                  })}
                </div>
                <div style={{ textAlign: 'center', fontFamily: C.mono, fontSize: 10, color: C.t3, marginTop: 6 }}>Audience fit →</div>
              </div>
            )}
            <div style={{ fontFamily: C.mono, fontSize: 10, color: C.t3, marginTop: 18 }}>Scored to your product · {data.cached ? 'cached' : 'fresh'} · v1 covers your core pool</div>
          </>
        )}
      </div>
    </div>
  );
}

const td: React.CSSProperties = { padding: '9px 10px', borderBottom: '1px solid #18181d', verticalAlign: 'middle' };
const thS: React.CSSProperties = { textAlign: 'left', fontFamily: C.mono, fontSize: 9.5, letterSpacing: '0.08em', textTransform: 'uppercase', color: C.t3, padding: '8px 10px', borderBottom: `1px solid ${C.line}`, whiteSpace: 'nowrap' };
const catS: React.CSSProperties = { fontFamily: C.mono, fontSize: 9, padding: '2px 7px', borderRadius: 4, background: 'rgba(167,139,250,0.1)', color: C.purple, whiteSpace: 'nowrap' };
const gemS: React.CSSProperties = { fontFamily: C.mono, fontSize: 8, fontWeight: 700, color: C.green, background: 'rgba(0,200,160,0.13)', padding: '1px 5px', borderRadius: 3, marginLeft: 6, textTransform: 'uppercase', letterSpacing: '0.04em' };
const actA: React.CSSProperties = { fontFamily: C.mono, fontSize: 10, color: C.blue, textDecoration: 'none', marginRight: 9 };
const inp: React.CSSProperties = { background: C.surface, border: `1px solid ${C.line}`, color: C.t1, borderRadius: 8, padding: '8px 11px', fontSize: 13, outline: 'none', fontFamily: 'inherit' };
