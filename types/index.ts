export interface SubredditAbout {
  display_name: string;
  title: string;
  subscribers: number;
  active_user_count: number;
  public_description: string;
  description: string;
  created_utc: number;
  over18: boolean;
  rules?: SubredditRule[];
}

export interface SubredditRule {
  short_name: string;
  description: string;
  kind: string;
}

export interface RedditPost {
  id: string;
  title: string;
  selftext: string;
  score: number;
  upvote_ratio: number;
  num_comments: number;
  created_utc: number;
  author: string;
  url: string;
  is_self: boolean;
  link_flair_text: string | null;
  hour_of_day: number;
  day_of_week: number;
}

export interface RedditComment {
  id: string;
  body: string;
  score: number;
  author: string;
  created_utc: number;
}

export interface RedditData {
  about: SubredditAbout;
  topPosts: RedditPost[];
  newPosts: RedditPost[];
  topComments: RedditComment[];
  rules: SubredditRule[];
}

// AI Analysis output shape
export interface CommunityDNA {
  tone: { label: string; score: number };
  selfPromoRisk: { label: string; score: number };
  vulnerabilityRewarded: { label: string; score: number };
  modActivity: { label: string; score: number };
  technicalDepth: { label: string; score: number };
  humor: { label: string; score: number };
}

export interface PostFormatExample {
  title: string;
  url: string | null;
  score: number;
  createdUtc: number;
}

export interface PostFormat {
  rank: number;
  name: string;
  avgScore: number;
  description: string;
  example: string;        // kept for backwards compat
  exampleUrl?: string;    // kept for backwards compat
  examples?: PostFormatExample[]; // up to 3 real posts exemplifying this format
}

export interface TimingSlot {
  dayOfWeek: number; // 0=Mon..6=Sun
  hourBlock: number; // 0=6am, 1=9am, 2=12pm, 3=3pm, 4=6pm, 5=9pm
  intensity: number; // 0–4
}

export interface AudienceSignal {
  icon: string;
  label: string;
  detail: string;
}

export interface RiskFlag {
  label: string;
  level: 'banned' | 'risky' | 'safe';
}

export interface OpportunityBreakdown {
  audienceSize: number;
  audienceFit: number;
  contentGap: number;
  postingSafety: number;
  growthTrend: number;
}

export interface WinningKeyword {
  word: string;
  weight: 'lg' | 'md' | 'sm';
}

// Thread Opportunity Finder types
export interface AlertConfig {
  email: string;
  productDescription: string;
  productUrl?: string;          // optional product URL for extra context
  goal: string;
  subreddits: string[];         // subreddit names without r/
  timezone: string;             // IANA timezone, e.g. 'America/New_York'
  alertFrequency: 'daily' | 'realtime'; // realtime = as soon as found (future)
  createdAt: string;
  lastDigestAt: string | null;
}

export interface ScoredThread {
  id: string;
  subreddit: string;
  title: string;
  url: string;
  score: number;                // Reddit upvotes
  numComments: number;
  createdUtc: number;
  relevanceScore: number;       // 1-10 — how well this thread matches the product
  relevanceReason: string;      // 1 sentence why this is an opportunity
  engagementAngle: string;      // 1 sentence on HOW to engage (what to say/offer)
  foundAt: string;              // ISO timestamp when SubSignal found this
}

// Subreddit Finder types
export interface SubredditMatch {
  subreddit: string;        // without r/
  assessment: string;       // punchy one-liner: strategic verdict on why this community serves the user's goal
  why: string;              // fuller reasoning: how this subreddit connects product + goal + audience
  audienceFit: number;      // 1-10
  engagement: number;       // 1-10 (how active / responsive the community is)
  competition: number;      // 1-10 (10 = low competition = good for founders)
  founderFriendly: number;  // 1-10
  overallScore: number;     // 1-10 weighted
  subscribers?: number;     // enriched from Arctic Shift
}

export interface FinderResult {
  targetPersona: string;    // who Claude thinks the product is for
  matches: SubredditMatch[];
}

// Post Success Predictor types
export interface PredictItem {
  label: string;   // e.g. "Title hooks curiosity"
  detail: string;  // e.g. "Opens with a question that makes the reader curious"
}

export interface PostPrediction {
  score: number;         // 0–100
  verdict: string;       // "Strong" | "Good" | "Mediocre" | "Weak"
  summary: string;       // 1-2 sentence overall take
  working: PredictItem[];
  killing: PredictItem[];
}

export interface SubredditAnalysis {
  subreddit: string;
  generatedAt: string;
  hasProductContext?: boolean; // true if scored against a real product description
  cached?: boolean;            // true if returned from Redis cache
  cachedAt?: string;           // ISO timestamp when it was originally cached
  // Raw subreddit stats surfaced from Reddit data
  subscribers?: number;
  createdUtc?: number;
  over18?: boolean;
  publicDescription?: string;
  aiSummary: string;
  opportunityScore: number;
  postingSafety: number;
  audienceMatch: number;
  competition: number;
  communityDNA: CommunityDNA;
  postFormats: PostFormat[];
  timing: TimingSlot[];
  audienceSignals: AudienceSignal[];
  riskFlags: RiskFlag[];
  opportunityBreakdown: OpportunityBreakdown;
  winningKeywords: WinningKeyword[];
  crossCommunityOverlap: { subreddit: string; pct: number }[];
}
