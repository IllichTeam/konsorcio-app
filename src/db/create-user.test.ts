import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import * as schema from "@/db/schema";
import { createTestDb, type TestDbHandle } from "@/db/testing";
import { createAuth } from "@/lib/auth";
import { ROLES } from "@/lib/auth/roles";

import { createCredentialUser, CreateUserError } from "./create-user";

describe("createCredentialUser (PGlite)", () => {
  let handle: TestDbHandle;
  let auth: ReturnType<typeof createAuth>;

  beforeAll(async () => {
    handle = await createTestDb();
    auth = createAuth(handle.db);
  });

  afterAll(async () => {
    await handle.client.close();
  });

  it("creates a user with the requested role", async () => {
    const result = await createCredentialUser(handle.db, {
      email: "create-user@konsorcio.local",
      password: "correct-horse-battery-staple",
      name: "Create User",
      role: ROLES.tenant,
    });

    expect(result).toMatchObject({
      email: "create-user@konsorcio.local",
      role: ROLES.tenant,
      created: true,
    });
    expect(result.userId).toEqual(expect.any(String));

    const rows = await handle.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, "create-user@konsorcio.local"));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      email: "create-user@konsorcio.local",
      name: "Create User",
      role: ROLES.tenant,
    });
  });

  it("defaults role to admin and name to the email local part", async () => {
    const result = await createCredentialUser(handle.db, {
      email: "defaults@konsorcio.local",
      password: "correct-horse-battery-staple",
    });

    expect(result.role).toBe(ROLES.admin);

    const rows = await handle.db
      .select()
      .from(schema.user)
      .where(eq(schema.user.email, "defaults@konsorcio.local"));

    expect(rows[0]).toMatchObject({
      name: "defaults",
      role: ROLES.admin,
    });
  });

  it("allows signing in with the created credentials", async () => {
    await createCredentialUser(handle.db, {
      email: "signin@konsorcio.local",
      password: "correct-horse-battery-staple",
    });

    const result = await auth.api.signInEmail({
      body: {
        email: "signin@konsorcio.local",
        password: "correct-horse-battery-staple",
      },
    });

    expect(result.user).toBeDefined();
    expect(result.user.email).toBe("signin@konsorcio.local");
    expect(result.token).toEqual(expect.any(String));
  });

  it("rejects duplicate emails without rotating the password", async () => {
    const email = "duplicate@konsorcio.local";

    await createCredentialUser(handle.db, {
      email,
      password: "original-password-123",
    });

    await expect(
      createCredentialUser(handle.db, {
        email,
        password: "different-password-456",
      }),
    ).rejects.toThrow(CreateUserError);

    const result = await auth.api.signInEmail({
      body: { email, password: "original-password-123" },
    });
    expect(result.user.email).toBe(email);

    await expect(
      auth.api.signInEmail({
        body: { email, password: "different-password-456" },
      }),
    ).rejects.toThrow();
  });

  it("rejects passwords shorter than 8 characters", async () => {
    await expect(
      createCredentialUser(handle.db, {
        email: "short-pw@konsorcio.local",
        password: "short",
      }),
    ).rejects.toThrow(CreateUserError);
  });
});
