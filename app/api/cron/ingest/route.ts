import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { isLifetimeAccount } from '@/lib/upstash';
import { sql } from '@/lib/db';
import { CORE_SUBREDDITS, SUBREDDIT_CANDIDATES } from '@/lib/subreddit-pool';

export const runtime = 'nodejs';
export const maxDuration = 300;

const ARCTIC = 'https://arctic-shift.photon-reddit.com';
const WINDOW_DAYS = 21;          // rolling retention
const PER_SUB_LIMIT = 100;       // posts pulled per sub per run
const FETCH_AFTER_DAYS = 3;      // pull posts from the last N days each run (incremental-ish)
const CONC = 6;                  // Arctic concurrency
const DEAD = /^\[(removed|deleted)\]$/i;

interface Row { id: string; subreddit: string; title: string; selftext: string; permalink: string; score: number; num_comments: number; created_utc: number; }

async function mapPool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  const worker = async () => { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

async function fetchSub(sub: string, after: string): Promise<Row[]> {
  try {
    const res = await fetch(`${ARCTIC}/api/posts/search?subreddit=${encodeURIComponent(sub)}&limit=${PER_SUB_LIMIT}&sort=desc&after=${after}`, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const j = await res.json() as { data?: Array<Record<string, unknown>> };
    return (j.data ?? []).map(p => ({
      id: String(p.id ?? ''),
      subreddit: String(p.subreddit ?? sub),
      title: String(p.title ?? ''),
      selftext: String(p.selftext ?? '').slice(0, 4000),
      permalink: p.permalink ? `https://reddit.com${p.permalink}` : String(p.url ?? ''),
      score: Number(p.score ?? 0),
      num_comments: Number(p.num_comments ?? 0),
      created_utc: Number(p.created_utc ?? 0),
    })).filter(r => r.id && r.title && !DEAD.test(r.title) && r.selftext !== '[removed]');
  } catch { return []; }
}

// Batched multi-row upsert (Neon HTTP — one round trip per batch).
async function upsert(rows: Row[]): Promise<number> {
  if (!sql || !rows.length) return 0;
  const BATCH = 100; let n = 0;
  for (let b = 0; b < rows.length; b += BATCH) {
    const slice = rows.slice(b, b + BATCH);
    const cols = 7; // id,subreddit,title,selftext,permalink,score,num_comments,created_utc -> 8 actually
    void cols;
    const params: unknown[] = [];
    const tuples = slice.map((r, i) => {
      const o = i * 8;
      params.push(r.id, r.subreddit, r.title, r.selftext, r.permalink, r.score, r.num_comments, r.created_utc);
      return `($${o + 1},$${o + 2},$${o + 3},$${o + 4},$${o + 5},$${o + 6},$${o + 7},$${o + 8})`;
    }).join(',');
    const q = `insert into posts (id,subreddit,title,selftext,permalink,score,num_comments,created_utc)
               values ${tuples}
               on conflict (id) do update set score=excluded.score, num_comments=excluded.num_comments, ingested_at=now()`;
    try { await sql.query(q, params); n += slice.length; } catch (e) { console.error('[ingest] upsert batch failed', e); }
  }
  return n;
}

export async function GET(req: NextRequest) {
  const cronAuth = req.headers.get('authorization') === `Bearer ${process.env.CRON_SECRET}`;
  const session = await getSession();
  const owner = !!(session?.user?.email && isLifetimeAccount(session.user.email)); // browser trigger
  if (!cronAuth && !owner) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!sql) return NextResponse.json({ error: 'DATABASE_URL not set' }, { status: 500 });

  const pool = Array.from(new Set([...CORE_SUBREDDITS, ...SUBREDDIT_CANDIDATES].map(s => s.trim()).filter(Boolean)));
  const after = new Date(Date.now() - FETCH_AFTER_DAYS * 864e5).toISOString().slice(0, 10);

  const batches = await mapPool(pool, CONC, s => fetchSub(s, after));
  const rows = batches.flat();
  const upserted = await upsert(rows);

  // Prune rolling window.
  let pruned = 0;
  try {
    const cutoff = Math.floor((Date.now() - WINDOW_DAYS * 864e5) / 1000);
    const r = await sql.query('delete from posts where created_utc < $1', [cutoff]);
    pruned = (r as { rowCount?: number }).rowCount ?? 0;
  } catch (e) { console.error('[ingest] prune failed', e); }

  let total = 0;
  try { const c = await sql.query('select count(*)::int as n from posts'); total = (c as unknown as Array<{ n: number }>)[0]?.n ?? 0; } catch { /* */ }

  return NextResponse.json({ ok: true, subs: pool.length, fetched: rows.length, upserted, pruned, total_in_index: total });
}
