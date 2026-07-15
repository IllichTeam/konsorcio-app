import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createTestDb, type TestDbHandle } from "./testing";
import * as schema from "./schema";

describe("db integration (PGlite)", () => {
  let handle: TestDbHandle;

  beforeAll(async () => {
    handle = await createTestDb();
  });

  afterAll(async () => {
    await handle.client.close();
  });

  it("inserts a consorcio and returns the persisted row", async () => {
    const [inserted] = await handle.db
      .insert(schema.consorcios)
      .values({ nombre: "Consorcio Test" })
      .returning();

    expect(inserted).toBeDefined();
    expect(inserted.id).toEqual(expect.stringMatching(/^[0-9a-f-]{36}$/i));
    expect(inserted.nombre).toBe("Consorcio Test");
    expect(inserted.createdAt).toBeInstanceOf(Date);
    expect(inserted.updatedAt).toBeInstanceOf(Date);
  });

  it("recovers the inserted consorcio via select", async () => {
    const [created] = await handle.db
      .insert(schema.consorcios)
      .values({ nombre: "Consorcio Recuperado" })
      .returning();

    const rows = await handle.db
      .select()
      .from(schema.consorcios)
      .where(eq(schema.consorcios.id, created.id));

    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      id: created.id,
      nombre: "Consorcio Recuperado",
    });
  });
});
