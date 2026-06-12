import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { createMessage } from '@/lib/llm';

export const runtime = 'nodejs';
export const maxDuration = 60;

const OWNER = 'vandit296@gmail.com';

// Treddit's ICP + positioning — the lens the scorer judges every query through.
const ICP_CONTEXT = `Treddit is a Reddit GROWTH EXECUTION tool (not social listening). It learns who a company sells to, then surfaces the actual people on Reddit with buying intent, what to say, and how not to get banned.
ICP (ideal reader/customer): an in-house growth marketer or hands-on founder running Reddit as a DELIBERATE channel for a company with real traction (~$5-10k+ MRR), who has tried keyword-listening tools (F5Bot, GummySearch) and found them noisy/low-signal.
NOT the ICP: pre-revenue indie devs hunting for their first user; people just curious about Reddit.`;

const MODIFIERS = (q: string) => [
  q, `${q} tool`, `best ${q}`, `${q} alternative`, `how to ${q}`, `${q} for saas`, `${q} reddit`,
  `what is ${q}`, `${q} vs`, `${q} pricing`, `is ${q} worth it`, `${q} examples`, `${q} software`,
];

async function autocomplete(q: string): Promise<string[]> {
  try {
    const r = await fetch(`https://suggestqueries.google.com/complete/search?client=firefox&q=${encodeURIComponent(q)}`, {
      headers: { Accept: 'application/json' }, cache: 'no-store', signal: AbortSignal.timeout(6000),
    });
    if (!r.ok) return [];
    const j = await r.json() as [string, string[]];
    return Array.isArray(j?.[1]) ? j[1] : [];
  } catch { return []; }
}

function stripJson(t: string): string { return t.trim().replace(/^```json?\n?/, '').replace(/\n?```$/, ''); }

interface Scored { query: string; intent: string; icpFit: number; competition: string; verdict: string; angle: string; }

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (session?.user?.email?.toLowerCase() !== OWNER) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get('q')?.trim();
  if (!q) return NextResponse.json({ error: 'q (topic) required' }, { status: 400 });

  // Pull real Google autocomplete for the seed + modifier templates, dedupe.
  const lists = await Promise.all(MODIFIERS(q).map(autocomplete));
  const seen = new Set<string>();
  const suggestions: string[] = [];
  for (const list of lists) for (const s of list) {
    const k = s.toLowerCase().trim();
    if (k && !seen.has(k)) { seen.add(k); suggestions.push(s); }
  }
  const candidates = suggestions.slice(0, 30);
  const usedFallback = candidates.length === 0;

  const prompt = `${ICP_CONTEXT}

You are an SEO strategist for Treddit. ${usedFallback
    ? `Google autocomplete returned nothing, so FIRST brainstorm 15 realistic search queries a person might type around the topic "${q}", then score them.`
    : `Below are real Google autocomplete queries seeded from the topic "${q}". Score each.`}

${usedFallback ? '' : `QUERIES:\n${candidates.map((c, i) => `${i + 1}. ${c}`).join('\n')}`}

For each query return:
- "query": the search phrase
- "intent": one of "informational" | "commercial" | "navigational"
- "icpFit": 0-100 — how likely the person typing this is Treddit's ICP (a practitioner running Reddit as a channel), NOT a random or an indie dev
- "competition": rough guess "low" | "medium" | "high" (how hard to rank — brandable/comparison/long-tail = low; broad head terms = high)
- "verdict": "write" (high ICP fit + winnable) | "maybe" | "skip"
- "angle": <=12 words on the article angle that would win this query for Treddit

Then pick the single best "write" query and give a 5-bullet article outline for it.

Return ONLY strict JSON: {"results":[{"query","intent","icpFit","competition","verdict","angle"}],"best":{"query","outline":["..."]}}`;

  try {
    const msg = await createMessage({ model: 'claude-haiku-4-5-20251001', max_tokens: 2500, messages: [{ role: 'user', content: prompt }] });
    const raw = (msg.content[0] as { type: string; text: string }).text;
    const parsed = JSON.parse(stripJson(raw)) as { results: Scored[]; best: { query: string; outline: string[] } };
    const results = (parsed.results || []).sort((a, b) => (b.icpFit ?? 0) - (a.icpFit ?? 0));
    return NextResponse.json({
      topic: q,
      autocompleteCount: candidates.length,
      usedFallback,
      results,
      best: parsed.best ?? null,
    });
  } catch (e) {
    console.error('[internal/seo]', e instanceof Error ? e.message : e);
    return NextResponse.json({ error: 'scoring_failed', message: 'Could not score that topic — try again.' }, { status: 502 });
  }
}
