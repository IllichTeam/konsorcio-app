import { defineConfig } from "drizzle-kit";

/**
 * Single schema, single migration set for both drivers: `dialect: "postgresql"`
 * produces identical SQL whether it targets PGlite (local/test) or Supabase
 * Postgres (production). Branch only on connection details via `DB_DRIVER`.
 */
export default process.env.DB_DRIVER === "postgres"
  ? defineConfig({
      dialect: "postgresql",
      schema: "./src/db/schema.ts",
      out: "./drizzle",
      dbCredentials: {
        url: process.env.DATABASE_URL!,
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
