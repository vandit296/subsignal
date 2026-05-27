import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getCompany, saveBrief } from '@/lib/upstash';
import type { WeeklyBrief, BriefStory } from '@/lib/upstash';
import Anthropic from '@anthropic-ai/sdk';

// Allow up to 60s on Vercel Pro (Arctic Shift + Claude can take ~20s)
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  score: number;
  num_comments: number;
  subreddit: string;
  permalink: string;
  url: string;
  created_utc: number;
  author: string;
}

async function fetchWeeklyPosts(subreddit: string): Promise<RedditPost[]> {
  const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 86400;
  const url = `https://arctic-shift.photon-reddit.com/api/posts/search?subreddit=${encodeURIComponent(subreddit)}&limit=100&after=${sevenDaysAgo}&sort=desc`;
  try {
    const res = await fetch(url, { cache: 'no-store' });
    if (!res.ok) return [];
    const data = await res.json();
    return (data.data || []) as RedditPost[];
  } catch {
    return [];
  }
}

function rankPost(post: RedditPost): number {
  const ageHours = (Date.now() / 1000 - post.created_utc) / 3600;
  return (post.score + post.num_comments * 3) / Math.sqrt(ageHours + 2);
}

function getWeekLabel(): string {
  const now = new Date();
  const month = now.toLocaleString('en-US', { month: 'long' });
  const day = now.getDate();
  return `Week of ${month} ${day}`;
}

export async function POST(req: NextRequest) {
  // Auth: session user OR cron secret with email in body
  let email: string | null = null;

  const authHeader = req.headers.get('authorization');
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    const body = await req.json().catch(() => ({}));
    email = body.email || null;
  } else {
    const session = await getServerSession(authOptions);
    email = session?.user?.email || null;
  }

  if (!email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get user's company profile for subreddits
  const company = await getCompany(email);
  if (!company || !company.subreddits || company.subreddits.length === 0) {
    return NextResponse.json({ error: 'No subreddits configured — set them up in Command settings first.' }, { status: 400 });
  }

  const subreddits = company.subreddits.slice(0, 8);

  // Fetch posts from all subreddits in parallel
  const allPostsNested = await Promise.all(subreddits.map(fetchWeeklyPosts));
  const allPosts: (RedditPost & { _rank: number })[] = [];

  for (const posts of allPostsNested) {
    for (const post of posts) {
      // Low thresholds — just filter out truly dead posts and removed content
      if (post.score < 5 || post.num_comments < 2) continue;
      if (!post.title || post.title === '[removed]' || post.title === '[deleted]') continue;
      if (post.selftext === '[removed]' || post.selftext === '[deleted]') continue;
      allPosts.push({ ...post, _rank: rankPost(post) });
    }
  }

  // Sort by rank descending
  allPosts.sort((a, b) => b._rank - a._rank);

  // Pick top 10 with subreddit diversity (max 3 per subreddit)
  const subredditCount: Record<string, number> = {};
  const topPosts: typeof allPosts = [];
  for (const post of allPosts) {
    const sub = post.subreddit.toLowerCase();
    subredditCount[sub] = (subredditCount[sub] || 0) + 1;
    if (subredditCount[sub] > 3) continue;
    topPosts.push(post);
    if (topPosts.length >= 10) break;
  }

  if (topPosts.length === 0) {
    return NextResponse.json({ error: 'No posts found this week across your tracked subreddits. Try again later.' }, { status: 422 });
  }

  // Build Claude prompt
  const postsForPrompt = topPosts.map((p, i) => ({
    index: i,
    subreddit: p.subreddit,
    title: p.title,
    body: (p.selftext || '').slice(0, 600),
    score: p.score,
    comments: p.num_comments,
    url: `https://reddit.com${p.permalink}`,
  }));

  const prompt = `You are a senior editor at a tech news outlet. Transform these Reddit threads into concise news stories for a weekly intelligence brief.

For each thread, assign a "beat" type:
- "trending": viral, high-engagement story
- "debate": controversial or polarizing discussion
- "signal": early market/tech signal worth watching
- "deep": nuanced, long-form insight
- "breaking": time-sensitive news or announcement

Return a JSON array of objects, one per input thread (preserve index order):
{
  "index": number,
  "beat": "trending"|"debate"|"signal"|"deep"|"breaking",
  "headline": "compelling 8-12 word headline (no clickbait)",
  "lede": "2-3 sentence news lede, journalism style",
  "pullQuote": "most compelling verbatim-style quote or stat from the thread (optional, omit if nothing stands out)",
  "pullQuoteAuthor": "u/username if quote is from a specific commenter (optional)",
  "whyItMatters": "1-2 sentence analyst take: why founders/builders should care"
}

Threads:
${JSON.stringify(postsForPrompt, null, 2)}

Return ONLY valid JSON array. No markdown, no extra text.`;

  let stories: BriefStory[] = [];

  try {
    const response = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });

    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    // Strip any accidental markdown code fences
    const cleaned = text.replace(/^```json\n?/, '').replace(/\n?```$/, '').trim();
    const parsed = JSON.parse(cleaned) as Array<{
      index: number;
      beat: BriefStory['beat'];
      headline: string;
      lede: string;
      pullQuote?: string;
      pullQuoteAuthor?: string;
      whyItMatters: string;
    }>;

    // Build stories with beat diversity (max 2 per beat), take top 6
    const beatCount: Record<string, number> = {};
    for (const item of parsed) {
      const post = topPosts[item.index];
      if (!post) continue;
      const beat = item.beat || 'trending';
      beatCount[beat] = (beatCount[beat] || 0) + 1;
      if (beatCount[beat] > 2) continue;

      stories.push({
        beat,
        headline: item.headline,
        subreddit: post.subreddit,
        lede: item.lede,
        pullQuote: item.pullQuote,
        pullQuoteAuthor: item.pullQuoteAuthor,
        whyItMatters: item.whyItMatters,
        url: `https://reddit.com${post.permalink}`,
        upvotes: post.score,
        comments: post.num_comments,
      });

      if (stories.length >= 6) break;
    }
  } catch (err) {
    console.error('[brief/generate] AI error:', err);
    return NextResponse.json({ error: `AI generation failed: ${String(err)}` }, { status: 500 });
  }

  if (stories.length === 0) {
    return NextResponse.json({ error: 'AI returned no stories. Please try again.' }, { status: 422 });
  }

  const brief: WeeklyBrief = {
    generatedAt: new Date().toISOString(),
    weekLabel: getWeekLabel(),
    postsScanned: allPosts.length,
    subredditsScanned: subreddits.length,
    stories,
  };

  await saveBrief(email, brief);

  return NextResponse.json({ ok: true, brief });
}
