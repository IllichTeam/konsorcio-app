import { db } from "@/db";
import { env } from "@/env";
import { createAuth } from "@/lib/auth";

export interface SeedAdminInput {
  email: string;
  password: string;
  name?: string;
}

export interface SeedAdminResult {
  userId: string;
  /** `true` when the admin row was created by this call, `false` when it already existed. */
  created: boolean;
}

type Database = Parameters<typeof createAuth>[0];

/**
 * Idempotently provisions the single permanent admin account.
 *
 * - Admin doesn't exist yet -> created with `role: "admin"` and a
 *   `credential` account holding the hashed password.
 * - Admin already exists -> `role` is (re-)set to `"admin"` and its password
 *   is reset to `password`. The env value is always the source of truth, so
 *   re-running this (e.g. after rotating `ADMIN_PASSWORD`) rotates the
 *   admin's password rather than leaving the old one in place.
 *
 * Bootstrap problem this solves: `emailAndPassword.disableSignUp: true`
 * blocks public sign-up, and the `admin` plugin's `createUser` endpoint
 * requires an authenticated admin session — a chicken-and-egg problem for
 * the very first admin. Instead of going through the HTTP API, this reaches
 * into `auth.$context` (the same internal context better-auth's own route
 * handlers use — see `better-auth/dist/plugins/admin/routes.mjs`'s
 * `createUser` endpoint and `better-auth/dist/api/routes/sign-up.mjs`) to
 * call `ctx.internalAdapter.createUser` / `linkAccount` / `updateUser` /
 * `updatePassword` directly, and `ctx.password.hash` to hash the password
 * with better-auth's configured hasher (scrypt by default). This keeps the
 * `account.password` hash byte-for-byte what `signInEmail` expects, instead
 * of inventing/precomputing a hash ourselves.
 */
export async function seedAdmin(
  database: Database,
  { email, password, name = "Admin" }: SeedAdminInput,
): Promise<SeedAdminResult> {
  const auth = createAuth(database);
  const ctx = await auth.$context;

  const normalizedEmail = email.toLowerCase();
  const existing = await ctx.internalAdapter.findUserByEmail(normalizedEmail, {
    includeAccounts: true,
  });
  const hashedPassword = await ctx.password.hash(password);

  if (!existing) {
    const user = await ctx.internalAdapter.createUser({
      email: normalizedEmail,
      name,
      emailVerified: true,
      role: "admin",
    });

    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: hashedPassword,
    });

    return { userId: user.id, created: true };
  }

  const { user, accounts } = existing;
  // `role` is an additional field the `admin` plugin adds to the `user`
  // schema at runtime; the base `User` type from `@better-auth/core` doesn't
  // know about it.
  const currentRole = (user as { role?: string | null }).role;

  if (currentRole !== "admin") {
    await ctx.internalAdapter.updateUser(user.id, { role: "admin" });
  }

  const credentialAccount = accounts.find((account) => account.providerId === "credential");

  if (credentialAccount) {
    await ctx.internalAdapter.updatePassword(user.id, hashedPassword);
  } else {
    // Existing user has no credential account yet (e.g. was only ever
    // created via another provider) — link one instead of updating.
    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: hashedPassword,
    });
  }

  return { userId: user.id, created: false };
}

/**
 * CLI entry point — `pnpm db:seed` (see `package.json`), which runs
 * `tsx --env-file=.env src/db/seed-admin.ts`.
 *
 * Uses the app's real `db` from `src/db/index.ts`, so it respects
 * `DB_DRIVER`: pglite locally, or Supabase Postgres in production via
 * `DB_DRIVER=postgres DATABASE_URL=... pnpm db:seed`. Requires migrations to
 * already be applied to the target database (`pnpm db:migrate`).
 */
async function main() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) {
    throw new Error(
      "ADMIN_EMAIL and ADMIN_PASSWORD must be set to run the admin seed (see .env.example).",
    );
  }

  const result = await seedAdmin(db, {
    email: env.ADMIN_EMAIL,
    password: env.ADMIN_PASSWORD,
  });

  console.log(
    `[db:seed] admin "${env.ADMIN_EMAIL}" ${
      result.created ? "created" : "already existed — role/password ensured"
    } (id: ${result.userId})`,
  );
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;

if (isMainModule) {
  main()
    .then(() => process.exit(0))
    .catch((error: unknown) => {
      console.error("[db:seed] failed:", error);
      process.exit(1);
    });
}
