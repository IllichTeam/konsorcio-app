import { describe, expect, it } from "vitest";

import {
  EXPENSE_EMAIL_MAX_ATTACHMENT_BYTES,
  EXPENSE_EMAIL_MAX_ATTACHMENTS,
  EXPENSE_EMAIL_SUBJECT,
  createExpenseEmailSendInputSchema,
  expenseEmailAttachmentRefSchema,
  expenseEmailOptionalLinkUrlSchema,
  previewExpenseEmailInputSchema,
} from "./expense-email";

const consortiumId = "11111111-1111-4111-8111-111111111111";
const sendId = "22222222-2222-4222-8222-222222222222";

function validAttachment(
  overrides?: Partial<{ storagePath: string; filename: string; sizeBytes: number }>,
) {
  return {
    storagePath: `expense-emails/${consortiumId}/${sendId}/expensa.pdf`,
    filename: "expensa.pdf",
    sizeBytes: 1024,
    ...overrides,
  };
}

describe("expense email schemas", () => {
  it("exposes fixed subject and attachment ceilings", () => {
    expect(EXPENSE_EMAIL_SUBJECT).toBe("Expensa Mensual");
    expect(EXPENSE_EMAIL_MAX_ATTACHMENTS).toBe(3);
    expect(EXPENSE_EMAIL_MAX_ATTACHMENT_BYTES).toBe(5 * 1024 * 1024);
  });

  it("accepts a valid attachment ref and rejects oversized files", () => {
    expect(expenseEmailAttachmentRefSchema.safeParse(validAttachment()).success).toBe(true);
    expect(
      expenseEmailAttachmentRefSchema.safeParse(
        validAttachment({ sizeBytes: EXPENSE_EMAIL_MAX_ATTACHMENT_BYTES + 1 }),
      ).success,
    ).toBe(false);
  });

  it("accepts empty or valid drive links and coerces junk URLs to empty", () => {
    expect(expenseEmailOptionalLinkUrlSchema.safeParse("").success).toBe(true);
    expect(expenseEmailOptionalLinkUrlSchema.safeParse("https://drive.google.com/x").success).toBe(
      true,
    );
    const junk = expenseEmailOptionalLinkUrlSchema.safeParse("not-a-url");
    expect(junk.success).toBe(true);
    if (junk.success) {
      expect(junk.data).toBe("");
    }
    const label = expenseEmailOptionalLinkUrlSchema.safeParse("Link");
    expect(label.success).toBe(true);
    if (label.success) {
      expect(label.data).toBe("");
    }
    expect(expenseEmailOptionalLinkUrlSchema.safeParse(undefined).success).toBe(true);
  });

  it("requires 1–3 attachments and at least one recipient on create", () => {
    const base = {
      consortiumId,
      sendId,
      recipients: ["a@example.com"],
      message: "Mensaje del mes",
      attachmentRefs: [validAttachment()],
    };

    expect(createExpenseEmailSendInputSchema.safeParse(base).success).toBe(true);
    expect(
      createExpenseEmailSendInputSchema.safeParse({ ...base, attachmentRefs: [] }).success,
    ).toBe(false);
    expect(
      createExpenseEmailSendInputSchema.safeParse({
        ...base,
        attachmentRefs: [
          validAttachment({
            filename: "1.pdf",
            storagePath: `expense-emails/${consortiumId}/${sendId}/1.pdf`,
          }),
          validAttachment({
            filename: "2.pdf",
            storagePath: `expense-emails/${consortiumId}/${sendId}/2.pdf`,
          }),
          validAttachment({
            filename: "3.pdf",
            storagePath: `expense-emails/${consortiumId}/${sendId}/3.pdf`,
          }),
          validAttachment({
            filename: "4.pdf",
            storagePath: `expense-emails/${consortiumId}/${sendId}/4.pdf`,
          }),
        ],
      }).success,
    ).toBe(false);
    expect(createExpenseEmailSendInputSchema.safeParse({ ...base, recipients: [] }).success).toBe(
      false,
    );
  });

  it("defaults preview attachmentNames to an empty list", () => {
    const parsed = previewExpenseEmailInputSchema.parse({
      consortiumId,
      message: "Hola",
      linkUrl: "",
    });

    expect(parsed.attachmentNames).toEqual([]);
  });
});
