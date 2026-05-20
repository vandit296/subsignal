'use client';

import { useState, FormEvent, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const POPULAR = ['SaaS', 'entrepreneur', 'startups', 'indiehackers', 'webdev', 'smallbusiness', 'marketing'];
const RECENT_KEY = 'treddit_recent_subs';

export default function ScoutIndexPage() {
  const [value, setValue] = useState('');
  const [recentSubs, setRecentSubs] = useState<string[]>([]);
  const router = useRouter();

  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecentSubs(JSON.parse(raw) as string[]);
    } catch {}
  }, []);

  function handleAnalyze(e: FormEvent) {
    e.preventDefault();
    const sub = value.replace(/^r\//, '').trim();
    if (sub) router.push(`/scout/${sub}`);
  }

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', padding: '0 24px',
    }}>
      <div style={{ width: '100%', maxWidth: 560 }}>

        {/* Header */}
        <h1 style={{
          fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em',
          color: 'var(--t1)', textAlign: 'center', marginBottom: 6,
        }}>
          Scout a subreddit
        </h1>
        <p style={{
          fontSize: 13, color: 'var(--t3)', textAlign: 'center',
          marginBottom: 28, lineHeight: 1.6,
        }}>
          Full community intelligence — audience DNA, timing, and your playbook.
        </p>

        {/* Search form */}
        <form onSubmit={handleAnalyze} style={{ width: '100%', marginBottom: 20 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{
              flex: 1, display: 'flex', alignItems: 'center',
              background: 'var(--panel)', border: '0.5px solid var(--border)',
              borderRadius: 10, padding: '0 14px', gap: 8,
              transition: 'border-color 0.15s',
            }}
              onFocus={() => {}}
            >
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--blue)', flexShrink: 0 }}>r/</span>
              <input
                type="text"
                value={value}
                onChange={e => setValue(e.target.value)}
                placeholder="enter subreddit…"
                autoFocus
                style={{
                  flex: 1, background: 'transparent', border: 'none', outline: 'none',
                  color: 'var(--t1)', fontSize: 14, fontFamily: 'var(--font-ui)',
                  padding: '13px 0',
                }}
              />
            </div>
            <button
              type="submit"
              disabled={!value.trim()}
              style={{
                padding: '13px 22px', fontSize: 13, fontWeight: 600,
                fontFamily: 'var(--font-ui)', borderRadius: 10, border: 'none',
                background: value.trim() ? 'var(--blue)' : 'var(--overlay)',
                color: value.trim() ? '#fff' : 'var(--t4)',
                cursor: value.trim() ? 'pointer' : 'default',
                transition: 'all 0.15s', whiteSpace: 'nowrap',
              }}
            >
              Analyze →
            </button>
          </div>
        </form>

        {/* Recent scouts */}
        {recentSubs.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em',
              color: 'var(--t4)', textTransform: 'uppercase',
              marginBottom: 10,
            }}>
              Recent scouts
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {recentSubs.map(sub => (
                <button
                  key={sub}
                  onClick={() => router.push(`/scout/${sub}`)}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '6px 12px', borderRadius: 8,
                    background: 'var(--blue-dim)', border: '0.5px solid var(--blue-border)',
                    color: 'var(--blue)', fontSize: 12.5, fontFamily: 'var(--font-ui)',
                    cursor: 'pointer', transition: 'opacity 0.12s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.opacity = '0.75')}
                  onMouseLeave={e => (e.currentTarget.style.opacity = '1')}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                  </svg>
                  r/{sub}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular suggestions */}
        <div>
          <div style={{
            fontSize: 10.5, fontWeight: 600, letterSpacing: '0.07em',
            color: 'var(--t4)', textTransform: 'uppercase',
            marginBottom: 10,
          }}>
            Popular
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
            {POPULAR.map(sub => (
              <button
                key={sub}
                onClick={() => router.push(`/scout/${sub}`)}
                style={{
                  padding: '6px 12px', borderRadius: 8,
                  background: 'var(--panel)', border: '0.5px solid var(--border)',
                  color: 'var(--t3)', fontSize: 12.5, fontFamily: 'var(--font-ui)',
                  cursor: 'pointer', transition: 'color 0.12s, border-color 0.12s',
                }}
                onMouseEnter={e => {
                  e.currentTarget.style.color = 'var(--t1)';
                  e.currentTarget.style.borderColor = 'var(--t3)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.color = 'var(--t3)';
                  e.currentTarget.style.borderColor = 'var(--border)';
                }}
              >
                r/{sub}
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
