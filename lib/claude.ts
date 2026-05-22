import Anthropic from '@anthropic-ai/sdk';
import { RedditData, SubredditAnalysis, PostPrediction, FinderResult } from '@/types';

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
    : '\n(No product context provided — score audienceMatch and opportunityScore for a generic early-stage B2B SaaS founder)\n';

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
        { "title": "<exact title from TOP 40 list>", "url": "<url from the list>", "score": <score>, "createdUtc": <created_utc from list> }
      ]
    },
    { "rank": 2, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "examples": [ { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> } ] },
    { "rank": 3, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "examples": [ { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> } ] },
    { "rank": 4, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "examples": [ { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> } ] },
    { "rank": 5, "name": "<format name>", "avgScore": <int>, "description": "<15 words max>", "examples": [ { "title": "<title>", "url": "<url>", "score": <score>, "createdUtc": <createdUtc> } ] }
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
For postFormats examples: pick actual posts from the TOP 40 list. Include up to 3 per format. CRITICAL: any double-quote characters inside title strings must be escaped as \\". Keep titles under 120 chars.
For competition: 10 = wide open market / blue ocean (very few similar products promoted here), 1 = highly saturated.
CRITICAL: Return ONLY valid JSON. No markdown fences. All string values must have properly escaped quotes.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
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
      .replace(/[“”]/g, '"')   // smart quotes → straight
      .replace(/[‘’]/g, "'")   // smart single quotes
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
    model: 'claude-haiku-4-5-20251001',
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
    ? `\nPRODUCT WEBSITE CONTENT (extracted from their URL — use this for additional context):\n${urlContent}\n`
    : '';

  const prompt = `You are a Reddit community strategist helping a founder find the best subreddits to reach their target audience.

PRODUCT DESCRIPTION:
"${description}"
${goalLine}${urlSection}
Your job:
1. Identify exactly who this product is for (the target persona)
2. Find the 6 best subreddits where that persona hangs out and would genuinely find this product valuable
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
    model: 'claude-sonnet-4-6',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonText = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(jsonText) as FinderResult;
}

export async function findSubredditsGoCrazy(description: string, goal?: string): Promise<import('@/types').GoCrazyResult> {
  const goalLine = goal ? `\nFOUNDER'S GOAL:\n"${goal}"\n` : '';

  const prompt = `You are an asymmetric Reddit growth strategist. A founder has described their product below. Your job is NOT to find the obvious communities — it is to find unexpected, underserved communities where this founder's narrative would land with zero competition and outsized resonance.

PRODUCT DESCRIPTION:
"${description}"
${goalLine}
Think laterally. Who else feels this pain but would never be found by a standard search? What communities have hidden frustrations this product could solve? Where could this founder be the ONLY person with a relevant tool?

Return ONLY a valid JSON object (no markdown):
{
  "targetPersona": "<1-2 sentence description of the ideal user>",
  "matches": [
    {
      "subreddit": "<name without r/>",
      "asymScore": <1-10 asymmetric opportunity — 10 = zero competition, massive hidden pain>,
      "oppType": "<2-3 word opportunity type e.g. 'Narrative Wormhole', 'Hidden Pain Community', 'Identity Transition', 'Emotional Resonance', 'Emerging Trend', 'Low-Competition Zone'>",
      "oppType2": "<secondary descriptor>",
      "archetype": "<5-6 word audience archetype e.g. 'Overwhelmed IT Operators'>",
      "insight": "<2-3 sentences: why this community is unexpectedly smart. Be specific about the hidden pain and why zero competitors are here>",
      "communityPsych": "<2 sentences: community identity and what they respond to>",
      "narrative": "<narrative angles that win here, separated by · >",
      "signals": [
        {"l": "<signal label>", "c": "<sp|si|sg|sa|sb>"},
        {"l": "<signal label>", "c": "<sp|si|sg|sa|sb>"},
        {"l": "<signal label>", "c": "<sp|si|sg|sa|sb>"},
        {"l": "<signal label>", "c": "<sp|si|sg|sa|sb>"},
        {"l": "<signal label>", "c": "<sp|si|sg|sa|sb>"}
      ],
      "strategic": "<2-3 sentences: the specific strategic opportunity — why now, why this founder, why no one else is here>",
      "firstMove": "<exact first post or comment to make — be specific about format, thread to target, and what NOT to say>",
      "risks": [
        {"l": "<risk>", "c": "rd-r"},
        {"l": "<risk>", "c": "rd-p"},
        {"l": "<risk>", "c": "rd-a"}
      ],
      "top": <true if asymScore >= 8.5, else false>
    }
  ]
}

Rules:
- Return exactly 5 subreddits
- Sort by asymScore descending
- The top 2 should have top:true (asymScore >= 8.5)
- Avoid the obvious ones (r/startups, r/SaaS, r/entrepreneur, r/indiehackers) — those are for Standard mode
- MINIMUM SIZE: Only suggest subreddits with at least 10,000 members — tiny communities have no reach
- Think: professional communities with recurring manual pain, identity groups with hidden founder density, niche operator communities, pre-commercial audiences
- Signal colour codes: sp=purple(go-crazy), si=indigo, sg=green(positive), sa=amber(warning), sb=blue
- Return ONLY valid JSON. No markdown fences.`;

  const message = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
    messages: [{ role: 'user', content: prompt }],
  });

  const rawText = (message.content[0] as { type: string; text: string }).text.trim();
  const jsonText = rawText.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(jsonText) as import('@/types').GoCrazyResult;
}

// ── Post Distribution Intelligence ────────────────────────────────────────────

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
Every post carries an emotional archetype that exists across many communities. Examples:
- "I built something nobody wanted" → ADHD communities (hyperfocus + disappointment), gamedev (shipping into silence), fiction writers (creative effort unrewarded)
- "I fired my first employee" → Military veterans (hard leadership decisions), therapists/counselors (professional detachment), managers in manufacturing
- "We hit $10k MRR" → r/financialindependence (milestone psychology), r/digitalnomad (freedom proof), r/personalfinance (proof it works)
- "My cold email got a 40% reply rate" → Sales professionals, recruiters, academic researchers (persuasion psychology)

LAYER 2 — WHO SECRETLY HAS THIS PROBLEM
Look past the obvious audience. Ask: which communities contain people who have dealt with this exact tension, but from a completely different angle?
- A post about "building in public and getting mocked" → r/bodybuilding (public judgment of progress), r/ArtificialIntelligence (hype vs reality expectations)
- A post about "I almost quit but didn't" → r/ultrarunning, r/solotravel, r/recovery communities

LAYER 3 — COMMUNITY REWARD PSYCHOLOGY
Each community upvotes a specific emotional contract. Match to that contract:
- Tactical communities (r/sales, r/recruiting): upvote specific numbers, methods, scripts
- Identity communities (r/cscareerquestions, r/freelance): upvote "one of us succeeds" stories
- Counter-culture communities (r/antiwork, r/cscareerquestions): upvote honest criticism of norms
- Skill communities (r/copywriting, r/datascience): upvote craft-level insight

SCORING: narrative/emotional fit 60%, promotion survivability 25%, discussion potential 15%. Size = 0.

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
      "subreddit": "FILL",
      "narrativeFit": 9,
      "insight": "3 sentences: the exact psychological mechanism — what reward structure this triggers, what emotional need it satisfies, why this voice feels native here. Never name the topic.",
      ${insightCommandField}
      "expectedReactions": ["specific prediction 1", "specific prediction 2", "specific prediction 3"],
      "positioning": "exact narrative frame for this community's identity and reward psychology",
      "risks": [
        {"text": "specific tribal tripwire or promotion alarm", "level": "medium"},
        {"text": "second specific risk", "level": "low"}
      ],
      "titleVariations": [
        "full psychological reframe for this community — not a word swap",
        "second psychological angle",
        "third psychological angle"
      ],
      "firstMove": "specific: timing + whether to seed a comment + opening line + one thing never to say here",
      "tags": ["tag1", "tag2"]
    }
  ]${goCrazy ? `,
  "goCrazy": [
    {
      "subreddit": "FILL — unexpected, zero topic overlap, deep psychological compatibility",
      "narrativeFit": 8,
      "asymScore": 9,
      "isGoCrazy": true,
      "insight": "3 sentences: the SURPRISING psychological match — why this community secretly rewards this narrative DNA despite zero topic overlap.",
      ${insightCommandField}
      "expectedReactions": ["specific reaction 1", "specific reaction 2", "specific reaction 3"],
      "positioning": "psychological positioning that makes this feel native to this unexpected community",
      "risks": [
        {"text": "specific risk", "level": "medium"},
        {"text": "second risk", "level": "low"}
      ],
      "titleVariations": [
        "completely reframed title — native to this community, zero overlap with original",
        "second reframe",
        "third reframe"
      ],
      "firstMove": "Go Crazy execution — positioning angle, why community hasn't seen this archetype, first comment to seed",
      "tags": ["tag1", "tag2"]
    }
  ]` : ''},
  "_end": true
}

RULES:
- Standard: exactly 3 subreddits. NONE can be from the banned list above. Each must reward this narrative for a COMPLETELY different psychological reason.
- The insight field must name the specific emotional contract or reward psychology of that community — never the topic category. Wrong: "this community is interested in startups." Right: "this community rewards tactical specificity and treats vague inspirational content as noise — the numbered breakdown in this post matches their upvote pattern exactly."
- Title variations must be full rewrites for that community's voice — not the same title with different words.
- Go Crazy: exactly 2 picks, sorted by asymScore desc. Zero topic overlap with the post. The test: a founder would never think of this subreddit unprompted, but once they see it they say "obviously."
- Return ONLY valid JSON.`

  const msg = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text.trim();
  // Strip markdown fences if present
  let json = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '').trim();
  // If Claude added any preamble, find the first { and last }
  const firstBrace = json.indexOf('{');
  const lastBrace = json.lastIndexOf('}');
  if (firstBrace > 0 || (lastBrace !== -1 && lastBrace !== json.length - 1)) {
    json = json.slice(firstBrace, lastBrace + 1);
  }
  try {
    return JSON.parse(json) as import('@/types').DistributionResult;
  } catch (e) {
    console.error('[analyzeDistribution] JSON parse failed. Raw response:', raw.slice(0, 500));
    throw new Error('Failed to parse distribution analysis from AI response');
  }
}
