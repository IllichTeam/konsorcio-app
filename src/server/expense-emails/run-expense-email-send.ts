import "server-only";

import { and, eq, inArray, isNull, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  consortiums,
  expenseEmailRecipients,
  expenseEmailSends,
  type ExpenseEmailRecipientRow,
  type ExpenseEmailSendRow,
} from "@/db/schema";
import { EXPENSE_EMAIL_SEND_CONCURRENCY, mapWithConcurrency } from "@/lib/email/concurrency";
import { loadEmailFooterContact } from "@/lib/email/load-sender-contact";
import { sendExpenseEmail } from "@/lib/email/send-expense-email";
import {
  EXPENSE_EMAIL_STALE_SENDING_MS,
  type ExpenseEmailSendStatus,
} from "@/lib/schemas/expense-email";
import { createExpenseEmailSignedUrls } from "@/lib/storage/expense-emails";

/** Pure rollup of per-recipient counts → send status (exported for unit tests). */
export function rollupExpenseEmailSendStatus(
  sentCount: number,
  failedCount: number,
  pendingCount: number,
): ExpenseEmailSendStatus {
  if (pendingCount > 0) {
    // Interrupted / incomplete pass — keep recoverable for retry UI.
    if (sentCount === 0 && failedCount === 0) {
      return "queued";
    }
    return "partial";
  }
  if (failedCount === 0) {
    return "sent";
  }
  if (sentCount === 0) {
    return "failed";
  }
  return "partial";
}

/** Sanitize provider errors for the UI (no signed URLs / secrets). */
export function userFacingExpenseEmailSendError(error: string): string {
  const trimmed = error.trim();
  if (!trimmed) {
    return "No se pudo enviar el correo";
  }
  // Keep provider text short; never include signed URLs.
  if (/https?:\/\//i.test(trimmed) || trimmed.length > 280) {
    return "No se pudo enviar el correo";
  }
  return trimmed;
}

/**
 * Whether a send stuck in `sending` looks abandoned (timeout / crash)
 * so `retryPending` / a second runner can reclaim it.
 */
export function isExpenseEmailSendStale(
  send: Pick<ExpenseEmailSendRow, "status" | "createdAt" | "claimExpiresAt">,
  recipients: Pick<ExpenseEmailRecipientRow, "lastAttemptAt">[],
  now = Date.now(),
): boolean {
  if (send.status !== "sending") {
    return false;
  }

  if (send.claimExpiresAt) {
    return send.claimExpiresAt.getTime() <= now;
  }

  // Backward-compatible fallback for rows created before runner leases existed.
  const latestAttemptMs = recipients.reduce<number | null>((max, row) => {
    const ts = row.lastAttemptAt?.getTime();
    if (ts == null) {
      return max;
    }
    return max == null ? ts : Math.max(max, ts);
  }, null);

  const anchorMs = latestAttemptMs ?? send.createdAt.getTime();
  return now - anchorMs >= EXPENSE_EMAIL_STALE_SENDING_MS;
}

type ExpenseEmailSendClaim = {
  send: ExpenseEmailSendRow;
  claimToken: string;
};

function leaseExpirySql() {
  return sql<Date>`now() + (${EXPENSE_EMAIL_STALE_SENDING_MS} * interval '1 millisecond')`;
}

function currentRunnerClaim(sendId: string, claimToken: string) {
  return sql<boolean>`exists (
    select 1
    from ${expenseEmailSends}
    where ${expenseEmailSends.id} = ${sendId}
      and ${expenseEmailSends.status} = 'sending'
      and ${expenseEmailSends.claimToken} = ${claimToken}
  )`;
}

/**
 * Atomically acquires one runner lease.
 *
 * PostgreSQL re-checks the WHERE predicate after waiting on a concurrent row
 * update. Once one runner writes a fresh token + expiry, every competing claim
 * returns no row, including concurrent stale reclaims from `sending`.
 */
async function tryClaimExpenseEmailSend(sendId: string): Promise<ExpenseEmailSendClaim | null> {
  const claimToken = crypto.randomUUID();
  const [claimed] = await db
    .update(expenseEmailSends)
    .set({
      status: "sending",
      claimToken,
      claimExpiresAt: leaseExpirySql(),
      finishedAt: null,
    })
    .where(
      and(
        eq(expenseEmailSends.id, sendId),
        or(
          inArray(expenseEmailSends.status, ["queued", "partial", "failed"]),
          and(
            eq(expenseEmailSends.status, "sending"),
            or(
              isNull(expenseEmailSends.claimExpiresAt),
              lte(expenseEmailSends.claimExpiresAt, sql<Date>`now()`),
            ),
          ),
        ),
      ),
    )
    .returning();

  return claimed ? { send: claimed, claimToken } : null;
}

/**
 * Renews and verifies ownership immediately before a side effect.
 * A runner whose lease was reclaimed cannot claim more recipients.
 */
async function renewExpenseEmailSendClaim(sendId: string, claimToken: string): Promise<boolean> {
  const [renewed] = await db
    .update(expenseEmailSends)
    .set({ claimExpiresAt: leaseExpirySql() })
    .where(
      and(
        eq(expenseEmailSends.id, sendId),
        eq(expenseEmailSends.status, "sending"),
        eq(expenseEmailSends.claimToken, claimToken),
      ),
    )
    .returning();

  return Boolean(renewed);
}

/**
 * Claim one recipient before calling Resend (attempts CAS).
 * Only the runner holding the current send lease may claim work.
 */
async function tryClaimExpenseEmailRecipient(
  recipient: Pick<ExpenseEmailRecipientRow, "id" | "status" | "attempts">,
  sendId: string,
  claimToken: string,
): Promise<ExpenseEmailRecipientRow | null> {
  if (recipient.status !== "pending" && recipient.status !== "failed") {
    return null;
  }

  if (!(await renewExpenseEmailSendClaim(sendId, claimToken))) {
    return null;
  }

  const now = new Date();
  const [claimed] = await db
    .update(expenseEmailRecipients)
    .set({
      attempts: recipient.attempts + 1,
      lastAttemptAt: now,
      error: null,
    })
    .where(
      and(
        eq(expenseEmailRecipients.id, recipient.id),
        inArray(expenseEmailRecipients.status, ["pending", "failed"]),
        eq(expenseEmailRecipients.attempts, recipient.attempts),
        currentRunnerClaim(sendId, claimToken),
      ),
    )
    .returning();

  return claimed ?? null;
}

/**
 * Background fan-out for one expense send:
 * claim send → signed URLs (fresh each run) → claim recipient → Resend →
 * per-recipient persistence → rollup counts/status.
 *
 * Recipients already `sent` are never touched. Unprocessed rows stay `pending`
 * if the process is interrupted before rollup.
 */
export async function runExpenseEmailSend(sendId: string): Promise<void> {
  const claim = await tryClaimExpenseEmailSend(sendId);
  if (!claim) {
    return;
  }
  const { send, claimToken } = claim;

  const [consortium] = await db
    .select()
    .from(consortiums)
    .where(eq(consortiums.id, send.consortiumId))
    .limit(1);

  if (!consortium) {
    console.error("Consortium missing for expense email send", {
      sendId,
      consortiumId: send.consortiumId,
    });
    await finalizeExpenseEmailSend(sendId, claimToken);
    return;
  }

  const footerContact = send.sentByUserId ? await loadEmailFooterContact(send.sentByUserId) : null;

  const workRecipients = await db
    .select()
    .from(expenseEmailRecipients)
    .where(
      and(
        eq(expenseEmailRecipients.sendId, sendId),
        inArray(expenseEmailRecipients.status, ["pending", "failed"]),
      ),
    );

  if (workRecipients.length === 0) {
    await finalizeExpenseEmailSend(sendId, claimToken);
    return;
  }

  let attachments: { path: string; filename: string }[];
  try {
    if (!(await renewExpenseEmailSendClaim(sendId, claimToken))) {
      return;
    }

    // Always regenerate signed URLs (private bucket; retry must not reuse expired links).
    const signed = await createExpenseEmailSignedUrls(send.attachmentRefs);
    const urlByPath = new Map(signed.map((item) => [item.storagePath, item.signedUrl]));
    attachments = send.attachmentRefs.map((ref) => {
      const path = urlByPath.get(ref.storagePath);
      if (!path) {
        throw new Error(`Missing signed URL for attachment ${ref.filename}`);
      }
      return { path, filename: ref.filename };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("Failed to create signed URLs for expense email send", {
      sendId,
      message,
    });

    await mapWithConcurrency(workRecipients, EXPENSE_EMAIL_SEND_CONCURRENCY, async (recipient) => {
      const claimed = await tryClaimExpenseEmailRecipient(recipient, sendId, claimToken);
      if (!claimed) {
        return;
      }

      await db
        .update(expenseEmailRecipients)
        .set({
          status: "failed",
          error: "No se pudieron preparar los adjuntos",
          resendId: null,
        })
        .where(
          and(
            eq(expenseEmailRecipients.id, claimed.id),
            eq(expenseEmailRecipients.attempts, claimed.attempts),
            inArray(expenseEmailRecipients.status, ["pending", "failed"]),
            currentRunnerClaim(sendId, claimToken),
          ),
        );
    });

    await finalizeExpenseEmailSend(sendId, claimToken);
    return;
  }

  const linkUrl = send.linkUrl?.trim() || null;
  const paymentAlias = consortium.paymentAlias?.trim() || null;
  const billingEmail = consortium.billingEmail?.trim() || null;

  await mapWithConcurrency(workRecipients, EXPENSE_EMAIL_SEND_CONCURRENCY, async (recipient) => {
    const claimed = await tryClaimExpenseEmailRecipient(recipient, sendId, claimToken);
    if (!claimed) {
      return;
    }

    const attemptAt = claimed.lastAttemptAt ?? new Date();

    const result = await sendExpenseEmail({
      to: claimed.email,
      consortium: consortium.name,
      message: send.body,
      linkUrl,
      paymentAlias,
      attachments,
      billingEmail,
      footerContact,
    });

    if (result.ok) {
      await db
        .update(expenseEmailRecipients)
        .set({
          status: "sent",
          resendId: result.resendId,
          error: null,
          lastAttemptAt: attemptAt,
        })
        .where(
          and(
            eq(expenseEmailRecipients.id, claimed.id),
            eq(expenseEmailRecipients.attempts, claimed.attempts),
            inArray(expenseEmailRecipients.status, ["pending", "failed"]),
            currentRunnerClaim(sendId, claimToken),
          ),
        );
      return;
    }

    console.error("Expense email recipient send failed", {
      sendId,
      recipientId: claimed.id,
      message: result.error,
      statusCode: result.statusCode ?? null,
    });

    await db
      .update(expenseEmailRecipients)
      .set({
        status: "failed",
        resendId: null,
        error: userFacingExpenseEmailSendError(result.error),

        lastAttemptAt: attemptAt,
      })
      .where(
        and(
          eq(expenseEmailRecipients.id, claimed.id),
          eq(expenseEmailRecipients.attempts, claimed.attempts),
          inArray(expenseEmailRecipients.status, ["pending", "failed"]),
          currentRunnerClaim(sendId, claimToken),
        ),
      );
  });

  await finalizeExpenseEmailSend(sendId, claimToken);
}

async function finalizeExpenseEmailSend(sendId: string, claimToken: string): Promise<void> {
  const [counts] = await db
    .select({
      recipientCount: sql<number>`count(*)::int`.mapWith(Number),
      sentCount:
        sql<number>`count(*) filter (where ${expenseEmailRecipients.status} = 'sent')::int`.mapWith(
          Number,
        ),
      failedCount:
        sql<number>`count(*) filter (where ${expenseEmailRecipients.status} = 'failed')::int`.mapWith(
          Number,
        ),
      pendingCount:
        sql<number>`count(*) filter (where ${expenseEmailRecipients.status} = 'pending')::int`.mapWith(
          Number,
        ),
    })
    .from(expenseEmailRecipients)
    .where(eq(expenseEmailRecipients.sendId, sendId));

  const recipientCount = counts?.recipientCount ?? 0;
  const sentCount = counts?.sentCount ?? 0;
  const failedCount = counts?.failedCount ?? 0;
  const pendingCount = counts?.pendingCount ?? 0;
  const status = rollupExpenseEmailSendStatus(sentCount, failedCount, pendingCount);
  const finishedAt = pendingCount > 0 ? null : new Date();

  await db
    .update(expenseEmailSends)
    .set({
      status,
      recipientCount,
      sentCount,
      failedCount,
      finishedAt,
      claimToken: null,
      claimExpiresAt: null,
    })
    .where(and(eq(expenseEmailSends.id, sendId), eq(expenseEmailSends.claimToken, claimToken)));
}
