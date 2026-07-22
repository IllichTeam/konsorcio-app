import "server-only";

import { render } from "react-email";

import { env } from "@/env";
import { NotificacionConsorcio } from "@/emails/notificacion-consorcio";

import { getResendClient } from "./client";
import { isEmailToOverridden, resolveEmailTo } from "./resolve-to";
import type { Recipient, SendEmailParams, SendEmailResult } from "./types";

/** Resend's batch API accepts at most this many emails per request. */
const BATCH_SIZE_LIMIT = 100;

/**
 * Splits `items` into consecutive chunks of at most `size` items each.
 *
 * @throws {Error} if `size` is not a positive integer.
 */
export function chunk<T>(items: T[], size: number): T[][] {
  if (!Number.isInteger(size) || size <= 0) {
    throw new Error("Chunk size must be a positive integer");
  }

  const chunks: T[][] = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }

  return chunks;
}

/**
 * Renders a personalized `NotificacionConsorcio` for `recipient` and builds
 * the corresponding Resend batch email payload.
 */
async function buildBatchEmail(
  recipient: Recipient,
  subject: string,
  body: string,
  consortium?: string,
  sender?: string,
  replyTo?: string,
) {
  const html = await render(
    <NotificacionConsorcio
      nombre={recipient.name}
      mensaje={body}
      consorcio={consortium}
      remitente={sender}
    />,
  );

  const resolvedSubject = isEmailToOverridden() ? `[para: ${recipient.email}] ${subject}` : subject;

  return {
    from: env.EMAIL_FROM,
    to: [resolveEmailTo(recipient.email)],
    subject: resolvedSubject,
    html,
    ...(replyTo ? { reply_to: replyTo } : {}),
  };
}

/**
 * Sends a personalized notification email to each recipient via Resend's
 * batch API, chunking requests to stay within Resend's per-batch limit.
 *
 * A failing chunk does not abort the remaining chunks: each chunk is sent
 * independently, and failures are aggregated into the final result so a
 * transient error affecting one chunk doesn't prevent delivery to the rest
 * of the recipients.
 */
export async function sendEmail(input: SendEmailParams): Promise<SendEmailResult> {
  const { subject, body, recipients, consortium, sender, replyTo } = input;

  if (recipients.length === 0) {
    return { status: "failed", sent: 0, failed: 0, resendIds: [], error: "No recipients" };
  }

  const resend = getResendClient();
  const chunks = chunk(recipients, BATCH_SIZE_LIMIT);

  /** Sends one chunk, normalizing both Resend's `error` field and thrown exceptions. */
  async function sendChunk(recipientChunk: Recipient[]) {
    try {
      const batchEmails = await Promise.all(
        recipientChunk.map((recipient) =>
          buildBatchEmail(recipient, subject, body, consortium, sender, replyTo),
        ),
      );

      const { data, error } = await resend.batch.send(batchEmails);

      if (error) {
        return { count: recipientChunk.length, ids: [], error: error.message };
      }

      return { count: recipientChunk.length, ids: data.data.map((item) => item.id) };
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : String(caught);
      return { count: recipientChunk.length, ids: [], error: message };
    }
  }

  const chunkResults = await Promise.all(chunks.map(sendChunk));

  const resendIds: string[] = [];
  let sent = 0;
  let failed = 0;
  let lastError: string | undefined;

  for (const result of chunkResults) {
    if (result.error) {
      failed += result.count;
      lastError = result.error;
    } else {
      sent += result.count;
      resendIds.push(...result.ids);
    }
  }

  const status: SendEmailResult["status"] =
    failed === 0 ? "sent" : sent === 0 ? "failed" : "partial";

  return {
    status,
    sent,
    failed,
    resendIds,
    ...(lastError ? { error: lastError } : {}),
  };
}
