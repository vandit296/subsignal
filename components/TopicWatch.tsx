'use client';

import { useEffect, useState, useCallback } from 'react';
import { track } from '@/lib/posthog';

interface Thread { sub: string; title: string; url: string; snippet: string; score: number; reason: string; numComments: number; createdUtc: number; }
interface Feed { topic?: string; definition?: string; threads?: Thread[]; stats?: { universe: number; indexed: number; matched: number; builtAt: string }; cached?: boolean; error?: string; }

const C = { void: '#0C0C0F', surface: '#131317', line: '#22222A', blue: '#4A8FFF', green: '#00C8A0', amber: '#FFB400', red: '#FF5C5C', t1: '#F0ECE4', t2: 'rgba(240,236,228,0.55)', t3: 'rgba(240,236,228,0.3)', mono: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)' };
const LOADING = ['Understanding the topic…', 'Mapping where it’s discussed…', 'Sweeping subreddits…', 'Filtering dead threads…', 'Scoring topic relevance…', 'Ranking matches…'];
const LS_KEY = 'treddit:topicwatch:last';
const LS_INTRO = 'treddit:topicwatch:introSeen';
const EXAMPLES = ['cloud API credits', 'pre-seed funding advice', 'customer churn problems', 'switching off Mailchimp'];

function IntroDialog({ onClose, onPick }: { onClose: () => void; onPick: (t: string) => void }) {
  return (
    <div onClick={onClose} style={{ position: 'fixed', inset: 0, background: 'rgba(4,4,6,0.72)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, zIndex: 50 }}>
      <div onClick={e => e.stopPropagation()} style={{ width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', background: 'linear-gradient(180deg,#15151B 0%,#0E0E12 100%)', border: `1px solid ${C.line}`, borderRadius: 18, boxShadow: '0 30px 80px rgba(0,0,0,0.6)' }}>
        <div style={{ padding: '24px 26px 18px', borderBottom: `1px solid ${C.line}`, position: 'relative' }}>
          <button onClick={onClose} aria-label="Close" style={{ position: 'absolute', top: 18, right: 20, background: 'transparent', border: 'none', color: C.t3, fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: C.blue, marginBottom: 9 }}>New way to watch Reddit</div>
          <h1 style={{ margin: 0, fontSize: 23, fontWeight: 800, letterSpacing: '-0.02em', lineHeight: 1.2 }}>This isn’t keyword tracking.<br />It’s <span style={{ color: C.blue }}>Topic Watch.</span></h1>
        </div>

        <div style={{ padding: '22px 26px 8px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12, marginBottom: 22 }}>
            <div style={{ borderRadius: 12, padding: '14px 15px', background: 'rgba(255,92,92,0.05)', border: '1px solid rgba(255,92,92,0.22)' }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.red, marginBottom: 10 }}>✕ Keyword tracking</div>
              <p style={{ margin: '0 0 8px', fontSize: 12.5, lineHeight: 1.5, color: C.t2 }}>Matches the <b style={{ color: C.t1 }}>exact words</b> you type — nothing else.</p>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: C.t2 }}>Misses the conversation when people phrase it differently, and floods you with coincidental noise.</p>
              <span style={{ display: 'block', marginTop: 8, fontSize: 11.5, color: C.t3, fontStyle: 'italic', lineHeight: 1.45 }}>Track “cloud API credits” → you miss “our Azure trial ran out, broke as a startup.”</span>
            </div>
            <div style={{ borderRadius: 12, padding: '14px 15px', background: 'rgba(74,143,255,0.07)', border: '1px solid rgba(74,143,255,0.32)' }}>
              <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: '0.1em', textTransform: 'uppercase', color: C.blue, marginBottom: 10 }}>◆ Topic Watch</div>
              <p style={{ margin: '0 0 8px', fontSize: 12.5, lineHeight: 1.5, color: C.t2 }}>Understands the <b style={{ color: C.t1 }}>meaning</b> behind a topic, not just the string.</p>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: C.t2 }}>Catches the thread even when your words never appear, and scores every match for relevance.</p>
              <span style={{ display: 'block', marginTop: 8, fontSize: 11.5, color: C.t3, fontStyle: 'italic', lineHeight: 1.45 }}>Watch “cloud API credits” → it <b style={{ color: C.green, fontStyle: 'normal' }}>catches</b> that same thread. Different words, same intent.</span>
            </div>
          </div>

          <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.t3, margin: '4px 0 12px' }}>How to pick a good topic</div>
          <ul style={{ listStyle: 'none', margin: '0 0 20px', padding: 0 }}>
            {[
              ['Describe the situation, not the keyword.', '“Founders looking for a CRM” beats just “CRM.”'],
              ['Go a notch broader than feels safe.', 'Topic Watch filters the precision back in — so cast wide.'],
              ['One idea per watch.', 'Split distinct topics into separate watches for cleaner results.'],
              ['Use plain language, not brand names.', 'Concepts travel further across Reddit than product names do.'],
            ].map(([h, d], i) => (
              <li key={i} style={{ display: 'flex', gap: 11, marginBottom: 12, fontSize: 13, lineHeight: 1.5, color: C.t2 }}>
                <span style={{ flexShrink: 0, width: 20, height: 20, borderRadius: 6, background: 'rgba(74,143,255,0.14)', color: C.blue, fontFamily: C.mono, fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', marginTop: 1 }}>{i + 1}</span>
                <span><b style={{ color: C.t1, fontWeight: 600 }}>{h}</b> {d}</span>
              </li>
            ))}
          </ul>

          <div style={{ fontFamily: C.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: C.t3, margin: '4px 0 12px' }}>Try one</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 6 }}>
            {EXAMPLES.map(ex => (
              <button key={ex} onClick={() => onPick(ex)} style={{ background: C.surface, border: `1px solid ${C.line}`, borderRadius: 999, padding: '7px 13px', fontSize: 12, color: C.t1, cursor: 'pointer' }}>{ex}</button>
            ))}
          </div>
        </div>

        <div style={{ padding: '16px 26px 22px', borderTop: `1px solid ${C.line}`, display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ background: C.blue, color: C.void, fontWeight: 700, fontSize: 13, border: 'none', borderRadius: 10, padding: '11px 22px', cursor: 'pointer' }}>Got it — start watching</button>
        </div>
      </div>
    </div>
  );
}

export default function TopicWatch() {
  const [topic, setTopic] = useState('');
  const [feed, setFeed] = useState<Feed | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState(LOADING[0]);
  const [showIntro, setShowIntro] = useState(false);

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
      // Persist so results survive reloads / navigation until cleared or replaced.
      try { localStorage.setItem(LS_KEY, JSON.stringify({ topic: q, feed: j })); } catch { /* ignore */ }
    } catch { setErr('Could not build this topic. Try again.'); }
    finally { clearInterval(iv); setLoading(false); }
  }, []);

  const clearAll = useCallback(() => {
    setFeed(null); setTopic(''); setErr(null);
    try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
  }, []);

  const closeIntro = useCallback(() => {
    setShowIntro(false);
    try { localStorage.setItem(LS_INTRO, '1'); } catch { /* ignore */ }
  }, []);

  const pickExample = useCallback((t: string) => {
    closeIntro(); setTopic(t); run(t);
  }, [closeIntro, run]);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const t = (p.get('topic') || p.get('q') || '').trim();
    if (t) { setTopic(t); run(t); return; }
    // No topic in URL — restore the last result so it stays until cleared/replaced.
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as { topic?: string; feed?: Feed };
        if (saved.feed) { setTopic(saved.topic ?? ''); setFeed(saved.feed); }
      }
    } catch { /* ignore */ }
    // First-ever visit → auto-show the explainer.
    try { if (!localStorage.getItem(LS_INTRO)) setShowIntro(true); } catch { /* ignore */ }
  }, [run]);

  const threads = feed?.threads ?? [];

  return (
    <div style={{ minHeight: '100vh', background: C.void, color: C.t1, fontFamily: 'var(--font-ui, system-ui, sans-serif)', padding: '28px 18px 70px' }}>
      {showIntro && <IntroDialog onClose={closeIntro} onPick={pickExample} />}
      <div style={{ maxWidth: 820, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
          <span style={{ color: C.blue }}>◆</span>
          <span style={{ fontFamily: C.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.t3 }}>Topic Watch <span style={{ color: C.amber }}>· beta</span></span>
          <button onClick={() => setShowIntro(true)} title="What is Topic Watch?"
            style={{ marginLeft: 'auto', background: 'transparent', border: `1px solid ${C.line}`, borderRadius: 999, width: 22, height: 22, color: C.t3, fontSize: 12, fontWeight: 700, cursor: 'pointer', lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>?</button>
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
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontFamily: C.mono, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase', color: C.blue, marginBottom: 7 }}>Watching: {feed.topic}</div>
                  <div style={{ fontSize: 13, color: C.t2, lineHeight: 1.5 }}>{feed.definition}</div>
                </div>
                <button onClick={clearAll} title="Clear results"
                  style={{ flexShrink: 0, background: 'transparent', color: C.t3, fontFamily: C.mono, fontSize: 10, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', border: `1px solid ${C.line}`, borderRadius: 8, padding: '6px 12px', cursor: 'pointer' }}>Clear all</button>
              </div>
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
