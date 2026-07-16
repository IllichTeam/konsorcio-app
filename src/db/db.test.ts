import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDb, type TestDbHandle } from "./testing";
import * as schema from "./schema";

describe("db integration (PGlite)", () => {
  let handle: TestDbHandle;
  let ownerId: string;

  beforeAll(async () => {
    handle = await createTestDb();

    const [owner] = await handle.db
      .insert(schema.user)
      .values({
        id: "owner-test-user",
        name: "Owner",
        email: "owner-test@konsorcio.local",
        emailVerified: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    ownerId = owner.id;
  });

  afterAll(async () => {
    await handle.client.close();
  });

  it("inserts a consortium and returns the persisted row", async () => {
    const [inserted] = await handle.db
      .insert(schema.consortiums)
      .values({
        name: "Consorcio Test",
        location: "CABA",
        paymentAlias: "alias.test",
        billingEmail: "billing@example.com",
        driveLink: "https://drive.google.com/test",
        ownerId,
      })
      .returning();

    expect(inserted).toBeDefined();
    expect(inserted.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/i));
    expect(inserted.name).toBe("Consorcio Test");
    expect(inserted.amount).toBe(0);
    expect(inserted.isDeleted).toBe(false);
    expect(inserted.ownerId).toBe(ownerId);
    expect(inserted.createdAt).toBeInstanceOf(Date);
    expect(inserted.updatedAt).toBeInstanceOf(Date);
  });

  it("recovers the inserted consortium via select", async () => {
    const [created] = await handle.db
      .insert(schema.consortiums)
      .values({
        name: "Consorcio Recuperado",
        location: "CABA",
        paymentAlias: "alias.recovered",
        billingEmail: "recovered@example.com",
        driveLink: "https://drive.google.com/recovered",
        ownerId,
      })
      .returning();

    const rows = await handle.db
      .select()
      .from(schema.consortiums)
      .where(eq(schema.consortiums.id, created.id));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: created.id,
      name: "Consorcio Recuperado",
      ownerId,
    });
  });
});
