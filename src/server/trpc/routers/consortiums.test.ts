import { eq } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import * as schema from "@/db/schema";
import { createTestDb, type TestDbHandle } from "@/db/testing";
import type { Session } from "@/lib/auth/session";
import { ROLES } from "@/lib/auth/roles";

// appRouter pulls emails + expenseEmails routers that import `server-only` modules.
vi.mock("server-only", () => ({}));

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/email/load-sender-contact", () => ({
  loadEmailFooterContact: vi.fn(async () => "Gurruchaga 2222 - CP: 1414 / Teléfono: 91123878467"),
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
const { sendEmail } = await import("@/lib/email/send");
const { createCallerFactory } = await import("@/server/trpc/init");
const { appRouter } = await import("@/server/trpc/routers/_app");
const { createTRPCContext } = await import("@/server/trpc/context");

const createCaller = createCallerFactory(appRouter);

let handle: TestDbHandle;
let testDb: TestDbHandle["db"];

function fakeSession(role: "superadmin" | "admin", userId: string): Session {
  return {
    user: {
      id: userId,
      name: `${role} user`,
      email: `${userId}@example.com`,
      role,
    },
    session: {
      id: "session-id",
    },
  } as unknown as Session;
}

async function callerFor(role: "superadmin" | "admin" | null, userId = `user-${role}`) {
  vi.mocked(getSession).mockResolvedValueOnce(role ? fakeSession(role, userId) : null);
  return createCaller(await createTRPCContext());
}

async function insertUser(id: string, role: string) {
  await testDb.insert(schema.user).values({
    id,
    name: id,
    email: `${id}@example.com`,
    emailVerified: true,
    role,
    createdAt: new Date(),
    updatedAt: new Date(),
  });
}

const sampleInput = {
  name: "Torre Norte",
  location: "CABA",
  paymentAlias: "torre.norte",
  billingEmail: "billing@example.com",
  driveLink: "https://drive.google.com/torre-norte",
};

describe("consortiums tRPC router", () => {
  beforeAll(async () => {
    handle = await createTestDb();
    testDb = handle.db;
  });

  afterAll(async () => {
    await handle.client.close();
  });

  beforeEach(async () => {
    vi.clearAllMocks();
    await testDb.delete(schema.tenantEmails);
    await testDb.delete(schema.emailLog);
    await testDb.delete(schema.expenseEmailRecipients);
    await testDb.delete(schema.expenseEmailSends);
    await testDb.delete(schema.consortiumActivities);
    await testDb.delete(schema.consortiums);
    await testDb.delete(schema.user);
  });

  it("rejects list when there is no session", async () => {
    const caller = await callerFor(null);

    await expect(caller.consortiums.list()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("creates a consortium owned by the authenticated admin", async () => {
    await insertUser("user-admin", ROLES.admin);
    const caller = await callerFor("admin", "user-admin");

    const created = await caller.consortiums.create(sampleInput);

    expect(created).toMatchObject({ ...sampleInput, amount: 0 });
    expect(created.id).toEqual(expect.any(String));

    const rows = await testDb.select().from(schema.consortiums);
    expect(rows).toHaveLength(1);
    expect(rows[0]?.ownerId).toBe("user-admin");
  });

  it("lists only consortiums owned by the admin", async () => {
    await insertUser("user-a", ROLES.admin);
    await insertUser("user-b", ROLES.admin);

    await testDb.insert(schema.consortiums).values([
      { ...sampleInput, name: "Mine", ownerId: "user-a" },
      { ...sampleInput, name: "Theirs", ownerId: "user-b", billingEmail: "other@example.com" },
    ]);

    const caller = await callerFor("admin", "user-a");
    const list = await caller.consortiums.list();

    expect(list).toEqual([
      {
        id: expect.any(String),
        name: "Mine",
        location: "CABA",
        paymentAlias: sampleInput.paymentAlias,
        billingEmail: sampleInput.billingEmail,
        driveLink: sampleInput.driveLink,
        unitCount: 0,
        contactCount: 0,
      },
    ]);
  });

  it("counts distinct units and all contacts per consortium", async () => {
    await insertUser("user-a", ROLES.admin);

    const [consortium] = await testDb
      .insert(schema.consortiums)
      .values({ ...sampleInput, name: "Mine", ownerId: "user-a" })
      .returning();

    await testDb.insert(schema.tenantEmails).values([
      {
        consortiumId: consortium.id,
        floor: "1",
        departmentNumber: null,
        letter: "A",
        email: "owner@example.com",
        contactType: "propietario",
      },
      {
        consortiumId: consortium.id,
        floor: "1",
        departmentNumber: null,
        letter: "A",
        email: "tenant@example.com",
        contactType: "inquilino",
      },
      {
        consortiumId: consortium.id,
        floor: "2",
        departmentNumber: "3",
        letter: "B",
        email: "other@example.com",
        contactType: "inquilino",
      },
      {
        consortiumId: consortium.id,
        floor: "9",
        departmentNumber: null,
        letter: "Z",
        email: "deleted@example.com",
        contactType: "propietario",
        isDeleted: true,
      },
    ]);

    const caller = await callerFor("admin", "user-a");
    const list = await caller.consortiums.list();

    expect(list).toEqual([
      {
        id: consortium.id,
        name: "Mine",
        location: "CABA",
        paymentAlias: sampleInput.paymentAlias,
        billingEmail: sampleInput.billingEmail,
        driveLink: sampleInput.driveLink,
        unitCount: 2,
        contactCount: 3,
      },
    ]);
  });

  it("lets superadmin list all consortiums", async () => {
    await insertUser("user-a", ROLES.admin);
    await insertUser("user-super", ROLES.superadmin);

    await testDb.insert(schema.consortiums).values([
      { ...sampleInput, name: "A", ownerId: "user-a" },
      {
        ...sampleInput,
        name: "B",
        ownerId: "user-a",
        billingEmail: "b@example.com",
      },
    ]);

    const caller = await callerFor("superadmin", "user-super");
    const list = await caller.consortiums.list();

    expect(list).toHaveLength(2);
  });

  it("forbids an admin from updating another owner's consortium", async () => {
    await insertUser("user-a", ROLES.admin);
    await insertUser("user-b", ROLES.admin);

    const [row] = await testDb
      .insert(schema.consortiums)
      .values({ ...sampleInput, ownerId: "user-a" })
      .returning();

    const caller = await callerFor("admin", "user-b");

    await expect(
      caller.consortiums.update({
        id: row.id,
        ...sampleInput,
        name: "Hijacked",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("soft-deletes a consortium and hides it from list", async () => {
    await insertUser("user-admin", ROLES.admin);

    const ownerCaller = await callerFor("admin", "user-admin");
    const created = await ownerCaller.consortiums.create(sampleInput);

    const deleteCaller = await callerFor("admin", "user-admin");
    await deleteCaller.consortiums.delete({ id: created.id });

    const listCaller = await callerFor("admin", "user-admin");
    await expect(listCaller.consortiums.list()).resolves.toEqual([]);

    const [row] = await testDb
      .select()
      .from(schema.consortiums)
      .where(eq(schema.consortiums.id, created.id));

    expect(row?.isDeleted).toBe(true);
  });

  it("updates amount for an owned consortium", async () => {
    await insertUser("user-admin", ROLES.admin);
    const ownerCaller = await callerFor("admin", "user-admin");
    const created = await ownerCaller.consortiums.create(sampleInput);

    const amountCaller = await callerFor("admin", "user-admin");
    const updated = await amountCaller.consortiums.updateAmount({
      id: created.id,
      amount: 150_000,
    });

    expect(updated.amount).toBe(150_000);
  });

  it("creates a consortium with nullable alias/email/drive", async () => {
    await insertUser("user-admin", ROLES.admin);
    const caller = await callerFor("admin", "user-admin");

    const created = await caller.consortiums.create({
      name: "Sin extras",
      location: "CABA",
      paymentAlias: null,
      billingEmail: null,
      driveLink: null,
    });

    expect(created).toMatchObject({
      name: "Sin extras",
      paymentAlias: null,
      billingEmail: null,
      driveLink: null,
    });
  });

  it("returns empty history for a new consortium and paginates recorded activities", async () => {
    await insertUser("user-admin", ROLES.admin);
    const ownerCaller = await callerFor("admin", "user-admin");
    const created = await ownerCaller.consortiums.create(sampleInput);

    const emptyCaller = await callerFor("admin", "user-admin");
    const empty = await emptyCaller.consortiums.history({
      id: created.id,
      page: 1,
      pageSize: 10,
    });
    expect(empty).toEqual({ items: [], total: 0 });

    const driveCaller = await callerFor("admin", "user-admin");
    await driveCaller.consortiums.update({
      ...sampleInput,
      id: created.id,
      driveLink: "https://drive.google.com/updated",
    });

    const amountCaller = await callerFor("admin", "user-admin");
    await amountCaller.consortiums.updateAmount({
      id: created.id,
      amount: 150_000,
    });

    const multiCaller = await callerFor("admin", "user-admin");
    await multiCaller.consortiums.update({
      ...sampleInput,
      id: created.id,
      name: "Torre Sur",
      driveLink: "https://drive.google.com/updated",
      location: "Palermo",
    });

    const page1Caller = await callerFor("admin", "user-admin");
    const page1 = await page1Caller.consortiums.history({
      id: created.id,
      page: 1,
      pageSize: 2,
    });

    expect(page1.total).toBe(3);
    expect(page1.items).toHaveLength(2);
    expect(page1.items[0]).toMatchObject({
      type: "consortium_updated",
      summary: "Se editaron los datos del consorcio",
      payload: {
        fieldsChanged: expect.arrayContaining(["name", "location"]),
      },
    });
    expect(page1.items[1]).toMatchObject({
      type: "amount_updated",
      summary: "Se actualizó el monto de caja",
      payload: { previousAmount: 0, newAmount: 150_000 },
    });
    expect(page1.items[0]?.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(Number.isNaN(Date.parse(page1.items[0]!.timestamp))).toBe(false);

    const page2Caller = await callerFor("admin", "user-admin");
    const page2 = await page2Caller.consortiums.history({
      id: created.id,
      page: 2,
      pageSize: 2,
    });

    expect(page2.items).toHaveLength(1);
    expect(page2.items[0]).toMatchObject({
      type: "drive_link_updated",
      summary: "Se actualizó el link del drive",
      payload: {
        previousDriveLink: sampleInput.driveLink,
        newDriveLink: "https://drive.google.com/updated",
      },
    });
  });

  it("rejects history for a consortium the admin cannot access", async () => {
    await insertUser("user-a", ROLES.admin);
    await insertUser("user-b", ROLES.admin);

    const [row] = await testDb
      .insert(schema.consortiums)
      .values({ ...sampleInput, ownerId: "user-a" })
      .returning();

    const caller = await callerFor("admin", "user-b");

    await expect(
      caller.consortiums.history({ id: row.id, page: 1, pageSize: 10 }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("enriches expense_sent history rows with live sendStatus", async () => {
    await insertUser("user-admin", ROLES.admin);
    const ownerCaller = await callerFor("admin", "user-admin");
    const created = await ownerCaller.consortiums.create(sampleInput);

    const sendId = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    const missingSendId = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

    await testDb.insert(schema.expenseEmailSends).values({
      id: sendId,
      consortiumId: created.id,
      sendNumber: 3,
      subject: "Expensa Mensual",
      body: "Mensaje",
      status: "partial",
      attachmentRefs: [],
      sentByUserId: "user-admin",
      recipientCount: 2,
      sentCount: 1,
      failedCount: 1,
    });

    await testDb.insert(schema.consortiumActivities).values([
      {
        consortiumId: created.id,
        actorUserId: "user-admin",
        type: "expense_sent",
        summary: "Se envió la expensa mensual de Julio de 2026",
        payload: {
          sendId,
          sendNumber: 3,
          recipientCount: 2,
          subject: "Expensa Mensual",
        },
      },
      {
        consortiumId: created.id,
        actorUserId: "user-admin",
        type: "expense_sent",
        summary: "Se envió la expensa mensual de Junio de 2026",
        payload: {
          sendId: missingSendId,
          sendNumber: 2,
          recipientCount: 1,
          subject: "Expensa Mensual",
        },
      },
      {
        consortiumId: created.id,
        actorUserId: "user-admin",
        type: "notification_sent",
        summary: "Se envió una notificación a los inquilinos",
        payload: {
          messagePreview: "Hola",
          recipientCount: 1,
        },
      },
    ]);

    const historyCaller = await callerFor("admin", "user-admin");
    const history = await historyCaller.consortiums.history({
      id: created.id,
      page: 1,
      pageSize: 10,
    });

    expect(history.total).toBe(3);

    const withLiveStatus = history.items.find((item) => item.payload.sendId === sendId);
    const withMissingSend = history.items.find((item) => item.payload.sendId === missingSendId);
    const notification = history.items.find((item) => item.type === "notification_sent");

    expect(withLiveStatus).toMatchObject({
      type: "expense_sent",
      sendStatus: "partial",
    });
    expect(withMissingSend).toMatchObject({
      type: "expense_sent",
    });
    expect(withMissingSend?.sendStatus).toBeUndefined();
    expect(notification?.sendStatus).toBeUndefined();
  });

  it("sendComment emails via NotificacionConsorcio pipeline", async () => {
    await insertUser("user-admin", ROLES.admin);
    const ownerCaller = await callerFor("admin", "user-admin");
    const created = await ownerCaller.consortiums.create(sampleInput);

    vi.mocked(sendEmail).mockResolvedValueOnce({
      status: "sent",
      sent: 1,
      failed: 0,
      resendIds: ["re_test"],
    });

    const commentCaller = await callerFor("admin", "user-admin");
    await expect(
      commentCaller.consortiums.sendComment({
        id: created.id,
        message: "Hola vecinos",
        recipients: [
          { email: "juan.perez@example.com", name: "1° - A" },
          { email: "maria.gomez@example.com", name: "3° - 2 B" },
        ],
      }),
    ).resolves.toBeUndefined();

    expect(sendEmail).toHaveBeenCalledWith({
      subject: `Notificación - ${created.name}`,
      body: "Hola vecinos",
      recipients: [
        { email: "juan.perez@example.com", name: "1° - A" },
        { email: "maria.gomez@example.com", name: "3° - 2 B" },
      ],
      consortium: created.name,
      sender: "Administración",
      replyTo: sampleInput.billingEmail,
      footerContact: "Gurruchaga 2222 - CP: 1414 / Teléfono: 91123878467",
    });

    const historyCaller = await callerFor("admin", "user-admin");
    const history = await historyCaller.consortiums.history({
      id: created.id,
      page: 1,
      pageSize: 10,
    });
    expect(history.total).toBe(1);
    expect(history.items[0]).toMatchObject({
      type: "notification_sent",
      summary: "Se envió una notificación a los inquilinos",
      payload: {
        messagePreview: "Hola vecinos",
        recipientCount: 2,
      },
    });
  });

  it("sendComment rejects when billingEmail is missing", async () => {
    await insertUser("user-admin", ROLES.admin);
    const ownerCaller = await callerFor("admin", "user-admin");
    const created = await ownerCaller.consortiums.create({
      ...sampleInput,
      billingEmail: null,
    });

    const commentCaller = await callerFor("admin", "user-admin");
    await expect(
      commentCaller.consortiums.sendComment({
        id: created.id,
        message: "Hola vecinos",
        recipients: [{ email: "juan.perez@example.com", name: "1° - A" }],
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Debés configurar primero el correo del consorcio",
    });

    expect(sendEmail).not.toHaveBeenCalled();
  });
});
