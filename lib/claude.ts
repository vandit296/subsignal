import Anthropic from '@anthropic-ai/sdk';
import { RedditData, SubredditAnalysis, PostPrediction, FinderResult, TimingSlot, GoCrazyResult } from '@/types';

// ââ Real timing computation âââââââââââââââââââââââââââââââââââââââââââââââââââ
// Derives posting-time intensity from actual post timestamps + upvote scores.
// Weights by score so high-performing time slots glow brighter.
const UTC_HOUR_BLOCKS = [6, 9, 12, 15, 18, 21]; // must match TimingHeatmap.tsx

function hourToBlock(utcHour: number): number {
  let best = 0, bestDist = Infinity;
  for (let i = 0; i < UTC_HOUR_BLOCKS.length; i++) {
    const dist = Math.abs(utcHour - UTC_HOUR_BLOCKS[i]);
    if (dist < bestDist) { bestDist = dist; best = i; }
  }
  return best;
}

export function computeTiming(posts: import('@/types').RedditPost[]): TimingSlot[] {
  // grid[day][block] = cumulative score weight
  const grid: number[][] = Array.from({ length: 7 }, () => new Array(6).fill(0));
  for (const post of posts) {
    // Reddit day_of_week: Sun=0 â¦ Sat=6  â  component Mon=0 â¦ Sun=6
    const compDay = (post.day_of_week + 6) % 7;
    const block   = hourToBlock(post.hour_of_day);
    grid[compDay][block] += Math.max(post.score, 1);
  }
  const maxScore = Math.max(...grid.flat(), 1);
  const timing: TimingSlot[] = [];
  for (let day = 0; day < 7; day++) {
    for (let block = 0; block < 6; block++) {
      timing.push({ dayOfWeek: day, hourBlock: block, intensity: Math.round((grid[day][block] / maxScore) * 4) });
    }
  }
  return timing;
}

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function analyzeSubreddit(
  subreddit: string,
  data: RedditData,
  product?: { productDescription?: string; goal?: string }
): Promise<SubredditAnalysis> {
  const topPostSummaries = data.topPosts.slice(0, 40).map(p => ({
    title: p.title,
    score: p.score,
    comments: p.num_comments,
    flair: p.link_flair_text,
    hour: p.hour_of_day,
    day: p.day_of_week,
    hasSelfText: p.selftext.length > 50,
    url: p.url,
    createdUtc: p.created_utc,
  }));

  const ruleTexts = data.rules.map(r => `- ${r.short_name}: ${r.description}`).join('\n');
  const commentSample = data.topComments.slice(0, 15).map(c => c.body).join('\n---\n');

  const productSection = product?.productDescription
    ? `\nPRODUCT CONTEXT (score audienceMatch and opportunityScore specifically for this product and goal):
- Product: ${product.productDescription}${product.goal ? `\n- Goal: ${product.goal}` : ''}
`
    : '\n(No product context provided â score audienceMatch and opportunityScore for a generic early-stage B2B SaaS founder)\n';

  const prompt = `You are a Reddit marketing intelligence analyst. Analyze the subreddit r/${subreddit} based on the data below and return a JSON object.
${productSection}
SUBREDDIT INFO:
- Name: r/${subreddit}
- Title: ${data.about.title}
- Subscribers: ${data.about.subscribers.toLocaleString()}
- Active users: ${data.about.active_user_count.toLocaleString()}
- Description: ${data.about.public_description}

SUBREDDIT RULES:
${ruleTexts || 'No rules provided'}

TOP 40 POSTS (title | score | comments | flair | hour_utc | day 0=Sun | created_utc | url):
${topPostSummaries.map(p => `"${p.title}" | ${p.score} | ${p.comments} | ${p.flair ?? 'none'} | ${p.hour}h | day${p.day} | ${p.createdUtc} | ${p.url}`).join('\n')}

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
    {
      "rank": 1,
      "name": "<format name>",
      "avgScore": <int>,
      "description": "<15 words max describing the pattern>",
      "examples": [
        { "title": "<exact title from TOP 40 list>", "url": "<url from the list>", "score": <score>, "createdUtc": <created_utc from list> },
        { "title": "<exact title from TOP 40 list>", "url": "<url from the list>", "score": <score>, "createdUtc": <created_utc from list> },
        { "title": "<exact title from TOP 40 list>", "url": "<url from the list>", "score": <score>, "createdUtc": <created_utc from list> },
        { "title": "<exact title from TOP 40 list>", "url": "<url from the list>", "score": <score>, "createdUtc": <created_utc from list> },
        { "title": "<exact title from TOP 40 list>", "url": "<url from the list>", "score": <score>, "createdUtc": <created_utc from list> }
      ]
    },
    { "rank": 2, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "examples": [ { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> } ] },
    { "rank": 3, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "examples": [ { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> } ] },
    { "rank": 4, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "examples": [ { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> } ] },
    { "rank": 5, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "examples": [ { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> } ] },
    { "rank": 6, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "examples": [ { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> } ] },
    { "rank": 7, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "examples": [ { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> } ] },
    { "rank": 8, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "examples": [ { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> }, { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> } ] }
  ],
  "audienceSignals": [
    { "icon": "ð¤", "label": "Primary persona", "detail": "<description>" },
    { "icon": "ð¥", "label": "Top pain points", "detail": "<description>" },
    { "icon": "ð", "label": "Cross-community overlap", "detail": "<description>" },
    { "icon": "ð¬", "label": "Comment triggers", "detail": "<description>" },
    { "icon": "ð«", "label": "What they hate", "detail": "<description>" }
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

For postFormats examples: pick actual posts from the TOP 40 list. Ranks 1-2 get 5 examples, ranks 3-5 get 3 examples, ranks 6-8 get 2 examples. Provide all 8 formats if the data supports it. CRITICAL: any double-quote characters inside title strings must be escaped as \\". Keep titles under 120 chars.
For competition: 10 = wide open market / blue ocean (very few similar products promoted here), 1 = highly saturated.
CRITICAL: Return ONLY valid JSON. No markdown fences. All string values must have properly escaped quotes.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = (message.content[0] as { type: string; text: string }).text.trim();

  // Strip any accidental markdown fences
  const jsonText = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');

  let parsed: Record<string, unknown>;
  try {
    parsed = JSON.parse(jsonText);
  } catch {
    // Attempt repair: replace unescaped double quotes inside string values
    // Strategy: find JSON string boundaries and escape bare quotes within them
    const repaired = jsonText
      .replace(/[ââ]/g, '"')   // smart quotes â straight
      .replace(/[ââ]/g, "'")   // smart single quotes
      // Fix unescaped quotes inside title/description values by scanning for pattern: ": "...unescaped..."
      .replace(/"(title|description|aiSummary|relevanceReason|engagementAngle|example|detail|label|assessment|why|word|subreddit|name|icon)":\s*"((?:[^"\\]|\\.)*)"/g,
        (_, key, val) => `"${key}": "${val.replace(/(?<!\\)"/g, '\\"')}"`
      );
    try {
      parsed = JSON.parse(repaired);
    } catch (e2) {
      console.error('[analyzeSubreddit] JSON parse failed even after repair:', (e2 as Error).message);
      console.error('[analyzeSubreddit] raw snippet:', jsonText.slice(0, 500));
      throw new Error(`AI returned malformed JSON: ${(e2 as Error).message}`);
    }
  }

  return {
    subreddit,
    generatedAt: new Date().toISOString(),
    ...parsed,
    timing: computeTiming(data.topPosts), // real data, not AI guess
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
${body ? `Body:\n${body}` : '(Title-only post â no body text)'}

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

Return 2-4 items in each of "working" and "killing". Be specific to THIS subreddit and THIS draft â not generic advice.
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

export async function findSubreddits(description: string, goal?: string, urlContent?: string): Promise<FinderResult> {
  const goalLine = goal
    ? `\nFOUNDER'S GOAL:\n"${goal}"\n`
    : '';

  const urlSection = urlContent
    ? `\nPRODUCT WEBSITE CONTENT (extracted from their URL â use this for additional context):\n${urlContent}\n`
    : '';

  const prompt = `You are a Reddit community strategist helping a founder find the best subreddits to reach their target audience.

PRODUCT DESCRIPTION:
"${description}"
${goalLine}${urlSection}
Your job:
1. Identify exactly who this product is for (the target persona)
2. Find the 6 best subreddits where that persona hangs out and would genuinely find this product valuable
3. For each subreddit, explain WHY it fits this founder's specific goal â not just the product generically
4. Score each subreddit across 4 dimensions

Important:
- Include a mix of obvious AND non-obvious subreddits. The less-obvious picks often have better engagement and less competition.
- The "assessment" must be a single punchy sentence that captures the *strategic angle* â why this subreddit specifically serves the founder's goal with their specific target user. Make it feel like advice from a seasoned growth strategist, not a generic description of the subreddit.
- The "why" should go deeper: connect the product, the founder's goal, and what makes this community uniquely positioned to help. Be specific â mention things like the community's typical problems, what they upvote, what they ignore.

Return ONLY a valid JSON object with this exact shape (no markdown, no explanation):
{
  "targetPersona": "<1-2 sentence description of who this product is for and what they care about>",
  "matches": [
    {
      "subreddit": "<name without r/>",
      "assessment": "<punchy one-liner strategic verdict â e.g. 'Prime for early adopter acquisition â devs here actively adopt new tools before they go mainstream'>",
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
- overallScore: Use weights: audienceFitÃ35% + engagementÃ25% + competitionÃ25% + founderFriendlyÃ15%

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

export async function analyzeDistribution(
  title: string,
  body: string,
  companyContext?: { description?: string; goal?: string; name?: string },
  goCrazy = false,
): Promise<import('@/types').DistributionResult> {
  const companyBlock = companyContext?.description
    ? `\nFOUNDER CONTEXT (Command-Aware Mode):\nCompany: ${companyContext.name || 'Unknown'}\nProduct: ${companyContext.description}\nGoal: ${companyContext.goal || 'Not specified'}\n`
    : '';

  const insightCommandField = companyContext?.description
    ? `"insightCommand": "<2-3 sentences: same psychological insight but filtered through the founder's specific company context — how this community is strategically valuable for their exact product and goal>",`
    : '';

  const prompt = `You are a Reddit distribution strategist. Your one job: find the non-obvious communities where this specific post will resonate deeply.

THE STANDARD TO BEAT: r/startups, r/entrepreneur, r/SaaS, r/indiehackers, r/smallbusiness, r/marketing. These are the subs anyone would guess without AI. Before picking one, ask yourself: is there a more specific community where this narrative lands with twice the resonance and half the competition? There almost always is. If you do pick one of these, the other two picks must be genuinely non-obvious, and its insight must go beyond "this community is for founders" — name the specific psychological reason it wins here.

WHAT YOU MUST DO INSTEAD — think in three layers:

LAYER 1 — EMOTIONAL ARCHETYPE, not topic
Every post carries an emotional archetype that exists across many communities.

LAYER 2 — WHO SECRETLY HAS THIS PROBLEM
Look past the obvious audience. Ask: which communities contain people who have dealt with this exact tension?

LAYER 3 — COMMUNITY REWARD PSYCHOLOGY
Each community upvotes a specific emotional contract. Match to that contract.

SCORING: narrative/emotional fit 60%, promotion survivability 25%, discussion potential 15%.

POST TO ANALYZE:
TITLE: "${title}"
BODY: "${body || '(title only)'}"
${companyBlock}
Return ONLY this JSON (no markdown, no fences):

{
  "dna": {
    "narrativeType": "FILL",
    "emotionalEnergy": "FILL",
    "promotionRisk": "Low",
    "promotionRiskScore": 3,
    "audienceMaturity": "FILL",
    "discussionPotential": 7,
    "authenticityScore": 8,
    "tacticalDepth": 6,
    "controversyScore": 4,
    "promotionSafety": 8
  },
  "standard": [
    {
      "subreddit": "SUBREDDIT_NAME",
      "narrativeFit": 9,
      "insight": "3 sentences: the exact psychological mechanism.",
      ${insightCommandField}
      "expectedReactions": ["specific prediction 1", "specific prediction 2"],
      "positioning": "exact narrative frame",
      "risks": [{"text": "specific risk", "level": "medium"}],
      "titleVariations": ["reframe 1", "reframe 2", "reframe 3"],
      "firstMove": "specific: timing + opening line",
      "tags": ["tag1", "tag2"]
    }
  ]${goCrazy ? `,
  "goCrazy": [
    {
      "subreddit": "SUBREDDIT_NAME",
      "narrativeFit": 8,
      "asymScore": 9,
      "isGoCrazy": true,
      "insight": "3 sentences: the SURPRISING psychological match.",
      ${insightCommandField}
      "expectedReactions": ["reaction 1", "reaction 2"],
      "positioning": "psychological positioning",
      "risks": [{"text": "specific risk", "level": "medium"}],
      "titleVariations": ["reframe 1", "reframe 2", "reframe 3"],
      "firstMove": "Go Crazy execution",
      "tags": ["tag1", "tag2"]
    }
  ]` : ''},
  "_end": true
}`;

  const message = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: goCrazy ? 2800 : 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (message.content[0] as { type: string; text: string }).text.trim();
  let jsonText = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  jsonText = jsonText.replace(/,\s*"_end"\s*:\s*true\s*}(\s*)$/, '}$1');
  try {
    return JSON.parse(jsonText) as import('@/types').DistributionResult;
  } catch {
    const m = jsonText.match(/^(\{[\s\S]*"standard"\s*:\s*\[[\s\S]*?\])/);
    if (m) {
      try { return JSON.parse(m[1] + '}') as import('@/types').DistributionResult; } catch { /* fall through */ }
    }
    console.error('[analyzeDistribution] JSON parse failed. Raw response:', raw.slice(0, 300));
    throw new Error('Failed to parse distribution analysis');
  }
}


export async function findSubredditsGoCrazy(description: string, goal?: string): Promise<FinderResult> {
  const goalLine = goal ? `\nFOUNDER'S GOAL:\n"${goal}"\n` : '';

  const prompt = `You are an elite Reddit growth strategist specialising in non-obvious community discovery. Your job is to find the hidden gems — subreddits where a founder's target audience is actively present but where no one is marketing to them yet.

PRODUCT DESCRIPTION:
"${description}"
${goalLine}
THE RULE: You may NOT recommend any of these: r/startups, r/entrepreneur, r/SaaS, r/indiehackers, r/smallbusiness, r/marketing, r/business. These are the obvious answers. Anyone can find them. Your job is to find what they can't.

HOW TO THINK — three lenses:

LENS 1 — WHERE DOES THE TARGET USER ALREADY HANG OUT?
Forget the product's topic. Think about the person who uses this product. What do they do on Reddit when they're NOT thinking about work or this product? What communities do they belong to for completely different reasons, but where this product would solve a pain they regularly complain about?

LENS 2 — WHAT EMOTIONAL ARCHETYPE DOES THIS PRODUCT SERVE?
Every product is solving an emotional need beyond its functional one. Find communities built around that emotional need, not the product category.

LENS 3 — WHAT ADJACENT PROBLEMS DOES THIS PRODUCT SOLVE?
Find the upstream and downstream communities in the target user's frustration journey.

REQUIREMENTS:
- Return exactly 9 subreddits
- Every pick must be genuinely non-obvious — if a smart founder would guess it in 30 seconds, it's too obvious
- All subreddits must be active (100k+ members preferred, absolute minimum 10k)
- The "assessment" must name the specific psychological mechanism — not the subreddit's topic
- Sort by overallScore descending

Return ONLY a valid JSON object (no markdown, no explanation):
{
  "targetPersona": "<2 sentence description of the human being this product serves — their life context, not just their job title>",
  "matches": [
    {
      "subreddit": "<name without r/>",
      "assessment": "<one punchy sentence naming the exact psychological or situational mechanism — e.g. 'Members here regularly post about the exact workflow problem this solves, but have never seen a tool for it'>",
      "why": "<2-3 sentences: connect the community's actual behaviour and pain patterns to this product and goal. Be specific — cite what kinds of posts thrive here and why that creates an opening>",
      "audienceFit": <1-10>,
      "engagement": <1-10>,
      "competition": <1-10>,
      "founderFriendly": <1-10>,
      "overallScore": <1-10: weight audienceFit 35% + engagement 25% + competition 25% + founderFriendly 15%>
    }
  ]
}

Return ONLY the JSON. No markdown fences.`;

  const message = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 3500,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonText = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(jsonText) as FinderResult;
}
