'use client';

import { useState, useEffect, useCallback } from 'react';

const C = { void: '#0C0C0F', surface: '#131317', line: '#22222A', blue: '#4A8FFF', green: '#00C8A0', amber: '#FFB400', red: '#FF5C5C', t1: '#F0ECE4', t2: 'rgba(240,236,228,0.6)', t3: 'rgba(240,236,228,0.34)', mono: 'var(--font-mono, ui-monospace, Menlo, monospace)' };

interface Post { tag: 'trigger' | 'adjacent' | 'noise'; text: string; query?: string; }
interface Sub { sub: string; posts: Post[]; }
interface Segment { icp: string; note?: string; subreddits: Sub[]; }
interface Tree { company: string; what: string; segments: Segment[]; cached?: boolean; error?: string; }

const TAG_C: Record<string, string> = { trigger: C.green, adjacent: C.amber, noise: C.red };
const TAG_BG: Record<string, string> = { trigger: 'rgba(0,200,160,0.13)', adjacent: 'rgba(255,180,0,0.13)', noise: 'rgba(255,92,92,0.12)' };

function Collapsible({ head, children, defaultOpen = true, accent }: { head: React.ReactNode; children: React.ReactNode; defaultOpen?: boolean; accent?: string }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <div onClick={() => setOpen(o => !o)} style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8, padding: '7px 11px', borderRadius: 9, background: C.surface, border: `1px solid ${accent ?? C.line}`, cursor: 'pointer', maxWidth: 700 }}>
        <span style={{ flexShrink: 0, width: 12, color: C.t3, fontFamily: C.mono, fontSize: 11, marginTop: 1 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 13.5, lineHeight: 1.4 }}>{head}</span>
      </div>
      {open && <div style={{ marginLeft: 9, paddingLeft: 22, borderLeft: '1px dashed #26262e', marginTop: 4 }}>{children}</div>}
    </div>
  );
}

interface RThread { sub: string; title: string; url: string; score: number; reason?: string; numComments?: number; }

// A pain node: click to expand and load the REAL Reddit threads for it (via Topic Watch).
function PostNode({ p }: { p: Post }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [threads, setThreads] = useState<RThread[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const q = p.query || p.text;

  const toggle = async () => {
    const next = !open; setOpen(next);
    if (next && threads === null && !loading) {
      setLoading(true); setErr(null);
      try {
        const res = await fetch(`/api/topic-watch?topic=${encodeURIComponent(q)}`, { cache: 'no-store' });
        const j = await res.json() as { threads?: RThread[]; error?: string };
        if (j.error) setErr(j.error);
        else setThreads((j.threads || []).slice(0, 3));
      } catch { setErr('Could not load threads.'); }
      finally { setLoading(false); }
    }
  };

  return (
    <div style={{ margin: '4px 0' }}>
      <div onClick={toggle} style={{ display: 'inline-flex', alignItems: 'flex-start', gap: 8, padding: '7px 11px', borderRadius: 9, background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${TAG_C[p.tag]}`, maxWidth: 680, cursor: 'pointer' }}>
        <span style={{ flexShrink: 0, width: 12, color: C.t3, fontFamily: C.mono, fontSize: 11, marginTop: 1 }}>{open ? '▾' : '▸'}</span>
        <span style={{ fontSize: 13, lineHeight: 1.4 }}>
          <span style={{ fontFamily: C.mono, fontSize: 8.5, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', padding: '2px 6px', borderRadius: 4, marginRight: 7, background: TAG_BG[p.tag], color: TAG_C[p.tag] }}>{p.tag}</span>
          {p.text}
          {!open && <span style={{ color: C.t3, fontFamily: C.mono, fontSize: 10, marginLeft: 8 }}>▸ real threads</span>}
        </span>
      </div>
      {open && (
        <div style={{ marginLeft: 20, marginTop: 6 }}>
          {loading && <div style={{ fontFamily: C.mono, fontSize: 11, color: C.t3 }}>◆ finding real threads… (first time can take ~a minute)</div>}
          {!loading && err && <div style={{ fontSize: 12, color: C.amber }}>{err}</div>}
          {!loading && threads && threads.length === 0 && <div style={{ fontSize: 12, color: C.t3 }}>No live threads right now. <a href={`/watch?topic=${encodeURIComponent(q)}`} target="_blank" rel="noopener noreferrer" style={{ color: C.blue }}>Open Topic Watch →</a></div>}
          {!loading && threads && threads.map((t, i) => (
            <a key={i} href={t.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: 'rgba(255,255,255,0.02)', border: `1px solid ${C.line}`, borderRadius: 8, padding: '8px 11px', marginBottom: 6, maxWidth: 660 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 3 }}>
                <span style={{ fontFamily: C.mono, fontSize: 10, color: C.blue }}>r/{t.sub}</span>
                {typeof t.numComments === 'number' && t.numComments > 0 && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.t3 }}>💬 {t.numComments}</span>}
                <span style={{ marginLeft: 'auto', fontFamily: C.mono, fontSize: 9, color: C.green }}>{t.score}% on-topic</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: C.t1, lineHeight: 1.35 }}>{t.title}</div>
              {t.reason && <div style={{ fontSize: 11.5, color: C.t2, marginTop: 2 }}>{t.reason}</div>}
            </a>
          ))}
          {!loading && threads && threads.length > 0 && <a href={`/watch?topic=${encodeURIComponent(q)}`} target="_blank" rel="noopener noreferrer" style={{ fontFamily: C.mono, fontSize: 10, color: C.blue, textDecoration: 'none' }}>see all in Topic Watch →</a>}
        </div>
      )}
    </div>
  );
}

export default function MindMapPage() {
  const [tree, setTree] = useState<Tree | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async (rebuild = false) => {
    setLoading(true); setErr(null); setTree(null);
    try {
      const res = await fetch(`/api/mindmap${rebuild ? '?rebuild=1' : ''}`, { cache: 'no-store' });
      const j = await res.json() as Tree;
      if (j.error) { setErr(j.error); return; }
      setTree(j);
    } catch { setErr('Could not load the map. Try rebuild.'); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { load(false); }, [load]);

  const lvl = (s: string) => <span style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.12em', textTransform: 'uppercase', color: C.blue, marginRight: 6 }}>{s}</span>;

  return (
    <div style={{ minHeight: '100vh', background: C.void, color: C.t1, fontFamily: 'var(--font-ui, system-ui, sans-serif)', padding: '28px 20px 80px' }}>
      <div style={{ maxWidth: 920, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ color: C.blue }}>◆</span>
          <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.t3 }}>ICP Mind Map <span style={{ color: C.amber }}>· internal</span></span>
          <button onClick={() => load(true)} disabled={loading} style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${C.line}`, color: C.t2, fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>↻ Rebuild</button>
        </div>
        <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.55, marginBottom: 18, maxWidth: 720 }}>
          Built from your Command profile. Bottom layer = <span style={{ color: C.green }}>● trigger</span> (act now) · <span style={{ color: C.amber }}>● adjacent</span> (help / build trust) · <span style={{ color: C.red }}>● noise</span> (your ICP, but no path — skip). Example posts are what to watch for; real matches come from Topic Watch.
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '70px 0', fontFamily: C.mono, fontSize: 13, color: C.t3 }}>◆ Building your map…<div style={{ fontSize: 11, marginTop: 6 }}>first build takes a few seconds</div></div>}
        {!loading && err && <div style={{ color: C.amber, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>{err}</div>}

        {!loading && tree && (
          <Collapsible accent="rgba(74,143,255,0.3)" head={<span><span style={{ fontWeight: 700 }}>{tree.company}</span><span style={{ display: 'block', fontSize: 11.5, color: C.t3, marginTop: 2 }}>{tree.what}</span></span>}>
            {tree.segments?.map((seg, i) => (
              <div key={i} style={{ margin: '4px 0' }}>
                <Collapsible head={<span>{lvl('ICP')}{seg.icp}{seg.note && <span style={{ display: 'block', fontSize: 11.5, color: C.t3, marginTop: 2 }}>{seg.note}</span>}</span>}>
                  {seg.subreddits?.map((sb, j) => (
                    <div key={j} style={{ margin: '4px 0' }}>
                      <Collapsible defaultOpen={false} head={<span>{lvl('Subreddit')}r/{sb.sub} <a href={`/scout/${encodeURIComponent(sb.sub)}`} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ fontFamily: C.mono, fontSize: 10, color: C.blue, textDecoration: 'none', marginLeft: 6 }}>↗ scout</a></span>}>
                        {sb.posts?.map((p, k) => (
                          <PostNode key={k} p={p} />
                        ))}
                      </Collapsible>
                    </div>
                  ))}
                </Collapsible>
              </div>
            ))}
          </Collapsible>
        )}
      </div>
    </div>
  );
}
