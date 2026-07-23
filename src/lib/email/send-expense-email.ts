import "server-only";

import { env } from "@/env";
import { EXPENSE_EMAIL_SUBJECT } from "@/lib/schemas/expense-email";

import { getResendClient } from "./client";
import { withRateLimitRetry } from "./concurrency";
import { renderExpenseEmailHtml } from "./render-expense-email";
import { isEmailToOverridden, resolveEmailTo } from "./resolve-to";

/** One PDF attachment for Resend (`path` = signed/public URL Resend can fetch). */
export type ExpenseEmailAttachment = {
  path: string;
  filename: string;
};

export type SendExpenseEmailParams = {
  /** Intended recipient (before `EMAIL_OVERRIDE_TO` redirect). */
  to: string;
  /** Consortium display name for the template. */
  consortium: string;
  /** Dedicated period line (e.g. from `formatExpensePeriod`). */
  periodo: string;
  /** Automatic monthly message body. */
  message: string;
  /** Optional drive / payment link (readonly in maqueta UI). */
  linkUrl?: string | null;
  /** Optional payment alias (readonly in maqueta UI). */
  paymentAlias?: string | null;
  /**
   * Filenames shown in the HTML body. Defaults to `attachments[].filename`
   * when omitted.
   */
  attachmentNames?: string[];
  /** Resend attachments via remote `path` (signed Storage URL, etc.). */
  attachments: ExpenseEmailAttachment[];
  /**
   * Consortium billing email → Resend `reply_to`.
   * Omitted when null/empty (send still succeeds).
   */
  billingEmail?: string | null;
  remitente?: string;
  unsubscribeUrl?: string;
  /** Sender profile footer: address / phone / postal code. */
  footerContact?: string | null;
};

export type SendExpenseEmailResult =
  | { ok: true; resendId: string }
  | { ok: false; error: string; statusCode?: number | null };

function toRateLimitError(message: string, statusCode: number | null, name: string) {
  return Object.assign(new Error(message), { statusCode, name });
}

/**
 * Sends one monthly expense email via Resend `emails.send` (not batch).
 *
 * - Subject: fixed `Expensa Mensual` (+ `[para: …]` when override is active)
 * - `reply_to` only when `billingEmail` is present
 * - Attachments: `{ path, filename }[]`
 * - Retries acotados on Resend 429 (same helper as the Phase 3 runner)
 *
 * Does not touch the body-only `batch.send` path used by notifications/comments.
 */
export async function sendExpenseEmail(
  input: SendExpenseEmailParams,
): Promise<SendExpenseEmailResult> {
  const {
    to,
    consortium,
    periodo,
    message,
    linkUrl,
    paymentAlias,
    attachments,
    billingEmail,
    remitente,
    unsubscribeUrl,
    footerContact,
  } = input;

  if (attachments.length === 0) {
    return { ok: false, error: "No se adjuntaron PDFs" };
  }

  const attachmentNames =
    input.attachmentNames ?? attachments.map((attachment) => attachment.filename);

  const html = await renderExpenseEmailHtml({
    consorcio: consortium,
    periodo,
    mensaje: message,
    linkUrl,
    paymentAlias,
    attachmentNames,
    remitente,
    unsubscribeUrl,
    footerContact,
  });

  const subject = isEmailToOverridden()
    ? `[para: ${to}] ${EXPENSE_EMAIL_SUBJECT}`
    : EXPENSE_EMAIL_SUBJECT;

  const replyTo = billingEmail?.trim() || undefined;

  const resend = getResendClient();

  try {
    const resendId = await withRateLimitRetry(async () => {
      const { data, error } = await resend.emails.send({
        from: env.EMAIL_FROM,
        to: [resolveEmailTo(to)],
        subject,
        html,
        attachments: attachments.map((attachment) => ({
          path: attachment.path,
          filename: attachment.filename,
        })),
        ...(replyTo ? { reply_to: replyTo } : {}),
      });

      if (error) {
        throw toRateLimitError(error.message, error.statusCode, error.name);
      }

      if (!data?.id) {
        throw new Error("Resend did not return an email id");
      }

      return data.id;
    });

    return { ok: true, resendId };
  } catch (caught) {
    const messageText = caught instanceof Error ? caught.message : String(caught);
    const statusCode =
      caught && typeof caught === "object" && "statusCode" in caught
        ? ((caught as { statusCode?: number | null }).statusCode ?? undefined)
        : undefined;

    return {
      ok: false,
      error: messageText,
      ...(statusCode !== undefined ? { statusCode } : {}),
    };
  }
}
