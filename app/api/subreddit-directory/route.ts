import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany, consumeBuildQuota } from '@/lib/upstash';
import { createMessage } from '@/lib/llm';
import { CORE_SUBREDDITS } from '@/lib/subreddit-pool';

export const runtime = 'nodejs';
export const maxDuration = 300;

const ARCTIC = 'https://arctic-shift.photon-reddit.com';
const TTL = 24 * 3600;
const CATEGORIES = [
  'Founders & Startups', 'Fundraising & Investors', 'SaaS & Product', 'Marketing & Growth',
  'Dev & Engineering', 'Sales & Outreach', 'Ecommerce & DTC', 'Finance & Ops',
  'Niche & Industry', 'Community & Misc',
];

async function redis(cmd: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(url, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(cmd), cache: 'no-store' });
    return ((await r.json()) as { result: unknown }).result;
  } catch { return null; }
}

// Returns the subscriber count, 0 if the API responded but the sub isn't found
// (absent/misspelled), or null if we couldn't reach Arctic (transient — don't
// punish a real community for a fetch blip). Retries once on failure.
async function subCount(sub: string, attempt = 0): Promise<number | null> {
  try {
    const r = await fetch(`${ARCTIC}/api/subreddits/search?subreddit=${encodeURIComponent(sub)}&limit=10`, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(8000) });
    if (!r.ok) { if (attempt < 1) return subCount(sub, attempt + 1); return null; }
    const j = await r.json() as { data?: Array<{ subscribers?: number; display_name?: string }> };
    const data = j.data || [];
    const exact = data.find(d => String(d.display_name ?? '').toLowerCase() === sub.toLowerCase());
    return exact?.subscribers ?? 0; // exact-only: a fuzzy near-match is not this sub
  } catch { if (attempt < 1) return subCount(sub, attempt + 1); return null; }
}

async function mapPool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  const worker = async () => { while (i < items.length) { const idx = i++; out[idx] = await fn(items[idx]); } };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

const strip = (s: string) => s.replace(/```json?/gi, '').replace(/```/g, '').trim();

interface ScoreRow { sub: string; category: string; fit: number; competition: number; bestFor: string; }

async function scoreBatch(c: { name?: string; description?: string; idealUser?: string; goal?: string }, subs: string[]): Promise<ScoreRow[]> {
  const prompt = `You categorize and score subreddits as marketing/engagement targets for a company. Output strict JSON only.
COMPANY: "${c.name || 'This company'}" — ${c.description}
${c.goal ? `GOAL: ${c.goal}` : ''}${c.idealUser ? `\nIDEAL USER: ${c.idealUser}` : ''}
For each subreddit, return:
- category: EXACTLY one of ${JSON.stringify(CATEGORIES)}
- fit: 0-100 (how strongly THIS company's target customers are present & reachable here)
- competition: 0-100 (how saturated with marketers/self-promo)
- bestFor: <=8 words on what engaging here is good for
SUBREDDITS: ${subs.join(', ')}
Return ONLY a JSON array: [{"sub":"name","category":"...","fit":0,"competition":0,"bestFor":"..."}]`;
  const msg = await createMessage({ model: 'claude-haiku-4-5-20251001', max_tokens: 2600, messages: [{ role: 'user', content: prompt }] });
  const t = strip((msg.content[0] as { type: string; text: string }).text);
  let arr: ScoreRow[] | null = null;
  try { arr = JSON.parse(t); } catch { const m = t.match(/\[[\s\S]*\]/); if (m) { try { arr = JSON.parse(m[0]); } catch { /* */ } } }
  return Array.isArray(arr) ? arr : [];
}

export async function GET(req: NextRequest) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const company = await getCompany(email);
  if (!company?.description?.trim()) return NextResponse.json({ noProfile: true });

  let refresh = req.nextUrl.searchParams.get('refresh') === '1';
  // Each refresh costs ~4 Haiku batches + ~90 Arctic calls — cap forced refreshes.
  if (refresh && !(await consumeBuildQuota(email, 'directory', 5))) refresh = false;
  const key = `treddit:directory:${email.toLowerCase()}`;
  if (!refresh) {
    const cached = await redis(['GET', key]) as string | null;
    if (cached) { try { return NextResponse.json({ ...JSON.parse(cached), cached: true }); } catch { /* rebuild */ } }
  }

  const pool = Array.from(new Set(CORE_SUBREDDITS.map(s => s.trim()).filter(Boolean)));
  const c = { name: (company as { name?: string }).name, description: company.description, idealUser: (company as { idealUser?: string }).idealUser, goal: (company as { goal?: string }).goal };

  // AI score in batches
  const scoreMap: Record<string, ScoreRow> = {};
  const B = 25;
  for (let i = 0; i < pool.length; i += B) {
    const arr = await scoreBatch(c, pool.slice(i, i + B));
    for (const r of arr) { if (r?.sub) scoreMap[String(r.sub).toLowerCase().replace(/^r\//, '')] = r; }
  }

  // Member counts (Arctic, concurrency-capped, best-effort)
  const counts = await mapPool(pool, 8, subCount);

  const clamp = (v: unknown) => Math.max(0, Math.min(100, Math.round(Number(v) || 0)));
  const subs = pool.map((s, idx) => {
    const sc = scoreMap[s.toLowerCase()] || ({} as Partial<ScoreRow>);
    const members = counts[idx];                              // number | null
    const verified = typeof members === 'number' && members > 0;
    const fit = clamp(sc.fit), competition = clamp(sc.competition);
    // Never show a confident score for a community we couldn't verify is real &
    // active — withhold the fit and flag it instead of printing a name-based 8.0.
    return {
      sub: s,
      category: CATEGORIES.includes(sc.category || '') ? sc.category : 'Community & Misc',
      members: members ?? 0,
      noData: !verified,
      fit: verified ? fit : 0,
      competition,
      bestFor: verified ? (sc.bestFor || '').slice(0, 90) : 'No activity data — could not verify this community.',
      opp: verified ? 100 - competition : 0,
      gem: verified && fit >= 75 && competition <= 52,
    };
  }).sort((a, b) => Number(b.noData ? 0 : 1) - Number(a.noData ? 0 : 1) || b.fit - a.fit);

  const payload = { subs, categories: CATEGORIES, company: { name: (company as { name?: string }).name || '', description: company.description }, generatedAt: new Date().toISOString() };
  try { await redis(['SET', key, JSON.stringify(payload), 'EX', String(TTL)]); } catch { /* non-fatal */ }
  return NextResponse.json({ ...payload, cached: false });
}
