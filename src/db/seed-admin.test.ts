import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { createTestDb, type TestDbHandle } from "@/db/testing";
import { createAuth } from "@/lib/auth";

import { seedAdmin } from "./seed-admin";

// Single shared PGlite instance for the whole file (matches `auth.test.ts`):
// creating/closing a fresh PGlite per test has been observed to abort the
// underlying WASM runtime. Each test below uses its own email address so
// they stay independent despite sharing one database.
describe("seedAdmin (PGlite)", () => {
  let handle: TestDbHandle;
  let auth: ReturnType<typeof createAuth>;

  beforeAll(async () => {
    handle = await createTestDb();
    auth = createAuth(handle.db);
  });

  afterAll(async () => {
    await handle.client.close();
  });

  it("creates the admin user with role admin when it doesn't exist", async () => {
    const result = await seedAdmin(handle.db, {
      email: "admin-create@konsorcio.local",
      password: "correct-horse-battery-staple",
    });

    expect(result.created).toBe(true);

    const rows = await handle.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, "admin-create@konsorcio.local"));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ email: "admin-create@konsorcio.local", role: "admin" });
  });

  it("allows signing in with the seeded credentials, proving the password hash is correct", async () => {
    await seedAdmin(handle.db, {
      email: "admin-signin@konsorcio.local",
      password: "correct-horse-battery-staple",
    });

    const result = await auth.api.signInEmail({
      body: {
        email: "admin-signin@konsorcio.local",
        password: "correct-horse-battery-staple",
      },
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe("admin-signin@konsorcio.local");
    expect(result.token).toEqual(expect.any(String));
  });

  it("is idempotent: re-running with a new password rotates it (env is the source of truth)", async () => {
    const email = "admin-rotate@konsorcio.local";

    await seedAdmin(handle.db, { email, password: "old-password-123" });

    const secondRun = await seedAdmin(handle.db, { email, password: "new-password-456" });

    expect(secondRun.created).toBe(false);

    // Old password no longer works.
    await expect(
      auth.api.signInEmail({
        body: { email, password: "old-password-123" },
      }),
    ).rejects.toThrow();

    // New password works.
    const result = await auth.api.signInEmail({
      body: { email, password: "new-password-456" },
    });
    expect(result.user.email).toBe(email);

    // Still exactly one user row (no duplicate created on re-run).
    const rows = await handle.db.select().from(schema.user).where(eq(schema.user.email, email));
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ role: "admin" });
  });

  it("rejects public sign-up because disableSignUp is enabled", async () => {
    await expect(
      auth.api.signUpEmail({
        body: {
          name: "Someone Else",
          email: "someone-else@example.com",
          password: "correct-horse-battery-staple",
        },
      }),
    ).rejects.toThrow();
  });
});
