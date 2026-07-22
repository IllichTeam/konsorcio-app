import { z } from "@/lib/zod";

/**
 * Typed, validated environment variables.
 *
 * `DB_DRIVER` selects the Drizzle driver at runtime (see `src/db/index.ts`):
 * - "pglite": embedded Postgres via WASM, used in local dev and tests. No
 *   `DATABASE_URL` required.
 * - "postgres": postgres-js against a real Postgres instance (Supabase in
 *   production). Requires `DATABASE_URL` (Transaction Pooler for runtime).
 *
 * `DATABASE_URL` / `DIRECT_DATABASE_URL` are intentionally optional here so
 * the app never throws on boot in pglite mode; `src/db/index.ts` asserts
 * `DATABASE_URL` when `DB_DRIVER === "postgres"`. Drizzle Kit
 * (`drizzle.config.ts`) uses `DIRECT_DATABASE_URL` for migrate/push/studio.
 */
const envSchema = z.object({
  DATABASE_URL: z.string().optional(),
  /**
   * Direct Postgres or Session Pooler (`:5432`) URL for Drizzle Kit
   * migrations. Not read by the app runtime — only by `drizzle.config.ts`.
   * Optional here so importing `@/env` in the Next.js process never requires it.
   */
  DIRECT_DATABASE_URL: z.string().optional(),
  DB_DRIVER: z.enum(["pglite", "postgres"]).default("pglite"),
  /**
   * better-auth encryption/signing secret. Optional at the schema level so
   * `drizzle-kit`/the `@better-auth/cli` (which imports this module to
   * resolve config) never throws during schema generation; `src/lib/auth.ts`
   * asserts it is present before constructing the real runtime instance.
   */
  BETTER_AUTH_SECRET: z.string().optional(),
  BETTER_AUTH_URL: z.string().default("http://localhost:3200"),
  /**
   * Credentials for the permanent admin account, consumed by the idempotent
   * seed (`src/db/seed-admin.ts`). Optional at the schema level (like
   * `BETTER_AUTH_SECRET`) so tooling that imports this module — drizzle-kit,
   * the better-auth CLI — never throws; `seedAdmin`'s CLI wrapper asserts
   * both are present before running.
   */
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  /**
   * Resend API key used to send transactional email. Optional at the schema
   * level (like `BETTER_AUTH_SECRET`) so tooling that imports this module —
   * drizzle-kit, the better-auth CLI — never throws; `src/lib/email/client.ts`
   * asserts it is present before constructing the real `Resend` instance.
   * When unset, OTP/forgot-password emails are logged to stdout for local/pglite
   * dev (see `src/lib/email/send-otp-email.ts`).
   */
  RESEND_API_KEY: z.string().optional(),
  EMAIL_FROM: z.string().default("Konsorcio <onboarding@resend.dev>"),
  /**
   * Temporary override for all outbound Resend `to` addresses (notifications +
   * OTP). Use while the production domain is unverified — Resend's
   * `onboarding@resend.dev` sender can only deliver to the account owner.
   * Unset once the domain is verified to restore real recipients.
   */
  EMAIL_OVERRIDE_TO: z.string().email().optional(),
  /**
   * Client (`NEXT_PUBLIC_`): when true, controlled demo mode — sidebar shows
   * only Consorcios and unfinished detail actions are hidden. Default false.
   */
  NEXT_PUBLIC_DEMO_MODE: z.preprocess((val) => val === "true" || val === true, z.boolean()),
  /**
   * Supabase project URL for Storage (expense PDF uploads). Optional at the
   * schema level so tooling that imports this module never throws;
   * `src/lib/storage/supabase-admin.ts` asserts both Storage vars before use.
   * Server-only — never expose as `NEXT_PUBLIC_*`.
   */
  SUPABASE_URL: z.string().url().optional(),
  /**
   * Supabase secret API key (`sb_secret_…`) for private bucket upload + signed URLs.
   * Replaces the legacy `service_role` JWT. Server-only — never send to the browser.
   */
  SUPABASE_SECRET_KEY: z.string().min(1).optional(),
});

export const env = envSchema.parse({
  DATABASE_URL: process.env.DATABASE_URL,
  DIRECT_DATABASE_URL: process.env.DIRECT_DATABASE_URL,
  DB_DRIVER: process.env.DB_DRIVER,
  BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
  BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
  ADMIN_EMAIL: process.env.ADMIN_EMAIL,
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD,
  RESEND_API_KEY: process.env.RESEND_API_KEY,
  EMAIL_FROM: process.env.EMAIL_FROM,
  EMAIL_OVERRIDE_TO: process.env.EMAIL_OVERRIDE_TO || undefined,
  NEXT_PUBLIC_DEMO_MODE: process.env.NEXT_PUBLIC_DEMO_MODE,
  SUPABASE_URL: process.env.SUPABASE_URL || undefined,
  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || undefined,
});

export type Env = typeof env;
