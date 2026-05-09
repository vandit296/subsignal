import Anthropic from '@anthropic-ai/sdk';
import { RedditData, SubredditAnalysis, PostPrediction, FinderResult } from '@/types';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function analyzeSubreddit(
  subreddit: string,
  data: RedditData
): Promise<SubredditAnalysis> {
  const topPostSummaries = data.topPosts.slice(0, 40).map(p => ({
    title: p.title,
    score: p.score,
    comments: p.num_comments,
    flair: p.link_flair_text,
    hour: p.hour_of_day,
    day: p.day_of_week,
    hasSelfText: p.selftext.length > 50,
  }));

  const ruleTexts = data.rules.map(r => `- ${r.short_name}: ${r.description}`).join('\n');
  const commentSample = data.topComments.slice(0, 15).map(c => c.body).join('\n---\n');

  const prompt = `You are a Reddit marketing intelligence analyst. Analyze the subreddit r/${subreddit} based on the data below and return a JSON object.

SUBREDDIT INFO:
- Name: r/${subreddit}
- Title: ${data.about.title}
- Subscribers: ${data.about.subscribers.toLocaleString()}
- Active users: ${data.about.active_user_count.toLocaleString()}
- Description: ${data.about.public_description}

SUBREDDIT RULES:
${ruleTexts || 'No rules provided'}

TOP 40 POSTS (title | score | comments | flair | hour_utc | day 0=Sun):
${topPostSummaries.map(p => `"${p.title}" | ${p.score} | ${p.comments} | ${p.flair ?? 'none'} | ${p.hour}h | day${p.day}`).join('\n')}

SAMPLE COMMENTS:
${commentSample}

Based on this data, return ONLY a valid JSON object with this exact shape (no markdown, no explanation):

{
  "aiSummary": "2-3 sentence plain English summary of what makes this community tick and how to succeed here",
  "opportunityScore": <float 1-10>,
  "postingSafety": <float 1-10>,
  "audienceMatch": <float 1-10>,
  "competition": <float 1-10>,
  "communityDNA": {
    "tone": { "label": "<one word>", "score": <0-100> },
    "selfPromoRisk": { "label": "<High|Medium|Low>", "score": <0-100> },
    "vulnerabilityRewarded": { "label": "<Strongly|Moderately|Rarely>", "score": <0-100> },
    "modActivity": { "label": "<Very High|High|Medium|Low>", "score": <0-100> },
    "technicalDepth": { "label": "<Deep|Moderate|Surface>", "score": <0-100> },
    "humor": { "label": "<Valued|Occasional|Rare>", "score": <0-100> }
  },
  "postFormats": [
    { "rank": 1, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "example": "<example title>" },
    { "rank": 2, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "example": "<example title>" },
    { "rank": 3, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "example": "<example title>" },
    { "rank": 4, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "example": "<example title>" },
    { "rank": 5, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "example": "<example title>" }
  ],
  "timing": [
    { "dayOfWeek": <0-6 Mon=0>, "hourBlock": <0=6am,1=9am,2=12pm,3=3pm,4=6pm,5=9pm>, "intensity": <0-4> }
  ],
  "audienceSignals": [
    { "icon": "👤", "label": "Primary persona", "detail": "<description>" },
    { "icon": "🔥", "label": "Top pain points", "detail": "<description>" },
    { "icon": "🔗", "label": "Cross-community overlap", "detail": "<description>" },
    { "icon": "💬", "label": "Comment triggers", "detail": "<description>" },
    { "icon": "🚫", "label": "What they hate", "detail": "<description>" }
  ],
  "riskFlags": [
    { "label": "<specific risk>", "level": "banned" },
    { "label": "<specific risk>", "level": "banned" },
    { "label": "<specific risk>", "level": "risky" },
    { "label": "<specific risk>", "level": "risky" },
    { "label": "<specific risk>", "level": "risky" },
    { "label": "<safe action>", "level": "safe" },
    { "label": "<safe action>", "level": "safe" }
  ],
  "opportunityBreakdown": {
    "audienceSize": <float 1-10>,
    "audienceFit": <float 1-10>,
    "contentGap": <float 1-10>,
    "postingSafety": <float 1-10>,
    "growthTrend": <float 1-10>
  },
  "winningKeywords": [
    { "word": "<keyword>", "weight": "lg" },
    { "word": "<keyword>", "weight": "lg" },
    { "word": "<keyword>", "weight": "md" },
    { "word": "<keyword>", "weight": "md" },
    { "word": "<keyword>", "weight": "md" },
    { "word": "<keyword>", "weight": "sm" },
    { "word": "<keyword>", "weight": "sm" },
    { "word": "<keyword>", "weight": "sm" },
    { "word": "<keyword>", "weight": "sm" },
    { "word": "<keyword>", "weight": "sm" }
  ],
  "crossCommunityOverlap": [
    { "subreddit": "r/<name>", "pct": <int> },
    { "subreddit": "r/<name>", "pct": <int> },
    { "subreddit": "r/<name>", "pct": <int> }
  ]
}

For timing, include ALL 42 combinations (7 days × 6 hour blocks). Base intensity on actual post performance patterns in the data.
Return ONLY the JSON. No markdown fences.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4000,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = (message.content[0] as { type: string; text: string }).text.trim();

  // Strip any accidental markdown fences
  const jsonText = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  const parsed = JSON.parse(jsonText);

  return {
    subreddit,
    generatedAt: new Date().toISOString(),
    ...parsed,
  } as SubredditAnalysis;
}

export async function predictPost(
  subreddit: string,
  data: RedditData,
  title: string,
  body: string
): Promise<PostPrediction> {
  // Build context from top posts
  const topPostSummaries = data.topPosts.slice(0, 30).map(p =>
    `"${p.title}" | score:${p.score} | comments:${p.num_comments} | flair:${p.link_flair_text ?? 'none'}`
  ).join('\n');

  const ruleTexts = data.rules.map(r => `- ${r.short_name}: ${r.description}`).join('\n');

  const prompt = `You are a Reddit success prediction engine. A founder wants to post on r/${subreddit}.

THEIR DRAFT:
Title: ${title}
${body ? `Body:\n${body}` : '(Title-only post — no body text)'}

SUBREDDIT CONTEXT:
- Subscribers: ${data.about.subscribers.toLocaleString()}
- Description: ${data.about.public_description}

RULES:
${ruleTexts || 'No rules listed'}

TOP 30 PERFORMING POSTS IN THIS SUBREDDIT (for style/pattern reference):
${topPostSummaries}

Based on how this draft compares to what actually succeeds in r/${subreddit}, score this post.

Return ONLY a valid JSON object with this exact shape (no markdown, no explanation):
{
  "score": <integer 0-100>,
  "verdict": "<one of: Strong | Good | Mediocre | Weak>",
  "summary": "<1-2 sentence plain English overall take on this post's chances>",
  "working": [
    { "label": "<short label>", "detail": "<specific reason this element helps>" },
    { "label": "<short label>", "detail": "<specific reason this element helps>" }
  ],
  "killing": [
    { "label": "<short label>", "detail": "<specific reason this element hurts>" },
    { "label": "<short label>", "detail": "<specific reason this element hurts>" }
  ]
}

Rules for scoring:
- Score 80-100: Post matches top-performer patterns closely, rules-safe, strong hook
- Score 60-79: Decent post, will likely get some traction but missing key elements
- Score 40-59: Post will likely be ignored or get low engagement
- Score 0-39: High risk of removal, very low engagement, or major rule violations

Return 2-4 items in each of "working" and "killing". Be specific to THIS subreddit and THIS draft — not generic advice.
If the post is nearly perfect, killing can have 1 item (but always at least 1).
Return ONLY the JSON. No markdown fences.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 1500,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonText = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(jsonText) as PostPrediction;
}

export async function findSubreddits(description: string, goal?: string): Promise<FinderResult> {
  const goalLine = goal
    ? `\nFOUNDER'S GOAL:\n"${goal}"\n`
    : '';

  const prompt = `You are a Reddit community strategist helping a founder find the best subreddits to reach their target audience.

PRODUCT DESCRIPTION:
"${description}"
${goalLine}
Your job:
1. Identify exactly who this product is for (the target persona)
2. Find the 10 best subreddits where that persona hangs out and would genuinely find this product valuable
3. For each subreddit, explain WHY it fits this founder's specific goal — not just the product generically
4. Score each subreddit across 4 dimensions

Important:
- Include a mix of obvious AND non-obvious subreddits. The less-obvious picks often have better engagement and less competition.
- The "assessment" must be a single punchy sentence that captures the *strategic angle* — why this subreddit specifically serves the founder's goal with their specific target user. Make it feel like advice from a seasoned growth strategist, not a generic description of the subreddit.
- The "why" should go deeper: connect the product, the founder's goal, and what makes this community uniquely positioned to help. Be specific — mention things like the community's typical problems, what they upvote, what they ignore.

Return ONLY a valid JSON object with this exact shape (no markdown, no explanation):
{
  "targetPersona": "<1-2 sentence description of who this product is for and what they care about>",
  "matches": [
    {
      "subreddit": "<name without r/>",
      "assessment": "<punchy one-liner strategic verdict — e.g. 'Prime for early adopter acquisition — devs here actively adopt new tools before they go mainstream'>",
      "why": "<2-3 sentences connecting this subreddit's community behaviour, the product, and the founder's goal. Be specific about what this community values and why that makes this a strong match.>",
      "audienceFit": <1-10: how well this subreddit's members match the target persona>,
      "engagement": <1-10: how active and responsive this community is to founder posts>,
      "competition": <1-10: 10=very low competition/blue ocean, 1=saturated with similar products>,
      "founderFriendly": <1-10: how tolerant this subreddit is of founders sharing products>,
      "overallScore": <1-10: weighted average, weight audienceFit most heavily>
    }
  ]
}

Scoring rules:
- audienceFit: Is the typical member of this subreddit actually someone who would benefit from this product?
- engagement: Does this community actively upvote and discuss founder posts? (not just lurk)
- competition: Are there already 10 similar tools being promoted here weekly? If yes, score low.
- founderFriendly: Does the subreddit allow "I built this" posts? Or will it get removed?
- overallScore: Use weights: audienceFit×35% + engagement×25% + competition×25% + founderFriendly×15%

Sort matches by overallScore descending.
Return ONLY the JSON. No markdown fences.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonText = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(jsonText) as FinderResult;
}
