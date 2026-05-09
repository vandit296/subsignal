import { Redis } from '@upstash/redis';
import { AlertConfig, ScoredThread } from '@/types';

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

const KEYS = {
  alertConfig: 'subsignal:alert-config',
  seenThreads: 'subsignal:seen-threads',          // Redis Set of thread IDs already sent
  relevantThreads: (sub: string) => `subsignal:threads:${sub.toLowerCase()}`,
};

// ── Alert Config ─────────────────────────────────────────────────────────────

export async function getAlertConfig(): Promise<AlertConfig | null> {
  const raw = await redis.get<AlertConfig>(KEYS.alertConfig);
  return raw ?? null;
}

export async function saveAlertConfig(config: AlertConfig): Promise<void> {
  await redis.set(KEYS.alertConfig, config);
}

// ── Relevant Threads ──────────────────────────────────────────────────────────

export async function getRelevantThreads(subreddit: string): Promise<ScoredThread[]> {
  const raw = await redis.get<ScoredThread[]>(KEYS.relevantThreads(subreddit));
  return raw ?? [];
}

export async function saveRelevantThreads(
  subreddit: string,
  threads: ScoredThread[]
): Promise<void> {
  // Keep for 24 hours
  await redis.set(KEYS.relevantThreads(subreddit), threads, { ex: 86400 });
}

// ── Seen Thread Deduplication ─────────────────────────────────────────────────

export async function markThreadsSeen(threadIds: string[]): Promise<void> {
  if (threadIds.length === 0) return;
  await redis.sadd(KEYS.seenThreads, ...threadIds);
  // Expire the set after 7 days so it doesn't grow forever
  await redis.expire(KEYS.seenThreads, 7 * 86400);
}

export async function filterUnseenThreads(threadIds: string[]): Promise<string[]> {
  if (threadIds.length === 0) return [];
  const results = await Promise.all(
    threadIds.map(id => redis.sismember(KEYS.seenThreads, id))
  );
  return threadIds.filter((_, i) => !results[i]);
}
