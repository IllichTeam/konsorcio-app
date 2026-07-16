/**
 * Options for `postgres-js` against a pooled serverless Postgres URL
 * (Supabase Transaction Pooler on :6543, or any PgBouncer transaction-mode
 * pooler).
 *
 * - `prepare: false` — transaction-mode poolers do not support prepared
 *   statements across connections.
 * - `max: 1` — each Vercel serverless isolate should hold at most one
 *   connection so concurrent isolates do not exhaust the pooler.
 */
export const SERVERLESS_POSTGRES_OPTIONS = {
  prepare: false,
  max: 1,
} as const;

export type ServerlessPostgresOptions = typeof SERVERLESS_POSTGRES_OPTIONS;
