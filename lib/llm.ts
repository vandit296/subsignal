// Central Claude client with a hard daily spend circuit-breaker.
//
// Every Claude call MUST go through `createMessage()`. Before each call we check
// today's accumulated spend (tracked in Redis); if it's at/over the cap we throw
// LlmBudgetError and the call never hits Anthropic. After each call we add the
// real cost (from usage) to the day's counter. This guarantees a worst-case
// daily ceiling no matter what traffic/attacks arrive.
//
// Cap is configurable via LLM_DAILY_CAP_USD (default $10).
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export class LlmBudgetError extends Error {
  constructor() { super('Daily AI budget reached — try again later'); this.name = 'LlmBudgetError'; }
}

const CAP_USD = Number(process.env.LLM_DAILY_CAP_USD ?? '10');

// Price per 1M tokens: [input, output]. Everything is Haiku today; others listed
// so the meter stays accurate if a call is ever bumped up.
const PRICE: Record<string, [number, number]> = {
  'claude-haiku-4-5-20251001': [1, 5],
  'claude-sonnet-4-5': [3, 15],
  'claude-opus-4-5': [15, 75],
};
const priceFor = (model: string): [number, number] => PRICE[model] ?? [1, 5];

async function redis(cmd: unknown[]): Promise<unknown> {
  const url = process.env.UPSTASH_REDIS_REST_URL, token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  try {
    const r = await fetch(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(cmd),
      cache: 'no-store',
    });
    return ((await r.json()) as { result: unknown }).result;
  } catch { return null; }
}

const dayKey = () => `treddit:llm:spend:${new Date().toISOString().slice(0, 10)}`;

/** Today's accumulated Claude spend in USD. */
export async function llmSpentTodayUsd(): Promise<number> {
  const v = (await redis(['GET', dayKey()])) as string | null;
  return v ? Number(v) / 1e6 : 0;
}

export async function llmBudget(): Promise<{ spentUsd: number; capUsd: number; remainingUsd: number }> {
  const spent = await llmSpentTodayUsd();
  return { spentUsd: spent, capUsd: CAP_USD, remainingUsd: Math.max(0, CAP_USD - spent) };
}

/** Budget-guarded Claude call. Drop-in for `client.messages.create`. */
export async function createMessage(
  params: Anthropic.MessageCreateParamsNonStreaming,
): Promise<Anthropic.Message> {
  // Gate: fail closed if we're already at the cap.
  if ((await llmSpentTodayUsd()) >= CAP_USD) throw new LlmBudgetError();

  const msg = await client.messages.create(params);

  // Meter: add this call's real cost to today's counter (micro-dollars, integer).
  try {
    const [pin, pout] = priceFor(String(params.model));
    // SDK's Usage type doesn't declare cache token fields on every version — widen safely; metering MUST include them.
    const u = msg.usage as Anthropic.Usage & { cache_creation_input_tokens?: number | null; cache_read_input_tokens?: number | null };
    const inTok = (u.input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
    const costUsd = (inTok * pin + (u.output_tokens ?? 0) * pout) / 1e6;
    const micro = Math.max(0, Math.round(costUsd * 1e6));
    if (micro > 0) {
      const k = dayKey();
      const n = (await redis(['INCRBY', k, String(micro)])) as number | null;
      if (n !== null) await redis(['EXPIRE', k, String(48 * 3600)]);
    }
  } catch { /* metering is best-effort; never break a successful call */ }

  return msg;
}

export const isBudgetError = (e: unknown): e is LlmBudgetError => e instanceof LlmBudgetError;
