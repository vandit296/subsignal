'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SubredditMatch, FinderResult, CompanyProfile, GoCrazyMatch, GoCrazyResult } from '@/types';

const UI = 'var(--font-ui)';

const LOADING_MESSAGES = [
  'Initialising intelligence sweep...',
  'Mapping community landscape...',
  'Profiling audience demographics...',
  'Detecting narrative opportunities...',
  'Analysing posting patterns...',
  'Scoring audience fit signals...',
  'Identifying asymmetric targets...',
  'Calculating asymmetry scores...',
  'Cross-referencing community overlap...',
  'Intelligence sweep complete',
];

const RADAR_SUBS = [
  { name: 'r/SaaS',              r: 0.38, a: 0.4,  gc: false },
  { name: 'r/startups',          r: 0.62, a: 1.1,  gc: false },
  { name: 'r/indieHackers',      r: 0.50, a: 2.0,  gc: false },
  { name: 'r/entrepreneur',      r: 0.78, a: 3.0,  gc: false },
  { name: 'r/msp',               r: 0.45, a: 4.2,  gc: true  },
  { name: 'r/cscareerquestions', r: 0.68, a: 5.0,  gc: true  },
  { name: 'r/ADHD',              r: 0.30, a: 5.8,  gc: true  },
  { name: 'r/freelance',         r: 0.72, a: 0.9,  gc: true  },
  { name: 'r/marketing',         r: 0.55, a: 2.8,  gc: false },
  { name: 'r/devops',            r: 0.42, a: 3.7,  gc: true  },
  { name: 'r/ProductManagement', r: 0.58, a: 1.6,  gc: false },
  { name: 'r/smallbusiness',     r: 0.82, a: 4.8,  gc: false },
];

// ── RadarLoader ───────────────────────────────────────────────────────────────

function RadarLoader({ message }: { message: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [blipStates, setBlipStates] = useState<boolean[]>(RADAR_SUBS.map(() => false));
  const angleRef   = useRef(0);
  const blipData   = useRef(RADAR_SUBS.map(() => ({ visible: false, lastLit: -9999 })));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf: number;

    function resize() {
      if (!canvas) return;
      const s = canvas.parentElement?.offsetWidth || 400;
      canvas.width = s; canvas.height = s;
    }
    resize();
    window.addEventListener('resize', resize);

    function tick() {
      if (!canvas || !ctx) return;
      const w = canvas.width, h = canvas.height;
      const cx = w/2, cy = h/2, R = Math.min(w,h)/2 - 4;
      ctx.clearRect(0,0,w,h);
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2); ctx.fillStyle='#090910'; ctx.fill();
      [0.25,0.5,0.75,1.0].forEach(f => {
        ctx.beginPath(); ctx.arc(cx,cy,R*f,0,Math.PI*2);
        ctx.strokeStyle='rgba(52,211,153,0.09)'; ctx.lineWidth=0.8; ctx.stroke();
      });
      ctx.strokeStyle='rgba(52,211,153,0.06)'; ctx.lineWidth=0.5;
      ctx.beginPath(); ctx.moveTo(cx-R,cy); ctx.lineTo(cx+R,cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx,cy-R); ctx.lineTo(cx,cy+R); ctx.stroke();
      const d=R*0.707; ctx.strokeStyle='rgba(52,211,153,0.03)';
      ctx.beginPath(); ctx.moveTo(cx-d,cy-d); ctx.lineTo(cx+d,cy+d); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx+d,cy-d); ctx.lineTo(cx-d,cy+d); ctx.stroke();
      const tl=Math.PI*0.6, ang=angleRef.current;
      for(let t=0;t<50;t++){
        const ta=ang-(t/50)*tl, alpha=(1-t/50)*0.20;
        ctx.beginPath(); ctx.moveTo(cx,cy); ctx.arc(cx,cy,R,ta-tl/50,ta); ctx.closePath();
        ctx.fillStyle=`rgba(52,211,153,${alpha.toFixed(3)})`; ctx.fill();
      }
      ctx.beginPath(); ctx.moveTo(cx,cy);
      ctx.lineTo(cx+Math.cos(ang)*R, cy+Math.sin(ang)*R);
      ctx.strokeStyle='rgba(52,211,153,0.9)'; ctx.lineWidth=1.5; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,R,0,Math.PI*2);
      ctx.strokeStyle='rgba(52,211,153,0.20)'; ctx.lineWidth=1.2; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx,cy,3,0,Math.PI*2); ctx.fillStyle='rgba(52,211,153,1)'; ctx.fill();
      ctx.beginPath(); ctx.arc(cx,cy,7,0,Math.PI*2); ctx.fillStyle='rgba(52,211,153,0.10)'; ctx.fill();
      angleRef.current += 0.010;
      const now=Date.now(); let changed=false;
      const ns=[...blipData.current.map(b=>b.visible)];
      RADAR_SUBS.forEach((s,i)=>{
        const bn=((s.a%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
        const sn=((ang%(Math.PI*2))+Math.PI*2)%(Math.PI*2);
        let diff=sn-bn; if(diff<0) diff+=Math.PI*2;
        if(diff>=0&&diff<0.22&&!blipData.current[i].visible){
          blipData.current[i].visible=true; blipData.current[i].lastLit=now; ns[i]=true; changed=true;
        }
        if(blipData.current[i].visible&&now-blipData.current[i].lastLit>5500){
          blipData.current[i].visible=false; ns[i]=false; changed=true;
        }
      });
      if(changed) setBlipStates([...ns]);
      raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize',resize); };
  }, []);

  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:'82vh', gap:32, fontFamily:UI }}>
      <div style={{ position:'relative', width:'min(62vw,62vh)', height:'min(62vw,62vh)', flexShrink:0 }}>
        <canvas ref={canvasRef} style={{ position:'absolute', inset:0, width:'100%', height:'100%', borderRadius:'50%' }} />
        <div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
          {RADAR_SUBS.map((s,i) => {
            const px=50+Math.cos(s.a)*s.r*46, py=50+Math.sin(s.a)*s.r*46;
            return (
              <div key={s.name} style={{ position:'absolute', left:`${px}%`, top:`${py}%`, transform:'translate(-50%,-50%)', display:'flex', flexDirection:'column', alignItems:'center', gap:4, opacity:blipStates[i]?1:0, transition:'opacity 0.4s ease' }}>
                <div style={{ width:7, height:7, borderRadius:'50%', background:s.gc?'#A78BFA':'#34D399', boxShadow:`0 0 8px 2px ${s.gc?'rgba(167,139,250,0.6)':'rgba(52,211,153,0.6)'}` }} />
                <div style={{ fontSize:10, fontWeight:600, color:s.gc?'rgba(167,139,250,0.9)':'rgba(52,211,153,0.9)', background:'rgba(0,0,0,0.65)', border:`0.5px solid ${s.gc?'rgba(167,139,250,0.25)':'rgba(52,211,153,0.25)'}`, borderRadius:4, padding:'2px 6px', whiteSpace:'nowrap', letterSpacing:'0.02em' }}>
                  {s.name}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ textAlign:'center' }}>
        <div style={{ fontSize:13, fontWeight:600, color:'var(--t2)', letterSpacing:'0.06em', textTransform:'uppercase', marginBottom:10 }}>Scanning Communities</div>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8 }}>
          <div style={{ width:6, height:6, borderRadius:'50%', background:'#34D399', animation:'rpulse 1.2s ease-in-out infinite' }} />
          <span style={{ fontSize:12, color:'var(--t4)', letterSpacing:'0.04em' }}>{message}</span>
        </div>
      </div>
      <style>{`@keyframes rpulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:0.4;transform:scale(0.6)}}`}</style>
    </div>
  );
}

// ── Signal pill ───────────────────────────────────────────────────────────────

const SIG_STYLES: Record<string, { bg: string; border: string; color: string }> = {
  sp: { bg:'rgba(167,139,250,0.08)', border:'rgba(167,139,250,0.18)', color:'rgba(167,139,250,0.85)' },
  si: { bg:'rgba(129,140,248,0.08)', border:'rgba(129,140,248,0.18)', color:'rgba(129,140,248,0.85)' },
  sg: { bg:'rgba(52,211,153,0.07)',  border:'rgba(52,211,153,0.17)',  color:'rgba(52,211,153,0.85)'  },
  sa: { bg:'rgba(251,191,36,0.07)',  border:'rgba(251,191,36,0.17)',  color:'rgba(251,191,36,0.85)'  },
  sb: { bg:'rgba(74,143,255,0.07)',  border:'rgba(74,143,255,0.17)',  color:'rgba(74,143,255,0.85)'  },
};

function Sig({ l, c }: { l: string; c: string }) {
  const s = SIG_STYLES[c] || SIG_STYLES.sb;
  return <span style={{ fontSize:11, fontWeight:500, padding:'3px 8px', borderRadius:4, border:`0.5px solid ${s.border}`, background:s.bg, color:s.color }}>{l}</span>;
}

// ── ScoreBadge ────────────────────────────────────────────────────────────────

function ScoreBadge({ score, variant = 'standard' }: { score: number; variant?: 'standard' | 'gocrazy' }) {
  if (variant === 'gocrazy') {
    return (
      <div style={{ flexShrink:0, textAlign:'center', padding:'6px 11px', borderRadius:8, border:'0.5px solid rgba(167,139,250,0.25)', background:'rgba(167,139,250,0.07)' }}>
        <span style={{ fontSize:10, fontWeight:700, letterSpacing:'0.07em', textTransform:'uppercase', color:'rgba(167,139,250,0.55)', display:'block', marginBottom:1 }}>Asymmetry</span>
        <span style={{ fontSize:18, fontWeight:700, color:'#A78BFA', display:'block', lineHeight:1.1 }}>{score.toFixed(1)}</span>
        <span style={{ fontSize:10, color:'var(--t4)' }}>/ 10</span>
      </div>
    );
  }
  const { color, bg, border } = score >= 8.5
    ? { color:'#34D399', bg:'rgba(52,211,153,0.08)', border:'rgba(52,211,153,0.20)' }
    : score >= 7
    ? { color:'var(--blue)', bg:'rgba(74,143,255,0.08)', border:'rgba(74,143,255,0.20)' }
    : { color:'#FBBF24', bg:'rgba(251,191,36,0.08)', border:'rgba(251,191,36,0.20)' };
  return (
    <div style={{ flexShrink:0, textAlign:'center', padding:'6px 11px', borderRadius:8, border:`0.5px solid ${border}`, background:bg }}>
      <span style={{ fontSize:18, fontWeight:700, color, display:'block', lineHeight:1.1 }}>{score.toFixed(1)}</span>
      <span style={{ fontSize:10, color:'var(--t4)' }}>/ 10</span>
    </div>
  );
}

// ── Bar ───────────────────────────────────────────────────────────────────────

function Bar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:3 }}>
        <span style={{ fontSize:11, color:'var(--t3)' }}>{label}</span>
        <span style={{ fontSize:11, fontWeight:500, color:'var(--t2)' }}>{value}</span>
      </div>
      <div style={{ height:2, background:'var(--overlay)', borderRadius:99, overflow:'hidden' }}>
        <div style={{ height:'100%', width:`${value*10}%`, background:color, borderRadius:99 }} />
      </div>
    </div>
  );
}

// ── Shared card shell helpers ─────────────────────────────────────────────────

const CARD_SHELL = {
  base: { background:'var(--surface)', borderRadius:12, overflow:'hidden' as const, transition:'border-color 0.15s' },
  std:  { border:'0.5px solid var(--border)' },
  gc:   (top: boolean) => ({ border:`0.5px solid ${top?'rgba(167,139,250,0.22)':'rgba(167,139,250,0.10)'}`, backgroundImage: top ? 'linear-gradient(180deg,rgba(129,140,248,0.04) 0%,transparent 100px)' : 'none' }),
};

// ── MatchCard (Standard) ──────────────────────────────────────────────────────

function MatchCard({ match, rank }: { match: SubredditMatch; rank: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const fmt = (n?: number) => !n ? '' : n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n/1_000)}k` : String(n);

  return (
    <div style={{ ...CARD_SHELL.base, ...CARD_SHELL.std }}
      onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(240,236,228,0.12)')}
      onMouseLeave={e=>(e.currentTarget.style.borderColor='var(--border)')}>

      {/* Header */}
      <div style={{ padding:'18px 20px 14px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <span style={{ fontSize:11, color:'var(--t4)', fontFamily:"'SF Mono','Fira Code',monospace", minWidth:18 }}>#{rank}</span>
            <button onClick={()=>router.push(`/dashboard/${match.subreddit}`)}
              style={{ fontSize:15, fontWeight:600, color:'var(--t1)', letterSpacing:'-0.01em', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:UI, transition:'color 0.12s' }}
              onMouseEnter={e=>(e.currentTarget.style.color='var(--blue)')}
              onMouseLeave={e=>(e.currentTarget.style.color='var(--t1)')}>
              r/{match.subreddit}
            </button>
          </div>
          {match.subscribers ? <div style={{ fontSize:11, color:'var(--t4)', paddingLeft:26 }}>{fmt(match.subscribers)} members</div> : null}
        </div>
        <ScoreBadge score={match.overallScore} />
      </div>

      {/* Body */}
      <div style={{ padding:'0 20px 16px' }}>
        {/* Assessment */}
        <div style={{ background:'var(--overlay)', borderRadius:7, padding:'9px 12px', marginBottom:14, display:'flex', gap:8 }}>
          <span style={{ color:'var(--blue)', fontSize:11, flexShrink:0, marginTop:2 }}>→</span>
          <p style={{ fontSize:12.5, color:'var(--t1)', lineHeight:1.5, fontWeight:500, margin:0 }}>{match.assessment}</p>
        </div>

        {/* Bars */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'7px 24px' }}>
          <Bar label="Audience Fit"     value={match.audienceFit}     color="#34D399" />
          <Bar label="Engagement"       value={match.engagement}      color="var(--blue)" />
          <Bar label="Low Competition"  value={match.competition}     color="#A78BFA" />
          <Bar label="Founder Friendly" value={match.founderFriendly} color="#FBBF24" />
        </div>

        {/* Expand: why */}
        {match.why && (
          <>
            <button onClick={()=>setOpen(v=>!v)}
              style={{ marginTop:12, background:'none', border:'none', cursor:'pointer', color:'var(--t4)', fontSize:11.5, padding:0, fontFamily:UI, transition:'color 0.12s' }}
              onMouseEnter={e=>(e.currentTarget.style.color='var(--t2)')}
              onMouseLeave={e=>(e.currentTarget.style.color='var(--t4)')}>
              {open ? '▲ Hide reasoning' : '▼ Why this community?'}
            </button>
            {open && <p style={{ fontSize:12, color:'var(--t3)', lineHeight:1.6, marginTop:8 }}>{match.why}</p>}
          </>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop:'0.5px solid var(--border)', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, color:'var(--t4)' }}>Full intelligence report</span>
        <button onClick={()=>router.push(`/dashboard/${match.subreddit}`)}
          style={{ fontSize:11.5, fontWeight:500, color:'var(--hot)', background:'none', border:'none', cursor:'pointer', fontFamily:UI, padding:0 }}
          onMouseEnter={e=>(e.currentTarget.style.opacity='0.7')}
          onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
          Analyze →
        </button>
      </div>
    </div>
  );
}

// ── GoCrazyCard ───────────────────────────────────────────────────────────────

function GoCrazyCard({ match, rank }: { match: GoCrazyMatch; rank: number }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const fmt = (n?: number) => !n ? '' : n >= 1_000_000 ? `${(n/1_000_000).toFixed(1)}M` : n >= 1_000 ? `${Math.round(n/1_000)}k` : String(n);
  const RISK_C: Record<string,string> = { 'rd-r':'#F87171', 'rd-a':'#FBBF24', 'rd-p':'#A78BFA' };

  return (
    <div style={{ ...CARD_SHELL.base, ...CARD_SHELL.gc(match.top) }}
      onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(167,139,250,0.28)')}
      onMouseLeave={e=>(e.currentTarget.style.borderColor=match.top?'rgba(167,139,250,0.22)':'rgba(167,139,250,0.10)')}>

      {/* Header */}
      <div style={{ padding:'18px 20px 14px', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
            <span style={{ fontSize:11, color:'var(--t4)', fontFamily:"'SF Mono','Fira Code',monospace", minWidth:18 }}>#{rank}</span>
            <button onClick={()=>router.push(`/dashboard/${match.subreddit}`)}
              style={{ fontSize:15, fontWeight:600, color:'var(--t1)', letterSpacing:'-0.01em', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:UI, transition:'color 0.12s' }}
              onMouseEnter={e=>(e.currentTarget.style.color='#A78BFA')}
              onMouseLeave={e=>(e.currentTarget.style.color='var(--t1)')}>
              r/{match.subreddit}
            </button>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:8, paddingLeft:26 }}>
            {match.subscribers ? <span style={{ fontSize:11, color:'var(--t4)' }}>{fmt(match.subscribers)} members</span> : null}
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:4, background:'rgba(167,139,250,0.10)', border:'0.5px solid rgba(167,139,250,0.22)', color:'rgba(167,139,250,0.85)' }}>{match.archetype}</span>
          </div>
        </div>
        <ScoreBadge score={match.asymScore} variant="gocrazy" />
      </div>

      {/* Body — visible content only */}
      <div style={{ padding:'0 20px 16px' }}>
        {/* Insight — the one key sentence */}
        <div style={{ padding:'10px 13px', background:'rgba(167,139,250,0.04)', borderLeft:'2px solid #A78BFA', borderRadius:'0 7px 7px 0', marginBottom:12 }}>
          <p style={{ fontSize:12.5, color:'var(--t1)', lineHeight:1.55, margin:0, fontWeight:500 }}>{match.insight}</p>
        </div>

        {/* Signal pills */}
        {match.signals?.length > 0 && (
          <div style={{ display:'flex', flexWrap:'wrap', gap:5, marginBottom:12 }}>
            {match.signals.map((s,i) => <Sig key={i} l={s.l} c={s.c} />)}
          </div>
        )}

        {/* First move */}
        <div style={{ padding:'9px 12px', background:'var(--overlay)', borderRadius:7, display:'flex', gap:8 }}>
          <span style={{ color:'#A78BFA', fontSize:11, flexShrink:0, marginTop:2 }}>→</span>
          <div style={{ fontSize:12, color:'var(--t2)', lineHeight:1.5 }}>{match.firstMove}</div>
        </div>

        {/* Expand: psych + narrative + opp boxes + risks */}
        <button onClick={()=>setOpen(v=>!v)}
          style={{ marginTop:12, background:'none', border:'none', cursor:'pointer', color:'var(--t4)', fontSize:11.5, padding:0, fontFamily:UI, transition:'color 0.12s' }}
          onMouseEnter={e=>(e.currentTarget.style.color='var(--t2)')}
          onMouseLeave={e=>(e.currentTarget.style.color='var(--t4)')}>
          {open ? '▲ Collapse' : '▼ Full analysis'}
        </button>

        {open && (
          <div style={{ marginTop:12, display:'flex', flexDirection:'column', gap:12 }}>
            {match.communityPsych && (
              <div>
                <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--t4)', marginBottom:5 }}>Community psychology</div>
                <div style={{ fontSize:12, color:'var(--t3)', lineHeight:1.55, fontStyle:'italic' }}>{match.communityPsych}</div>
              </div>
            )}
            {match.narrative && (
              <div>
                <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--t4)', marginBottom:5 }}>Winning narrative</div>
                <div style={{ fontSize:12, color:'var(--t3)', lineHeight:1.55, fontStyle:'italic' }}>{match.narrative}</div>
              </div>
            )}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
              {match.strategic && (
                <div style={{ padding:'9px 11px', background:'var(--overlay)', border:'0.5px solid var(--border)', borderRadius:7 }}>
                  <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--t4)', marginBottom:4 }}>Strategic play</div>
                  <div style={{ fontSize:11.5, color:'var(--t2)', lineHeight:1.45 }}>{match.strategic}</div>
                </div>
              )}
              {match.oppType && (
                <div style={{ padding:'9px 11px', background:'var(--overlay)', border:'0.5px solid var(--border)', borderRadius:7 }}>
                  <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--t4)', marginBottom:4 }}>Opportunity type</div>
                  <div style={{ fontSize:11.5, color:'rgba(167,139,250,0.85)', fontWeight:500, marginBottom:2 }}>{match.oppType}</div>
                  {match.oppType2 && <div style={{ fontSize:11, color:'var(--t4)' }}>{match.oppType2}</div>}
                </div>
              )}
            </div>
            {match.risks?.length > 0 && (
              <div>
                <div style={{ fontSize:9.5, fontWeight:700, letterSpacing:'0.09em', textTransform:'uppercase', color:'var(--t4)', marginBottom:6 }}>Risks</div>
                <div style={{ display:'flex', flexDirection:'column', gap:4 }}>
                  {match.risks.map((r,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'flex-start', gap:7, fontSize:11.5, color:'var(--t3)', lineHeight:1.4 }}>
                      <div style={{ width:4, height:4, borderRadius:'50%', background:RISK_C[r.c]||'#F87171', flexShrink:0, marginTop:5 }} />
                      <span>{r.l}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{ borderTop:'0.5px solid var(--border)', padding:'10px 20px', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontSize:11, color:'var(--t4)' }}>Full intelligence report</span>
        <button onClick={()=>router.push(`/dashboard/${match.subreddit}`)}
          style={{ fontSize:11.5, fontWeight:500, color:'#A78BFA', background:'none', border:'none', cursor:'pointer', fontFamily:UI, padding:0 }}
          onMouseEnter={e=>(e.currentTarget.style.opacity='0.7')}
          onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
          Analyze →
        </button>
      </div>
    </div>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────

function EmptyState() {
  const router = useRouter();
  return (
    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', textAlign:'center', padding:'80px 32px', gap:18 }}>
      <div style={{ width:52, height:52, background:'var(--surface)', border:'0.5px solid var(--border)', borderRadius:14, display:'flex', alignItems:'center', justifyContent:'center', fontSize:22 }}>🧭</div>
      <div style={{ fontSize:17, fontWeight:600, color:'var(--t1)', letterSpacing:'-0.02em' }}>Set up your product profile first</div>
      <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.6, maxWidth:320 }}>
        To find the right communities for you, Treddit needs to understand your product, target user, and ICP. Set these up in Command — takes about 2 minutes.
      </p>
      <button onClick={()=>router.push('/command')}
        style={{ background:'var(--blue)', color:'#fff', border:'none', borderRadius:8, padding:'10px 22px', fontSize:13, fontWeight:600, cursor:'pointer', fontFamily:UI }}>
        Set up in Command →
      </button>
    </div>
  );
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface StdResponse extends FinderResult {
  noProfile?: boolean; cached?: boolean; company?: CompanyProfile; generatedAt?: string; error?: string;
}
interface GCResponse extends GoCrazyResult {
  noProfile?: boolean; cached?: boolean; company?: CompanyProfile; generatedAt?: string; error?: string;
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function RadarPage() {
  const router = useRouter();
  type Mode   = 'standard' | 'gocrazy';
  type Status = 'loading' | 'no-profile' | 'done' | 'error';

  const [mode,      setMode]      = useState<Mode>('standard');
  const [status,    setStatus]    = useState<Status>('loading');
  const [loadingMsg,setLoadingMsg]= useState(LOADING_MESSAGES[0]);
  const [stdResult, setStdResult] = useState<StdResponse | null>(null);
  const [gcResult,  setGcResult]  = useState<GCResponse  | null>(null);
  const [error,     setError]     = useState<string | null>(null);
  const [urlSource, setUrlSource] = useState<string | null>(null);

  const RADAR_DURATION = 10000;

  const load = useCallback(async (m: Mode, refresh = false) => {
    setStatus('loading');
    setError(null);
    let i = 0; setLoadingMsg(LOADING_MESSAGES[0]);
    const interval = setInterval(() => { i=(i+1)%LOADING_MESSAGES.length; setLoadingMsg(LOADING_MESSAGES[i]); }, RADAR_DURATION/LOADING_MESSAGES.length);
    const minDelay = new Promise(res => setTimeout(res, RADAR_DURATION));
    const url = `/api/subreddits?mode=${m}${refresh?'&refresh=1':''}`;
    const apiFetch = fetch(url).then(async r => {
      const ct = r.headers.get('content-type') || '';
      if (!r.ok || !ct.includes('application/json')) {
        if (r.status === 401 || r.redirected) throw new Error('Session expired — please sign in again.');
        throw new Error(`Server error (${r.status})`);
      }
      return r.json();
    });
    try {
      const [data] = await Promise.all([apiFetch, minDelay]);
      clearInterval(interval);
      if (data.error) throw new Error(data.error);
      if (data.noProfile) { setStatus('no-profile'); return; }
      if (m === 'gocrazy') setGcResult(data as GCResponse);
      else setStdResult(data as StdResponse);
      setStatus('done');
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }, []);

  // Load on mount — use URL mode if ?url= param present, otherwise standard
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const rawUrl = params.get('url');
    if (rawUrl) {
      setUrlSource(rawUrl);
      // Remove param from browser URL without reload
      const clean = new URL(window.location.href);
      clean.searchParams.delete('url');
      window.history.replaceState({}, '', clean.toString());
      loadByUrl(rawUrl);
    } else {
      load('standard');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadByUrl(url: string) {
    setStatus('loading');
    setError(null);
    let i = 0; setLoadingMsg(LOADING_MESSAGES[0]);
    const interval = setInterval(() => { i=(i+1)%LOADING_MESSAGES.length; setLoadingMsg(LOADING_MESSAGES[i]); }, RADAR_DURATION/LOADING_MESSAGES.length);
    const minDelay = new Promise(res => setTimeout(res, RADAR_DURATION));
    const apiFetch = fetch(`/api/subreddits-by-url?url=${encodeURIComponent(url)}`).then(async r => {
      const ct = r.headers.get('content-type') || '';
      if (!r.ok || !ct.includes('application/json')) throw new Error(`Server error (${r.status})`);
      return r.json();
    });
    try {
      const [data] = await Promise.all([apiFetch, minDelay]);
      clearInterval(interval);
      if (data.error) throw new Error(data.error);
      setStdResult(data as StdResponse);
      setStatus('done');
    } catch (err: unknown) {
      clearInterval(interval);
      setError(err instanceof Error ? err.message : 'Something went wrong');
      setStatus('error');
    }
  }

  function switchMode(m: Mode) {
    setMode(m);
    const alreadyLoaded = m === 'standard' ? !!stdResult : !!gcResult;
    if (!alreadyLoaded) load(m);
  }

  const company = (stdResult?.company || gcResult?.company) as CompanyProfile | undefined;
  const isLoading = status === 'loading';

  return (
    <div style={{ minHeight:'100vh', background:'var(--void)', fontFamily:UI }}>
      {/* Header */}
      <div style={{ padding:'28px 32px 0', borderBottom:'0.5px solid var(--border)', paddingBottom:0 }}>
        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, marginBottom:0 }}>
          <div>
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:10, fontWeight:600, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(74,143,255,0.55)', marginBottom:10 }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--blue)', opacity:0.7 }} />
              Intelligence Brief
            </div>
            <h1 style={{ fontSize:24, fontWeight:700, letterSpacing:'-0.03em', color:'var(--t1)', lineHeight:1.1, marginBottom:5 }}>Radar</h1>
            <p style={{ fontSize:13, color:'var(--t3)', lineHeight:1.55, maxWidth:480, marginBottom:20 }}>
              {mode === 'gocrazy'
                ? 'Asymmetric growth opportunities hidden inside unexpected Reddit communities.'
                : 'Strategic community analysis matched to your product narrative, ICP, and growth goals.'}
            </p>
          </div>
        </div>

        {/* Mode tabs */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', position:'relative', top:1 }}>
            {/* Standard tab */}
            <button onClick={()=>switchMode('standard')}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', fontSize:13, fontWeight:500, cursor:'pointer', border:'none', background:'none', fontFamily:UI, color:mode==='standard'?'var(--blue)':'var(--t3)', borderBottom:mode==='standard'?'2px solid var(--blue)':'2px solid transparent', transition:'color 0.15s' }}>
              Standard Intelligence
            </button>
            {/* Go Crazy tab */}
            <button onClick={()=>switchMode('gocrazy')}
              style={{ display:'flex', alignItems:'center', gap:7, padding:'10px 18px', fontSize:13, fontWeight:500, cursor:'pointer', border:'none', background:'none', fontFamily:UI, color:mode==='gocrazy'?'#A78BFA':'var(--t3)', borderBottom:mode==='gocrazy'?'2px solid #A78BFA':'2px solid transparent', transition:'color 0.15s' }}>
              <span style={{ fontSize:12 }}>✦</span>
              Go Crazy
              <span style={{ fontSize:9, fontWeight:700, letterSpacing:'0.06em', padding:'2px 6px', borderRadius:3, background:'rgba(167,139,250,0.12)', border:'0.5px solid rgba(167,139,250,0.22)', color:'#A78BFA', textTransform:'uppercase' }}>new</span>
            </button>
          </div>
          {status === 'done' && (
            <button onClick={()=>load(mode, true)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 12px', fontSize:12, fontWeight:500, background:'var(--overlay)', border:'0.5px solid var(--border)', borderRadius:8, color:'var(--t3)', cursor:'pointer', fontFamily:UI, marginBottom:6 }}
              onMouseEnter={e=>{e.currentTarget.style.color='var(--t1)';}}
              onMouseLeave={e=>{e.currentTarget.style.color='var(--t3)';}}>
              ↻ Refresh
            </button>
          )}
        </div>
      </div>

      {/* Loading */}
      {isLoading && <RadarLoader message={loadingMsg} />}

      {status === 'no-profile' && <EmptyState />}

      {status === 'error' && (
        <div style={{ padding:'24px 32px' }}>
          <div style={{ background:'rgba(248,113,113,0.06)', border:'0.5px solid rgba(248,113,113,0.18)', borderRadius:10, padding:'20px 20px' }}>
            <p style={{ fontSize:13, color:'#F87171', margin:'0 0 14px' }}>{error}</p>
            {error?.includes('Session') ? (
              <a href="/auth/signin" style={{ display:'inline-block', padding:'9px 20px', background:'linear-gradient(160deg,#3d80f0 0%,#2460d0 100%)', color:'rgba(255,255,255,0.95)', textDecoration:'none', borderRadius:7, fontSize:13, fontWeight:500, fontFamily:UI }}>
                Sign in again →
              </a>
            ) : (
              <button onClick={() => load(mode)} style={{ padding:'9px 20px', background:'rgba(240,236,228,0.06)', border:'0.5px solid rgba(240,236,228,0.12)', color:'var(--t2)', borderRadius:7, fontSize:13, cursor:'pointer', fontFamily:UI }}>
                Retry
              </button>
            )}
          </div>
        </div>
      )}

      {status === 'done' && (
        <div>
          {/* Profile bar */}
          {company && (
            <div style={{ margin:'20px 32px 0', background:'var(--surface)', border:'0.5px solid rgba(74,143,255,0.18)', borderRadius:10, padding:'12px 16px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12 }}>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <div style={{ width:8, height:8, borderRadius:'50%', background:'#34D399', flexShrink:0 }} />
                <p style={{ fontSize:12.5, color:'var(--t2)', lineHeight:1.5, margin:0 }}>
                  <strong style={{ color:'var(--t1)', fontWeight:600 }}>{company.name}</strong>
                  {company.description ? ` — ${company.description.slice(0,80)}${company.description.length>80?'…':''}` : ''}
                  {company.goal ? <> · Goal: <strong style={{ color:'var(--t1)', fontWeight:600 }}>{company.goal}</strong></> : null}
                </p>
              </div>
              <button onClick={()=>router.push('/command')}
                style={{ fontSize:12, color:'var(--blue)', background:'none', border:'none', cursor:'pointer', whiteSpace:'nowrap', padding:0, flexShrink:0, fontFamily:UI }}>
                Edit in Command →
              </button>
            </div>
          )}

          {/* Go Crazy banner */}
          {mode === 'gocrazy' && (
            <div style={{ margin:'16px 32px 0', padding:'14px 18px', background:'linear-gradient(135deg,rgba(129,140,248,0.06) 0%,rgba(167,139,250,0.04) 100%)', border:'0.5px solid rgba(167,139,250,0.16)', borderRadius:10, display:'flex', alignItems:'flex-start', gap:12 }}>
              <span style={{ fontSize:18, flexShrink:0, marginTop:1 }}>✦</span>
              <div>
                <div style={{ fontSize:12, fontWeight:600, color:'#A78BFA', marginBottom:4, letterSpacing:'0.01em' }}>Go Crazy Mode</div>
                <div style={{ fontSize:12.5, color:'var(--t3)', lineHeight:1.55 }}>These are not where your users currently are. These are where your narrative could unexpectedly dominate — communities with hidden pain, emotional resonance, and zero competition from tools like yours.</div>
              </div>
            </div>
          )}

          {/* Target persona */}
          {(() => {
            const persona = mode === 'gocrazy' ? gcResult?.targetPersona : stdResult?.targetPersona;
            return persona ? (
              <div style={{ margin:'16px 32px 0', background:'rgba(13,13,31,0.8)', border:'0.5px solid rgba(99,102,241,0.15)', borderRadius:10, padding:'12px 16px' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:10, fontWeight:600, letterSpacing:'0.07em', color:'rgba(165,180,252,0.7)', textTransform:'uppercase', marginBottom:6 }}>
                  <span>✦</span> Target persona
                </div>
                <p style={{ fontSize:13, color:'var(--t1)', lineHeight:1.55, margin:0 }}>{persona}</p>
              </div>
            ) : null;
          })()}

          {/* Results */}
          <div style={{ padding:'20px 32px 60px' }}>
            {mode === 'standard' && stdResult && (() => {
              const cached = stdResult.cached && stdResult.generatedAt;
              return (
                <>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
                    <span style={{ fontSize:11.5, fontWeight:500, color:'var(--t4)', letterSpacing:'0.04em', textTransform:'uppercase' }}>
                      {stdResult.matches.length} communities — ranked by strategic fit
                    </span>
                    {cached && <span style={{ fontSize:11.5, color:'var(--t4)' }}>Cached · {new Date(stdResult.generatedAt!).toLocaleDateString()}</span>}
                  </div>
                  <div style={{ marginBottom:10, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(52,211,153,0.5)' }}>Primary targets</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:28 }}>
                    {stdResult.matches.slice(0,3).map((m,i) => <MatchCard key={m.subreddit} match={m} rank={i+1} />)}
                  </div>
                  {stdResult.matches.length > 3 && (
                    <>
                      <div style={{ marginBottom:10, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--t4)' }}>Secondary targets</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        {stdResult.matches.slice(3).map((m,i) => <MatchCard key={m.subreddit} match={m} rank={i+4} />)}
                      </div>
                    </>
                  )}
                </>
              );
            })()}

            {mode === 'gocrazy' && gcResult && (() => {
              const top  = gcResult.matches.filter(m => m.top);
              const rest = gcResult.matches.filter(m => !m.top);
              return (
                <>
                  <div style={{ marginBottom:10, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'rgba(167,139,250,0.55)' }}>High asymmetry targets</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:12, marginBottom:28 }}>
                    {top.map((m,i) => <GoCrazyCard key={m.subreddit} match={m} rank={i+1} />)}
                  </div>
                  {rest.length > 0 && (
                    <>
                      <div style={{ marginBottom:10, fontSize:10, fontWeight:700, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--t4)' }}>Worth exploring</div>
                      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                        {rest.map((m,i) => <GoCrazyCard key={m.subreddit} match={m} rank={top.length+i+1} />)}
                      </div>
                    </>
                  )}
                </>
              );
            })()}
          </div>
        </div>
      )}
    </div>
  );
}
