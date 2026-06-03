'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

const ADMIN = 'vandit296@gmail.com';
const UI = 'var(--font-ui)';
const MONO = "'SF Mono','Fira Code',monospace";

interface UserRow {
  email: string;
  name: string;
  status: string;
  createdAt: string | null;
  trialEnd: string | null;
  onboardingComplete: boolean;
  subscriptionId: string | null;
  keywordCount: number;
  keywords: string[];
}

interface Summary { total: number; active: number; trial: number; expired: number; cancelled: number; }

const STATUS_COLOR: Record<string, string> = {
  active:    '#22c55e',
  trial:     '#4A8FFF',
  expired:   'rgba(240,236,228,0.28)',
  cancelled: '#ef4444',
  unknown:   'rgba(240,236,228,0.20)',
};

function fmt(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' });
}

function daysAgo(iso: string | null) {
  if (!iso) return '';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 86400000);
  if (diff === 0) return 'today';
  if (diff === 1) return '1d ago';
  return `${diff}d ago`;
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '0.5px solid var(--border)', borderRadius: 10, padding: '16px 20px', minWidth: 110 }}>
      <div style={{ fontSize: 11, color: 'var(--t3)', fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 8 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color, letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</div>
    </div>
  );
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers]       = useState<UserRow[]>([]);
  const [summary, setSummary]   = useState<Summary | null>(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [filter, setFilter]     = useState<string>('all');
  const [emailStatus, setEmailStatus] = useState<Record<string, string>>({});

  async function sendExpiredEmail(email: string) {
    setEmailStatus(s => ({ ...s, [email]: 'sending...' }));
    const res = await fetch('/api/admin/send-expired-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ emails: [email] }),
    });
    const data = await res.json() as { results: Record<string, string> };
    setEmailStatus(s => ({ ...s, [email]: data.results[email] ?? 'done' }));
  }

  useEffect(() => {
    if (status === 'loading') return;
    if (session?.user?.email !== ADMIN) { router.push('/'); return; }
    fetch('/api/admin/users')
      .then(r => r.json())
      .then(d => { setUsers(d.users ?? []); setSummary(d.summary ?? null); })
      .catch(() => setError('Failed to load users'))
      .finally(() => setLoading(false));
  }, [status, session, router]);

  if (status === 'loading' || loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontFamily: MONO, fontSize: 12, color: 'var(--t4)', letterSpacing: '0.1em' }}>LOADING USERS...</span>
      </div>
    );
  }

  if (error) return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <span style={{ color: '#ef4444', fontFamily: MONO, fontSize: 13 }}>{error}</span>
    </div>
  );

  const visible = filter === 'all' ? users : users.filter(u => u.status === filter);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--void)', fontFamily: UI, color: 'var(--t1)' }}>

      {/* Header */}
      <div style={{ padding: '28px 32px 24px', borderBottom: '0.5px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 10, fontFamily: MONO, letterSpacing: '0.12em', color: 'rgba(74,143,255,0.55)', textTransform: 'uppercase', marginBottom: 6 }}>Treddit Admin</div>
            <h1 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', margin: 0 }}>User Intelligence</h1>
          </div>
          <button onClick={() => router.push('/feed')}
            style={{ fontSize: 12, color: 'var(--t4)', background: 'none', border: 'none', cursor: 'pointer', fontFamily: UI }}>
            ← Back to app
          </button>
        </div>

        {/* Summary cards */}
        {summary && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <StatCard label="Total"     value={summary.total}     color="var(--t1)" />
            <StatCard label="Active"    value={summary.active}    color="#22c55e" />
            <StatCard label="Trial"     value={summary.trial}     color="#4A8FFF" />
            <StatCard label="Expired"   value={summary.expired}   color="rgba(240,236,228,0.40)" />
            <StatCard label="Cancelled" value={summary.cancelled} color="#ef4444" />
          </div>
        )}
      </div>

      {/* Filter tabs */}
      <div style={{ padding: '16px 32px', borderBottom: '0.5px solid var(--border)', display: 'flex', gap: 4 }}>
        {['all', 'active', 'trial', 'expired', 'cancelled'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            style={{
              padding: '5px 14px', fontSize: 12, fontFamily: UI, borderRadius: 6, cursor: 'pointer',
              background: filter === f ? 'rgba(240,236,228,0.08)' : 'transparent',
              border: filter === f ? '0.5px solid rgba(240,236,228,0.14)' : '0.5px solid transparent',
              color: filter === f ? 'var(--t1)' : 'var(--t4)',
              letterSpacing: '-0.01em', textTransform: 'capitalize',
            }}>{f === 'all' ? `All (${users.length})` : f}
          </button>
        ))}
      </div>

      {/* User table */}
      <div style={{ padding: '0 32px 40px' }}>
        {visible.length === 0 ? (
          <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--t4)', fontFamily: MONO, fontSize: 12 }}>No users</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ borderBottom: '0.5px solid var(--border)' }}>
                {['User', 'Status', 'Signed up', 'Trial ends', 'Onboarded', 'Keywords', ''].map(h => (
                  <th key={h} style={{ padding: '10px 12px', fontSize: 10, fontFamily: MONO, color: 'var(--t4)', letterSpacing: '0.08em', textTransform: 'uppercase', textAlign: 'left', fontWeight: 500 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visible.map(u => (
                <>
                  <tr key={u.email}
                    style={{ borderBottom: '0.5px solid var(--border)', cursor: 'pointer', transition: 'background 0.12s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(240,236,228,0.025)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    onClick={() => setExpanded(expanded === u.email ? null : u.email)}>

                    {/* User */}
                    <td style={{ padding: '13px 12px' }}>
                      <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--t1)', letterSpacing: '-0.01em' }}>{u.name || u.email.split('@')[0]}</div>
                      <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: MONO, marginTop: 2 }}>{u.email}</div>
                    </td>

                    {/* Status */}
                    <td style={{ padding: '13px 12px' }}>
                      <span style={{
                        fontSize: 11, fontFamily: MONO, letterSpacing: '0.06em', textTransform: 'uppercase',
                        color: STATUS_COLOR[u.status] ?? 'var(--t4)',
                        background: `${STATUS_COLOR[u.status]}18`,
                        border: `0.5px solid ${STATUS_COLOR[u.status]}33`,
                        padding: '3px 8px', borderRadius: 4,
                      }}>{u.status}</span>
                    </td>

                    {/* Signed up */}
                    <td style={{ padding: '13px 12px' }}>
                      <div style={{ fontSize: 12, color: 'var(--t2)' }}>{fmt(u.createdAt)}</div>
                      <div style={{ fontSize: 11, color: 'var(--t4)', fontFamily: MONO }}>{daysAgo(u.createdAt)}</div>
                    </td>

                    {/* Trial end */}
                    <td style={{ padding: '13px 12px' }}>
                      <div style={{ fontSize: 12, color: u.status === 'trial' ? '#4A8FFF' : 'var(--t4)' }}>{fmt(u.trialEnd)}</div>
                    </td>

                    {/* Onboarded */}
                    <td style={{ padding: '13px 12px' }}>
                      <span style={{ fontSize: 12, color: u.onboardingComplete ? '#22c55e' : 'var(--t4)' }}>
                        {u.onboardingComplete ? '✓ Yes' : '— No'}
                      </span>
                    </td>

                    {/* Keywords */}
                    <td style={{ padding: '13px 12px' }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: u.keywordCount > 0 ? 'var(--t1)' : 'var(--t4)' }}>{u.keywordCount}</span>
                      <span style={{ fontSize: 11, color: 'var(--t4)', marginLeft: 4 }}>saved</span>
                    </td>

                    {/* Expand toggle */}
                    <td style={{ padding: '13px 12px', color: 'var(--t4)', fontSize: 11 }}>
                      {expanded === u.email ? '▲' : '▼'}
                    </td>
                  </tr>

                  {/* Expanded row */}
                  {expanded === u.email && (
                    <tr key={`${u.email}-exp`} style={{ background: 'rgba(240,236,228,0.016)', borderBottom: '0.5px solid var(--border)' }}>
                      <td colSpan={7} style={{ padding: '14px 12px 16px 24px' }}>
                        <div style={{ display: 'flex', gap: 32, flexWrap: 'wrap' }}>
                          <div>
                            <div style={{ fontSize: 10, fontFamily: MONO, color: 'var(--t4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Subscription ID</div>
                            <div style={{ fontSize: 12, fontFamily: MONO, color: u.subscriptionId ? 'var(--t2)' : 'var(--t4)' }}>{u.subscriptionId ?? '—'}</div>
                          </div>
                          {u.status !== 'active' && (
                            <div>
                              <div style={{ fontSize: 10, fontFamily: MONO, color: 'var(--t4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Actions</div>
                              <button
                                onClick={() => sendExpiredEmail(u.email)}
                                style={{ fontSize: 11, fontFamily: MONO, padding: '4px 10px', borderRadius: 4, background: 'rgba(239,68,68,0.08)', border: '0.5px solid rgba(239,68,68,0.3)', color: '#ef4444', cursor: 'pointer' }}
                              >
                                {emailStatus[u.email] ?? 'Send expired email'}
                              </button>
                            </div>
                          )}
                          <div>
                            <div style={{ fontSize: 10, fontFamily: MONO, color: 'var(--t4)', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 6 }}>Keywords tracked</div>
                            {u.keywords.length > 0 ? (
                              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                                {u.keywords.map(k => (
                                  <span key={k} style={{ fontSize: 11, fontFamily: MONO, color: 'var(--blue)', background: 'rgba(74,143,255,0.08)', border: '0.5px solid rgba(74,143,255,0.22)', padding: '3px 9px', borderRadius: 4 }}>{k}</span>
                                ))}
                              </div>
                            ) : <span style={{ fontSize: 12, color: 'var(--t4)' }}>None saved</span>}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
