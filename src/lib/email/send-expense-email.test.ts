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

vi.mock("server-only", () => ({}));

vi.mock("@/env", () => ({
  env: mockEnv,
}));

vi.mock("@/lib/email/client", () => ({
  getResendClient: getResendClientMock,
}));

vi.mock("./render-expense-email", () => ({
  renderExpenseEmailHtml: renderMock,
}));

import { sendExpenseEmail } from "./send-expense-email";

describe("sendExpenseEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    renderMock.mockReset();
    getResendClientMock.mockReset();
    getResendClientMock.mockReturnValue({ emails: { send: sendMock } });
    renderMock.mockResolvedValue("<html>expensa</html>");
    mockEnv.EMAIL_OVERRIDE_TO = undefined;
    sendMock.mockResolvedValue({ data: { id: "re_123" }, error: null });
  });

  it("returns a Spanish error without calling Resend when there are no PDFs", async () => {
    const result = await sendExpenseEmail({
      to: "a@example.com",
      consortium: "Torre",
      periodo: "Julio de 2026",
      message: "Mensaje",
      attachments: [],
    });

    expect(result).toEqual({ ok: false, error: "No se adjuntaron PDFs" });
    expect(sendMock).not.toHaveBeenCalled();
  });

  it("sends via emails.send (not batch) with fixed subject and path attachments", async () => {
    const result = await sendExpenseEmail({
      to: "a@example.com",
      consortium: "Torre",
      periodo: "Julio de 2026",
      message: "Mensaje",
      linkUrl: "https://drive.example/x",
      paymentAlias: "ALIAS.COBRO",
      attachments: [{ path: "https://signed.example/a.pdf", filename: "a.pdf" }],
      billingEmail: "billing@example.com",
    });

    expect(result).toEqual({ ok: true, resendId: "re_123" });
    expect(renderMock).toHaveBeenCalledWith(
      expect.objectContaining({
        consorcio: "Torre",
        periodo: "Julio de 2026",
        mensaje: "Mensaje",
      }),
    );
    expect(sendMock).toHaveBeenCalledTimes(1);
    expect(sendMock.mock.calls[0][0]).toMatchObject({
      from: mockEnv.EMAIL_FROM,
      to: ["a@example.com"],
      subject: "Expensa Mensual",
      html: "<html>expensa</html>",
      reply_to: "billing@example.com",
      attachments: [{ path: "https://signed.example/a.pdf", filename: "a.pdf" }],
    });
    expect(getResendClientMock().batch).toBeUndefined();
  });

  it("omits reply_to when billingEmail is empty and prefixes subject under override", async () => {
    mockEnv.EMAIL_OVERRIDE_TO = "qa@example.com";

    await sendExpenseEmail({
      to: "tenant@example.com",
      consortium: "Torre",
      periodo: "Julio de 2026",
      message: "Mensaje",
      attachments: [{ path: "https://signed.example/a.pdf", filename: "a.pdf" }],
      billingEmail: "   ",
    });

    expect(sendMock.mock.calls[0][0]).toMatchObject({
      to: ["qa@example.com"],
      subject: "[para: tenant@example.com] Expensa Mensual",
    });
    expect(sendMock.mock.calls[0][0]).not.toHaveProperty("reply_to");
  });

  it("retries Resend 429 errors then returns failure details", async () => {
    sendMock
      .mockResolvedValueOnce({
        data: null,
        error: { message: "rate limited", statusCode: 429, name: "rate_limit_exceeded" },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "still limited", statusCode: 429, name: "rate_limit_exceeded" },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "still limited", statusCode: 429, name: "rate_limit_exceeded" },
      })
      .mockResolvedValueOnce({
        data: null,
        error: { message: "still limited", statusCode: 429, name: "rate_limit_exceeded" },
      });

    const result = await sendExpenseEmail({
      to: "a@example.com",
      consortium: "Torre",
      periodo: "Julio de 2026",
      message: "Mensaje",
      attachments: [{ path: "https://signed.example/a.pdf", filename: "a.pdf" }],
    });

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.statusCode).toBe(429);
      expect(result.error).toContain("still limited");
    }
    expect(sendMock).toHaveBeenCalledTimes(4);
  });
});
