import path from "node:path";

import { PGlite } from "@electric-sql/pglite";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { drizzle as drizzlePostgres } from "drizzle-orm/postgres-js";
import postgres from "postgres";

import { env } from "@/env";

import { SERVERLESS_POSTGRES_OPTIONS } from "./postgres-client-options";
import * as schema from "./schema";

/**
 * Runtime-selected Drizzle client.
 *
 * - `DB_DRIVER=postgres` (or a `DATABASE_URL` with a `postgres(ql)://`
 *   protocol): postgres-js against a real Postgres instance (Supabase in
 *   production). Runtime should use the Transaction Pooler URL (`:6543`);
 *   Drizzle Kit migrations use `DIRECT_DATABASE_URL` separately.
 * - Anything else (default): PGlite, an embedded Postgres compiled to WASM,
 *   persisted to the local `./.pglite` directory. Used for local dev and as
 *   the base for the in-memory PGlite test helper.
 *
 * Both branches share the same `schema`, so callers never need to know
 * which driver backs `db` — `dialect: "postgresql"` in `drizzle.config.ts`
 * keeps the generated SQL identical for both.
 *
 * The client is memoized on `globalThis` so Next.js dev-mode HMR reuses the
 * same connection/instance instead of opening a new one on every reload.
 */

const isPostgresUrl = (url: string | undefined): boolean =>
  !!url && /^postgres(ql)?:\/\//.test(url);

const usePostgres = env.DB_DRIVER === "postgres" || isPostgresUrl(env.DATABASE_URL);

function createPostgresDb() {
  if (!env.DATABASE_URL) {
    throw new Error(
      "DATABASE_URL is required when DB_DRIVER=postgres (Supabase connection string).",
    );
  }

  const client = postgres(env.DATABASE_URL, SERVERLESS_POSTGRES_OPTIONS);
  return drizzlePostgres({ client, schema });
}

function createPgliteDb() {
  const dataDir = path.join(process.cwd(), ".pglite");
  const client = new PGlite(dataDir);
  return drizzlePglite({ client, schema });
}

type DrizzleDb = ReturnType<typeof createPostgresDb> | ReturnType<typeof createPgliteDb>;

const globalForDb = globalThis as unknown as { drizzleDb?: DrizzleDb };

function getDb(): DrizzleDb {
  if (!globalForDb.drizzleDb) {
    globalForDb.drizzleDb = usePostgres ? createPostgresDb() : createPgliteDb();
  }
  return globalForDb.drizzleDb;
}

/**
 * Lazy singleton. The underlying client (the `./.pglite` file store or the
 * postgres-js pool) is created on first property access, not at import time —
 * so merely importing `@/db` (e.g. in a `next build` worker that collects page
 * data but never runs a query, or in `src/lib/auth.ts`'s eager `createAuth()`)
 * does not open a connection. Once created, the instance is memoized on
 * `globalThis`, so every module that imports `db` shares the exact same
 * connection within a process (and across Next.js dev-mode HMR reloads).
 */
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop) {
    const real = getDb() as unknown as Record<string | symbol, unknown>;
    const value = real[prop];
    return typeof value === "function" ? value.bind(real) : value;
  },
});

export { schema };
