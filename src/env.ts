import { z } from "@/lib/zod";

/**
 * Typed, validated environment variables.
 *
 * `DB_DRIVER` selects the Drizzle driver at runtime (see `src/db/index.ts`):
 * - "pglite": embedded Postgres via WASM, used in local dev and tests. No
 *   `DATABASE_URL` required.
 * - "postgres": postgres-js against a real Postgres instance (Supabase in
 *   production). Requires `DATABASE_URL`.
 *
 * `DATABASE_URL` is intentionally optional here so the app never throws on
 * boot in pglite mode; `src/db/index.ts` is responsible for asserting it is
 * present when `DB_DRIVER === "postgres"`.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  DB_DRIVER: z.enum(["pglite", "postgres"]).default("pglite"),
  /**
   * better-auth encryption/signing secret. Optional at the schema level so
   * `drizzle-kit`/the `@better-auth/cli` (which imports this module to
   * resolve config) never throws during schema generation; `src/lib/auth.ts`
   * asserts it is present before constructing the real runtime instance.
   */
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().default("http://localhost:3000"),
  /**
   * Credentials for the permanent admin account, consumed by the idempotent
   * seed (`src/db/seed-admin.ts`). Optional at the schema level (like
   * `BETTER_AUTH_SECRET`) so tooling that imports this module — drizzle-kit,
   * the better-auth CLI — never throws; `seedAdmin`'s CLI wrapper asserts
   * both are present before running.
   */
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DB_DRIVER: process.env.DB_DRIVER,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
});

export type Env = typeof env;
