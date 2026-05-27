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
  // Non-empty results cached for 24h; empty results cached for 2h so they retry sooner
  const ttl = threads.length > 0 ? 86400 : 7200;
  await redis(['SET', KEYS.threads(subreddit), JSON.stringify(threads), 'EX', String(ttl)]);
}

export async function clearRelevantThreads(subreddit: string): Promise<void> {
  await redis(['DEL', KEYS.threads(subreddit)]);
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

// ── Lifetime / founder accounts — always treated as active paid ───────────────
// Add any email here to give permanent full access without payment.
const LIFETIME_EMAILS = new Set([
  'vandit296@gmail.com',
]);

export function isLifetimeAccount(email: string): boolean {
  return LIFETIME_EMAILS.has(email.toLowerCase());
}

// ── V2: User & Company — ────────────────────────────────────────────────────────

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
    subscriptionStatus: isLifetimeAccount(data.email) || existing?.subscriptionStatus === 'active'
      ? 'active'
      : isTrialActive ? 'trial' : 'expired',
    subscriptionId: data.subscriptionId ?? existing?.subscriptionId,
    customerId: data.customerId ?? existing?.customerId,
    onboardingComplete: data.onboardingComplete ?? existing?.onboardingComplete ?? false,
    createdAt: existing?.createdAt ?? now,
  };
  await redis(['SET', KEYS.user(data.email), JSON.stringify(user)]);
  await registerUserForBrief(data.email);
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
  if (isLifetimeAccount(user.email)) return true;
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

// ── Per-user Alert Settings ──────────────────────────────────────────────────

export interface UserAlertSettings {
  globalEnabled: boolean;
  timezone: string;             // IANA timezone, e.g. "Asia/Kolkata"
  scoutDigest: {
    enabled: boolean;
    deliveryTime: string;       // e.g. "07:00" in user's local timezone
    days: string[];             // e.g. ["mon","tue","wed","thu","fri"]
  };
  keywordWatch: {
    enabled: boolean;
    mode: 'realtime' | 'hourly' | 'daily';
    minScore: number;           // 1–10
    keywords: string[];
  };
  signalFeed: {
    enabled: boolean;
    frequency: 'daily' | 'weekly';
    categories: string[];       // ideal_user | competition | industry | interesting
  };
  opportunityAlerts: {
    enabled: boolean;
  };
  weeklyReport: {
    enabled: boolean;
    sendDay: string;            // e.g. "sunday"
  };
  updatedAt: string;
}

export const DEFAULT_ALERT_SETTINGS: UserAlertSettings = {
  globalEnabled: true,
  timezone: 'UTC',              // overwritten by client on first save
  scoutDigest: {
    enabled: true,
    deliveryTime: '07:00',
    days: ['mon', 'tue', 'wed', 'thu', 'fri'],
  },
  keywordWatch: {
    enabled: true,
    mode: 'realtime',
    minScore: 7,
    keywords: [],
  },
  signalFeed: {
    enabled: true,
    frequency: 'weekly',
    categories: ['ideal_user', 'competition', 'industry', 'interesting'],
  },
  opportunityAlerts: { enabled: false },
  weeklyReport: { enabled: true, sendDay: 'sunday' },
  updatedAt: new Date().toISOString(),
};

export async function getAlertSettings(email: string): Promise<UserAlertSettings> {
  const raw = await redis(['GET', `treddit:alert-settings:${email}`]) as string | null;
  if (!raw) return DEFAULT_ALERT_SETTINGS;
  try { return { ...DEFAULT_ALERT_SETTINGS, ...JSON.parse(raw) } as UserAlertSettings; }
  catch { return DEFAULT_ALERT_SETTINGS; }
}

export async function saveAlertSettings(email: string, settings: UserAlertSettings): Promise<void> {
  await redis(['SET', `treddit:alert-settings:${email}`, JSON.stringify(aettings)]);
}

// ── Watchlist ─────────────────────────────────────────────────────────────────

export async function getWatchlist(email: string): Promise<string[]> {
  const raw = await redis(['GET', `treddit:watchlist:${email}`]) as string | null;
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; } catch { return []; }
}

export async function addToWatchlist(email: string, subreddit: string): Promise<void> {
  const current = await getWatchlist(email);
  if (!current.includes(subreddit)) {
    await redis(['SET', `treddit:watchlist:${email}`, JSON.stringify([subreddit, ...current])]);
  }
}

export async function removeFromWatchlist(email: string, subreddit: string): Promise<void> {
  const current = await getWatchlist(email);
  await redis(['SET', `treddit:watchlist:${email}`, JSON.stringify(current.filter(s => s !== subreddit))]);
}

// ── Free tier helpers ─────────────────────────────────────────────────────────

export const FREE_SCOUT_LIMIT = 3; // reports per calendar month

/** Returns true if the user's trial has expired and they're not on a paid plan */
export function isFreeTierUser(user: AppUser): boolean {
  if (isLifetimeAccount(user.email)) return false;
  if (user.subscriptionStatus === 'active') return false;
  const trialEnd = new Date(user.trialStartAt).getTime() + 3 * 86_400_000;
  return Date.now() > trialEnd;
}

// ── Scout usage tracking ──────────────────────────────────────────────────────

function scoutUsageKey(email: string): string {
  const month = new Date().toISOString().slice(0, 7); // "2026-05"
  return `treddit:scout-usage:${email.toLowerCase()}:${month}`;
}

export async function getScoutUsageThisMonth(email: string): Promise<number> {
  const raw = await redis(['GET', scoutUsageKey(email)]) as string | null;
  return raw ? parseInt(raw, 10) : 0;
}

export async function incrementScoutUsage(email: string): Promise<number> {
  const key = scoutUsageKey(email);
  const newVal = await redis(['INCR', key]) as number;
  // Expire after 35 days so it self-cleans (always covers the full month)
  if (newVal === 1) await redis(['EXPIRE', key, String(35 * 86_400)]);
  return newVal;
}

// ── Morning Brief ─────────────────────────────────────────────────────────────

export interface BriefThread {
  id: string;
  title: string;
  subreddit: string;
  score: number;        // Reddit upvotes
  numComments: number;
  url: string;
  createdUtc: number;
}

export interface BriefNarrative {
  id: string;
  type: 'hero' | 'signal' | 'tension' | 'mood';
  headline: string;
  synthesis: string;         // editorial paragraph(s) — \n\n separated for hero
  implication: string;       // brief editorial implication sentence
  strength: 1 | 2 | 3 | 4 | 5;
  threads: BriefThread[];
  subreddits: string[];      // unique subreddits contributing
  totalUpvotes: number;
}

export interface MarketPulseItem {
  label: string;
  change: number;            // percentage change (positive or negative)
}

export interface DailyBrief {
  userId: string;
  date: string;              // YYYY-MM-DD
  edition: number;
  generatedAt: string;
  hero: BriefNarrative;
  signals: BriefNarrative[];   // 3-4 side signals
  pulse: MarketPulseItem[];
  subreddits: string[];
  threadCount: number;
  narrativeCount: number;
}

function briefKey(email: string, date: string) {
  return `treddit:brief:${email.toLowerCase()}:${date}`;
}

function briefEditionKey(email: string) {
  return `treddit:brief-edition:${email.toLowerCase()}`;
}

export async function saveBrief(email: string, brief: DailyBrief): Promise<void> {
  const key = briefKey(email, brief.date);
  await redis(['SET', key, JSON.stringify(brief), 'EX', String(7 * 86400)]); // 7 day TTL
}

export async function getBrief(email: string, date: string): Promise<DailyBrief | null> {
  const raw = await redis(['GET', briefKey(lowerCase, date)]) as string | null;
  if (!raw) return null;
  try { return JSON.parse(raw) as DailyBrief; } catch { return null; }
}

export async function getNextEditionNumber(email: string): Promise<number> {
  const n = await redis(['INCR', briefEditionKey(email)]) as number;
  return n;
}

// ── User registry (for cron "all users" delivery) ────────────────────────────

export async function registerUserForBrief(email: string): Promise<void> {
  await redis(['SADD', 'treddit:brief-users', email.toLowerCase()]);
}

export async function getAllBriefUsers(): Promise<string[]> {
  const users = await redis(['SMEMBERS', 'treddit:brief-users']) as string[];
  return users ?? [];
}

// ── Brief viewed tracking ─────────────────────────────────────────────────────

export async function markBriefViewed(email: string, date: string): Promise<void> {
  await redis(['SET', `treddit:brief-viewed:${email.toLowerCase()}:${date}`, '1', 'EX', String(7 * 86400)]);
}

export async function hasBriefBeenViewed(email: string, date: string): Promise<boolean> {
  const v = await redis(['GET', `treddit:brief-viewed:${email.toLowerCase()}:${date}`]) as string | null;
  return v === '1';
}

export async function hasBriefForToday(email: string): Promise<boolean> {
  const today = new Date().toISOString().slice(0, 10);
  const brief = await getBrief(email, today);
  return brief !== null;
}
