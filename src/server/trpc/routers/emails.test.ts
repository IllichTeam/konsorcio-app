import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Session } from "@/lib/auth/session";
import type { SendEmailResult } from "@/lib/email/types";
import type { EmailRecipient } from "@/lib/email/recipients";

vi.mock("@/lib/auth/session", () => ({
  getSession: vi.fn(),
}));

vi.mock("@/lib/email/send", () => ({
  sendEmail: vi.fn(),
}));

vi.mock("@/lib/email/recipients", () => ({
  listRecipients: vi.fn(),
}));

const insertValuesMock = vi.fn().mockResolvedValue(undefined);
const insertMock = vi.fn(() => ({ values: insertValuesMock }));
const selectOrderByLimitMock = vi.fn().mockResolvedValue([]);
const selectOrderByMock = vi.fn(() => ({ limit: selectOrderByLimitMock }));
const selectFromMock = vi.fn(() => ({ orderBy: selectOrderByMock }));
const selectMock = vi.fn(() => ({ from: selectFromMock }));

vi.mock("@/db", () => ({
  db: {
    insert: insertMock,
    select: selectMock,
  },
}));

const { getSession } = await import("@/lib/auth/session");
const { sendEmail } = await import("@/lib/email/send");
const { listRecipients } = await import("@/lib/email/recipients");
const { createCallerFactory } = await import("@/server/trpc/init");
const { appRouter } = await import("@/server/trpc/routers/_app");
const { createTRPCContext } = await import("@/server/trpc/context");

const createCaller = createCallerFactory(appRouter);

function fakeSession(role: "superadmin" | "admin" | "tenant"): Session {
  return {
    user: {
      id: `user-${role}`,
      name: `${role} user`,
      email: `${role}@example.com`,
      role,
    },
    session: {
      id: "session-id",
    },
  } as unknown as Session;
}

async function callerFor(role: "superadmin" | "admin" | "tenant" | null) {
  vi.mocked(getSession).mockResolvedValueOnce(role ? fakeSession(role) : null);
  return createCaller(await createTRPCContext());
}

const validInput = {
  subject: "Aviso importante",
  body: "Contenido del correo",
  recipients: [{ email: "alice@example.com", name: "Alice" }],
};

const sampleRecipients: EmailRecipient[] = [
  { id: "user-alice", name: "Alice", email: "alice@example.com" },
  { id: "user-charlie", name: "Charlie", email: "charlie@example.com" },
];

describe("emails tRPC router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    insertValuesMock.mockResolvedValue(undefined);
    selectOrderByLimitMock.mockResolvedValue([]);
  });

  describe("recipients", () => {
    it("rejects when there is no session", async () => {
      const caller = await callerFor(null);

      await expect(caller.emails.recipients()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "No autorizado",
      });
      expect(listRecipients).not.toHaveBeenCalled();
    });

    it("rejects when the session user is not a superadmin", async () => {
      const caller = await callerFor("admin");

      await expect(caller.emails.recipients()).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: "Prohibido",
      });
      expect(listRecipients).not.toHaveBeenCalled();
    });

    it("returns recipients for a superadmin session", async () => {
      vi.mocked(listRecipients).mockResolvedValueOnce(sampleRecipients);
      const caller = await callerFor("superadmin");

      await expect(caller.emails.recipients()).resolves.toEqual(sampleRecipients);
    });
  });

  describe("history", () => {
    it("rejects when there is no session", async () => {
      const caller = await callerFor(null);

      await expect(caller.emails.history()).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
    });

    it("returns serialized email logs for a superadmin", async () => {
      const createdAt = new Date("2026-01-15T12:00:00.000Z");
      selectOrderByLimitMock.mockResolvedValueOnce([
        {
          id: "11111111-1111-4111-8111-111111111111",
          subject: "Hello",
          body: "Body",
          recipients: [{ email: "alice@example.com" }],
          recipientCount: 1,
          status: "sent",
          resendIds: ["resend-1"],
          error: null,
          sentByUserId: "user-superadmin",
          createdAt,
        },
      ]);
      const caller = await callerFor("superadmin");

      await expect(caller.emails.history()).resolves.toEqual([
        {
          id: "11111111-1111-4111-8111-111111111111",
          subject: "Hello",
          body: "Body",
          recipients: [{ email: "alice@example.com" }],
          recipientCount: 1,
          status: "sent",
          resendIds: ["resend-1"],
          error: null,
          sentByUserId: "user-superadmin",
          createdAt: createdAt.toISOString(),
        },
      ]);
    });
  });

  describe("send", () => {
    it("rejects when there is no session", async () => {
      const caller = await callerFor(null);

      await expect(caller.emails.send(validInput)).rejects.toMatchObject({
        code: "UNAUTHORIZED",
      });
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("rejects when the session user is not a superadmin", async () => {
      const caller = await callerFor("admin");

      await expect(caller.emails.send(validInput)).rejects.toMatchObject({
        code: "FORBIDDEN",
      });
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("rejects when subject is missing", async () => {
      const caller = await callerFor("superadmin");

      await expect(caller.emails.send({ ...validInput, subject: "" })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("rejects when recipients is empty", async () => {
      const caller = await callerFor("superadmin");

      await expect(caller.emails.send({ ...validInput, recipients: [] })).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("rejects when a recipient email is invalid", async () => {
      const caller = await callerFor("superadmin");

      await expect(
        caller.emails.send({
          ...validInput,
          recipients: [{ email: "not-an-email" }],
        }),
      ).rejects.toMatchObject({
        code: "BAD_REQUEST",
      });
      expect(sendEmail).not.toHaveBeenCalled();
    });

    it("sends the email and logs it for a superadmin session", async () => {
      const result: SendEmailResult = {
        status: "sent",
        sent: 1,
        failed: 0,
        resendIds: ["resend-1"],
      };
      vi.mocked(sendEmail).mockResolvedValueOnce(result);
      const caller = await callerFor("superadmin");

      await expect(caller.emails.send(validInput)).resolves.toEqual({
        status: "sent",
        sent: 1,
        failed: 0,
      });
      expect(sendEmail).toHaveBeenCalledWith(validInput);
      expect(insertMock).toHaveBeenCalled();
      expect(insertValuesMock).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: validInput.subject,
          body: validInput.body,
          recipients: validInput.recipients,
          recipientCount: validInput.recipients.length,
          status: "sent",
          resendIds: ["resend-1"],
          error: null,
          sentByUserId: "user-superadmin",
        }),
      );
    });

    it("throws BAD_GATEWAY when sendEmail reports a failed status", async () => {
      const result: SendEmailResult = {
        status: "failed",
        sent: 0,
        failed: 1,
        resendIds: [],
        error: "Resend error",
      };
      vi.mocked(sendEmail).mockResolvedValueOnce(result);
      const caller = await callerFor("superadmin");

      await expect(caller.emails.send(validInput)).rejects.toMatchObject({
        code: "BAD_GATEWAY",
        message: "No se pudo enviar el correo",
      });
    });

    it("still succeeds when persisting the email log throws", async () => {
      const result: SendEmailResult = {
        status: "sent",
        sent: 1,
        failed: 0,
        resendIds: ["resend-1"],
      };
      vi.mocked(sendEmail).mockResolvedValueOnce(result);
      insertValuesMock.mockRejectedValueOnce(new Error("db down"));
      const caller = await callerFor("superadmin");

      await expect(caller.emails.send(validInput)).resolves.toEqual({
        status: "sent",
        sent: 1,
        failed: 0,
      });
    });
  });
});
