import { AlertConfig, AppUser, CompanyProfile, ScoredThread, SubredditAnalysis } from '@/types';

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
  // V2 user keys
  user:           (email: string) => `subsignal:user:${email.toLowerCase()}`,
  company:        (userId: string) => `subsignal:company:${userId.toLowerCase()}`,
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

// ── V2: User & Company ────────────────────────────────────────────────────────

const TRIAL_DAYS = 3;

export async function getUser(email: string): Promise<AppUser | null> {
  const raw = await redis(['GET', KEYS.user(email)]) as string | null;
  if (!raw) return null;
  return JSON.parse(raw) as AppUser;
}

export async function upsertUser(data: Partial<AppUser> & { email: string }): Promise<AppUser> {
  const existing = await getUser(data.email);
  const now = new Date().toISOString();
  const trialStart = existing?.trialStartAt ?? now;
  const trialEnd = new Date(new Date(trialStart).getTime() + TRIAL_DAYS * 86400_000);
  const isTrialActive = new Date() < trialEnd;

  const user: AppUser = {
    id: data.email,
    email: data.email,
    name: data.name ?? existing?.name ?? '',
    image: data.image ?? existing?.image,
    trialStartAt: trialStart,
    subscriptionStatus: existing?.subscriptionStatus === 'active'
      ? 'active'
      : isTrialActive ? 'trial' : 'expired',
    subscriptionId: data.subscriptionId ?? existing?.subscriptionId,
    customerId: data.customerId ?? existing?.customerId,
    onboardingComplete: data.onboardingComplete ?? existing?.onboardingComplete ?? false,
    createdAt: existing?.createdAt ?? now,
  };
  await redis(['SET', KEYS.user(data.email), JSON.stringify(user)]);
  return user;
}

export async function activateSubscription(
  email: string,
  subscriptionId: string,
  customerId: string,
  periodEnd: string
): Promise<void> {
  const user = await getUser(email);
  if (!user) return;
  const updated: AppUser = {
    ...user,
    subscriptionStatus: 'active',
    subscriptionId,
    customerId,
  };
  await redis(['SET', KEYS.user(email), JSON.stringify(updated)]);
  // Store current period end separately for quick lookup in middleware
  await redis(['SET', `subsignal:sub-end:${email}`, periodEnd, 'EX', String(90 * 86400)]);
}

export async function cancelSubscription(email: string): Promise<void> {
  const user = await getUser(email);
  if (!user) return;
  const updated: AppUser = { ...user, subscriptionStatus: 'cancelled' };
  await redis(['SET', KEYS.user(email), JSON.stringify(updated)]);
}

export async function getCompany(userId: string): Promise<CompanyProfile | null> {
  const raw = await redis(['GET', KEYS.company(userId)]) as string | null;
  if (!raw) return null;
  return JSON.parse(raw) as CompanyProfile;
}

export async function saveCompany(profile: CompanyProfile): Promise<void> {
  await redis(['SET', KEYS.company(profile.userId), JSON.stringify(profile)]);
}

// Helper: check if a user's trial or subscription is still valid
export function isAccessGranted(user: AppUser): boolean {
  if (user.subscriptionStatus === 'active') return true;
  if (user.subscriptionStatus === 'trial') {
    const trialEnd = new Date(user.trialStartAt).getTime() + TRIAL_DAYS * 86400_000;
    return Date.now() < trialEnd;
  }
  return false;
}

// Helper: get days remaining in trial
export function trialDaysRemaining(user: AppUser): number {
  const trialEnd = new Date(user.trialStartAt).getTime() + TRIAL_DAYS * 86400_000;
  const ms = trialEnd - Date.now();
  return Math.max(0, Math.ceil(ms / 86400_000));
}
