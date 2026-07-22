import { describe, expect, it } from "vitest";

import type { ExpenseEmailRecipientRow, ExpenseEmailSendRow } from "@/db/schema";

import {
  toExpenseEmailRecipientDto,
  toExpenseEmailSendDetailDto,
  toExpenseEmailSendDto,
} from "./map-expense-email-dto";

const sendRow = {
  id: "22222222-2222-4222-8222-222222222222",
  consortiumId: "11111111-1111-4111-8111-111111111111",
  subject: "Expensa Mensual",
  body: "Mensaje",
  linkUrl: "https://drive.example/x",
  status: "partial",
  attachmentRefs: [
    {
      storagePath:
        "expense-emails/11111111-1111-4111-8111-111111111111/22222222-2222-4222-8222-222222222222/a.pdf",
      filename: "a.pdf",
      sizeBytes: 10,
    },
  ],
  sentByUserId: "user-1",
  claimToken: null,
  claimExpiresAt: null,
  recipientCount: 2,
  sentCount: 1,
  failedCount: 1,
  createdAt: new Date("2026-07-21T12:00:00.000Z"),
  finishedAt: new Date("2026-07-21T12:05:00.000Z"),
} as ExpenseEmailSendRow;

const recipientRow = {
  id: "33333333-3333-4333-8333-333333333333",
  sendId: sendRow.id,
  email: "a@example.com",
  status: "sent",
  resendId: "re_1",
  error: null,
  attempts: 1,
  lastAttemptAt: new Date("2026-07-21T12:01:00.000Z"),
} as ExpenseEmailRecipientRow;

describe("map expense email DTOs", () => {
  it("serializes send timestamps and sender display name", () => {
    expect(toExpenseEmailSendDto(sendRow, "Ana Admin")).toMatchObject({
      id: sendRow.id,
      status: "partial",
      sentByUserName: "Ana Admin",
      createdAt: "2026-07-21T12:00:00.000Z",
      finishedAt: "2026-07-21T12:05:00.000Z",
    });
  });

  it("serializes recipient attempt timestamps", () => {
    expect(toExpenseEmailRecipientDto(recipientRow)).toMatchObject({
      email: "a@example.com",
      status: "sent",
      lastAttemptAt: "2026-07-21T12:01:00.000Z",
    });
  });

  it("builds the detail payload used by the status screen", () => {
    const detail = toExpenseEmailSendDetailDto(sendRow, [recipientRow], "Ana Admin");
    expect(detail.send.sentByUserName).toBe("Ana Admin");
    expect(detail.recipients).toHaveLength(1);
  });
});
