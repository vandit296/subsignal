'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { track } from '@/lib/posthog';

const UI = 'var(--font-ui)';

interface RecentItem { kind: 'post' | 'comment'; text: string; url: string; sub: string; createdUtc: number }
interface Lead {
  username: string; sub: string; threadUrl: string; profileUrl: string;
  quote: string; building: string; why: string; angle: string; flags: string[]; score: number;
  recent?: RecentItem[];
}
interface Batch {
  date: string; builtAt: string; profileSummary: string; leads: Lead[];
  stats: { scanned: number; authors: number; delivered: number };
  nextDropUtc: string; cached?: boolean; noProfile?: boolean; error?: string; message?: string;
  archived?: boolean; empty?: boolean; availableDates?: string[];
}

function utcToday(): string { return new Date().toISOString().slice(0, 10); }
function dayLabel(date: string): string {
  const today = utcToday();
  const y = new Date(); y.setUTCDate(y.getUTCDate() - 1);
  if (date === today) return 'Today';
  if (date === y.toISOString().slice(0, 10)) return 'Yesterday';
  return new Date(date + 'T00:00:00Z').toLocaleDateString(undefined, { month: 'short', day: 'numeric', timeZone: 'UTC' });
}

const LOADING = [
  "Scanning today's threads…",
  'Reading founder posts…',
  'Scoring ICP fit…',
  'Ranking your customers…',
];

function tier(s: number): { col: string; label: string; hot: boolean } {
  if (s >= 85) return { col: 'var(--hot)', label: 'DM today', hot: true };
  if (s >= 68) return { col: 'var(--blue)', label: 'strong fit', hot: false };
  return { col: 'var(--amber)', label: 'soft fit', hot: false };
}

function useCountdown(iso: string | undefined): string {
  const [txt, setTxt] = useState('—');
  useEffect(() => {
    if (!iso) return;
    const tick = () => {
      const ms = new Date(iso).getTime() - Date.now();
      if (ms <= 0) { setTxt('00h 00m 00s'); return; }
      const h = Math.floor(ms / 3.6e6), m = Math.floor((ms % 3.6e6) / 6e4), s = Math.floor((ms % 6e4) / 1e3);
      setTxt(`${String(h).padStart(2, '0')}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [iso]);
  return txt;
}

export default function IcpRadarPage() {
  const [batch, setBatch] = useState<Batch | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [msgIdx, setMsgIdx] = useState(0);
  const [selDate, setSelDate] = useState<string>(utcToday());
  const [dates, setDates] = useState<string[]>([]);
  const msgTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const cd = useCountdown(batch?.nextDropUtc);
  const todayStr = utcToday();

  const load = useCallback(async (date?: string) => {
    const target = date ?? utcToday();
    setSelDate(target);
    setLoading(true); setErr(null);
    msgTimer.current = setInterval(() => setMsgIdx(i => (i + 1) % LOADING.length), 620);
    try {
      const q = target !== utcToday() ? `?date=${target}` : '';
      const r = await fetch(`/api/icp-radar${q}`);
      const j = (await r.json()) as Batch;
      if (r.status === 401) { setErr('Please sign in to use ICP Radar.'); return; }
      if (j.noProfile) { setErr('noProfile'); setBatch(j); return; }
      if (j.error) { setErr(j.message || 'Could not build your batch — try again shortly.'); return; }
      if (Array.isArray(j.availableDates)) setDates(j.availableDates);
      setBatch(j);
    } catch {
      setErr('Network error — try again.');
    } finally {
      if (msgTimer.current) clearInterval(msgTimer.current);
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Attribute arrivals from a campaign link (e.g. the launch email's UTM-tagged
  // CTA) so PostHog can show how many people the announcement actually drove here.
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const src = p.get('utm_source');
    if (src) track('icp_from_campaign', { utm_source: src, utm_medium: p.get('utm_medium') || '', utm_campaign: p.get('utm_campaign') || '' });
  }, []);

  // Day-switcher: show the available days (newest first); always include today.
  const dayTabs = Array.from(new Set([todayStr, ...dates])).filter(d => {
    const cutoff = new Date(); cutoff.setUTCDate(cutoff.getUTCDate() - 2);
    return d >= cutoff.toISOString().slice(0, 10);
  }).sort((a, b) => (a < b ? 1 : -1));

  // ── loading ──
  if (loading) {
    return (
      <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26, fontFamily: UI }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <svg width="22" height="22" viewBox="0 0 20 20" fill="none">
            <polygon points="10,1 18,5.5 18,14.5 10,19 2,14.5 2,5.5" stroke="var(--blue)" strokeWidth="1.1" fill="none" />
            <polygon points="10,5 14,7.5 14,12.5 10,15 6,12.5 6,7.5" fill="var(--blue)" opacity="0.15" />
            <circle cx="10" cy="10" r="2" fill="var(--blue)" />
          </svg>
          <span style={{ fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em' }}>ICP Radar</span>
        </div>
        <div style={{ width: 210 }}><div className="scan-loader" /></div>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ color: 'var(--t2)', fontSize: 14 }}>{LOADING[msgIdx]}</span>
          <span style={{ color: 'var(--t4)', fontSize: 12 }}>finding the founders who are your customers</span>
        </div>
      </div>
    );
  }

  // ── no company set ──
  if (err === 'noProfile') {
    return (
      <div style={{ maxWidth: 560, margin: '12vh auto 0', textAlign: 'center', fontFamily: UI }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 10 }}>Set up your company first</h1>
        <p style={{ color: 'var(--t3)', fontSize: 14, lineHeight: 1.6, marginBottom: 20 }}>
          ICP Radar scores Reddit users against your company. Add a one-line description in Command and your first batch builds automatically.
        </p>
        <Link href="/command" className="btn-void-primary">Go to Command</Link>
      </div>
    );
  }

  // ── other error ──
  if (err) {
    return (
      <div style={{ maxWidth: 520, margin: '14vh auto 0', textAlign: 'center', fontFamily: UI }}>
        <p style={{ color: 'var(--t2)', fontSize: 14, marginBottom: 16 }}>{err}</p>
        <button className="btn-void" onClick={() => load()}>Try again</button>
      </div>
    );
  }

  const leads = batch?.leads ?? [];
  const dmToday = leads.filter(l => l.score >= 85).length;
  const avg = leads.length ? Math.round(leads.reduce((s, l) => s + l.score, 0) / leads.length) : 0;
  const archived = selDate !== todayStr;
  const emptyDay = !!batch?.empty;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: '26px 0 80px', fontFamily: UI }}>
      {/* header */}
      <h1 style={{ fontSize: 21, fontWeight: 600, letterSpacing: '-0.015em', display: 'flex', alignItems: 'center', gap: 10 }}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--blue)" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 1 0 10 10" /><path d="M12 8a4 4 0 1 0 4 4" /><circle cx="12" cy="12" r="1" /><path d="M12 2v3M22 12h-3" />
        </svg>
        ICP Radar
      </h1>
      <div style={{ fontSize: 12, color: 'var(--t3)', margin: '6px 0 18px' }}>
        Customers, not keywords · scored by Claude · <span style={{ color: 'var(--t2)' }}>you write &amp; send every DM</span>
      </div>

      {/* day switcher */}
      {dayTabs.length > 1 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          {dayTabs.map(d => {
            const active = d === selDate;
            return (
              <button key={d} onClick={() => { if (d !== selDate) load(d); }}
                style={{
                  fontFamily: UI, fontSize: 12.5, fontWeight: 500, padding: '6px 13px', borderRadius: 8, cursor: 'pointer',
                  background: active ? 'var(--blue-mid)' : 'transparent',
                  border: `0.5px solid ${active ? 'var(--blue-border)' : 'var(--border)'}`,
                  color: active ? 'var(--blue)' : 'var(--t3)', transition: 'all 0.14s',
                }}>
                {dayLabel(d)}
              </button>
            );
          })}
        </div>
      )}

      {/* daily / archive bar */}
      <div className="cb" style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', marginBottom: 20 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--t2)' }}>
          {archived
            ? <><span style={{ fontSize: 11, color: 'var(--t3)', border: '0.5px solid var(--border)', padding: '1px 8px', borderRadius: 6 }}>Archive</span>{dayLabel(selDate)} · <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--t2)' }}>{leads.length} leads</span></>
            : <><span className="live-dot-hot" />Today&apos;s ICPs · <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--blue)' }}>{batch?.stats.delivered ?? 0} delivered</span></>}
        </span>
        <span style={{ flex: 1 }} />
        {!archived && (
          <span style={{ fontSize: 12, color: 'var(--t3)', textAlign: 'right', lineHeight: 1.5 }}>
            Next batch drops in<br /><b style={{ fontFamily: 'var(--font-mono)', color: 'var(--t1)', fontWeight: 500 }}>{cd}</b>
          </span>
        )}
      </div>

      {/* stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 22 }}>
        {([[archived ? 'LEADS' : 'DELIVERED TODAY', leads.length], ['DM-WORTHY (≥85)', dmToday], ['AVG FIT', avg]] as [string, number][]).map(([k, v]) => (
          <div key={k} className="cb" style={{ padding: '14px 16px' }}>
            <div style={{ fontSize: 11, color: 'var(--t4)', letterSpacing: '0.02em' }}>{k}</div>
            <div style={{ fontSize: 26, fontWeight: 600, letterSpacing: '-0.02em', marginTop: 3, lineHeight: 1 }}>{v}</div>
          </div>
        ))}
      </div>

      {/* empty */}
      {leads.length === 0 && (
        <div className="cb" style={{ padding: '28px 20px', textAlign: 'center', color: 'var(--t3)', fontSize: 14 }}>
          {emptyDay
            ? `No batch was generated for ${dayLabel(selDate)}.`
            : 'No strong matches surfaced in today’s threads. The window refreshes daily — check back tomorrow.'}
        </div>
      )}

      {/* leads */}
      {leads.map((d, i) => {
        const t = tier(d.score);
        return (
          <div key={d.username + i} className="cb void-slide-up" style={{ padding: '16px 17px 15px', marginBottom: 13, animationDelay: `${i * 45}ms` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 13 }}>
              <div style={{ width: 50, height: 50, borderRadius: '50%', flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', border: `1.5px solid ${t.col}`, color: t.col }}>
                <span style={{ fontSize: 18, fontWeight: 600, color: 'var(--t1)', lineHeight: 1 }}>{d.score}</span>
                <span style={{ fontSize: 8, letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 1 }}>fit</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                  {t.hot && <span className="live-dot-hot" />}
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 14, fontWeight: 600 }}>u/{d.username}</span>
                  <span style={{ fontSize: 12, color: 'var(--t3)' }}>{d.sub}</span>
                  <span style={{ fontSize: 11, fontWeight: 500, padding: '2px 9px', borderRadius: 20, color: t.col, background: t.hot ? 'var(--hot-dim)' : t.col === 'var(--blue)' ? 'var(--blue-dim)' : 'var(--amber-dim)', border: `0.5px solid ${t.hot ? 'var(--hot-border)' : t.col === 'var(--blue)' ? 'var(--blue-border)' : 'var(--amber-border)'}` }}>{t.label}</span>
                </div>
                {d.building && <div style={{ fontSize: 13, color: 'var(--t3)', marginTop: 3 }}>{d.building}</div>}
              </div>
            </div>

            <div style={{ borderLeft: '2px solid var(--blue-border)', padding: '7px 0 7px 12px', margin: '13px 0 11px', fontSize: 14, color: 'var(--t1)', fontStyle: 'italic', lineHeight: 1.55 }}>
              &ldquo;{d.quote}&rdquo;
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '6px 12px', fontSize: 13, marginBottom: 12 }}>
              <div style={{ color: 'var(--t4)', fontSize: 11, letterSpacing: '0.02em', textTransform: 'uppercase', paddingTop: 2, whiteSpace: 'nowrap' }}>Why them</div>
              <div style={{ color: 'var(--t2)', lineHeight: 1.5 }}>{d.why}</div>
              {d.angle && <>
                <div style={{ color: 'var(--t4)', fontSize: 11, letterSpacing: '0.02em', textTransform: 'uppercase', paddingTop: 2, whiteSpace: 'nowrap' }}>Your angle</div>
                <div style={{ color: 'var(--t2)', lineHeight: 1.5 }}>{d.angle}</div>
              </>}
            </div>

            {d.flags.length > 0 && (
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 13 }}>
                {d.flags.map(f => <span key={f} style={{ fontSize: 11, color: 'var(--t3)', background: 'var(--panel)', border: '0.5px solid var(--border)', padding: '2px 8px', borderRadius: 6 }}>{f}</span>)}
              </div>
            )}

            {d.recent && d.recent.length > 0 && (
              <div style={{ marginBottom: 13 }}>
                <div style={{ fontSize: 11, color: 'var(--t4)', letterSpacing: '0.02em', textTransform: 'uppercase', marginBottom: 6 }}>Recently active</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {d.recent.map((r, k) => (
                    <a key={k} href={r.url} target="_blank" rel="noreferrer" style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 12.5, color: 'var(--t2)', textDecoration: 'none', lineHeight: 1.45 }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: r.kind === 'post' ? 'var(--blue)' : 'var(--t4)', textTransform: 'uppercase', flexShrink: 0, minWidth: 50 }}>{r.kind}</span>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <span style={{ color: 'var(--t4)' }}>r/{r.sub} · </span>{r.text}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <a className="btn-void-primary" href={d.threadUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>Open thread</a>
              <a className="btn-void" href={d.profileUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>Profile</a>
            </div>
          </div>
        );
      })}

      {/* footer */}
      <div style={{ textAlign: 'center', border: '0.5px dashed var(--border-hover)', borderRadius: 12, padding: '30px 20px', marginTop: 8, background: 'rgba(19,19,23,0.4)' }}>
        {archived ? (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>Viewing {dayLabel(selDate)}</h3>
            <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6, maxWidth: 400, margin: '0 auto' }}>
              ICP Radar keeps the last 3 days. These are read-only — past batches aren&apos;t rebuilt.
            </p>
            <button className="btn-void-primary" style={{ marginTop: 14 }} onClick={() => load(todayStr)}>Back to today</button>
          </>
        ) : (
          <>
            <h3 style={{ fontSize: 15, fontWeight: 600, marginBottom: 5 }}>That&apos;s today&apos;s batch.</h3>
            <p style={{ fontSize: 13, color: 'var(--t3)', lineHeight: 1.6, maxWidth: 380, margin: '0 auto' }}>
              ICP Radar delivers one curated set of customers per day — no endless scroll, no burning through your list. Come back tomorrow for a fresh drop.
            </p>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 22, color: 'var(--blue)', marginTop: 14, letterSpacing: '0.02em' }}>{cd}</div>
          </>
        )}
      </div>
    </div>
  );
}
