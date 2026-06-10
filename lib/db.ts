// Postgres (Neon serverless, HTTP driver) — the central index store.
// Safe to import even when DATABASE_URL isn't set: `sql` is null and callers
// fall back to the live engine. (Step 1 of the central-index plan.)
import { neon, type NeonQueryFunction } from '@neondatabase/serverless';

export const hasDb = !!process.env.DATABASE_URL;
export const sql: NeonQueryFunction<false, false> | null = hasDb
  ? neon(process.env.DATABASE_URL!)
  : null;
