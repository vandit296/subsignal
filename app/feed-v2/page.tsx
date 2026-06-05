'use client';

import { useEffect, useState, useCallback } from 'react';

interface Opp { sub: string; title: string; url: string; snippet: string; tier: string; score: number; angle: string; numComments: number; createdUtc: number; }
interface Feed { profile?: { summary: string; category: string; jtbd: string }; opportunities?: Opp[]; stats?: { universe: number; indexed: number; matched: number; builtAt: string; shortlist?: number; skipped?: number; unscored?: number }; cached?: boolean; error?: string; message?: string; }

const C = { void: '#0C0C0F', surface: '#131317', line: '#22222A', blue: '#4A8FFF', green: '#00C8A0', amber: '#FFB400', t1: '#F0ECE4', t2: 'rgba(240,236,228,0.55)', t3: 'rgba(240,236,228,0.3)', mono: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)' };
const LOADING = ['Reading your company…', 'Mapping your customers…', 'Sweeping ~140 subreddits…', 'Filtering dead threads…', 'Scoring engagement opportunities…', 'Ranking your feed…'];
const REPLY_PAGE = 5;

export default function FeedV2() {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState(LOADING[0]);
  const [page, setPage] = useState(0);
  const [addPage, setAddPage] = useState(0);
  const [watchPage, setWatchPage] = useState(0);

  const load = useCallback(async (force = false) => {
    setLoading(true); setErr(null); setPage(0); setAddPage(0); setWatchPage(0);
    let i = 0; const iv = setInterval(() => { i = (i + 1) % LOADING.length; setMsg(LOADING[i]); }, 1600);
    try {
      const qs = typeof window !== 'undefined' ? window.location.search : '';
      const url = '/api/intelligence-feed' + qs + (force ? (qs ? '&' : '?') + 'rebuild=1' : '');
      const res = await fetch(url, { cache: 'no-store' });
      if (res.status === 401) { setErr('Please sign in to view your feed.'); return; }
      const j = await res.json() as Feed;
      setFeed(j);
    } catch { setErr('Could not build the feed. Try again.'); }
    finally { clearInterval(iv); setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  const opps = feed?.opportunities ?? [];
  const reply = opps.filter(o => o.tier === 'reply');
  const add = opps.filter(o => o.tier === 'add');
  const watch = opps.filter(o => o.tier === 'watch');
  const pages = Math.max(1, Math.ceil(reply.length / REPLY_PAGE));
  const replyPage = reply.slice(page * REPLY_PAGE, page * REPLY_PAGE + REPLY_PAGE);
  const addPages = Math.max(1, Math.ceil(add.length / REPLY_PAGE));
  const addSlice = add.slice(addPage * REPLY_PAGE, addPage * REPLY_PAGE + REPLY_PAGE);
  const watchPages = Math.max(1, Math.ceil(watch.length / REPLY_PAGE));
  const watchSlice = watch.slice(watchPage * REPLY_PAGE, watchPage * REPLY_PAGE + REPLY_PAGE);
  const pager = (n: number, cur: number, set: (x: number) => void) => n <= 1 ? null : (
    <div style={{ display: 'flex', gap: 7, justifyContent: 'center', margin: '14px 0 28px' }}>
      {Array.from({ length: n }, (_, i) => (
        <button key={i} onClick={() => set(i)} style={{ fontFamily: C.mono, fontSize: 12, minWidth: 30, height: 30, borderRadius: 7, cursor: 'pointer', background: i === cur ? C.blue : 'transparent', color: i === cur ? C.void : C.t2, border: `1px solid ${i === cur ? C.blue : C.line}`, fontWeight: i === cur ? 700 : 400 }}>{i + 1}</button>
      ))}
    </div>
  );

  const card = (o: Opp, accent: string) => (
    <a key={o.url} href={o.url} target="_blank" rel="noopener noreferrer" style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${accent}`, borderRadius: 9, padding: '12px 15px', marginBottom: 9 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
        <span style={{ fontFamily: C.mono, fontSize: 10, color: C.blue }}>r/{o.sub}</span>
        {o.numComments > 0 && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.t3 }}>💬 {o.numComments}</span>}
        <span style={{ marginLeft: 'auto', fontFamily: C.mono, fontSize: 9, color: C.t3 }}>{o.score}</span>
      </div>
      <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, color: C.t1, marginBottom: o.angle ? 4 : 0 }}>{o.title}</div>
      {o.angle && <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.45 }}>{o.angle}</div>}
    </a>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.void, color: C.t1, fontFamily: 'var(--font-ui, system-ui, sans-serif)', padding: '28px 18px 70px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
          <span style={{ color: C.blue }}>◆</span>
          <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.t3 }}>Market Feed <span style={{ color: C.amber }}>· beta</span></span>
          <button onClick={() => load(true)} style={{ marginLeft: 'auto', fontFamily: C.mono, fontSize: 10, color: C.t2, background: 'transparent', border: `1px solid ${C.line}`, borderRadius: 7, padding: '6px 12px', cursor: 'pointer' }}>↻ Rebuild</button>
        </div>

        {loading && (
          <div style={{ textAlign: 'center', padding: '70px 0' }}>
            <div style={{ fontSize: 30, color: C.blue, animation: 'pulse 1.1s ease-in-out infinite' }}>◆</div>
            <div style={{ fontFamily: C.mono, fontSize: 13, color: C.t1, marginTop: 18 }}>{msg}</div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 6 }}>First build can take a minute — then it&apos;s instant.</div>
            <style>{`@keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}`}</style>
          </div>
        )}

        {!loading && err && <div style={{ color: C.amber, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>{err}</div>}

        {!loading && !err && feed?.error === 'no_company' && (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: 28, color: C.blue, marginBottom: 14 }}>◆</div>
            <div style={{ fontSize: 16, fontWeight: 600, marginBottom: 8 }}>Tell us your company</div>
            <div style={{ fontSize: 13, color: C.t2, marginBottom: 22 }}>{feed.message}</div>
            <a href="/command" style={{ display: 'inline-block', background: C.blue, color: C.void, fontFamily: C.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', padding: '12px 22px', borderRadius: 10, textDecoration: 'none' }}>Add company →</a>
          </div>
        )}

        {!loading && !err && feed?.profile && (
          <>
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: '16px 18px', marginBottom: 18 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.blue, marginBottom: 8 }}>What we understand</div>
              <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>{feed.profile.summary}</div>
              <div style={{ fontSize: 12, color: C.t2 }}>Customer job: {feed.profile.jtbd}</div>
            </div>
            {feed.stats && <div style={{ fontFamily: C.mono, fontSize: 10, color: C.t3, marginBottom: 22, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>{feed.stats.universe} subreddits swept</span><span>{feed.stats.indexed} live threads scanned</span><span>{feed.stats.matched} opportunities</span>{feed.cached && <span>· updated {new Date(feed.stats.builtAt).toLocaleDateString()}</span>}
            </div>}

            {/* REPLY NOW — paginated */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 10 }}>
              <span style={{ fontSize: 15, fontWeight: 600, color: C.green }}>🔥 Reply now</span>
              <span style={{ fontFamily: C.mono, fontSize: 10, color: C.t3 }}>{reply.length} high-intent</span>
              <span style={{ flex: 1, height: 1, background: C.line }} />
            </div>
            {replyPage.map(o => card(o, C.green))}
            {reply.length === 0 && <div style={{ fontSize: 12, color: C.t3, marginBottom: 14 }}>No high-intent threads right now — check Add value below.</div>}
            {pager(pages, page, setPage)}

            {/* ADD VALUE */}
            {add.length > 0 && <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '8px 0 10px' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.blue }}>💬 Add value</span>
                <span style={{ fontFamily: C.mono, fontSize: 10, color: C.t3 }}>{add.length} authority-building</span>
                <span style={{ flex: 1, height: 1, background: C.line }} />
              </div>
              {addSlice.map(o => card(o, C.blue))}
              {pager(addPages, addPage, setAddPage)}
            </>}

            {/* WATCH */}
            {watch.length > 0 && <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, margin: '18px 0 10px' }}>
                <span style={{ fontSize: 15, fontWeight: 600, color: C.amber }}>👀 Watch</span>
                <span style={{ fontFamily: C.mono, fontSize: 10, color: C.t3 }}>{watch.length} market signals</span>
                <span style={{ flex: 1, height: 1, background: C.line }} />
              </div>
              {watchSlice.map(o => card(o, C.amber))}
              {pager(watchPages, watchPage, setWatchPage)}
            </>}
          </>
        )}
      </div>
    </div>
  );
}
