import { NextRequest, NextResponse } from 'next/server';
import { getCompany, saveRelevantThreads } from '@/lib/upstash';
import { scoreThreadsForProduct } from '@/lib/thread-scorer';
import { sendKeywordAlert } from '@/lib/email';
import { ScoredThread } from '@/types';

// Daily digest — runs every morning at 8 AM IST (2:30 AM UTC).
// Always sends the top scored threads from the last 24h regardless of
// whether they were seen before — this is a digest, not a real-time alert.

const FOUNDER_EMAIL = 'vandit296@gmail.com';
const MIN_SCORE = 6;   // only include threads scoring 6+
const MAX_THREADS = 15; // cap digest length

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const config = await getCompany(FOUNDER_EMAIL);
  if (!config?.description || !config.subreddits?.length) {
    return NextResponse.json({ message: 'No company config — set up your product in /command' });
  }

  const results: Record<string, number> = {};
  const allThreads: ScoredThread[] = [];

  for (const subreddit of config.subreddits) {
    try {
      const threads = await scoreThreadsForProduct(
        subreddit,
        config.description,
        config.goal ?? '',
        config.idealUser
      );
      await saveRelevantThreads(subreddit, threads);
      results[subreddit] = threads.length;
      allThreads.push(...threads);
      console.log(`[daily-digest] r/${subreddit}: ${threads.length} threads`);
    } catch (err) {
      console.error(`[daily-digest] r/${subreddit} failed:`, err);
      results[subreddit] = -1;
    }
  }

  // Pick the best threads across all subreddits for the digest
  const digestThreads = allThreads
    .filter(t => t.relevanceScore >= MIN_SCORE)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, MAX_THREADS);

  let emailStatus = 'no qualifying threads';

  if (digestThreads.length > 0) {
    try {
      await sendKeywordAlert({
        to: FOUNDER_EMAIL,
        productDescription: config.description,
        threads: digestThreads,
      });
      emailStatus = `sent ${digestThreads.length} threads to ${FOUNDER_EMAIL}`;
    } catch (err) {
      console.error('[daily-digest] Email failed:', err);
      emailStatus = `failed: ${String(err)}`;
    }
  }

  console.log(`[daily-digest] Done. ${digestThreads.length} in digest. Email: ${emailStatus}`);
  return NextResponse.json({ ok: true, subreddits: results, digestCount: digestThreads.length, email: emailStatus });
}
