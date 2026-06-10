'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { SubredditAnalysis } from '@/types';
import { Period } from '@/app/scout/[subreddit]/page';
import CommunityDNA from './CommunityDNA';
import PostFormats from './PostFormats';
import TimingHeatmap from './TimingHeatmap';
import AudienceIntel from './AudienceIntel';
import RiskFlags from './RiskFlags';
import OpportunityScore from './OpportunityScore';
import KeywordCloud from './KeywordCloud';
import PostPredictor from './PostPredictor';
import Opportunities from './Opportunities';

interface Props {
  analysis: SubredditAnalysis;
  period: Period;
  onPeriodChange: (p: Period) => void;
  onRefresh: () => void;
  onBack: () => void;
}

type Tab = 'intelligence' | 'predictor' | 'opportunities';

const PERIODS: { value: Period; label: string }[] = [
  { value: '1week',   label: 'Week' },
  { value: '1month',  label: 'Month' },
  { value: '3months', label: '3 Mo' },
  { value: '1year',   label: 'Year' },
  { value: 'alltime', label: 'All Time' },
];

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toString();
}

function StatCell({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 3 }}>
      <div style={{ fontSize: 11, color: 'var(--t4)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 400 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: color || 'var(--t1)', lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

// ── localStorage helpers for recent subreddits ─────────────────────────────
const RECENT_KEY = 'treddit_recent_subs';
const MAX_RECENT = 8;

function getRecentSubs(): string[] {
  if (typeof window === 'undefined') return [];
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); } catch { return []; }
}

function pushRecentSub(sub: string) {
  if (typeof window === 'undefined') return;
  const existing = getRecentSubs().filter(s => s !== sub);
  localStorage.setItem(RECENT_KEY, JSON.stringify([sub, ...existing].slice(0, MAX_RECENT)));
}

export default function Dashboard({ analysis, period, onPeriodChange, onRefresh, onBack }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('intelligence');

  // Edit subreddit
  const [editing, setEditing] = useState(false);
  const [editVal, setEditVal] = useState('');
  const editRef = useRef<HTMLInputElement>(null);

  // Recent subreddits dropdown
  const [recentOpen, setRecentOpen] = useState(false);
  const [recentSubs, setRecentSubs] = useState<string[]>([]);
  const recentRef = useRef<HTMLDivElement>(null);

  // Watchlist
  const [watched, setWatched] = useState(false);
  const [watchToast, setWatchToast] = useState('');

  const riskCount = analysis.riskFlags?.filter(f => f.level === 'banned' || f.level === 'risky').length ?? 0;
  const riskLabel = riskCount === 0 ? 'Low' : riskCount <= 2 ? 'Medium' : 'High';
  const riskColor = riskCount === 0 ? 'var(--green)' : riskCount <= 2 ? 'var(--orange)' : 'var(--danger)';

  // Track current sub + load recent on mount
  useEffect(() => {
    pushRecentSub(analysis.subreddit);
    setRecentSubs(getRecentSubs().filter(s => s !== analysis.subreddit));
  }, [analysis.subreddit]);

  // Focus input when editing starts
  useEffect(() => {
    if (editing) { editRef.current?.focus(); editRef.current?.select(); }
  }, [editing]);

  // Close recent dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (recentRef.current && !recentRef.current.contains(e.target as Node)) setRecentOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function startEdit() {
    setEditVal(analysis.subreddit);
    setEditing(true);
    setRecentOpen(false);
  }

  function commitEdit() {
    const sub = editVal.trim().replace(/^r\//, '');
    setEditing(false);
    if (sub && sub !== analysis.subreddit) router.push(`/scout/${sub}`);
  }

  async function toggleWatch() {
    const next = !watched;
    setWatched(next);
    setWatchToast(next ? `Added r/${analysis.subreddit} to watchlist` : `Removed r/${analysis.subreddit} from watchlist`);
    setTimeout(() => setWatchToast(''), 3000);
    try {
      await fetch('/api/watchlist', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subreddit: analysis.subreddit }),
      });
    } catch { /* silent */ }
  }

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', color: 'var(--t1)', fontFamily: 'var(--font-ui)' }}>

      {/* ── Watch toast ── */}
      {watchToast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          zIndex: 200, background: 'var(--panel)', border: '0.5px solid var(--border)',
          borderRadius: 8, padding: '10px 18px', fontSize: 13, color: 'var(--t1)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <span style={{ color: 'var(--blue)' }}>✓</span> {watchToast}
        </div>
      )}

      {/* ── Top bar ── */}
      <div style={{
        position: 'sticky', top: 0, zIndex: 10,
        padding: '0 24px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        height: 52,
        background: 'rgba(12,12,15,0.96)',
        borderBottom: '0.5px solid var(--border)',
        backdropFilter: 'blur(16px)',
      }}>
        {/* Left: back + breadcrumb + edit + recent */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
          <button onClick={onBack} style={{ color: 'var(--t3)', fontSize: 13, background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)', padding: '4px 0', flexShrink: 0 }}>
            ← Back
          </button>
          <span style={{ color: 'var(--border)', fontSize: 16, flexShrink: 0 }}>|</span>

          {/* Breadcrumb + edit inline */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--t3)', minWidth: 0 }}>
            <span style={{ flexShrink: 0 }}>Scout</span>
            <span style={{ color: 'var(--t4)', flexShrink: 0 }}>/</span>

            {editing ? (
              <input
                ref={editRef}
                value={editVal}
                onChange={e => setEditVal(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') commitEdit();
                  if (e.key === 'Escape') setEditing(false);
                }}
                onBlur={commitEdit}
                placeholder="subreddit name"
                style={{
                  background: 'var(--panel)', border: '0.5px solid var(--blue-border)',
                  borderRadius: 5, padding: '2px 8px', color: 'var(--t1)', fontSize: 13,
                  fontFamily: 'var(--font-ui)', outline: 'none', width: 160,
                }}
              />
            ) : (
              <button
                onClick={startEdit}
                title="Change subreddit"
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: 'none', border: 'none', cursor: 'pointer',
                  padding: '2px 4px', borderRadius: 5,
                  color: 'var(--t1)', fontWeight: 500, fontSize: 13,
                  fontFamily: 'var(--font-ui)',
                }}
              >
                r/{analysis.subreddit}
                {/* Pencil icon */}
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="var(--t4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
            )}
          </div>

          {/* Recent subreddits dropdown — always visible */}
          <div ref={recentRef} style={{ position: 'relative', flexShrink: 0 }}>
            <button
              onClick={() => setRecentOpen(o => !o)}
              title="Recently scouted subreddits"
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                background: recentOpen ? 'var(--panel)' : 'var(--overlay)',
                border: '0.5px solid var(--border)',
                borderRadius: 6, padding: '4px 9px',
                color: recentOpen ? 'var(--t1)' : 'var(--t3)',
                fontSize: 12, fontFamily: 'var(--font-ui)',
                cursor: 'pointer', transition: 'all 0.12s',
              }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              Recent
              <svg width="9" height="9" viewBox="0 0 10 6" fill="none" style={{ marginLeft: 1 }}>
                <path d={recentOpen ? 'M1 5l4-4 4 4' : 'M1 1l4 4 4-4'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>

            {recentOpen && (
              <div style={{
                position: 'absolute', top: 'calc(100% + 6px)', left: 0,
                background: 'var(--panel)', border: '0.5px solid var(--border)',
                borderRadius: 10, overflow: 'hidden', zIndex: 100, minWidth: 200,
                boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
              }}>
                <div style={{ padding: '8px 12px 5px', fontSize: 10, color: 'var(--t4)', letterSpacing: '0.08em', fontFamily: 'var(--font-mono)', textTransform: 'uppercase' }}>
                  Recently scouted
                </div>
                {recentSubs.length > 0 ? recentSubs.map(sub => (
                  <button
                    key={sub}
                    onClick={() => { setRecentOpen(false); router.push(`/scout/${sub}`); }}
                    style={{
                      width: '100%', display: 'flex', alignItems: 'center', gap: 8,
                      padding: '8px 12px', background: 'none', border: 'none',
                      cursor: 'pointer', textAlign: 'left',
                      color: 'var(--t2)', fontSize: 13, fontFamily: 'var(--font-ui)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.04)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                  >
                    <div style={{
                      width: 22, height: 22, borderRadius: 5, flexShrink: 0,
                      background: `hsl(${sub.split('').reduce((a, c) => a + c.charCodeAt(0), 0) % 360}, 45%, 28%)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 9, fontWeight: 700, color: '#fff',
                    }}>
                      {sub[0].toUpperCase()}
                    </div>
                    <span>r/{sub}</span>
                  </button>
                )) : (
                  <div style={{ padding: '10px 12px 12px', fontSize: 12, color: 'var(--t4)' }}>
                    Scout more subreddits to see them here.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Centre: Period selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, padding: '4px', background: 'var(--panel)', borderRadius: 8, border: '0.5px solid var(--border)', flexShrink: 0 }}>
          {PERIODS.map(p => (
            <button
              key={p.value}
              onClick={() => onPeriodChange(p.value)}
              style={{
                padding: '4px 10px', fontSize: 12, borderRadius: 6, fontFamily: 'var(--font-ui)',
                fontWeight: period === p.value ? 500 : 400,
                background: period === p.value ? 'var(--blue-dim)' : 'transparent',
                color: period === p.value ? 'var(--blue)' : 'var(--t3)',
                border: period === p.value ? '0.5px solid var(--blue-border)' : '0.5px solid transparent',
                cursor: 'pointer',
              }}
            >{p.label}</button>
          ))}
        </div>

        {/* Right: watchlist + cache info + refresh */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
          {/* Add to watchlist */}
          <button
            onClick={toggleWatch}
            title={watched ? 'Remove from watchlist' : 'Add to watchlist — get daily emails'}
            style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 10px', borderRadius: 6, fontSize: 12,
              fontFamily: 'var(--font-ui)', cursor: 'pointer',
              background: watched ? 'rgba(74,143,255,0.12)' : 'var(--panel)',
              border: '0.5px solid ' + (watched ? 'var(--blue-border)' : 'var(--border)'),
              color: watched ? 'var(--blue)' : 'var(--t3)',
              transition: 'all 0.15s ease',
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill={watched ? 'var(--blue)' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
            </svg>
            {watched ? 'Watching' : 'Watch'}
          </button>

          {analysis.cached && analysis.cachedAt && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--t3)', padding: '3px 8px', background: 'var(--panel)', borderRadius: 6, border: '0.5px solid var(--border)' }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--blue)', flexShrink: 0 }} />
              {new Date(analysis.cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          )}
          {analysis.cached && (
            <button onClick={onRefresh} style={{ fontSize: 12, color: 'var(--t3)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'var(--font-ui)' }}>↺</button>
          )}
        </div>
      </div>

      {/* ── Tab bar ── */}
      <div style={{ borderBottom: '0.5px solid var(--border)', padding: '0 24px' }}>
        <div style={{ display: 'flex', gap: 0 }}>
          {(['intelligence', 'predictor', 'opportunities'] as Tab[]).map(tab => {
            const labels: Record<Tab, string> = { intelligence: 'Intelligence Report', predictor: 'Score My Post', opportunities: 'Opportunities' };
            const active = activeTab === tab;
            return (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  padding: '12px 16px', fontSize: 13, fontWeight: active ? 500 : 400,
                  color: active ? 'var(--t1)' : 'var(--t3)',
                  background: 'none', border: 'none', borderBottom: active ? '2px solid var(--blue)' : '2px solid transparent',
                  cursor: 'pointer', fontFamily: 'var(--font-ui)',
                  transition: 'color 0.12s',
                }}
              >{labels[tab]}</button>
            );
          })}
        </div>
      </div>

      {/* ── Tab content ── */}
      {activeTab === 'intelligence' ? (
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 24px 48px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Subreddit identity */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14 }}>
            <div style={{
              width: 44, height: 44, borderRadius: 10, flexShrink: 0,
              background: 'linear-gradient(135deg,#ff4500,#ff6534)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 18, fontWeight: 700, color: '#fff',
            }}>
              {analysis.subreddit.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.04em', color: 'var(--t1)', lineHeight: 1.1 }}>
                r/{analysis.subreddit}
              </div>
              <div style={{ fontSize: 12, color: 'var(--t3)', marginTop: 3 }}>
                {analysis.subscribers ? `${fmt(analysis.subscribers)} members` : 'Subreddit analysis'}
                {analysis.over18 && ' · NSFW'}
              </div>
              <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:500, background:'var(--blue-dim)', color:'var(--blue)', border:'0.5px solid var(--blue-border)' }}>
                  High Signal
                </span>
                <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'3px 9px', borderRadius:20, fontSize:11, fontWeight:500, background:'var(--green-dim)', color:'var(--green)', border:'0.5px solid var(--green-border)' }}>
                  {riskLabel} Risk
                </span>
              </div>
            </div>
          </div>

          {/* Stat strip */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)',
            gap: 1, background: 'var(--border)',
            borderRadius: 10, overflow: 'hidden',
            border: '0.5px solid var(--border)',
          }}>
            {[
              { label: 'Members', value: analysis.subscribers ? fmt(analysis.subscribers) : '—', sub: 'total community' },
              { label: 'Opp. Score', value: analysis.opportunityScore.toFixed(1), sub: 'out of 10', color: 'var(--blue)' },
              { label: 'Posting Safety', value: analysis.postingSafety.toFixed(1), sub: 'ban risk inverse', color: analysis.postingSafety >= 7 ? 'var(--green)' : analysis.postingSafety >= 4 ? 'var(--orange)' : 'var(--danger)' },
              { label: 'Audience Match', value: analysis.audienceMatch.toFixed(1), sub: analysis.hasProductContext ? 'your target' : 'generic founder', color: 'var(--blue)' },
              { label: 'Risk Level', value: riskLabel, sub: `${riskCount} flag${riskCount !== 1 ? 's' : ''} detected`, color: riskColor },
            ].map((s, i) => (
              <div key={i} style={{ background: 'var(--surface)' }}>
                <StatCell {...s} />
              </div>
            ))}
          </div>

          {/* AI Summary — hero */}
          <div style={{
            background: 'var(--surface)', border: '0.5px solid var(--blue-border)',
            borderRadius: 10, overflow: 'hidden', position: 'relative',
          }}>
            {/* Top accent line */}
            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg, transparent, rgba(74,143,255,0.5), transparent)' }} />
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px 0' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, fontWeight: 600, color: 'var(--blue)', letterSpacing: '0.07em', textTransform: 'uppercase' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--blue)', animation: 'aipulse 2s ease-in-out infinite', display: 'inline-block' }} />
                Intelligence Brief
              </div>
              <span style={{ fontSize: 11, color: 'var(--t4)' }}>
                {analysis.cached && analysis.cachedAt
                  ? `Cached · ${new Date(analysis.cachedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                  : `Generated ${new Date(analysis.generatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
              </span>
            </div>
            <div style={{ padding: '12px 20px 18px' }}>
              <p style={{ fontSize: 14, lineHeight: 1.7, color: 'var(--t1)' }}>{analysis.aiSummary}</p>
            </div>
          </div>

          {/* Main two-column grid */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: 16 }}>

            {/* Left col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Score cards — bar style */}
              <ScoreBars analysis={analysis} />
              <AudienceIntel signals={analysis.audienceSignals} overlap={analysis.crossCommunityOverlap} />
              <KeywordCloud keywords={analysis.winningKeywords} />
            </div>

            {/* Right col */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <TimingHeatmap timing={analysis.timing} />
              <CommunityDNA dna={analysis.communityDNA} />
            </div>
          </div>

          {/* Full-width bottom row */}
          <PostFormats formats={analysis.postFormats} />
          <RiskFlags flags={analysis.riskFlags} />
          <OpportunityScore breakdown={analysis.opportunityBreakdown} total={analysis.opportunityScore} />

          {/* No-context nudge */}
          {!analysis.hasProductContext && (
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 16px', fontSize: 12, borderRadius: 8, background: 'var(--blue-dim)', border: '0.5px solid var(--blue-border)', color: 'var(--t2)' }}>
              <span style={{ color: 'var(--blue)', flexShrink: 0 }}>ℹ</span>
              <span>
                <strong style={{ color: 'var(--blue)' }}>Scores are based on a generic founder profile</strong> — not your specific product.{' '}
                <a href="/command" style={{ color: 'var(--blue)', textDecoration: 'underline' }}>Set up your product in Command →</a>{' '}
                to get scores tailored to what you&apos;re building.
              </span>
            </div>
          )}
        </div>
      ) : activeTab === 'predictor' ? (
        <PostPredictor subreddit={analysis.subreddit} />
      ) : (
        <Opportunities subreddit={analysis.subreddit} />
      )}

      <style>{`
        @keyframes aipulse { 0%,100% { opacity:1 } 50% { opacity:0.3 } }
      `}</style>
    </div>
  );
}

/* ── Inline score bars component ── */
function ScoreBars({ analysis }: { analysis: SubredditAnalysis }) {
  const scores = [
    { name: 'Opportunity Score', desc: analysis.hasProductContext ? 'For your product' : 'Generic founder', value: analysis.opportunityScore, max: 10, color: 'var(--blue)' },
    { name: 'Posting Safety', desc: 'Ban risk inverse', value: analysis.postingSafety, max: 10, color: analysis.postingSafety >= 7 ? 'var(--green)' : analysis.postingSafety >= 4 ? 'var(--orange)' : 'var(--danger)' },
    { name: analysis.hasProductContext ? 'Audience Match' : 'Founder Fit', desc: analysis.hasProductContext ? 'Your target customer' : 'Generic ICP match', value: analysis.audienceMatch, max: 10, color: 'var(--blue)' },
    { name: 'Market Gap', desc: '10 = wide open, 1 = saturated', value: analysis.competition, max: 10, color: 'var(--blue)' },
  ];

  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 18px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--t2)' }}>Opportunity Scores</span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {scores.map(s => (
          <div key={s.name} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12.5, color: 'var(--t2)', fontWeight: 500 }}>{s.name}</div>
              <div style={{ fontSize: 11, color: 'var(--t4)', marginTop: 1 }}>{s.desc}</div>
            </div>
            <div style={{ flexShrink: 0, width: 120, height: 4, background: 'var(--overlay)', borderRadius: 2, overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: s.color, width: `${(s.value / s.max) * 100}%` }} />
            </div>
            <div style={{ fontSize: 13, fontWeight: 700, letterSpacing: '-0.02em', color: s.color, minWidth: 30, textAlign: 'right' }}>
              {s.value.toFixed(1)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
