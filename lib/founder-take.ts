// ── Founder Bubble Logic ──────────────────────────────────────────────────────
// Vandit's personal take on a post score, contextualised by subreddit category.
// Score buckets: 0-39 | 40-59 | 60-69 | 70-79 | 80-89 | 90-100
// Subreddit categories: investing | startups | marketing | tech | default

type ScoreBucket = 'terrible' | 'weak' | 'decent' | 'good' | 'great' | 'exceptional';
type SubCategory = 'investing' | 'startups' | 'marketing' | 'tech' | 'default';

function getBucket(score: number): ScoreBucket {
  if (score < 40) return 'terrible';
  if (score < 60) return 'weak';
  if (score < 70) return 'decent';
  if (score < 80) return 'good';
  if (score < 90) return 'great';
  return 'exceptional';
}

function getCategory(subreddit: string): SubCategory {
  const s = subreddit.toLowerCase();

  if (/angel|venturecapital|vc|investing|stocks|finance|wallstreet|valueinvest/.test(s))
    return 'investing';

  if (/saas|startup|entrepreneur|microsaas|indiehacker|buildinpublic|sideproject|founder/.test(s))
    return 'startups';

  if (/marketing|content_market|seo|socialmedia|digital_market|copywriting|growthhack/.test(s))
    return 'marketing';

  if (/programming|webdev|reactjs|nextjs|javascript|typescript|python|coding|devops|technology/.test(s))
    return 'tech';

  return 'default';
}

const TAKES: Record<SubCategory, Record<ScoreBucket, string>> = {
  investing: {
    terrible:    "Hard pass. This community has seen thousands of pitches and they'll smell a half-baked thesis immediately. Get the hook crisp and bring a clear opinion — not just a question.",
    weak:        "Not quite there yet. Investing communities on Reddit are brutal with vague posts. You need a sharper point of view or a specific data point that makes people stop scrolling.",
    decent:      "Borderline — and that's fine. I've posted in investing subs at this score and sometimes it lands. Tighten the first sentence and I'd go for it.",
    good:        "Good post for this community. Angel investing and VC subs reward directness and specificity — and you have that. Post it.",
    great:       "This is going to do well. The investing community appreciates when someone brings a real take to the table, not just noise. Post it.",
    exceptional: "Post this now. Seriously. This is the kind of post that gets saved and shared in investing communities. Don't wait.",
  },
  startups: {
    terrible:    "This won't get traction in a SaaS or startup sub. The bar is high here — people are building things and they can tell when a post lacks substance. Go back to the core story.",
    weak:        "Borderline. Startup communities value authenticity above everything. If there's a real story buried here, make it the centre — cut the rest.",
    decent:      "Could work. For SaaS and startup subs, 60+ is my personal go-ahead line. Polish the hook and you're good.",
    good:        "Strong post for this community. Founders respond to founders. This reads like it comes from a real place — post it.",
    great:       "Very solid for a startup sub. The mix of honesty and insight is exactly what these communities reward. Go for it.",
    exceptional: "Exceptional. This is the kind of post that starts real conversations in startup communities. Post it immediately.",
  },
  marketing: {
    terrible:    "Marketing subs can be harsh with thin content. This needs more substance — a result, a framework, or a counter-intuitive take — before it earns attention.",
    weak:        "Needs work. Marketing communities love specific numbers and actionable insights. Right now it's too generic to stand out.",
    decent:      "Getting there. Add one concrete result or stat and this moves from decent to good. Worth that extra pass.",
    good:        "Good post for a marketing sub. It has a clear angle and the community will engage with it.",
    great:       "Well-framed for a marketing audience. The specificity is there and the insight is clear. Post it.",
    exceptional: "Exceptional for a marketing sub. It will get saved, shared, and commented on heavily. Post it.",
  },
  tech: {
    terrible:    "Tech communities have a low tolerance for fluff. This needs a concrete technical angle or a clear problem you're solving before it earns upvotes.",
    weak:        "Needs sharpening. Tech subs reward specificity — what exactly did you build, learn, or break? Lead with that.",
    decent:      "Decent. If you have a working demo link or a concrete outcome to share alongside this, it'll perform meaningfully better.",
    good:        "Good post for a tech community. The framing is solid and the audience will relate to it. Post it.",
    great:       "Strong. Tech communities love when someone shares what actually happened, not what was supposed to happen. This has that energy.",
    exceptional: "This is a rare one. Post it immediately — tech communities will upvote, save, and discuss this heavily.",
  },
  default: {
    terrible:    "Hold this one. It's not ready. The core idea might be there but the execution needs work before you put it in front of people.",
    weak:        "On the fence. Take another pass — what's the single thing you want people to take away? Lead with that and cut everything else.",
    decent:      "Decent. Anything above 60 I'd usually say go for it. Minor tweaks to the opener could push this from borderline to solid.",
    good:        "Good post. I'd post this. The structure is clear and the angle is there. Go for it.",
    great:       "Strong one. Well above average — the community you're posting in will respond well to this.",
    exceptional: "Exceptional. Post it now and don't second-guess it.",
  },
};

export interface FounderTake {
  message: string;
  bucket: ScoreBucket;
  category: SubCategory;
}

export function getFounderTake(score: number, subreddit: string): FounderTake {
  const bucket = getBucket(score);
  const category = getCategory(subreddit);
  return {
    message: TAKES[category][bucket],
    bucket,
    category,
  };
}
