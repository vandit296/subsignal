# PARKED — Topic Watch "actionability" ranking

_Status: shipped behind a flag, decision deferred. Pick up later._

## What's live right now
- The topic scorer (`lib/intelligence.ts` → `scoreTopicBatch`) now also returns an **`intent`** for each thread: `ask | rec | pain | win | news | opinion`.
- `INTENT_WEIGHT` in `lib/intelligence.ts` maps intent → actionability weight (ask/rec/pain = 1, win = 0.5, news/opinion = 0.35).
- `components/TopicWatch.tsx`:
  - Shows the **intent tag** on every result card (e.g. SEEKING REC, ASKING, SHARING WIN) — always on.
  - Reads `?rank=action` URL flag → re-sorts results by `on-topic% × intent weight`. Default sort is still relevance.
- Compare links: `/watch?topic=X` (current) vs `/watch?topic=X&rank=action` (experimental). First build of a topic needs `&rebuild=1` (signed in) to populate intent.

## What we learned (real data: "remote work", "venture capital")
- Intent scoring is **accurate** (tags match reality).
- The **re-sort is marginal** — the relevance scorer already surfaces high-intent posts at the top (e.g. "what webcam do you recommend"). For fundraising-type topics, results are almost ALL high-intent already.
- The **real win is the visible intent tag**, not the reordering — lets you see "someone's ASKING" (reply) vs "SHARING / news" (skip) at a glance.

## Open decision (to take up later)
1. Make `rank=action` the **default** for everyone (drop the flag)? — low risk, small upside.
2. Or keep just the tags (clear win) and leave default sort = relevance?
3. Bigger lever if we ever want real recall gains: **semantic retrieval (embeddings / Upstash Vector)** — catches paraphrased threads the keyword pre-filter drops. Separate, larger project.

## Notes
- Cost: intent adds nothing material (same Haiku scoring call, one extra field; max_tokens bumped 1500→1700).
- Everything is already deployed to prod; flag is off by default so no user impact until we decide.

## Coverage / breadth lever (parked)
- Topic Watch sweeps **140 subreddits per build** (`UNIVERSE_CAP` in `lib/intelligence.ts`).
- Each swept sub: 40 newest posts (`PER_SUB_LIMIT`), last 10 days (`WINDOW_DAYS`).
- The 140 = topic's AI-picked subs (~25, first) + CORE_SUBREDDITS (90, always) + fill from SUBREDDIT_CANDIDATES (346 pool), deduped, capped at 140.
- **Pool is 436 curated subs total (90 core + 346 candidates) but only ~140 are used per build** — so ~300 candidate subs sit unused each build. The cap, not the pool, is the binding limit.
- **Lever for wider coverage:** raise `UNIVERSE_CAP` (one-number change). Direct cost/time tradeoff — more Arctic fetches + more threads to AI-score per build. Hold while cost-focused; revisit if recall/coverage becomes the priority.
