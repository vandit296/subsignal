import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { getCompany, isLifetimeAccount } from '@/lib/upstash';
import { createMessage } from '@/lib/llm';

export const runtime = 'nodejs';
export const maxDuration = 120;

// Internal/experimental: builds an ICP → channels → posts mind map from the user's
// Command company profile. Owner-only for now (hidden tool); unlink keeps it off the
// product surface until we decide to ship it. Cached per user 24h.

async function redis(cmd: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd), cache: 'no-store',
    });
    return ((await r.json()) as { result: unknown }).result;
  } catch { return null; }
}

const strip = (s: string) => s.replace(/```json\s*/gi, '').replace(/```/g, '').trim();

export async function GET(req: NextRequest) {
  const session = await getSession();
  const email = session?.user?.email;
  if (!email) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isLifetimeAccount(email)) return NextResponse.json({ error: 'This internal tool is owner-only for now.' }, { status: 403 });

  const company = await getCompany(email);
  if (!company?.description) {
    return NextResponse.json({ error: 'No company found. Set up your product in Command first.' }, { status: 400 });
  }

  const rebuild = new URL(req.url).searchParams.get('rebuild') === '1';
  const key = `treddit:mindmap:${email.toLowerCase()}`;
  if (!rebuild) {
    const c = (await redis(['GET', key])) as string | null;
    if (c) { try { return NextResponse.json({ ...JSON.parse(c), cached: true }); } catch { /* rebuild */ } }
  }

  const c = company as { name?: string; description?: string; goal?: string; idealUser?: string };
  const prompt = `You map a company's ideal customer to WHERE they post on Reddit and WHAT they post — to find engagement opportunities. Output strict JSON only.

COMPANY: "${c.name || 'This company'}"
WHAT IT DOES: "${c.description}"
${c.goal ? `GOAL: "${c.goal}"` : ''}
${c.idealUser ? `IDEAL USER: "${c.idealUser}"` : ''}

Produce this tree:
{
 "company": "name",
 "what": "one concise line on what they do",
 "segments": [
   {
     "icp": "a specific customer segment",
     "note": "<=8 words on who they are",
     "subreddits": [
       { "sub": "real subreddit name, no r/",
         "posts": [
           {"tag":"trigger","query":"2-5 word topic","text":"a realistic post title this person writes that signals a pain THIS product directly relieves — phrased as the user would, and they do NOT mention the product"},
           {"tag":"adjacent","query":"2-5 word topic","text":"a related pain — not a direct buy signal, but good to help/build trust"},
           {"tag":"noise","query":"2-5 word topic","text":"something this exact ICP posts that is NOT an opportunity — their identity, but no path to the product"}
         ]
       }
     ]
   }
 ]
}
Rules: 3-4 segments. 2-3 subreddits per segment. 3-4 posts per subreddit with a MIX of tags (at least one "trigger"). "trigger" must be a pain the product solves, in the user's own words, never naming the product. "query" is a short 2-5 word topic phrase (the concept, not the full sentence) to feed a monitoring tool. Output JSON only, no markdown.`;

  let tree: unknown;
  try {
    const msg = await createMessage({ model: 'claude-haiku-4-5-20251001', max_tokens: 2600, messages: [{ role: 'user', content: prompt }] });
    tree = JSON.parse(strip((msg.content[0] as { type: string; text: string }).text));
  } catch {
    return NextResponse.json({ error: 'Could not build the map. Try again (add &rebuild=1).' }, { status: 500 });
  }

  await redis(['SET', key, JSON.stringify(tree), 'EX', String(24 * 3600)]);
  return NextResponse.json({ ...(tree as object), cached: false });
}
