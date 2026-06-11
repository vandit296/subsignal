// ICP Radar — people, not threads.
//
// Reuses the Intelligence engine's expensive work (company profile -> wide Arctic
// sweep -> recall -> intent scorer -> crisis filter) and adds ONE more pass: it
// takes the AUTHORS of the high-intent threads and scores each *person* as an
// ideal customer, producing a daily, ranked, hand-write-your-own-DM lead list.
//
// Cost: piggybacks on the cached IntelFeed when fresh (no extra Arctic sweep),
// then one Claude person-scoring batch. Daily-drip: one batch per user per UTC day.

import { createMessage } from './llm';
import {
  buildFeed, getCachedFeed, cacheFeed,
  type IntelFeed, type IntelOpportunity,
} from './intelligence';

// ── tunables ──────────────────────────────────────────────────────────────────
const PERSON_CAP = 28;   // max distinct authors sent to the person-scorer
const SCORE_BATCH = 14;  // authors per scoring call
const DAILY_N = 12;      // leads delivered in a day's batch
const MIN_ICP = 45;      // drop anyone below this — a thin list beats a padded one

// ── types ───────────────────────────────────────────────────────────────────
export interface RecentItem {
  kind: 'post' | 'comment';
  text: string;         // post title, or comment body snippet
  url: string;
  sub: string;
  createdUtc: number;
}
export interface IcpLead {
  username: string;
  sub: string;
  threadUrl: string;
  profileUrl: string;
  quote: string;        // their own words — the post title that flagged them
  building: string;     // what they're building (<=10 words)
  why: string;          // why they're a fit (<=20 words)
  angle: string;        // note-to-self on how to help — NOT a drafted message
  flags: string[];      // caution tags (throwaway, cross-poster, may-not-pay…)
  score: number;        // ICP fit 0-100
  recent: RecentItem[]; // recent posts/comments — extra context to personalise the DM
}
export interface IcpBatch {
  date: string;                 // UTC YYYY-MM-DD this batch belongs to
  builtAt: string;
  profileSummary: string;
  leads: IcpLead[];
  stats: { scanned: number; authors: number; delivered: number };
  nextDropUtc: string;          // ISO — when tomorrow's batch unlocks
}

// ── self-contained redis (REST) ──────────────────────────────────────────────
async function redis(command: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(command), cache: 'no-store', signal: AbortSignal.timeout(8_000),
    });
    const j = await res.json() as { result?: unknown };
    return j.result ?? null;
  } catch { return null; }
}

function stripJson(t: string): string { return t.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, ''); }

export function utcDate(d = new Date()): string { return d.toISOString().slice(0, 10); }
export function nextDropUtc(d = new Date()): string {
  const n = new Date(d); n.setUTCHours(24, 0, 0, 0); return n.toISOString();
}
const icpKey = (email: string, date: string) => `treddit:icp:${email.toLowerCase()}:${date}`;

export async function getTodayBatch(email: string): Promise<IcpBatch | null> {
  const raw = await redis(['GET', icpKey(email, utcDate())]) as string | null;
  if (!raw) return null;
  try { return JSON.parse(raw) as IcpBatch; } catch { return null; }
}
export async function cacheTodayBatch(email: string, batch: IcpBatch): Promise<void> {
  // Live for ~26h so a late-night build still survives to the next morning.
  await redis(['SET', icpKey(email, batch.date), JSON.stringify(batch), 'EX', String(26 * 3600)]);
}

// ── dedupe authors: keep each person's single strongest thread ────────────────
const BOTLIKE = /(^auto|bot$|moderator|automoderator|\[deleted\])/i;
const tierRank: Record<string, number> = { reply: 0, add: 1, watch: 2 };

function pickAuthors(opps: IntelOpportunity[]): IntelOpportunity[] {
  const best = new Map<string, IntelOpportunity>();
  for (const o of opps) {
    const a = (o.author || '').trim();
    if (!a || BOTLIKE.test(a)) continue;
    if (o.tier !== 'reply' && o.tier !== 'add') continue;   // active need only
    const cur = best.get(a.toLowerCase());
    if (!cur) { best.set(a.toLowerCase(), o); continue; }
    // prefer the higher-intent tier, then the higher score
    const better = (tierRank[o.tier] - tierRank[cur.tier]) || (o.score - cur.score);
    if (better < 0 || (tierRank[o.tier] === tierRank[cur.tier] && o.score > cur.score)) best.set(a.toLowerCase(), o);
  }
  return [...best.values()]
    .sort((a, b) => (tierRank[a.tier] - tierRank[b.tier]) || (b.score - a.score))
    .slice(0, PERSON_CAP);
}

// ── person scorer (Prompt C) ──────────────────────────────────────────────────
interface PersonScore { i: number; keep: boolean; icp: number; building: string; why: string; angle: string; flags: string[]; }

async function scorePeople(
  profile: { summary: string; jtbd: string },
  batch: { author: string; sub: string; title: string; snippet: string }[],
): Promise<Record<number, PersonScore>> {
  const list = batch.map((c, i) => `[${i}] u/${c.author} in r/${c.sub} — "${c.title}" — ${c.snippet.slice(0, 140)}`).join('\n');
  const prompt = `You are scoring individual Reddit users as potential CUSTOMERS for a specific company, based on a post they wrote. Output strict JSON only.

COMPANY: ${profile.summary}
THEIR CUSTOMER'S JOB-TO-BE-DONE: ${profile.jtbd}

For each user, judge how likely THIS PERSON is an ideal customer of the company — not whether the topic is relevant, but whether the human behind the post would actually buy/use the product. A founder actively struggling with exactly what the company solves = high. An agency/spammer, a person just venting with no product, someone too early or clearly not the buyer = low or drop.

Rules:
- "keep": false if they're not a plausible customer (no product, pure rant, recruiter, off-topic, obvious self-promoter with nothing to buy), OR if there is ANY sign of personal/medical/financial crisis or distress. Never surface someone in distress.
- "icp": 0-100 fit. Be honest and spread the scores — most people are 40-75, reserve 85+ for a near-perfect match.
- "building": <=10 words on what they're building/their situation.
- "why": <=20 words — why they are (or aren't) a fit.
- "angle": <=16 words — a NOTE TO SELF on how to genuinely help them in a DM. NOT a written message. A strategy hint only.
- "flags": array of <=3 short caution tags if any (e.g. "early stage", "cross-poster", "may not pay", "competitor-adjacent", "brand account"). Empty array if none.

USERS:
${list}

Return ONLY a JSON array: [{"i":0,"keep":true,"icp":0-100,"building":"...","why":"...","angle":"...","flags":["..."]}]`;
  const msg = await createMessage({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] });
  const raw = (msg.content[0] as { type: string; text: string }).text;
  const out: Record<number, PersonScore> = {};
  let arr: PersonScore[] | null = null;
  const txt = stripJson(raw);
  try { arr = JSON.parse(txt); }
  catch { const m = txt.match(/\[[\s\S]*\]/); if (m) { try { arr = JSON.parse(m[0]); } catch { /* give up */ } } }
  if (arr) for (const r of arr) out[r.i] = r;
  return out;
}

// ── chunk + concurrency helpers ───────────────────────────────────────────────
function chunk<T>(a: T[], n: number): T[][] { const o: T[][] = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; }
async function mapPool<T, R>(items: T[], n: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length); let i = 0;
  const w = async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]); } };
  await Promise.all(Array.from({ length: Math.min(n, items.length) }, w));
  return out;
}

// ── recent activity (Arctic author lookup) ────────────────────────────────────
async function arcticArr(url: string, attempt = 0): Promise<Array<Record<string, unknown>>> {
  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(9_000) });
    if (res.status === 429 && attempt < 2) { await new Promise(r => setTimeout(r, 500 * 2 ** attempt + Math.random() * 300)); return arcticArr(url, attempt + 1); }
    if (!res.ok) return [];
    const j = await res.json() as { data?: Array<Record<string, unknown>> };
    return j.data ?? [];
  } catch { return []; }
}

async function fetchRecent(user: string, excludeUrl: string): Promise<RecentItem[]> {
  const enc = encodeURIComponent(user);
  const [posts, comments] = await Promise.all([
    arcticArr(`https://arctic-shift.photon-reddit.com/api/posts/search?author=${enc}&limit=6&sort=desc`),
    arcticArr(`https://arctic-shift.photon-reddit.com/api/comments/search?author=${enc}&limit=5&sort=desc`),
  ]);
  const items: RecentItem[] = [];
  for (const p of posts) {
    const ti = (p.title as string) || '';
    if (!p.permalink || ti === '[removed]' || ti === '[deleted]') continue;
    items.push({ kind: 'post', text: ti, url: `https://reddit.com${p.permalink as string}`, sub: (p.subreddit as string) || '', createdUtc: (p.created_utc as number) || 0 });
  }
  for (const c of comments) {
    const body = ((c.body as string) || '').replace(/\s+/g, ' ').trim();
    if (!c.permalink || !body || body === '[removed]' || body === '[deleted]') continue;
    items.push({ kind: 'comment', text: body.slice(0, 160), url: `https://reddit.com${c.permalink as string}`, sub: (c.subreddit as string) || '', createdUtc: (c.created_utc as number) || 0 });
  }
  items.sort((a, b) => b.createdUtc - a.createdUtc);
  const seen = new Set<string>([excludeUrl]); const out: RecentItem[] = [];
  for (const it of items) { if (seen.has(it.url)) continue; seen.add(it.url); out.push(it); if (out.length >= 3) break; }
  return out;
}

// ── orchestration ─────────────────────────────────────────────────────────────
export async function buildIcpBatch(
  company: { description?: string; name?: string; goal?: string },
  email?: string,
): Promise<IcpBatch> {
  // Reuse a fresh cached feed if it has authored opportunities; else build one
  // (and cache it so /feed benefits from the same sweep). Feeds built before the
  // author-capture change won't have authors → rebuild.
  let feed: IntelFeed | null = email ? await getCachedFeed(email) : null;
  const authored = (feed?.opportunities ?? []).filter(o => o.author).length;
  if (!feed || authored < 3) {
    feed = await buildFeed(company, email);
    if (email) await cacheFeed(email, feed);
  }

  const authors = pickAuthors(feed.opportunities);

  const leads: IcpLead[] = [];
  for (const part of chunk(authors, SCORE_BATCH)) {
    const input = part.map(o => ({ author: o.author as string, sub: o.sub, title: o.title, snippet: o.snippet }));
    const scores = await scorePeople({ summary: feed.profile.summary, jtbd: feed.profile.jtbd }, input);
    part.forEach((o, j) => {
      const s = scores[j];
      if (!s || !s.keep || (s.icp ?? 0) < MIN_ICP) return;
      const u = o.author as string;
      leads.push({
        username: u,
        sub: o.sub.startsWith('r/') ? o.sub : `r/${o.sub}`,
        threadUrl: o.url,
        profileUrl: `https://www.reddit.com/user/${u}`,
        quote: o.title,
        building: (s.building || '').trim(),
        why: (s.why || '').trim(),
        angle: (s.angle || '').trim(),
        flags: Array.isArray(s.flags) ? s.flags.filter(Boolean).slice(0, 3) : [],
        score: Math.max(0, Math.min(100, Math.round(s.icp ?? 0))),
        recent: [],
      });
    });
  }

  leads.sort((a, b) => b.score - a.score);
  const top = leads.slice(0, DAILY_N);

  // Enrich only the delivered leads with recent activity (bounded Arctic calls).
  await mapPool(top, 5, async (lead) => {
    lead.recent = await fetchRecent(lead.username, lead.threadUrl);
  });

  return {
    date: utcDate(),
    builtAt: new Date().toISOString(),
    profileSummary: feed.profile.summary,
    leads: top,
    stats: { scanned: feed.opportunities.length, authors: authors.length, delivered: top.length },
    nextDropUtc: nextDropUtc(),
  };
}
