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

export interface PostFormat {
  rank: number;
  name: string;
  avgScore: number;
  description: string;
  example: string;
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
