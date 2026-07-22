import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/db", () => ({
  db: {},
}));

vi.mock("@/lib/email/send-expense-email", () => ({
  sendExpenseEmail: vi.fn(),
}));

vi.mock("@/lib/storage/expense-emails", () => ({
  createExpenseEmailSignedUrls: vi.fn(),
}));

import {
  isExpenseEmailSendStale,
  rollupExpenseEmailSendStatus,
  userFacingExpenseEmailSendError,
} from "./run-expense-email-send";

describe("rollupExpenseEmailSendStatus", () => {
  it("maps counts to queued / sent / failed / partial", () => {
    expect(rollupExpenseEmailSendStatus(0, 0, 3)).toBe("queued");
    expect(rollupExpenseEmailSendStatus(3, 0, 0)).toBe("sent");
    expect(rollupExpenseEmailSendStatus(0, 3, 0)).toBe("failed");
    expect(rollupExpenseEmailSendStatus(2, 1, 0)).toBe("partial");
    expect(rollupExpenseEmailSendStatus(1, 0, 2)).toBe("partial");
  });
});

describe("userFacingExpenseEmailSendError", () => {
  it("hides empty errors, URLs and overly long provider text", () => {
    expect(userFacingExpenseEmailSendError("")).toBe("No se pudo enviar el correo");
    expect(userFacingExpenseEmailSendError("https://signed.example/secret.pdf")).toBe(
      "No se pudo enviar el correo",
    );
    expect(userFacingExpenseEmailSendError("x".repeat(300))).toBe("No se pudo enviar el correo");
    expect(userFacingExpenseEmailSendError("Casilla rechazada")).toBe("Casilla rechazada");
  });
});

describe("isExpenseEmailSendStale", () => {
  const now = Date.parse("2026-07-21T12:00:00.000Z");

  it("is only meaningful while status is sending", () => {
    expect(
      isExpenseEmailSendStale(
        {
          status: "queued",
          createdAt: new Date(now - 10_000),
          claimExpiresAt: null,
        },
        [],
        now,
      ),
    ).toBe(false);
  });

  it("uses claim lease expiry when present", () => {
    expect(
      isExpenseEmailSendStale(
        {
          status: "sending",
          createdAt: new Date(now - 10_000),
          claimExpiresAt: new Date(now - 1),
        },
        [],
        now,
      ),
    ).toBe(true);

    expect(
      isExpenseEmailSendStale(
        {
          status: "sending",
          createdAt: new Date(now - 10_000),
          claimExpiresAt: new Date(now + 60_000),
        },
        [],
        now,
      ),
    ).toBe(false);
  });

  it("falls back to lastAttemptAt / createdAt when lease is missing", () => {
    expect(
      isExpenseEmailSendStale(
        {
          status: "sending",
          createdAt: new Date(now - 3 * 60_000),
          claimExpiresAt: null,
        },
        [],
        now,
      ),
    ).toBe(true);

    expect(
      isExpenseEmailSendStale(
        {
          status: "sending",
          createdAt: new Date(now - 3 * 60_000),
          claimExpiresAt: null,
        },
        [{ lastAttemptAt: new Date(now - 30_000) }],
        now,
      ),
    ).toBe(false);
  });
});
