import { defineConfig } from "drizzle-kit";

/**
 * Single schema, single migration set for both drivers: `dialect: "postgresql"`
 * produces identical SQL whether it targets PGlite (local/test) or Supabase
 * Postgres (production). Branch only on connection details via `DB_DRIVER`.
 *
 * When `DB_DRIVER=postgres`, Drizzle Kit (`generate` / `migrate` / `push` /
 * `studio`) uses `DIRECT_DATABASE_URL` — direct Postgres or Session Pooler
 * (`:5432`) — never the Transaction Pooler used by the app runtime.
 */
export default process.env.DB_DRIVER === "postgres"
  ? defineConfig({
      dialect: "postgresql",
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dbCredentials: {
        url: process.env.DIRECT_DATABASE_URL!,
      },
    })
  : defineConfig({
      dialect: "postgresql",
      driver: "pglite",
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dbCredentials: {
        url: "./.pglite",
      },
    });
