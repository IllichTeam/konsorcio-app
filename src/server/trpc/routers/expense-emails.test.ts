import { beforeEach, describe, expect, it, vi } from "vitest";

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

vi.mock("@/server/trpc/lib/consortium-access", () => ({
  findAccessibleConsortium: vi.fn(),
}));

const selectMock = vi.fn();
const insertValuesMock = vi.fn().mockResolvedValue(undefined);
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const transactionMock = vi.fn(async (fn: (tx: { insert: typeof insertMock }) => Promise<void>) => {
  await fn({ insert: insertMock });
});

vi.mock("@/db", () => ({
  db: {
    select: selectMock,
    insert: insertMock,
    transaction: transactionMock,
  },
}));

const { getSession } = await import("@/lib/auth/session");
const { findAccessibleConsortium } = await import("@/server/trpc/lib/consortium-access");
const { scheduleExpenseEmailSend } =
  await import("@/server/expense-emails/schedule-expense-email-send");
const { createCallerFactory } = await import("@/server/trpc/init");
const { appRouter } = await import("@/server/trpc/routers/_app");
const { createTRPCContext } = await import("@/server/trpc/context");

const createCaller = createCallerFactory(appRouter);

function fakeSession(): Session {
  return {
    user: {
      id: "user-admin",
      name: "Admin",
      email: "admin@example.com",
      role: "admin",
    },
    session: { id: "session-id" },
  } as unknown as Session;
}

async function caller() {
  vi.mocked(getSession).mockResolvedValueOnce(fakeSession());
  return createCaller(await createTRPCContext());
}

const consortiumId = "11111111-1111-4111-8111-111111111111";
const sendId = "22222222-2222-4222-8222-222222222222";

function mockSelectSequence(handlers: Array<() => unknown | Promise<unknown>>) {
  let index = 0;
  selectMock.mockImplementation(() => {
    const handler = handlers[index] ?? handlers.at(-1);
    index += 1;
    const result = handler?.();
    return {
      from: () => ({
        where: () => {
          const value = result;
          const asPromise = Promise.resolve(value);
          return Object.assign(asPromise, {
            limit: async (n: number) => {
              const rows = (await asPromise) as unknown[];
              return rows.slice(0, n);
            },
            orderBy: () => asPromise,
          });
        },
        leftJoin: () => ({
          where: () => ({
            limit: async () => result,
            orderBy: () => ({ limit: async () => result }),
          }),
          orderBy: () => ({ limit: async () => result }),
        }),
        orderBy: () => ({ limit: async () => result }),
      }),
    };
  });
}

describe("expenseEmails tRPC router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertValuesMock.mockResolvedValue(undefined);
    transactionMock.mockImplementation(async (fn) => {
      await fn({ insert: insertMock });
    });
    vi.mocked(findAccessibleConsortium).mockResolvedValue({
      id: consortiumId,
      name: "Torre Norte",
      driveLink: "https://drive.example/x",
      paymentAlias: "ALIAS",
      billingEmail: "billing@example.com",
    } as never);
  });

  it("rejects create when attachment refs escape the reserved send path", async () => {
    mockSelectSequence([() => []]);
    const api = await caller();

    await expect(
      api.expenseEmails.create({
        consortiumId,
        sendId,
        recipients: ["a@example.com"],
        message: "Mensaje",
        attachmentRefs: [
          {
            storagePath: `expense-emails/other/${sendId}/a.pdf`,
            filename: "a.pdf",
            sizeBytes: 10,
          },
        ],
      }),
    ).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "Los archivos adjuntos no pertenecen a este envío",
    });
    expect(scheduleExpenseEmailSend).not.toHaveBeenCalled();
  });

  it("acks an existing sendId idempotently and re-schedules when still queued", async () => {
    mockSelectSequence([
      () => [
        {
          id: sendId,
          consortiumId,
          status: "queued",
        },
      ],
    ]);
    const api = await caller();

    await expect(
      api.expenseEmails.create({
        consortiumId,
        sendId,
        recipients: ["a@example.com"],
        message: "Mensaje",
        attachmentRefs: [
          {
            storagePath: `expense-emails/${consortiumId}/${sendId}/a.pdf`,
            filename: "a.pdf",
            sizeBytes: 10,
          },
        ],
      }),
    ).resolves.toEqual({ sendId });

    expect(transactionMock).not.toHaveBeenCalled();
    expect(scheduleExpenseEmailSend).toHaveBeenCalledWith(sendId);
  });

  it("creates a send when recipients match active tenant emails", async () => {
    mockSelectSequence([() => [], () => [{ email: "A@example.com" }, { email: "b@example.com" }]]);

    const api = await caller();
    await expect(
      api.expenseEmails.create({
        consortiumId,
        sendId,
        recipients: ["a@example.com", "b@example.com"],
        message: "Mensaje del mes",
        linkUrl: "",
        attachmentRefs: [
          {
            storagePath: `expense-emails/${consortiumId}/${sendId}/a.pdf`,
            filename: "a.pdf",
            sizeBytes: 10,
          },
        ],
      }),
    ).resolves.toEqual({ sendId });

    expect(transactionMock).toHaveBeenCalled();
    expect(scheduleExpenseEmailSend).toHaveBeenCalledWith(sendId);
  });

  it("returns preview HTML from the shared renderer", async () => {
    const api = await caller();
    await expect(
      api.expenseEmails.preview({
        consortiumId,
        message: "Mensaje",
        linkUrl: "",
        attachmentNames: ["a.pdf"],
      }),
    ).resolves.toEqual({ html: "<html>preview</html>" });
  });
});
