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

## Arctic Shift API Notes
- Subreddit data: `/api/posts/search?subreddit=X&limit=auto&after=1week` (period as relative string)
- Keyword search: `/api/posts/search?title=KEYWORD&subreddit=X&limit=25&sort=desc&after=YYYY-MM-DD` (ISO date, NOT relative string)
- `subreddit=all` does NOT work — must specify a real subreddit name
- No API key needed, works from Vercel cloud IPs, indexes posts within hours of posting
- Exa's Reddit index is broken (returns 0 results for `includeDomains: reddit.com`) — do not use Exa for Reddit keyword search

## Architecture
- Auth: NextAuth (Google OAuth) — lib/auth.ts
- DB: Upstash Redis — lib/upstash.ts
- Email: Resend — lib/email.ts
- AI: Claude (Anthropic SDK) — lib/claude.ts
- Reddit data: Arctic Shift — lib/reddit-arctic.ts
- Keyword Watch: Arctic Shift title search across user subreddits + defaults — app/api/track/route.ts
- Admin dashboard: treddit.live/admin (vandit296@gmail.com only)


## Context Efficiency (keep sessions under 200K tokens)
- **Never fetch the full repo file tree** — ask which specific files are relevant instead
- **Never fetch the same file twice** — if it's already in context, use that
- **Read only the specific file you need** — don't fetch large page.tsx files to understand a feature; ask the user to describe it or read only the relevant lib/ file
- **Screenshots cost tokens** — take one screenshot per action sequence, not one per step; batch clicks and only screenshot the final result
- **Prefer targeted GitHub API calls** — fetch a specific file by path, not the full tree blob
- **Start a new conversation per task** — don't carry browser session state, file contents, or screenshots from a previous task into a new one
- **Never re-read a file to verify an edit** — trust the edit succeeded unless there's an error
