'use client';

import { useState, useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import Link from 'next/link';
import { isFreeTier } from '@/components/FreeTierGate';

interface BriefThread {
  id: string; title: string; subreddit: string;
  score: number; numComments: number; url: string; createdUtc: number;
}
interface BriefNarrative {
  id: string; type: 'hero' | 'signal' | 'tension' | 'mood';
  headline: string; synthesis: string; implication: string;
  strength: number; threads: BriefThread[]; subreddits: string[]; totalUpvotes: number;
}
interface MarketPulseItem { label: string; change: number; }
interface DailyBrief {
  hero: BriefNarrative; signals: BriefNarrative[]; pulse: MarketPulseItem[];
  subreddits: string[]; threadCount: number; narrativeCount: number; generatedAt?: string;
}

const BEAT: Record<string, { label: string; bg: string; text: string; border: string }> = {
  signal: { label: 'SIGNAL',     bg: '#0C1E2E', text: '#60A5FA', border: '#1A4060' },
  tension:{ label: 'DEBATE',     bg: '#2A1E08', text: '#FBBF24', border: '#5C4010' },
  mood:   { label: 'TRENDING',   bg: '#0C1E12', text: '#4ADE80', border: '#1A4A2E' },
  hero:   { label: 'LEAD STORY', bg: '#2A1A09', text: '#FF6B35', border: '#5C3010' },
};
function getBeat(type: string) {
  return BEAT[type] ?? { label: 'DEEP DIVE', bg: '#1A1A2E', text: '#A78BFA', border: '#3A2A6E' };
}

const EASE = 'cubic-bezier(0.16, 1, 0.3, 1)';
function fadeUp(on: boolean): React.CSSProperties {
  return { opacity: on ? 1 : 0, transform: on ? 'translateY(0)' : 'translateY(14px)', transition: `opacity 1.3s ${EASE}, transform 1.3s ${EASE}` };
}
function fadeIn(on: boolean): React.CSSProperties {
  return { opacity: on ? 1 : 0, transition: `opacity 1.4s ease` };
}
function slideLeft(on: boolean): React.CSSProperties {
  return { opacity: on ? 1 : 0, transform: on ? 'translateX(0)' : 'translateX(-8px)', transition: `opacity 1.1s ${EASE}, transform 1.1s ${EASE}` };
}

function BeatTag({ type }: { type: string }) {
  const b = getBeat(type);
  return <span style={{ display:'inline-block', fontSize:9, fontWeight:800, letterSpacing:'0.1em', padding:'2px 7px', borderRadius:2, background:b.bg, color:b.text, border:`1px solid ${b.border}`, flexShrink:0 }}>{b.label}</span>;
}

function SourceChips({ threads, vis }: { threads: BriefThread[]; vis: boolean[] }) {
  const top = (threads ?? []).slice(0, 3);
  if (!top.length) return null;
  return (
    <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginTop:'auto', paddingTop:10 }}>
      {top.map((t, i) => (
        <a key={t.id} href={t.url} target="_blank" rel="noopener noreferrer"
          style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:10, padding:'2px 8px', borderRadius:3, background:'#141414', color:'#555', border:'1px solid #222', textDecoration:'none', whiteSpace:'nowrap', ...fadeIn(vis[i] ?? false) }}>
          <span style={{ color:'#FF4500', fontWeight:600 }}>r/{t.subreddit}</span>
          <span style={{ color:'#2E2E2E' }}>·</span>
          <span>{t.score.toLocaleString()}&#8593;</span>
          <span style={{ color:'#2E2E2E' }}>·</span>
          <span>{t.numComments}c</span>
        </a>
      ))}
    </div>
  );
}

function WhyBox({ text, accentColor, on }: { text: string; accentColor: string; on: boolean }) {
  if (!text) return null;
  return (
    <div style={{ margin:'10px 0 8px', padding:'8px 10px', borderLeft:`2px solid ${accentColor}`, background:'#090909', borderRadius:'0 3px 3px 0', ...slideLeft(on) }}>
      <div style={{ fontSize:8, fontWeight:700, letterSpacing:'0.12em', color:'#3A3A3A', marginBottom:4 }}>WHY IT MATTERS</div>
      <div style={{ fontSize:11, color:'#666', lineHeight:1.6 }}>{text}</div>
    </div>
  );
}

function PulseRow({ items, on }: { items: MarketPulseItem[]; on: boolean }) {
  if (!items?.length) return null;
  return (
    <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14, paddingBottom:12, borderBottom:'1px solid #1A1A1A', ...fadeUp(on) }}>
      {items.map((item, i) => {
        const up = item.change >= 0;
        return <div key={i} style={{ fontSize:11, fontWeight:700, padding:'3px 9px', borderRadius:3, background: up ? '#0D2B1A' : '#2B0D0D', color: up ? '#4ADE80' : '#F87171', border:`1px solid ${up ? '#1A4A2E' : '#4A1A1A'}` }}>{item.label} {up ? '▲' : '▼'} {Math.abs(item.change).toFixed(1)}%</div>;
      })}
    </div>
  );
}
export default function BriefPage() {
  const { data: session } = useSession();
  const [brief, setBrief] = useState<DailyBrief | null>(null);
  const [loading, setLoading] = useState(true);
  const [isGuest, setIsGuest] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [vis, setVis] = useState<Set<string>>(new Set());
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 700);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!brief) return;
    timers.current.forEach(clearTimeout);
    timers.current = [];
    setVis(new Set());
    const seq: [string, number][] = [
      ['hdr',    0],   ['pulse',  700],
      ['c0',     1500],['c0-hl', 2100],['c0-body',2900],['c0-why',3900],
      ['c0-ch0', 4700],['c0-ch1',5000],['c0-ch2', 5300],
      ['c1',     6100],['c1-hl', 6700],['c1-why', 7500],
      ['c1-ch0', 8200],['c1-ch1',8500],
      ['c2',     9300],['c2-hl', 9900],['c2-why',10700],
      ['c3',    11500],['c3-hl',12100],['c3-why',12900],
      ['c4',    13700],['c4-hl',14300],['c4-why',15100],
    ];
    seq.forEach(([id, delay]) => {
      const t = setTimeout(() => setVis(prev => new Set([...prev, id])), delay);
      timers.current.push(t);
    });
    return () => timers.current.forEach(clearTimeout);
  }, [brief]);

  const v = (id: string) => vis.has(id);

  async function fetchBrief() {
    setLoading(true); setError(null);
    try {
      const res = await fetch('/api/brief');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const d = await res.json();
      if (d.guest) { setIsGuest(true); return; }
      setBrief(d.brief || null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally { setLoading(false); }
  }

  async function generateBrief() {
    setGenerating(true); setError(null);
    try {
      const res = await fetch('/api/brief/generate', { method: 'POST' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await fetchBrief();
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Generation failed');
    } finally { setGenerating(false); }
  }

  useEffect(() => { fetchBrief(); }, []);

  const signals = brief?.signals ?? [];
  const pulse   = brief?.pulse ?? [];
  const genDate = brief?.generatedAt ? new Date(brief.generatedAt).toLocaleString('en-US', { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : null;

  const gridStyle: React.CSSProperties = isMobile
    ? { display:'flex', flexDirection:'column', gap:1, background:'#222', border:'1px solid #222', borderRadius:6, overflow:'hidden' }
    : { display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gridTemplateRows:'auto auto', gap:1, background:'#222', border:'1px solid #222', borderRadius:6, overflow:'hidden' };

  const cardBase: React.CSSProperties = { background:'#0F0F0F', display:'flex', flexDirection:'column' };

  function srcNames(threads: BriefThread[], n = 3) {
    return [...new Set((threads ?? []).slice(0, n).map(t => `r/${t.subreddit}`))].join(' · ');
  }

  if (isFreeTier((session as any)?.user)) {
    return (
      <div style={{ minHeight:'100vh', background:'#0C0C0C', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'40px 24px' }}>
        <div style={{ width:48, height:48, borderRadius:'50%', background:'rgba(74,143,255,0.1)', border:'0.5px solid rgba(74,143,255,0.25)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:22, marginBottom:20 }}>📬</div>
        <div style={{ fontSize:18, fontWeight:600, color:'#F5F0E8', marginBottom:8, letterSpacing:'-0.02em' }}>Your Brief is in your inbox</div>
        <div style={{ fontSize:13, color:'#666', lineHeight:1.6, maxWidth:340, marginBottom:28 }}>
          On the free plan, your Daily Subreddit News is delivered by email each morning. Upgrade to read it here too.
        </div>
        <Link href="/upgrade" style={{ display:'inline-block', padding:'10px 24px', background:'#4A8FFF', color:'#fff', borderRadius:8, fontSize:13, fontWeight:600, textDecoration:'none' }}>
          Upgrade →
        </Link>
      </div>
    );
  }

  return (
    <div style={{ minHeight:'100vh', background:'#0C0C0C', fontFamily:'-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif', overflowX:'hidden' }}>
      <div style={{ maxWidth:960, margin:'0 auto', padding:'0 16px 48px' }}>
        <div style={{ display:'flex', alignItems:'flex-end', justifyContent:'space-between', padding:'22px 0 12px', borderBottom:'2px solid #FF6B35', marginBottom:16, gap:12, ...fadeUp(v('hdr')) }}>
          <div>
            <div style={{ fontSize:9, fontWeight:700, letterSpacing:'0.15em', color:'#FF6B35', marginBottom:4 }}>TREDDIT INTELLIGENCE</div>
            <div style={{ fontSize:22, fontWeight:900, color:'#F5F0E8', letterSpacing:'-0.04em', fontFamily:'Georgia, "Times New Roman", serif' }}>Daily Brief</div>
            <div style={{ fontSize:11, color:'#555', marginTop:3 }}>
              {new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric' })}
              {brief && brief.narrativeCount > 0 && ` · ${brief.narrativeCount} signals`}
              {brief && brief.threadCount > 0 && ` · ${brief.threadCount} posts`}
            </div>
          </div>
          <button onClick={generateBrief} disabled={generating} style={{ fontSize:12, fontWeight:600, padding:'7px 16px', borderRadius:4, background:'transparent', color: generating ? '#444' : '#666', border:`1px solid ${generating ? '#222' : '#333'}`, cursor: generating ? 'not-allowed' : 'pointer', flexShrink:0 }}>
            &#8635; {generating ? 'Generating…' : 'Generate'}
          </button>
        </div>
        {isGuest && (
          <div style={{ padding:'32px 0', textAlign:'center' }}>
            <p style={{ fontSize:14, color:'var(--t3)', marginBottom:20, lineHeight:1.7 }}>Your morning intelligence brief is personalised to your product.<br/>Sign in to set up your profile and start receiving it.</p>
            <a href="/auth/signin?callbackUrl=/brief" style={{ display:'inline-block', padding:'10px 22px', background:'linear-gradient(160deg,#3d80f0 0%,#2460d0 100%)', color:'rgba(255,255,255,0.95)', textDecoration:'none', borderRadius:7, fontSize:13, fontWeight:500 }}>Sign in to see your Brief →</a>
          </div>
        )}
        {!isGuest && error && <div style={{ padding:'10px 14px', borderRadius:5, background:'#2B0D0D', border:'1px solid #4A1A1A', color:'#F87171', fontSize:13, marginBottom:14 }}>{error}</div>}
        {loading && <div style={{ textAlign:'center', padding:'80px 0', color:'#444', fontSize:14 }}>Loading brief…</div>}
        {!loading && !brief && !error && (
          <div style={{ textAlign:'center', padding:'80px 0' }}>
            <div style={{ fontSize:38, marginBottom:12 }}>&#128240;</div>
            <div style={{ fontSize:17, fontWeight:700, color:'#F0EBE0', marginBottom:8 }}>No brief yet</div>
            <div style={{ fontSize:14, color:'#555', marginBottom:24, lineHeight:1.6 }}>Generate today&apos;s brief from your subreddits.</div>
            <button onClick={generateBrief} disabled={generating} style={{ fontSize:14, fontWeight:600, padding:'10px 26px', borderRadius:5, background:'#FF6B35', color:'#0C0C0C', border:'none', cursor:'pointer' }}>
              {generating ? 'Generating…' : '&#8635; Generate Brief'}
            </button>
          </div>
        )}
        {!loading && brief && (
          <>
            <PulseRow items={pulse} on={v('pulse')} />
            <div style={gridStyle}>
              <div style={isMobile ? { borderBottom:'1px solid #1E1E1E' } : { gridColumn:'1 / 3', gridRow:'1 / 2', borderRight:'1px solid #1E1E1E' }}>
                {brief.hero && (
                  <div style={{ ...cardBase, padding:'22px 22px 18px', height:'100%', boxSizing:'border-box', ...fadeUp(v('c0')) }}>
                    <BeatTag type={brief.hero.type} />
                    <div style={{ fontSize:10, color:'#444', marginTop:8, marginBottom:10 }}>{srcNames(brief.hero.threads, 3)}</div>
                    <div style={{ fontSize:20, fontWeight:700, color:'#F0EBE0', lineHeight:1.28, fontFamily:'Georgia, "Times New Roman", serif', letterSpacing:'-0.01em', marginBottom:12, ...fadeUp(v('c0-hl')) }}>
                      {brief.hero.headline}
                    </div>
                    <div style={{ fontSize:13, color:'#7A7268', lineHeight:1.7, marginBottom:4, ...fadeIn(v('c0-body')) }}>
                      {brief.hero.synthesis?.split('\n\n')[0] ?? ''}
                    </div>
                    <WhyBox text={brief.hero.implication ?? ''} accentColor={getBeat(brief.hero.type).border} on={v('c0-why')} />
                    <SourceChips threads={brief.hero.threads ?? []} vis={[v('c0-ch0'), v('c0-ch1'), v('c0-ch2')]} />
                  </div>
                )}
              </div>
              {signals[0] && (
                <div style={isMobile ? { borderBottom:'1px solid #1E1E1E' } : { gridColumn:'3 / 4', gridRow:'1 / 2' }}>
                  <div style={{ ...cardBase, padding:'16px 18px 14px', height:'100%', boxSizing:'border-box', ...fadeUp(v('c1')) }}>
                    <BeatTag type={signals[0].type} />
                    <div style={{ fontSize:10, color:'#444', marginTop:7, marginBottom:8 }}>{srcNames(signals[0].threads, 2)}</div>
                    <div style={{ fontSize:14, fontWeight:700, color:'#C8C0AD', lineHeight:1.35, fontFamily:'Georgia, "Times New Roman", serif', marginBottom:7, ...fadeUp(v('c1-hl')) }}>
                      {signals[0].headline}
                    </div>
                    <WhyBox text={signals[0].implication ?? ''} accentColor={getBeat(signals[0].type).border} on={v('c1-why')} />
                    <SourceChips threads={signals[0].threads ?? []} vis={[v('c1-ch0'), v('c1-ch1'), v('c1-ch2')]} />
                  </div>
                </div>
              )}
              {signals[1] && (
                <div style={isMobile ? { borderBottom:'1px solid #1E1E1E' } : { gridColumn:'1 / 2', gridRow:'2 / 3', borderRight:'1px solid #1E1E1E', borderTop:'1px solid #1E1E1E' }}>
                  <div style={{ ...cardBase, padding:'14px 16px 12px', height:'100%', boxSizing:'border-box', ...fadeUp(v('c2')) }}>
                    <BeatTag type={signals[1].type} />
                    <div style={{ fontSize:10, color:'#444', marginTop:7, marginBottom:8 }}>{srcNames(signals[1].threads, 2)}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#C8C0AD', lineHeight:1.35, fontFamily:'Georgia, serif', marginBottom:7, ...fadeUp(v('c2-hl')) }}>
                      {signals[1].headline}
                    </div>
                    <WhyBox text={signals[1].implication ?? ''} accentColor={getBeat(signals[1].type).border} on={v('c2-why')} />
                    <SourceChips threads={signals[1].threads ?? []} vis={[v('c2-ch0'), v('c2-ch1'), v('c2-ch2')]} />
                  </div>
                </div>
              )}
              {signals[2] && (
                <div style={isMobile ? { borderBottom:'1px solid #1E1E1E' } : { gridColumn:'2 / 3', gridRow:'2 / 3', borderRight:'1px solid #1E1E1E', borderTop:'1px solid #1E1E1E' }}>
                  <div style={{ ...cardBase, padding:'14px 16px 12px', height:'100%', boxSizing:'border-box', ...fadeUp(v('c3')) }}>
                    <BeatTag type={signals[2].type} />
                    <div style={{ fontSize:10, color:'#444', marginTop:7, marginBottom:8 }}>{srcNames(signals[2].threads, 2)}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#C8C0AD', lineHeight:1.35, fontFamily:'Georgia, serif', marginBottom:7, ...fadeUp(v('c3-hl')) }}>
                      {signals[2].headline}
                    </div>
                    <WhyBox text={signals[2].implication ?? ''} accentColor={getBeat(signals[2].type).border} on={v('c3-why')} />
                    <SourceChips threads={signals[2].threads ?? []} vis={[v('c3-ch0'), v('c3-ch1'), v('c3-ch2')]} />
                  </div>
                </div>
              )}
              {signals[3] && (
                <div style={isMobile ? {} : { gridColumn:'3 / 4', gridRow:'2 / 3', borderTop:'1px solid #1E1E1E' }}>
                  <div style={{ ...cardBase, padding:'14px 16px 12px', height:'100%', boxSizing:'border-box', ...fadeUp(v('c4')) }}>
                    <BeatTag type={signals[3].type} />
                    <div style={{ fontSize:10, color:'#444', marginTop:7, marginBottom:8 }}>{srcNames(signals[3].threads, 2)}</div>
                    <div style={{ fontSize:13, fontWeight:700, color:'#C8C0AD', lineHeight:1.35, fontFamily:'Georgia, serif', marginBottom:7, ...fadeUp(v('c4-hl')) }}>
                      {signals[3].headline}
                    </div>
                    <WhyBox text={signals[3].implication ?? ''} accentColor={getBeat(signals[3].type).border} on={v('c4-why')} />
                    <SourceChips threads={signals[3].threads ?? []} vis={[v('c4-ch0'), v('c4-ch1'), v('c4-ch2')]} />
                  </div>
                </div>
              )}
            </div>
            {signals.length > 4 && (
              <div style={{ marginTop:1 }}>
                {signals.slice(4).map(s => (
                  <div key={s.id} style={{ borderTop:'1px solid #1E1E1E', background:'#0F0F0F', padding:'14px 18px 12px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                      <BeatTag type={s.type} />
                      <span style={{ fontSize:13, fontWeight:600, color:'#B0A898', fontFamily:'Georgia, serif' }}>{s.headline}</span>
                    </div>
                    <div style={{ fontSize:11, color:'#555', lineHeight:1.5 }}>{s.implication}</div>
                  </div>
                ))}
              </div>
            )}
            {genDate && (
              <div style={{ marginTop:20, paddingTop:12, borderTop:'1px solid #1A1A1A', fontSize:10, color:'#333', textAlign:'center' }}>
                Generated {genDate} · Powered by Reddit + Claude
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
