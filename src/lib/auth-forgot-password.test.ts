import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDb, type TestDbHandle } from "@/db/testing";
import * as schema from "@/db/schema";

import { createAuth } from "./auth";

describe("better-auth emailOTP forgot-password (PGlite)", () => {
  let handle: TestDbHandle;
  let auth: ReturnType<typeof createAuth>;

  beforeAll(async () => {
    handle = await createTestDb();
    auth = createAuth(handle.db);
  });

  afterAll(async () => {
    await handle.client.close();
  });

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

  async function readForgetPasswordOtp(email: string): Promise<string> {
    const identifier = `forget-password-otp-${email.toLowerCase()}`;
    const rows = await handle.db
      .select()
      .from(schema.verification)
      .where(eq(schema.verification.identifier, identifier));

    expect(rows).toHaveLength(1);
    const [otp] = rows[0]!.value.split(":");
    expect(otp).toMatch(/^\d{6}$/);
    return otp!;
  }

  it("resets password with a 6-digit email OTP", async () => {
    const email = "reset-otp@example.com";
    await createUserDirectly(email, "old-password-123", "Reset OTP User");

    const requestResult = await auth.api.requestPasswordResetEmailOTP({
      body: { email },
    });
    expect(requestResult.success).toBe(true);

    const otp = await readForgetPasswordOtp(email);

    const checkResult = await auth.api.checkVerificationOTP({
      body: { email, type: "forget-password", otp },
    });
    expect(checkResult.success).toBe(true);

    const resetResult = await auth.api.resetPasswordEmailOTP({
      body: { email, otp, password: "new-password-456" },
    });
    expect(resetResult.success).toBe(true);

    await expect(
      auth.api.signInEmail({
        body: { email, password: "old-password-123" },
      }),
    ).rejects.toThrow();

    const signIn = await auth.api.signInEmail({
      body: { email, password: "new-password-456" },
    });
    expect(signIn.user.email).toBe(email);
  });

  it("returns success for unknown emails without storing an OTP", async () => {
    const email = "missing-user@example.com";

    const requestResult = await auth.api.requestPasswordResetEmailOTP({
      body: { email },
    });
    expect(requestResult.success).toBe(true);

    const identifier = `forget-password-otp-${email}`;
    const rows = await handle.db
      .select()
      .from(schema.verification)
      .where(eq(schema.verification.identifier, identifier));

    expect(rows).toHaveLength(0);
  });
});
