import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const BASE = 'https://arctic-shift.photon-reddit.com';

interface RawPost {
  id: string;
  title: string;
  score: number;
  num_comments: number;
  created_utc: number;
  url: string;
  subreddit: string;
  is_self: boolean;
  link_flair_text?: string;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const subreddit = searchParams.get('subreddit')?.replace(/^r\//, '').trim();
  const idea = searchParams.get('idea')?.trim();

  if (!subreddit || !idea) {
    return NextResponse.json({ error: 'subreddit and idea required' }, { status: 400 });
  }

  // Fetch top posts from the subreddit
  const res = await fetch(
    `${BASE}/api/posts/search?subreddit=${encodeURIComponent(subreddit)}&limit=auto&after=1year&sort=desc`,
    { headers: { Accept: 'application/json' }, cache: 'no-store' }
  ).catch(() => null);

  if (!res?.ok) {
    return NextResponse.json({ error: 'Could not fetch subreddit data' }, { status: 500 });
  }

  const json = await res.json();
  const posts: RawPost[] = ((json.data ?? []) as RawPost[])
    .sort((a, b) => b.score - a.score)
    .slice(0, 60);

  const postList = posts
    .map((p, i) => `[${i}] score:${p.score} | "${p.title}" | flair:${p.link_flair_text ?? 'none'}`)
    .join('\n');

  const prompt = `You are helping a founder find inspiration for their Reddit post.

THEIR POST IDEA:
"${idea}"

TARGET SUBREDDIT: r/${subreddit}

TOP POSTS FROM THIS SUBREDDIT (sorted by score):
${postList}

Find the 5 posts that are most similar in topic, angle, or tone to the founder's idea. These will serve as inspiration — showing what format and framing worked well.

Also identify the dominant tone/style for this type of post (e.g. "story-driven", "data-backed", "question format", "confession style", "milestone share").

Return ONLY valid JSON (no markdown):
{
  "tone": "<1 phrase describing the winning tone for this type of post in r/${subreddit}>",
  "toneAdvice": "<2 sentences on how to nail the tone and framing for this specific post idea in this subreddit>",
  "similarPosts": [
    { "index": <N>, "why": "<1 sentence: what makes this a good reference for the founder's idea>" },
    { "index": <N>, "why": "..." },
    { "index": <N>, "why": "..." },
    { "index": <N>, "why": "..." },
    { "index": <N>, "why": "..." }
  ]
}`;

  try {
    const message = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 800,
      messages: [{ role: 'user', content: prompt }],
    });

    const raw = (message.content[0] as { type: string; text: string }).text.trim();
    const parsed = JSON.parse(raw.replace(/^```json?\n?/, '').replace(/\n?```$/, ''));

    const similar = parsed.similarPosts
      .filter((s: { index: number }) => s.index < posts.length)
      .map((s: { index: number; why: string }) => {
        const p = posts[s.index];
        return {
          title: p.title,
          score: p.score,
          numComments: p.num_comments,
          url: p.is_self
            ? `https://reddit.com/r/${p.subreddit}/comments/${p.id}`
            : p.url,
          flair: p.link_flair_text ?? null,
          createdUtc: p.created_utc,
          why: s.why,
        };
      });

    return NextResponse.json({
      subreddit,
      idea,
      tone: parsed.tone,
      toneAdvice: parsed.toneAdvice,
      similarPosts: similar,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
