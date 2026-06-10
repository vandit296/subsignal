# PLAN — Central Index, Step 1 (ingest + wide search)

_Goal: stop sweeping Reddit live per search. Ingest a large subreddit universe into our own store on a schedule, and have Topic Watch (then Feed) query that store — so coverage stops being capped by per-request time. "140 is too few" goes away._

---

## The core change
**Today:** every Topic Watch search live-fetches ~140 subreddits from Arctic, filters, scores. Slow (~1 min) and width-capped.
**Step 1:** a background cron continuously pulls recent posts from a large universe into our store. Searches query the store (instant, wide). No live Arctic sweep at query time.

```
Arctic ──(cron, every few hours)──▶  OUR INDEX (recent posts)  ◀──(query)── Topic Watch / Feed
         free, incremental                full-text searchable        fast, wide
```

## 1. Universe (what we ingest)
- Start with the existing pool: **CORE_SUBREDDITS (90) + SUBREDDIT_CANDIDATES (346) = ~436 subs** — already 3× today's live cap.
- Designed to grow to **1,000s** later (Step 3) with no query-time penalty.

## 2. What we pull per sub
- Arctic firehose: `/api/posts/search?subreddit=X&limit=100&after=<lastRun>` — **incremental** (only new posts since last ingest).
- Keep: `id, subreddit, title, selftext(truncated), permalink, score, num_comments, created_utc`.
- Drop on the way in: `[removed]/[deleted]`, locked, crisis-flagged (reuse the CRISIS filter).
- **Rolling window:** prune posts older than ~14–30 days so the index stays fresh and small.

## 3. Storage — the one real decision
We need **full-text search now** and **vector search later** (Step 2). Two clean paths:

- **Option A — Postgres + pgvector (recommended).** Neon / Supabase / Vercel Postgres. Native full-text search (`tsvector`) for Step 1, and `pgvector` for Step 2 embeddings — **one store for both steps**. Cheap at this scale (~hundreds of MB). New dependency, but the standard tool and the cleanest long-term home.
- **Option B — stay in-ecosystem.** Upstash **Search** (managed full-text) now + Upstash **Vector** (embeddings) later. No new vendor, but two products instead of one.

Either way, Arctic ingest is **free**, so the marginal cost is storage + cron compute (small).

## 4. Ingest cron
- Schedule: every **3–6 hours** (tune later). Incremental + concurrency-capped (gentle on Arctic, it rate-limits).
- Upsert posts; prune the rolling window. Track per-sub `lastRun` so each cycle only fetches new posts.
- Arctic is free → near-zero API $; cost is just cron minutes.

## 5. Topic Watch query change
- Keep `expandTopic` (topic → keywords + definition).
- Replace the live Arctic sweep with **one full-text query against the index** across the *entire* ingested universe → top ~300 candidates.
- AI-score only the **top ~100** (unchanged scorer, still under the $10/day breaker).
- Net: searches go from ~1 min over 140 subs → **~1–2s over the whole universe.**
- Feed engine moves to the same path afterward.

## 6. Cost shape (matters given the focus)
- Arctic ingest: **free.**
- Storage: small (rolling 14–30d window).
- Cron compute: a few minutes every few hours.
- Query-time AI scoring: **bounded** (top ~100 only) — same as today, capped by the breaker.
- → Much wider coverage **without** much more spend. The width was never the cost driver; the live LLM scoring is, and that stays capped.

## 7. Safety / rollout
- Build the ingest + index alongside the current engine.
- Topic Watch falls back to the live sweep if the index is empty/cold.
- Flip Topic Watch to index-backed once populated; verify recall ≥ current; then move Feed.

## 8. Done-when (Step 1 success)
- Index holds recent posts from ~436 subs, refreshed every few hours.
- Topic Watch returns in <2s, drawing from the full universe (not 140).
- Recall is at least as good as today (semantic improvement comes in Step 2).

---

## Decision needed before coding
**Storage: Postgres+pgvector (Option A, recommended) or Upstash Search+Vector (Option B)?**
Everything else is settled. Once you pick, Step 1 build = ingest cron + index schema + Topic Watch query swap.

## Not in Step 1 (later)
- Step 2: embeddings + semantic/vector recall.
- Step 3: grow the universe to thousands + auto-discover new subs.
