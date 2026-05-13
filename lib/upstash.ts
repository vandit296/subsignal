import { AlertConfig, ScoredThread, SubredditAnalysis } from '@/types';

// Upstash Redis via direct REST — no SDK, no package dependency
async function redis(command: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN must be set in environment variables');
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.UPSTASH_REDIS_REST_TOKEN!}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(command),
    cache: 'no-store',
  });
  const json = await res.json() as { result: unknown; error?: string };
  if (json.error) throw new Error(`Redis error: ${json.error}`);
  return json.result;
}

// TTL in seconds per period — shorter windows get shorter cache (data changes faster)
const PERIOD_TTL: Record<string, number> = {
  '1week':   60 * 60,          // 1 hour
  '1month':  60 * 60 * 3,      // 3 hours
  '3months': 60 * 60 * 6,      // 6 hours
  '1year':   60 * 60 * 12,     // 12 hours
  'alltime': 60 * 60 * 12,     // 12 hours
};

const KEYS = {
  alertConfig:    'subsignal:alert-config',
  seenThreads:    'subsignal:seen-threads',
  threads:        (sub: string) => `subsignal:threads:${sub.toLowerCase()}`,
  analysis:       (sub: string, period: string) =>
    `subsignal:analysis:${sub.toLowerCase()}:${period}`,
};

// ── Alert Config ─────────────────────────────────────────────────────────────

export async function getAlertConfig(): Promise<AlertConfig | null> {
  const raw = await redis(['GET', KEYS.alertConfig]) as string | null;
  if (!raw) return null;
  return JSON.parse(raw) as AlertConfig;
}

export async function saveAlertConfig(config: AlertConfig): Promise<void> {
  await redis(['SET', KEYS.alertConfig, JSON.stringify(config)]);
}

// ── Relevant Threads ──────────────────────────────────────────────────────────

export async function getRelevantThreads(subreddit: string): Promise<ScoredThread[]> {
  const raw = await redis(['GET', KEYS.threads(subreddit)]) as string | null;
  if (!raw) return [];
  return JSON.parse(raw) as ScoredThread[];
}

export async function saveRelevantThreads(subreddit: string, threads: ScoredThread[]): Promise<void> {
  // Cache for 24 hours (86400 seconds)
  await redis(['SET', KEYS.threads(subreddit), JSON.stringify(threads), 'EX', '86400']);
}

// ── Seen Thread Deduplication ─────────────────────────────────────────────────

export async function markThreadsSeen(threadIds: string[]): Promise<void> {
  if (threadIds.length === 0) return;
  await redis(['SADD', KEYS.seenThreads, ...threadIds]);
  await redis(['EXPIRE', KEYS.seenThreads, String(7 * 86400)]);
}

export async function filterUnseenThreads(threadIds: string[]): Promise<string[]> {
  if (threadIds.length === 0) return [];
  const checks = await Promise.all(
    threadIds.map(id => redis(['SISMEMBER', KEYS.seenThreads, id]))
  );
  return threadIds.filter((_, i) => checks[i] === 0);
}

// ── Analysis Cache ────────────────────────────────────────────────────────────

export async function getCachedAnalysis(
  subreddit: string,
  period: string
): Promise<(SubredditAnalysis & { cached: true; cachedAt: string }) | null> {
  const raw = await redis(['GET', KEYS.analysis(subreddit, period)]) as string | null;
  if (!raw) return null;
  return JSON.parse(raw);
}

export async function cacheAnalysis(
  subreddit: string,
  period: string,
  data: object
): Promise<void> {
  const ttl = PERIOD_TTL[period] ?? 60 * 60 * 6;
  const payload = JSON.stringify({ ...data, cached: true, cachedAt: new Date().toISOString() });
  await redis(['SET', KEYS.analysis(subreddit, period), payload, 'EX', String(ttl)]);
}
