import { beforeEach, describe, expect, it, vi } from "vitest";

const { sendMock, getResendClientMock, mockEnv } = vi.hoisted(() => ({
  sendMock: vi.fn(),
  getResendClientMock: vi.fn(),
  mockEnv: {
    EMAIL_FROM: "Konsorcio <onboarding@resend.dev>",
    EMAIL_OVERRIDE_TO: undefined as string | undefined,
    RESEND_API_KEY: "test-key" as string | undefined,
  },
}));

vi.mock("@/env", () => ({
  env: mockEnv,
}));

vi.mock("./client", () => ({
  getResendClient: getResendClientMock,
}));

import { sendOtpEmail } from "./send-otp-email";

describe("sendOtpEmail", () => {
  beforeEach(() => {
    sendMock.mockReset();
    getResendClientMock.mockReset();
    getResendClientMock.mockReturnValue({ emails: { send: sendMock } });
    sendMock.mockResolvedValue({ data: { id: "email-1" }, error: null });
    mockEnv.EMAIL_OVERRIDE_TO = undefined;
    mockEnv.RESEND_API_KEY = "test-key";
  });

  it("sends to the intended address when no override is set", async () => {
    await sendOtpEmail({
      to: "user@example.com",
      subject: "Código de recuperación",
      text: "Tu código es: 123456",
    });

    expect(sendMock).toHaveBeenCalledWith({
      from: mockEnv.EMAIL_FROM,
      to: "user@example.com",
      subject: "Código de recuperación",
      text: "Tu código es: 123456",
    });
  });

  it("redirects to EMAIL_OVERRIDE_TO and appends the intended recipient", async () => {
    mockEnv.EMAIL_OVERRIDE_TO = "illich570@gmail.com";

    await sendOtpEmail({
      to: "user@example.com",
      subject: "Código de recuperación",
      text: "Tu código es: 123456",
    });

    expect(sendMock).toHaveBeenCalledWith({
      from: mockEnv.EMAIL_FROM,
      to: "illich570@gmail.com",
      subject: "Código de recuperación",
      text: "Tu código es: 123456\n\nDestinatario: user@example.com",
    });
  });

  it("logs intended and resolved addresses when RESEND_API_KEY is unset", async () => {
    mockEnv.RESEND_API_KEY = undefined;
    mockEnv.EMAIL_OVERRIDE_TO = "illich570@gmail.com";
    const infoSpy = vi.spyOn(console, "info").mockImplementation(() => {});

    await sendOtpEmail({
      to: "user@example.com",
      subject: "Código de recuperación",
      text: "Tu código es: 123456",
    });

    expect(sendMock).not.toHaveBeenCalled();
    expect(infoSpy).toHaveBeenCalledWith("[sendOtpEmail]", {
      to: "illich570@gmail.com",
      intended: "user@example.com",
      subject: "Código de recuperación",
      text: "Tu código es: 123456\n\nDestinatario: user@example.com",
    });

    infoSpy.mockRestore();
  });
});
