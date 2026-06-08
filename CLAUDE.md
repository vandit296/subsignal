# Treddit — Project Context

## App
- **URL**: treddit.live
- **Repo**: github.com/vandit296/subsignal
- **Stack**: Next.js 14 App Router, TypeScript, Vercel, Upstash Redis, Resend (email), Razorpay (India payments), Paddle (global payments), Claude AI (Anthropic), Arctic Shift (Reddit data)

## Branch Rules
- `main` = production. Always push here.
- `feat/v2-saas` = NEVER touch or promote to production.

## Owner
- Email: vandit296@gmail.com (lifetime paid account, hardcoded in lib/upstash.ts)

## Design System (VOID)
- Background: `#0C0C0F` (--void), Surface: `#131317`, Panel: `#1A1A1F`
- Accent: `#4A8FFF` (--blue), Hot: `#FF4500`
- Text: `#F0ECE4` (--t1), muted via rgba
- Fonts: `var(--font-ui)` system-ui, `var(--font-mono)` SF Mono

## Key Rules
- Reddit OAuth/API is dead. Use Arctic Shift only for Reddit data.
- Sandbox has NO network access — never curl/wget/requests from bash.
- Never promote feat/v2-saas to production.
- Keep tasks scoped — avoid long sessions that trigger 1M token context.
- SECURITY: any fetch of a user-supplied URL MUST go through `lib/safe-fetch.ts` (`safeFetchText`/`assertSafeUrl`) — SSRF guard blocks private/reserved/metadata IPs, validates every redirect hop, caps size/time. Used by `fetchUrlText` (intelligence.ts) + `/api/subreddits-by-url` (also IP rate-limited 20/h + 12h per-URL cache). `/api/reddit-proxy` is host-locked to www.reddit.com. Fetched page text is passed to the LLM as untrusted data (never instructions).
- COST/ABUSE GUARDS:
  - **All Claude calls go through `lib/llm.ts` `createMessage()`** — never call `client.messages.create` directly. It enforces a hard daily spend circuit-breaker (Redis `treddit:llm:spend:{date}`, cap = `LLM_DAILY_CAP_USD` env, default $10): fails closed with `LlmBudgetError` once the day's metered cost hits the cap, meters real cost from `usage` after each call. `llmBudget()` exposes spent/remaining.
  - **`middleware.ts` per-IP rate limit** on `/api/*` (edge, Redis, fail-open): 60/min default, 15/min on Claude-backed routes; exempts `/api/auth`, `/api/billing/webhook`, `/api/cron`. Backstop to the Vercel WAF (configure WAF rate-limit + Bot Management in the Vercel dashboard for edge-level blocking).

## Arctic Shift API Notes
- Subreddit data: `/api/posts/search?subreddit=X&limit=auto&after=1week` (period as relative string)
- Keyword search: `/api/posts/search?query=KEYWORD&subreddit=X&limit=25&sort=desc&after=YYYY-MM-DD` (ISO date, NOT relative string). Use `query=` (full-text: title+selftext), NOT `title=` — `title=` misses body mentions and 422s on some terms. `query=` still requires a subreddit (global/no-subreddit returns 400).
- `subreddit=all` does NOT work — must specify a real subreddit name
- No API key needed, works from Vercel cloud IPs, indexes posts within hours of posting
- Exa's Reddit index is broken (returns 0 results for `includeDomains: reddit.com`) — do not use Exa for Reddit keyword search

## Architecture
- Auth: NextAuth (Google OAuth) — lib/auth.ts
- DB: Upstash Redis — lib/upstash.ts
- Email: Resend — lib/email.ts
- AI: Claude (Anthropic SDK) — lib/claude.ts
- Reddit data: Arctic Shift — lib/reddit-arctic.ts
- Keyword Watch: app/api/track/route.ts — Arctic `query=` full-text; ALWAYS searches `CORE_SUBREDDITS` (lib/subreddit-pool.ts); concurrency-capped + 429-retry + 15-min Redis cache. Exa only as opt-in fallback (`EXA_KEYWORD_FALLBACK=true`, off).
- **Intelligence Feed (flagship)**: lib/intelligence.ts — company URL/description → Claude profile → wide Arctic sweep (~140 subs, posts firehose, live-filtered) → tokenized recall → Claude intent scorer → tiered reply/add/watch. Crisis/self-harm safety filter drops distressed posts.
  - `/feed` IS this engine now (old signal feed removed; `/feed-v2` is an alias). API: app/api/intelligence-feed/route.ts (build-on-miss; `?url=` fetches+builds, `?description=`/`?rebuild=1` overrides). Feed built LAZILY on first visit, cached per-user 12h, INVALIDATED on `saveCompany`. (COST: `build-feeds` cron REMOVED — it rebuilt all users every 6h on autopilot, the main API spend. Route at app/api/cron/build-feeds still exists for manual pre-builds, just unscheduled.)
  - **Models (cost-tuned — ALL Haiku now)**: every Claude call uses `claude-haiku-4-5-20251001`. intelligence.ts (buildProfile, expandTopic, scoreBatch, scoreTopicBatch) + claude.ts (analyzeSubreddit/Scout, predictPost, findSubreddits/Radar, findSubredditsGoCrazy) + brief/generate + thread-scorer + post-similar. Opus fully removed for cost. If a specific output needs more quality later, bump THAT call to Sonnet (confirm model string first) — do not blanket-restore Opus. LLM_CAP trimmed 180→100.
  - Homepage Product URL tab forks: "Map my subreddits" → `/radar?url=`, "Find customers now" → `/feed?url=`.
- **Subreddit Directory** (`/radar/directory`, tab inside Radar): browsable view of the CORE_SUBREDDITS pool scored to the user's Command company — table (sortable) / by-topic / matrix (fit × opportunity, flags "hidden gems"). API: app/api/subreddit-directory/route.ts — AI-categorizes+scores the pool in Haiku batches (fit/competition/category/bestFor) + Arctic member counts (concurrency-capped), cached per-user 24h (`treddit:directory:{email}`, `?refresh=1` rebuilds). Cards link to Scout (`/scout/<sub>`) + Topic Watch. v1 = core pool (~90); expandable to SUBREDDIT_CANDIDATES via the pool import. Cost per build: ~4 Haiku batches + ~90 Arctic calls, once/24h/company.
- Payments: Razorpay (India) + Paddle (global). Paddle checkout is a **Paddle.js overlay** (not redirect) — app/upgrade/page.tsx loads Paddle.js w/ `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN`, opens via transaction id from app/api/billing/create-checkout. Launch discount auto-applies via `PADDLE_LAUNCH_DISCOUNT_ID` until 2026-08-01. Webhook: app/api/billing/webhook (needs `PADDLE_WEBHOOK_SECRET`).
- Admin dashboard: treddit.live/admin (vandit296@gmail.com only)
- Crons (vercel.json): posts-of-day (daily — the ONE recurring user email), trial-emails (daily lifecycle), feature-test (3h health, owner-only), expand-subreddit-pool (5am). EMAIL MODEL: free-trial users get exactly ONE recurring email/day = Posts of the Day, and ONLY if (a) they still have access (isAccessGranted) AND (b) they've set up a company with subreddits (no generic blasts; unset-up users get just the 24h 'finish setup' lifecycle nudge). REMOVED from schedule (cost + email fatigue): morning-brief (daily AI Brief), daily-digest (keyword alerts — feature is dead), signal-feed (weekly AI digest), weekly-brief (generated briefs nobody emailed), build-feeds. Their route files still exist but are UNSCHEDULED. Trial sequence (trial-emails): incomplete-setup @24h → trial-ending-soon @~24h-before-expiry → trial-expired @expiry (3-day extend token). Welcome email fires on subscription activation (billing webhook).

## Env vars (in Vercel, NOT in local .env.local which only has VERCEL_OIDC_TOKEN)
- Core: ANTHROPIC_API_KEY, UPSTASH_REDIS_REST_URL/TOKEN, RESEND_API_KEY, CRON_SECRET, NEXTAUTH_URL, EXA_API_KEY
- Paddle: PADDLE_API_KEY (live), PADDLE_PRICE_ID, NEXT_PUBLIC_PADDLE_CLIENT_TOKEN (live), PADDLE_WEBHOOK_SECRET, PADDLE_LAUNCH_DISCOUNT_ID
- Razorpay: RAZORPAY_KEY_ID/SECRET, NEXT_PUBLIC_RAZORPAY_KEY_ID, RAZORPAY_LAUNCH_OFFER_ID
- Optional: EXA_KEYWORD_FALLBACK (off), LLM_DAILY_CAP_USD (daily Claude spend ceiling, default 10), TOPIC_ANON_FREE_PER_DAY (anonymous Topic Watch builds/day before sign-in, default 1)

## PostHog (project 435749)
- Dashboards: "Intelligence Feed" (1676580), "Reddit Growth Funnel" (1672338)
- Custom events: keyword_added, distribute_attempted/analyzed/failed, feed_url_submitted, map_subreddits_clicked, intel_feed_built, opportunity_clicked

## Already built / fixed (do NOT redo)
- Paddle: live checkout overlay, auto launch discount, banner, webhook — all working & verified
- `/feed` already swapped to the Intelligence Feed engine; crisis safety filter live
- Keyword Watch already on Arctic `query=` + CORE_SUBREDDITS + cache
- og.png exists in public/ for social link previews


## Context Efficiency (keep sessions under 200K tokens)
- **Never fetch the full repo file tree** — ask which specific files are relevant instead
- **Never fetch the same file twice** — if it's already in context, use that
- **Read only the specific file you need** — don't fetch large page.tsx files to understand a feature; ask the user to describe it or read only the relevant lib/ file
- **Screenshots cost tokens** — take one screenshot per action sequence, not one per step; batch clicks and only screenshot the final result
- **Prefer targeted GitHub API calls** — fetch a specific file by path, not the full tree blob
- **Start a new conversation per task** — don't carry browser session state, file contents, or screenshots from a previous task into a new one
- **Never re-read a file to verify an edit** — trust the edit succeeded unless there's an error
