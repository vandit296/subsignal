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
    model: 'claude-opus-4-5',
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
    model: 'claude-opus-4-5',
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
    model: 'claude-opus-4-5',
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

  const prompt = `You are the world's most sophisticated Reddit narrative psychologist. You do not match posts to subreddits. You match STORIES to COMMUNITIES based on deep psychological compatibility.

CRITICAL — WHAT YOU MUST NEVER DO:
- Never match by keywords or topic overlap ("startup post → startup subreddits")
- Never match by semantic similarity alone
- Never prioritize communities by subscriber count or size
- Never think "this post is about X, so r/X"
- Never use surface-level category tagging

WHAT YOU MUST DO INSTEAD:
Execute a 7-step deep reasoning process before producing any output:

════════════════════════════════════════════
STEP 1 — DEEP POST UNDERSTANDING
════════════════════════════════════════════
Decode the post's psychological and narrative architecture:
- NARRATIVE TYPE: What story structure is this? (Founder Confession / Tactical Teardown / Vulnerable Milestone / Anti-Pattern Warning / Operational Lesson / Controversial Take / Build-in-Public / Underdog Rising / Failure Autopsy / Insight Revelation)
- EMOTIONAL ENERGY: What feeling drives this post? (Reflective·Vulnerable / Tactical·Ambitious / Honest·Frustrated / Curious·Hopeful / Cynical·Anti-Hype / Proud·Understated / Urgent·Alarmed)
- AUTHENTICITY LEVEL: How raw vs polished is this? (0=heavily produced, 10=brutally honest)
- PROMOTION INTENSITY: How much is this secretly selling? (0=pure story, 10=clearly an ad)
- DISCUSSION POTENTIAL: Will this generate debate, empathy, or reflection? (0=dead end, 10=explosive thread)
- AUDIENCE SOPHISTICATION: What reader does this post assume? (Beginner / Practitioner / Operator / Expert / Counter-culture)
- CORE TENSION: The central human tension this post carries (e.g. "gap between expectation and reality", "doing the right thing vs the profitable thing")

════════════════════════════════════════════
STEP 2 — COMMUNITY PSYCHOLOGY ENGINE
════════════════════════════════════════════
For each community you consider, reason about:
- REWARD STRUCTURE: What does this community upvote and why? (tactical value / emotional relatability / controversial truth / identity affirmation / peer recognition)
- EMOTIONAL TONE: Dominant emotional register? (supportive / skeptical / aspirational / cynical / technical / self-deprecating)
- PROMOTION TOLERANCE: How allergic to anything commercial? (0=despises it, 10=tolerates it well)
- ENGAGEMENT STYLE: Do members comment with advice, stories, debate, memes, or silence?
- AUDIENCE PSYCHOLOGY: What does a member want to feel after reading? (validated / informed / inspired / challenged / part of something)
- COLLECTIVE IDENTITY: What does this community believe about itself and the world?

════════════════════════════════════════════
STEP 3 — NARRATIVE-COMMUNITY MATCH ENGINE
════════════════════════════════════════════
For each community, ask: "Does this narrative BELONG here — not by topic, but by psychological fit?"
- Does the post's emotional energy match what this community rewards?
- Does the narrative structure feel native or foreign to this community's culture?
- Does the core tension of this post resonate with this community's collective fears/aspirations?
- Would the author's voice feel like an insider or outsider here?
- Does the audience sophistication match the community's expectations?

════════════════════════════════════════════
STEP 4 — STRATEGIC DISTRIBUTION SCORING
════════════════════════════════════════════
Score each community on a WEIGHTED formula:
- Narrative compatibility: 35% weight
- Emotional resonance: 25% weight
- Authenticity fit (does the post's rawness match community norms?): 20% weight
- Promotion survivability (will this get flagged as spam?): 15% weight
- Discussion catalyst potential: 5% weight
NOTE: Subscriber count, keyword overlap, and topic similarity contribute ZERO to scoring.

════════════════════════════════════════════
STEP 5 — STRATEGIC REASONING OUTPUT (7 components per subreddit)
════════════════════════════════════════════
1. FIT SCORE REASONING — Why this community scores high on each weighted dimension
2. WHY THIS POST WORKS HERE — The specific psychological mechanism that makes this narrative land
3. EXPECTED COMMUNITY REACTION — Specific emotional and behavioral predictions (not generic)
4. STRATEGIC RISKS — Community-specific hazards: promotion allergies, wrong tone flags, tribal tripwires
5. BEST POSITIONING ANGLE — Exact narrative frame that maximizes resonance in THIS community
6. FIRST MOVE — Specific tactical execution: timing, comment seeding strategy, what NOT to say
7. TITLE ADAPTATION — 3 title rewrites that speak to this community's specific psychology

════════════════════════════════════════════
STEP 6 — GO CRAZY MODE (if requested)
════════════════════════════════════════════
Standard picks are psychologically smart. Go Crazy picks must be psychologically BRILLIANT.
These are communities where:
- The topic has zero surface overlap but the narrative DNA is a perfect psychological match
- The audience archetype secretly shares the core tension in this post
- The emotional energy is rare and therefore high-value in this community
- No competitor founder would ever think to post here — a blue ocean
The test: "I would never have thought of this... but this is genius."
asymScore (1-10) = asymmetric opportunity: high score = massive upside with near-zero competition.

════════════════════════════════════════════
STEP 7 — CONTINUOUS LEARNING FRAMING
════════════════════════════════════════════
Your recommendations should reflect an evolving model of community psychology — not static rules but living patterns. Each recommendation is a hypothesis about narrative-community fit, grounded in deep reasoning about how communities actually reward authentic human stories.
${companyBlock}
═══════════════════════════════════════════════════════════
POST TO ANALYZE:
TITLE: "${title}"
BODY: "${body || '(no body — analyze title only)'}"
═══════════════════════════════════════════════════════════

Execute all 7 steps internally. Then return ONLY this JSON (no markdown, no fences, no explanation outside the JSON):

{
  "dna": {
    "narrativeType": "<specific narrative archetype>",
    "emotionalEnergy": "<specific emotional signature>",
    "promotionRisk": "<Low|Medium|High>",
    "promotionRiskScore": <0-10>,
    "audienceMaturity": "<specific audience type>",
    "discussionPotential": <1-10>,
    "authenticityScore": <1-10>,
    "tacticalDepth": <1-10>,
    "controversyScore": <1-10>,
    "promotionSafety": <1-10>
  },
  "standard": [
    {
      "subreddit": "<name without r/>",
      "narrativeFit": <1-10>,
      "insight": "<3 sentences: the psychological mechanism — WHY this narrative belongs here, what reward structure it triggers, what emotional need it satisfies. Be psychologically specific, never topic-generic.>",
      ${insightCommandField}
      "expectedReactions": [
        "<specific reaction e.g. 'Senior engineers will validate the technical choice and share war stories'>",
        "<specific reaction>",
        "<specific reaction>"
      ],
      "positioning": "<exact narrative frame to adopt — specific to this community's identity and reward psychology, not generic>",
      "risks": [
        {"text": "<community-specific risk — name the exact tribal tripwire or promotion alarm>", "level": "<high|medium|low>"},
        {"text": "<second specific risk>", "level": "<high|medium|low>"}
      ],
      "titleVariations": [
        "<title rewritten for this community's specific reward system — full psychological reframe, not a word swap>",
        "<different psychological angle>",
        "<third psychological angle>"
      ],
      "firstMove": "<specific tactical execution — include timing, whether to seed a comment, what opening line to use, and one thing to never say in this community>",
      "tags": ["<2-word descriptor>", "<2-word descriptor>"]
    }
  ]${goCrazy ? `,
  "goCrazy": [
    {
      "subreddit": "<unexpected community — zero topic overlap, but deep psychological compatibility>",
      "narrativeFit": <1-10>,
      "asymScore": <1-10>,
      "isGoCrazy": true,
      "insight": "<3 sentences: explain the SURPRISING psychological match — why this community secretly rewards this exact narrative DNA despite having nothing to do with the topic on the surface>",
      ${insightCommandField}
      "expectedReactions": ["<specific reaction>", "<specific reaction>", "<specific reaction>"],
      "positioning": "<psychological positioning that makes this feel native to this unexpected community>",
      "risks": [
        {"text": "<specific risk>", "level": "<high|medium|low>"},
        {"text": "<specific risk>", "level": "<high|medium|low>"}
      ],
      "titleVariations": [
        "<title completely reframed — zero overlap with original framing, native to this community>",
        "<second reframe>",
        "<third reframe>"
      ],
      "firstMove": "<Go Crazy execution — the exact positioning angle, why this community has never seen this post archetype before, what to seed in first comment>",
      "tags": ["<2-word descriptor>", "<2-word descriptor>"]
    }
  ]` : ''},
  "_end": true
}

FINAL RULES:
- Standard: exactly 3 subreddits, sorted by narrativeFit descending
- Each of the 3 standard picks must reward this narrative for COMPLETELY DIFFERENT psychological reasons
- Go Crazy: exactly 2 picks, sorted by asymScore descending — they must feel like "I'd never have thought of this, but genius"
- Every insight must name a specific psychological mechanism, never a topic category
- Every title variation must be a true psychological reframe, not a synonym swap
- Return ONLY valid JSON. No markdown. No explanation outside the JSON.`;

  const msg = await client.messages.create({
    model: 'claude-opus-4-5',
    max_tokens: 4500,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = (msg.content[0] as { type: string; text: string }).text.trim();
  const json = raw.replace(/^```json?\n?/, '').replace(/\n?```$/, '');
  return JSON.parse(json) as import('@/types').DistributionResult;
}
