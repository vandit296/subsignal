// Subreddit Pool — grows automatically over time
//
// Strategy:
//  1. SUBREDDIT_CANDIDATES: ~400 curated subreddits, ordered by relevance
//  2. Redis counter tracks how many are "active" (unlocked)
//  3. Daily cron calls expandPool(25) to unlock the next batch
//  4. Organic discovery: subreddits found in search results are auto-added
//  5. Each keyword search uses: user's configured subs + random sample from pool
//
// At 25/day: 400 candidates unlocked in ~16 days. Organic discovery adds 100s more.

// ── Redis helpers (reuse same pattern as upstash.ts) ─────────────────────────

async function redis(command: unknown[]): Promise<unknown> {
  const url   = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) throw new Error('Redis env vars not set');
  const res  = await fetch(url, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body:    JSON.stringify(command),
    cache:   'no-store',
  });
  const json = await res.json() as { result: unknown; error?: string };
  if (json.error) throw new Error(`Redis: ${json.error}`);
  return json.result;
}

const POOL_COUNT_KEY    = 'treddit:subreddit-pool:count';
const POOL_DISCOVERED   = 'treddit:subreddit-pool:discovered'; // Redis SET

// ── Candidate list (~400 subreddits, ordered by relevance to Treddit's ICP) ──

const RAW_CANDIDATES: string[] = [
  // ── Entrepreneurship & Startups ──────────────────────────────────────────
  'entrepreneur', 'Entrepreneur', 'startups', 'indiehackers', 'SideProject',
  'smallbusiness', 'business', 'EntrepreneurRideAlong', 'startupadvice',
  'buildinpublic', 'microsaas', 'SaaS', 'sweatystartup', 'juststart',
  'roastmystartup', 'alphaandbetausers', 'IMadeThis', 'SomebodyMakeThis',
  'Entrepreneur_ideas', 'founderopedy', 'startup', 'ecommerce', 'dropshipping',
  'AmazonFBA', 'shopify', 'Etsy', 'FulfillmentByAmazon', 'passive_income',

  // ── SaaS / Product / No-Code ─────────────────────────────────────────────
  'ProductHunt', 'software', 'AppBusiness', 'nocode', 'lowcode', 'webapps',
  'webapp', 'SaaSy', 'SaaSMarketing', 'productmanagement', 'product_design',
  'ProductManagement', 'agile', 'scrum', 'UserResearch',

  // ── Web Dev / Engineering ────────────────────────────────────────────────
  'webdev', 'programming', 'javascript', 'typescript', 'Python', 'node',
  'reactjs', 'nextjs', 'svelte', 'vue', 'angular', 'coding', 'learnprogramming',
  'learnjavascript', 'learnpython', 'Frontend', 'backend', 'fullstack',
  'css', 'html', 'webdesign', 'Web_Development', 'softwaredevelopment',
  'ExperiencedDevs', 'cscareerquestions', 'csMajors', 'compsci',
  'java', 'golang', 'rust', 'cpp', 'csharp', 'php', 'ruby', 'swift', 'kotlin',

  // ── DevOps / Cloud / Infra ───────────────────────────────────────────────
  'devops', 'aws', 'googlecloud', 'azure', 'kubernetes', 'docker', 'terraform',
  'selfhosted', 'homelab', 'linux', 'opensource', 'sysadmin', 'networking',
  'serverless', 'microservices', 'DatabaseAdministration', 'PostgreSQL', 'redis',

  // ── AI / ML ──────────────────────────────────────────────────────────────
  'MachineLearning', 'artificial', 'datascience', 'deeplearning', 'OpenAI',
  'ChatGPT', 'LocalLLaMA', 'AItools', 'artificial_intelligence', 'Bard',
  'ClaudeAI', 'PromptEngineering', 'singularity', 'compsci', 'LangChain',
  'learnmachinelearning', 'MLQuestions', 'computervision', 'NLP',

  // ── Marketing & Growth ───────────────────────────────────────────────────
  'marketing', 'digital_marketing', 'SEO', 'socialmedia', 'content_marketing',
  'growthhacking', 'PPC', 'FacebookAds', 'GoogleAds', 'emailmarketing',
  'copywriting', 'analytics', 'affiliate', 'affiliatemarketing',
  'Newsletters', 'blogging', 'podcasting', 'TikTokMarketing',
  'youtubers', 'YoutubeMarketing', 'socialmediamarketing', 'influencermarketing',
  'GrowthHacking', 'CustomerSuccess', 'sales', 'salestechniques', 'salesdevelopment',
  'salesforce', 'hubspot', 'CRMsoftware',

  // ── Design ───────────────────────────────────────────────────────────────
  'UI_Design', 'UX_Design', 'web_design', 'graphic_design', 'Figma',
  'Adobe', 'illustration', 'logodesign', 'branding', 'typography',
  'InteractionDesign', 'userexperience',

  // ── Finance / Investing ──────────────────────────────────────────────────
  'personalfinance', 'investing', 'financialindependence', 'Fire',
  'stocks', 'ValueInvesting', 'SecurityAnalysis', 'Accounting', 'fintech',
  'venturecapital', 'AngelInvesting', 'PrivateEquity', 'crowdfunding',
  'Kickstarter', 'smallbizfinance', 'entrepreneur_finance',

  // ── Career / Freelance / Remote ──────────────────────────────────────────
  'freelance', 'consulting', 'remotework', 'digitalnomad', 'WorkOnline',
  'forhire', 'Jobs', 'recruiting', 'humanresources', 'careerguidance',
  'developeronrent', 'freelancers', 'Upwork', 'Fiverr',

  // ── Productivity / Tools ─────────────────────────────────────────────────
  'productivity', 'gtd', 'selfimprovement', 'Notion', 'obsidian',
  'PKMS', 'zettelkasten', 'LifeProTips', 'Todoist', 'logseq',

  // ── B2B Verticals ────────────────────────────────────────────────────────
  // Legal
  'legaladvice', 'law', 'LegalTech',
  // HR / Recruiting
  'humanresources', 'recruiting', 'talentacquisition',
  // Real Estate / PropTech
  'realestateinvesting', 'RealEstate', 'airbnb', 'landlord',
  // Health / MedTech
  'healthIT', 'medicine', 'nursing', 'physicianassistant',
  // Education / EdTech
  'Teachers', 'education', 'edtech', 'onlineteaching',
  // Logistics
  'logistics', 'supplychain', 'trucking',
  // Finance / Fintech
  'Banking', 'fintech', 'cryptocurrency', 'Bitcoin', 'ethereum', 'DeFi',
  // Security / Privacy
  'cybersecurity', 'netsec', 'privacy', 'netsec',
  // Data / Analytics
  'dataengineering', 'BusinessIntelligence', 'PowerBI', 'tableau',

  // ── Mobile / Games ───────────────────────────────────────────────────────
  'androiddev', 'iOSProgramming', 'flutter', 'reactnative', 'xamarin',
  'gamedev', 'Unity3D', 'unrealengine', 'indiegaming', 'gamedesign',

  // ── Communities relevant to Treddit users ───────────────────────────────
  'Showerthoughts', 'LifeAdvice', 'Advice', 'CasualConversation',
  'AskReddit', 'NoStupidQuestions', 'explainlikeimfive',
  'todayilearned', 'mildlyinteresting', 'Futurology',
  'technology', 'tech', 'gadgets',

  // ── Writing / Content ────────────────────────────────────────────────────
  'writing', 'freelanceWriters', 'content_strategy', 'techwriting',
  'journalism', 'screenwriting',

  // ── Specific tools popular with founders ─────────────────────────────────
  'rails', 'django', 'laravel', 'wordpress', 'webflow', 'bubble',
  'zapier', 'airtable', 'supabase', 'firebase', 'vercel_', 'stripe',
  'twillio', 'sendgrid', 'intercom', 'zendesk', 'freshworks',

  // ── International / Regional founder communities ─────────────────────────
  'india', 'startupindia', 'IndiaTech', 'IndiaInvestments',
  'unitedkingdom', 'AusFinance', 'eupersonalfinance', 'germany',
  'canada', 'Singapore', 'bangalorestartups', 'hyderabadstartups',
  'gurgaon', 'developersIndia', 'ProgrammingBondha', 'olympiadindia',
  'ukstartups', 'PersonalFinanceZA', 'jovemedinamica', 'opiniaoimpopular',
  'KeineDummenFragen', 'SirApfelot',

  // ── User-added subreddits ─────────────────────────────────────────────────
  'advancedentrepreneur', 'angelinvestors', 'apachespark', 'ArtificialInteligence',
  'B2BSaaS', 'cofounderhunt', 'Coldemailing', 'dbt', 'DigitalMarketing',
  'Entrepreneurs', 'ExperiencedFounders', 'founder', 'GrowMyBusiness',
  'InsideAcquisitions', 'investingforbeginners', 'LLMPhysics', 'micro_saas',
  'reinforcementlearning', 'RoastMyStartup', 'sre', 'Startup_Ideas',
  'StartupSoloFounder', 'ukstartups', 'unusual_whales', 'vibecoding',
  'ycombinator', 'Startups_ideas', 'investors', 'Femalefounders',
  'TopAIReviews', 'MarketingAutomation', 'SpaceEconomyInvestors',
  'venturecapital', 'SurveyExchange', 'languagelearning', 'videoproduction',
  'wearables', 'esports', 'filmmakers', 'editors', 'sciencememes',
  'incremental_games', 'ambitionarena7', 'cumuluslabs', 'INAT',
];

// ── Core / priority subreddits — ALWAYS active and ALWAYS searched ────────────
// Curated high-value founder + VC + tech list. Unlike SUBREDDIT_CANDIDATES,
// these are NOT gated behind the daily unlock count — every keyword search hits
// all of them, so curated subs work immediately instead of waiting in the queue.
const RAW_CORE: string[] = [
  'advancedentrepreneur', 'ambitionarena7', 'AngelInvesting', 'angelinvestors', 'apachespark',
  'artificial', 'ArtificialInteligence', 'aws', 'B2BSaaS', 'bangalorestartups', 'buildinpublic',
  'cofounderhunt', 'Coldemailing', 'cscareerquestions', 'cumuluslabs', 'dataengineering', 'datascience',
  'dbt', 'developersIndia', 'devops', 'DigitalMarketing', 'duolingo', 'editors', 'Entrepreneur',
  'EntrepreneurRideAlong', 'Entrepreneurs', 'esports', 'ExperiencedDevs', 'ExperiencedFounders',
  'FacebookAds', 'filmmakers', 'founder', 'GPURestockAlerts', 'GrowMyBusiness', 'gurgaon',
  'hyderabadstartups', 'INAT', 'incremental_games', 'IndiaInvestments', 'indiehackers', 'influencermarketing',
  'InsideAcquisitions', 'investingforbeginners', 'jovemedinamica', 'KeineDummenFragen', 'kubernetes',
  'LangChain', 'languagelearning', 'learnprogramming', 'LLMPhysics', 'LocalLLaMA', 'MachineLearning',
  'micro_saas', 'microsaas', 'olympiadindia', 'opiniaoimpopular', 'PersonalFinanceZA', 'programming',
  'ProgrammingBondha', 'reinforcementlearning', 'RoastMyStartup', 'SaaS', 'sciencememes', 'SideProject',
  'SirApfelot', 'smallbusiness', 'SpaceEconomyInvestors', 'sre', 'StarBallGame', 'Startup_Ideas', 'startups',
  'StartupSoloFounder', 'SurveyExchange', 'Symbology', 'ukstartups', 'unusual_whales', 'venturecapital',
  'vibecoding', 'videoproduction', 'wearables', 'webdev', 'ycombinator', 'youtubers', 'Startups_ideas',
  'investors', 'startupindia', 'Femalefounders', 'TopAIReviews', 'MarketingAutomation', 'growthhacking',
];

// Case-insensitive dedup — the raw lists accumulated duplicates with different
// casing (e.g. 'growthhacking' vs 'GrowthHacking', 'entrepreneur' vs
// 'Entrepreneur'), which inflated the pool and double-scored the same community.
function dedupeCI(list: string[]): string[] {
  const seen = new Set<string>(); const out: string[] = [];
  for (const s of list) {
    const t = (s || '').trim(); if (!t) continue;
    const k = t.toLowerCase(); if (seen.has(k)) continue;
    seen.add(k); out.push(t);
  }
  return out;
}
export const SUBREDDIT_CANDIDATES: string[] = dedupeCI(RAW_CANDIDATES);
export const CORE_SUBREDDITS: string[] = dedupeCI(RAW_CORE);

// ── Public API ────────────────────────────────────────────────────────────────

/** How many candidates are currently unlocked */
export async function getPoolCount(): Promise<number> {
  try {
    const raw = await redis(['GET', POOL_COUNT_KEY]) as string | null;
    return raw ? parseInt(raw, 10) : 15; // start at 15 (covers the initial defaults)
  } catch {
    return 15;
  }
}

/** Unlock the next `n` subreddits. Called by daily cron. */
export async function expandPool(n = 25): Promise<{ previous: number; current: number }> {
  const previous = await getPoolCount();
  const current  = Math.min(previous + n, SUBREDDIT_CANDIDATES.length);
  await redis(['SET', POOL_COUNT_KEY, String(current)]);
  return { previous, current };
}

/** Add subreddits discovered organically from search results */
export async function addDiscoveredSubreddits(subreddits: string[]): Promise<void> {
  if (subreddits.length === 0) return;
  // Lowercase + dedupe before storing
  const cleaned = [...new Set(subreddits.map(s => s.toLowerCase()))];
  try {
    await redis(['SADD', POOL_DISCOVERED, ...cleaned]);
  } catch { /* non-fatal */ }
}

/** Get all active subreddits: unlocked candidates + organically discovered */
export async function getActivePool(): Promise<string[]> {
  try {
    const [count, discovered] = await Promise.all([
      getPoolCount(),
      redis(['SMEMBERS', POOL_DISCOVERED]) as Promise<string[]>,
    ]);
    const fromCandidates = SUBREDDIT_CANDIDATES.slice(0, count);
    // CORE is always active, regardless of the unlock count.
    return [...new Set([...CORE_SUBREDDITS, ...fromCandidates, ...(discovered ?? [])])];
  } catch {
    return [...new Set([...CORE_SUBREDDITS, ...SUBREDDIT_CANDIDATES.slice(0, 15)])];
  }
}

/**
 * Returns the subreddits to use for a keyword search:
 * user's configured subs (always included) + random sample from the pool.
 * maxTotal caps the request count to keep searches fast.
 */
export async function getSearchSubreddits(
  userSubreddits: string[] = [],
  maxTotal = 50,
): Promise<string[]> {
  const userSet = new Set(userSubreddits.map(s => s.toLowerCase()));
  // Always search: user's subs + the FULL curated core (never sampled away).
  const base = [...userSubreddits, ...CORE_SUBREDDITS.filter(s => !userSet.has(s.toLowerCase()))];
  const baseSet = new Set(base.map(s => s.toLowerCase()));

  // Fill any remaining budget with a random sample of the rest of the pool
  // (unlocked candidates + organically discovered). Core is never truncated.
  const pool = await getActivePool();
  const extra = pool.filter(s => !baseSet.has(s.toLowerCase()));
  for (let i = extra.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [extra[i], extra[j]] = [extra[j], extra[i]];
  }
  const room = Math.max(0, maxTotal - base.length);
  return [...base, ...extra.slice(0, room)];
}

/** Pool stats for monitoring */
export async function getPoolStats(): Promise<{ candidates: number; unlocked: number; discovered: number; total: number }> {
  const [unlocked, discoveredCount] = await Promise.all([
    getPoolCount(),
    redis(['SCARD', POOL_DISCOVERED]) as Promise<number>,
  ]);
  return {
    candidates: SUBREDDIT_CANDIDATES.length,
    unlocked,
    discovered: discoveredCount ?? 0,
    total: Math.min(unlocked, SUBREDDIT_CANDIDATES.length) + (discoveredCount ?? 0),
  };
}
