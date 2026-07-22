import type { ExpenseEmailRecipientRow, ExpenseEmailSendRow } from "@/db/schema";
import type {
  ExpenseEmailRecipientDto,
  ExpenseEmailSendDetailDto,
  ExpenseEmailSendDto,
} from "@/lib/schemas/expense-email";

export function toExpenseEmailSendDto(
  row: ExpenseEmailSendRow,
  sentByUserName: string | null = null,
): ExpenseEmailSendDto {
  return {
    id: row.id,
    consortiumId: row.consortiumId,
    subject: row.subject,
    body: row.body,
    linkUrl: row.linkUrl ?? null,
    status: row.status,
    attachmentRefs: row.attachmentRefs,
    sentByUserId: row.sentByUserId ?? null,
    sentByUserName,
    recipientCount: row.recipientCount,
    sentCount: row.sentCount,
    failedCount: row.failedCount,
    createdAt: row.createdAt.toISOString(),
    finishedAt: row.finishedAt?.toISOString() ?? null,
  };
}

export function toExpenseEmailRecipientDto(
  row: ExpenseEmailRecipientRow,
): ExpenseEmailRecipientDto {
  return {
    id: row.id,
    sendId: row.sendId,
    email: row.email,
    status: row.status,
    resendId: row.resendId ?? null,
    error: row.error ?? null,
    attempts: row.attempts,
    lastAttemptAt: row.lastAttemptAt?.toISOString() ?? null,
  };
}

export function toExpenseEmailSendDetailDto(
  send: ExpenseEmailSendRow,
  recipients: ExpenseEmailRecipientRow[],
  sentByUserName: string | null = null,
): ExpenseEmailSendDetailDto {
  return {
    send: toExpenseEmailSendDto(send, sentByUserName),
    recipients: recipients.map(toExpenseEmailRecipientDto),
  };
}
