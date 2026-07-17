import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock, renderMock, getResendClientMock, mockEnv } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  renderMock: vi.fn(),
  getResendClientMock: vi.fn(),
  mockEnv: {
    EMAIL_FROM: "Konsorcio <onboarding@resend.dev>",
    EMAIL_OVERRIDE_TO: undefined as string | undefined,
    RESEND_API_KEY: "test-key",
  },
}));

// `send.tsx` imports "server-only" at module top level, which throws when
// resolved outside of Next.js's RSC bundler (the `react-server` export
// condition isn't active under plain Vite/Vitest). Stub it to a no-op so the
// module can be imported in this jsdom test environment.
vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({
  env: mockEnv,
}));

vi.mock("@/lib/email/client", () => ({
  getResendClient: getResendClientMock,
}));

vi.mock("react-email", () => ({
  render: renderMock,
}));

// Mocking `render` means the real `NotificacionConsorcio` component body never
// executes, but the module import chain still needs to resolve.
vi.mock("@/emails/notificacion-consorcio", () => ({
  NotificacionConsorcio: (props: unknown) => props,
}));

import type { Recipient } from "@/lib/email/types";

import { chunk, sendEmail } from "./send";

function makeRecipients(count: number): Recipient[] {
  return Array.from({ length: count }, (_, index) => ({
    email: `user-${index}@example.com`,
    name: `User ${index}`,
  }));
}

describe("chunk", () => {
  it("splits an array into chunks of at most the given size", () => {
    const items = Array.from({ length: 250 }, (_, index) => index);
    const result = chunk(items, 100);

    expect(result).toHaveLength(3);
    expect(result[0]).toHaveLength(100);
    expect(result[1]).toHaveLength(100);
    expect(result[2]).toHaveLength(50);
  });

  it("returns an empty array for an empty input", () => {
    expect(chunk([], 100)).toEqual([]);
  });

  it("throws for a non-positive chunk size", () => {
    expect(() => chunk([1, 2, 3], 0)).toThrow();
  });
});

describe("sendEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    renderMock.mockReset();
    getResendClientMock.mockReset();
    getResendClientMock.mockReturnValue({ batch: { send: sendMock } });
    renderMock.mockResolvedValue("<html>mock</html>");
    mockEnv.EMAIL_OVERRIDE_TO = undefined;
  });

  it("returns a failed result without calling Resend when there are no recipients", async () => {
    const result = await sendEmail({ subject: "Hola", body: "Cuerpo", recipients: [] });

    expect(result).toEqual({
      status: "failed",
      sent: 0,
      failed: 0,
      resendIds: [],
      error: "No recipients",
    });
    expect(getResendClientMock).not.toHaveBeenCalled();
    expect(renderMock).not.toHaveBeenCalled();
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("chunks 250 recipients into 3 batch.send calls of sizes 100/100/50", async () => {
    sendMock.mockImplementation(async (batchEmails: unknown[]) => ({
      data: { data: batchEmails.map((_, index) => ({ id: `id-${index}` })) },
      error: null,
    }));

    const recipients = makeRecipients(250);
    const result = await sendEmail({ subject: "Hola", body: "Cuerpo", recipients });

    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(sendMock.mock.calls[0][0]).toHaveLength(100);
    expect(sendMock.mock.calls[1][0]).toHaveLength(100);
    expect(sendMock.mock.calls[2][0]).toHaveLength(50);

    expect(result.status).toBe("sent");
    expect(result.sent).toBe(250);
    expect(result.failed).toBe(0);
    expect(result.resendIds).toHaveLength(250);
  });

  it("builds one personalized email per recipient with its own `to` address", async () => {
    sendMock.mockImplementation(async (batchEmails: unknown[]) => ({
      data: { data: batchEmails.map((_, index) => ({ id: `id-${index}` })) },
      error: null,
    }));

    const recipients = makeRecipients(2);
    await sendEmail({ subject: "Recordatorio", body: "Cuerpo del mensaje", recipients });

    expect(sendMock).toHaveBeenCalledTimes(1);
    const batchEmails = sendMock.mock.calls[0][0] as Array<{ to: string[]; subject: string }>;
    expect(batchEmails).toHaveLength(2);
    expect(batchEmails[0].to).toEqual(["user-0@example.com"]);
    expect(batchEmails[1].to).toEqual(["user-1@example.com"]);
    expect(batchEmails.every((email) => email.subject === "Recordatorio")).toBe(true);

    expect(renderMock).toHaveBeenCalledTimes(2);
    const firstProps = renderMock.mock.calls[0][0] as {
      props: {
        nombre?: string;
        mensaje: string;
        consorcio?: string;
        remitente?: string;
      };
    };
    const secondProps = renderMock.mock.calls[1][0] as {
      props: {
        nombre?: string;
        mensaje: string;
        consorcio?: string;
        remitente?: string;
      };
    };
    expect(firstProps.props).toEqual({
      nombre: "User 0",
      mensaje: "Cuerpo del mensaje",
      consorcio: undefined,
      remitente: undefined,
    });
    expect(secondProps.props).toEqual({
      nombre: "User 1",
      mensaje: "Cuerpo del mensaje",
      consorcio: undefined,
      remitente: undefined,
    });
  });

  it("redirects every `to` to EMAIL_OVERRIDE_TO and prefixes the subject", async () => {
    mockEnv.EMAIL_OVERRIDE_TO = "illich570@gmail.com";

    sendMock.mockImplementation(async (batchEmails: unknown[]) => ({
      data: { data: batchEmails.map((_, index) => ({ id: `id-${index}` })) },
      error: null,
    }));

    const recipients = makeRecipients(2);
    await sendEmail({ subject: "Recordatorio", body: "Cuerpo", recipients });

    const batchEmails = sendMock.mock.calls[0][0] as Array<{ to: string[]; subject: string }>;
    expect(batchEmails[0].to).toEqual(["illich570@gmail.com"]);
    expect(batchEmails[1].to).toEqual(["illich570@gmail.com"]);
    expect(batchEmails[0].subject).toBe("[para: user-0@example.com] Recordatorio");
    expect(batchEmails[1].subject).toBe("[para: user-1@example.com] Recordatorio");
  });

  it("collects ids and reports 'sent' when every chunk succeeds", async () => {
    sendMock.mockResolvedValue({
      data: { data: [{ id: "id-a" }, { id: "id-b" }] },
      error: null,
    });

    const recipients = makeRecipients(2);
    const result = await sendEmail({ subject: "Hola", body: "Cuerpo", recipients });

    expect(result.status).toBe("sent");
    expect(result.sent).toBe(2);
    expect(result.failed).toBe(0);
    expect(result.resendIds).toEqual(["id-a", "id-b"]);
    expect(result.error).toBeUndefined();
  });

  it("reports 'partial' when one chunk errors and another succeeds, keeping the error message", async () => {
    sendMock
      .mockResolvedValueOnce({
        data: { data: Array.from({ length: 100 }, (_, index) => ({ id: `id-${index}` })) },
        error: null,
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "Rate limit exceeded", statusCode: 429, name: "rate_limit_exceeded" },
      });

    const recipients = makeRecipients(150);
    const result = await sendEmail({ subject: "Hola", body: "Cuerpo", recipients });

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("partial");
    expect(result.sent).toBe(100);
    expect(result.failed).toBe(50);
    expect(result.resendIds).toHaveLength(100);
    expect(result.error).toBe("Rate limit exceeded");
  });

  it("reports 'failed' when every chunk errors, and one chunk failing doesn't stop the rest", async () => {
    sendMock.mockRejectedValueOnce(new Error("Network error")).mockResolvedValueOnce({
      data: null,
      error: { message: "Invalid API key", statusCode: 401, name: "invalid_api_key" },
    });

    const recipients = makeRecipients(150);
    const result = await sendEmail({ subject: "Hola", body: "Cuerpo", recipients });

    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(result.status).toBe("failed");
    expect(result.sent).toBe(0);
    expect(result.failed).toBe(150);
    expect(result.resendIds).toEqual([]);
    expect(result.error).toBe("Invalid API key");
  });
});
