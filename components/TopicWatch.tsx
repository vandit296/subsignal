'use client';

import { useEffect, useState, useCallback } from 'react';
import { track } from '@/lib/posthog';

interface Thread { sub: string; title: string; url: string; snippet: string; score: number; reason: string; numComments: number; createdUtc: number; }
interface Feed { topic?: string; definition?: string; threads?: Thread[]; stats?: { universe: number; indexed: number; matched: number; builtAt: string }; cached?: boolean; error?: string; }

const C = { void: '#0C0C0F', surface: '#131317', line: '#22222A', blue: '#4A8FFF', green: '#00C8A0', amber: '#FFB400', t1: '#F0ECE4', t2: 'rgba(240,236,228,0.55)', t3: 'rgba(240,236,228,0.3)', mono: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)' };
const LOADING = ['Understanding the topic…', 'Mapping where it’s discussed…', 'Sweeping subreddits…', 'Filtering dead threads…', 'Scoring topic relevance…', 'Ranking matches…'];

export default function TopicWatch() {
  const [topic, setTopic] = useState('');
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState(LOADING[0]);

  const run = useCallback(async (t: string, force = false) => {
    const q = t.trim(); if (!q) return;
    setLoading(true); setErr(null); setFeed(null);
    track('topic_searched', { topic: q });
    let i = 0; const iv = setInterval(() => { i = (i + 1) % LOADING.length; setMsg(LOADING[i]); }, 1600);
    try {
      const res = await fetch(`/api/topic-watch?topic=${encodeURIComponent(q)}${force ? '&rebuild=1' : ''}`, { cache: 'no-store' });
      if (res.status === 401) { setErr('Please sign in to use Topic Watch.'); return; }
      const j = await res.json() as Feed;
      if (j.error) { setErr(j.error); return; }
      setFeed(j);
    } catch { setErr('Could not build this topic. Try again.'); }
    finally { clearInterval(iv); setLoading(false); }
  }, []);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = (p.get('topic') || p.get('q') || '').trim();
    if (t) { setTopic(t); run(t); }
  }, [run]);

  const threads = feed?.threads ?? [];

  return (
    <div style={{ minHeight: '100vh', background: C.void, color: C.t1, fontFamily: 'var(--font-ui, system-ui, sans-serif)', padding: '28px 18px 70px' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ color: C.blue }}>◆</span>
          <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.t3 }}>Topic Watch <span style={{ color: C.amber }}>· beta</span></span>
        </div>

        <form onSubmit={e => { e.preventDefault(); run(topic); }} style={{ display: 'flex', gap: 10, background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: '7px 7px 7px 16px', marginBottom: 16 }}>
          <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Watch a topic — e.g. cloud API credits, pre-seed funding, churn"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.t1, fontSize: 15, padding: '10px 0', fontFamily: 'inherit' }} />
          <button type="submit" disabled={!topic.trim()} style={{ background: topic.trim() ? C.blue : C.line, color: topic.trim() ? C.void : C.t3, fontFamily: C.mono, fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', border: 'none', borderRadius: 9, padding: '0 18px', cursor: topic.trim() ? 'pointer' : 'not-allowed' }}>Watch →</button>
        </form>

        {loading && (
          <div style={{ textAlign: 'center', padding: '70px 0' }}>
            <div style={{ fontSize: 30, color: C.blue, animation: 'pulse 1.1s ease-in-out infinite' }}>◆</div>
            <div style={{ fontFamily: C.mono, fontSize: 13, color: C.t1, marginTop: 18 }}>{msg}</div>
            <div style={{ fontSize: 11, color: C.t3, marginTop: 6 }}>First build of a topic takes a minute, then it&apos;s instant.</div>
            <style>{`@keyframes pulse{0%,100%{opacity:.35}50%{opacity:1}}`}</style>
          </div>
        )}

        {!loading && err && <div style={{ color: C.amber, fontSize: 13, padding: '40px 0', textAlign: 'center' }}>{err}</div>}

        {!loading && !err && !feed && (
          <div style={{ fontSize: 13, color: C.t3, textAlign: 'center', padding: '50px 0' }}>Enter a topic to watch the live conversation around it across Reddit.</div>
        )}

        {!loading && !err && feed?.threads && (
          <>
            <div style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 12, padding: '14px 16px', marginBottom: 14 }}>
              <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.blue, marginBottom: 7 }}>Watching: {feed.topic}</div>
              <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.5 }}>{feed.definition}</div>
            </div>
            {feed.stats && <div style={{ fontFamily: C.mono, fontSize: 10, color: C.t3, marginBottom: 20, display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              <span>{feed.stats.universe} subreddits swept</span><span>{feed.stats.indexed} live threads scanned</span><span>{feed.stats.matched} on-topic</span>{feed.cached && <span>· updated {new Date(feed.stats.builtAt).toLocaleDateString()}</span>}
            </div>}

            {threads.length === 0 && <div style={{ fontSize: 13, color: C.t3, textAlign: 'center', padding: '30px 0' }}>No on-topic threads found in the recent window. Try a broader topic.</div>}

            {threads.map(o => (
              <a key={o.url} href={o.url} target="_blank" rel="noopener noreferrer" onClick={() => track('topic_thread_clicked', { sub: o.sub, score: o.score })}
                style={{ display: 'block', textDecoration: 'none', color: 'inherit', background: C.surface, border: `1px solid ${C.line}`, borderLeft: `3px solid ${C.green}`, borderRadius: 9, padding: '12px 15px', marginBottom: 9 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                  <span style={{ fontFamily: C.mono, fontSize: 10, color: C.blue }}>r/{o.sub}</span>
                  {o.numComments > 0 && <span style={{ fontFamily: C.mono, fontSize: 9, color: C.t3 }}>💬 {o.numComments}</span>}
                  <span style={{ marginLeft: 'auto', fontFamily: C.mono, fontSize: 9, color: C.green }}>{o.score}% on-topic</span>
                </div>
                <div style={{ fontSize: 14, fontWeight: 600, lineHeight: 1.35, color: C.t1, marginBottom: o.reason ? 4 : 0 }}>{o.title}</div>
                {o.reason && <div style={{ fontSize: 12, color: C.t2, lineHeight: 1.45 }}>{o.reason}</div>}
              </a>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
