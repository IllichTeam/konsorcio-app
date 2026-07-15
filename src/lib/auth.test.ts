import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDb, type TestDbHandle } from "@/db/testing";
import * as schema from "@/db/schema";

import { createAuth } from "./auth";

describe("better-auth email/password (PGlite)", () => {
  let handle: TestDbHandle;
  let auth: ReturnType<typeof createAuth>;

  beforeAll(async () => {
    handle = await createTestDb();
    auth = createAuth(handle.db);
  });

  afterAll(async () => {
    await handle.client.close();
  });

  /**
   * Public self sign-up is intentionally disabled (`disableSignUp: true`):
   * the only account provisioning path is the admin seed
   * (`src/db/seed-admin.ts`, see `seed-admin.test.ts`) or an authenticated
   * admin using the `admin` plugin's `createUser` endpoint. This helper
   * creates users the same way the seed does, bypassing the disabled
   * public endpoint, so sign-in behavior can still be exercised here.
   */
  async function createUserDirectly(email: string, password: string, name: string) {
    const ctx = await auth.$context;
    const hashedPassword = await ctx.password.hash(password);
    const user = await ctx.internalAdapter.createUser({ email, name, emailVerified: true });
    await ctx.internalAdapter.linkAccount({
      userId: user.id,
      accountId: user.id,
      providerId: "credential",
      password: hashedPassword,
    });
    return user;
  }

  it("rejects public sign-up because disableSignUp is enabled", async () => {
    await expect(
      auth.api.signUpEmail({
        body: {
          name: "Test User",
          email: "test-user@example.com",
          password: "correct-horse-battery-staple",
        },
      }),
    ).rejects.toThrow();

    const rows = await handle.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, "test-user@example.com"));

    expect(rows).toHaveLength(0);
  });

  it("returns a session on sign-in with correct credentials", async () => {
    await createUserDirectly(
      "session-user@example.com",
      "correct-horse-battery-staple",
      "Session User",
    );

    const result = await auth.api.signInEmail({
      body: {
        email: "session-user@example.com",
        password: "correct-horse-battery-staple",
      },
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe("session-user@example.com");
    expect(result.token).toEqual(expect.any(String));

    const sessions = await handle.db
      .select()
      .from(schema.session)
      .where(eq(schema.session.userId, result.user.id));

    expect(sessions.length).toBeGreaterThan(0);
  });

  it("rejects sign-in with an incorrect password", async () => {
    await createUserDirectly(
      "wrong-password@example.com",
      "correct-horse-battery-staple",
      "Wrong Password User",
    );

    await expect(
      auth.api.signInEmail({
        body: {
          email: "wrong-password@example.com",
          password: "not-the-right-password",
        },
      }),
    ).rejects.toThrow();
  });
});
