import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { createTestDb, type TestDbHandle } from "@/db/testing";
import { ROLES } from "@/lib/auth/roles";
import type { Session } from "@/lib/auth/session";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/server/expense-emails/schedule-expense-email-send", () => ({
  scheduleExpenseEmailSend: vi.fn(),
}));

vi.mock("@/lib/email/render-expense-email", () => ({
  renderExpenseEmailHtml: vi.fn(async () => "<html>preview</html>"),
}));

vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/email/recipients", () => ({
  listRecipients: vi.fn(),
}));

vi.mock("@/db", () => ({
  db: new Proxy(
    {},
    {
      get(_target, prop, _receiver) {
        if (!testDb) {
          throw new Error("testDb not initialized");
        }
        const value = Reflect.get(testDb, prop, testDb);
        return typeof value === "function" ? value.bind(testDb) : value;
      },
    },
  ),
}));

const { getSession } = await import("@/lib/auth/session");
const { scheduleExpenseEmailSend } =
  await import("@/server/expense-emails/schedule-expense-email-send");
const { createCallerFactory } = await import("@/server/trpc/init");
const { appRouter } = await import("@/server/trpc/routers/_app");
const { createTRPCContext } = await import("@/server/trpc/context");

const createCaller = createCallerFactory(appRouter);

let handle: TestDbHandle;
let testDb: TestDbHandle["db"];

function fakeSession(userId: string): Session {
  return {
    user: {
      id: userId,
      name: "Admin",
      email: `${userId}@example.com`,
      role: "admin",
    },
    session: { id: "session-id" },
  } as unknown as Session;
}

async function caller(userId = "user-admin") {
  vi.mocked(getSession).mockResolvedValueOnce(fakeSession(userId));
  return createCaller(await createTRPCContext());
}

async function seedConsortium(ownerId: string, name = "Torre Norte") {
  await testDb.insert(schema.user).values({
    id: ownerId,
    name: ownerId,
    email: `${ownerId}@example.com`,
    emailVerified: true,
    role: ROLES.admin,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  const [consortium] = await testDb
    .insert(schema.consortiums)
    .values({
      name,
      location: "CABA",
      paymentAlias: "alias.test",
      billingEmail: "billing@example.com",
      driveLink: "https://drive.example/x",
      ownerId,
    })
    .returning();

  await testDb.insert(schema.tenantEmails).values({
    consortiumId: consortium.id,
    email: "inquilino@example.com",
    contactType: "inquilino",
  });

  return consortium;
}

function attachmentRefs(consortiumId: string, sendId: string) {
  return [
    {
      storagePath: `expense-emails/${consortiumId}/${sendId}/a.pdf`,
      filename: "a.pdf",
      sizeBytes: 10,
    },
  ];
}

describe("expenseEmails send_number (PGlite)", () => {
  beforeAll(async () => {
    handle = await createTestDb();
    testDb = handle.db;
  });

  afterAll(async () => {
    await handle.client.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await testDb.delete(schema.expenseEmailRecipients);
    await testDb.delete(schema.expenseEmailSends);
    await testDb.delete(schema.tenantEmails);
    await testDb.delete(schema.consortiums);
    await testDb.delete(schema.user);
  });

  it("assigns send_number 1 then 2 for the same consortium", async () => {
    const consortium = await seedConsortium("user-admin");
    const sendId1 = "22222222-2222-4222-8222-222222222221";
    const sendId2 = "22222222-2222-4222-8222-222222222222";
    const api = await caller();

    await api.expenseEmails.create({
      consortiumId: consortium.id,
      sendId: sendId1,
      recipients: ["inquilino@example.com"],
      message: "Primero",
      attachmentRefs: attachmentRefs(consortium.id, sendId1),
    });
    await api.expenseEmails.create({
      consortiumId: consortium.id,
      sendId: sendId2,
      recipients: ["inquilino@example.com"],
      message: "Segundo",
      attachmentRefs: attachmentRefs(consortium.id, sendId2),
    });

    const rows = await testDb
      .select({ id: schema.expenseEmailSends.id, sendNumber: schema.expenseEmailSends.sendNumber })
      .from(schema.expenseEmailSends)
      .where(eq(schema.expenseEmailSends.consortiumId, consortium.id));

    expect(rows).toEqual(
      expect.arrayContaining([
        { id: sendId1, sendNumber: 1 },
        { id: sendId2, sendNumber: 2 },
      ]),
    );
  });

  it("does not bump send_number on idempotent create with the same sendId", async () => {
    const consortium = await seedConsortium("user-admin");
    const sendId = "22222222-2222-4222-8222-222222222223";
    const payload = {
      consortiumId: consortium.id,
      sendId,
      recipients: ["inquilino@example.com"] as string[],
      message: "Mensaje",
      attachmentRefs: attachmentRefs(consortium.id, sendId),
    };

    const api1 = await caller();
    await api1.expenseEmails.create(payload);
    const api2 = await caller();
    await api2.expenseEmails.create(payload);

    const rows = await testDb
      .select()
      .from(schema.expenseEmailSends)
      .where(eq(schema.expenseEmailSends.consortiumId, consortium.id));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.sendNumber).toBe(1);
    expect(scheduleExpenseEmailSend).toHaveBeenCalledWith(sendId);
  });

  it("keeps independent send_number sequences per consortium", async () => {
    const a = await seedConsortium("user-a", "Consorcio A");
    const b = await seedConsortium("user-b", "Consorcio B");
    const sendA = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const sendB = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

    const apiA = await caller("user-a");
    await apiA.expenseEmails.create({
      consortiumId: a.id,
      sendId: sendA,
      recipients: ["inquilino@example.com"],
      message: "A",
      attachmentRefs: attachmentRefs(a.id, sendA),
    });

    const apiB = await caller("user-b");
    await apiB.expenseEmails.create({
      consortiumId: b.id,
      sendId: sendB,
      recipients: ["inquilino@example.com"],
      message: "B",
      attachmentRefs: attachmentRefs(b.id, sendB),
    });

    const [rowA] = await testDb
      .select({ sendNumber: schema.expenseEmailSends.sendNumber })
      .from(schema.expenseEmailSends)
      .where(eq(schema.expenseEmailSends.id, sendA));
    const [rowB] = await testDb
      .select({ sendNumber: schema.expenseEmailSends.sendNumber })
      .from(schema.expenseEmailSends)
      .where(eq(schema.expenseEmailSends.id, sendB));

    expect(rowA?.sendNumber).toBe(1);
    expect(rowB?.sendNumber).toBe(1);
  });

  it("exposes sendNumber on getSend and listRecentByConsortium", async () => {
    const consortium = await seedConsortium("user-admin");
    const sendId = "22222222-2222-4222-8222-222222222224";
    const createApi = await caller();
    await createApi.expenseEmails.create({
      consortiumId: consortium.id,
      sendId,
      recipients: ["inquilino@example.com"],
      message: "Mensaje",
      attachmentRefs: attachmentRefs(consortium.id, sendId),
    });

    const readApi = await caller();
    const detail = await readApi.expenseEmails.getSend({
      consortiumId: consortium.id,
      sendId,
    });
    const list = await readApi.expenseEmails.listRecentByConsortium({
      consortiumId: consortium.id,
    });

    expect(detail.send.sendNumber).toBe(1);
    expect(list[0]?.sendNumber).toBe(1);
  });
});
