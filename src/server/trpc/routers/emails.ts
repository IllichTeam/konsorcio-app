import { desc } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { emailLog } from "@/db/schema";
import {
  emailLogSchema,
  emailRecipientOptionSchema,
  sendEmailInputSchema,
  sendEmailResultSchema,
} from "@/lib/schemas/email";
import { listRecipients } from "@/lib/email/recipients";
import { sendEmail } from "@/lib/email/send";
import { loadEmailFooterContact } from "@/lib/email/load-sender-contact";
import { z } from "@/lib/zod";
import { adminProcedure, createTRPCRouter } from "@/server/trpc/init";

function toEmailLogDto(row: typeof emailLog.$inferSelect) {
  return {
    id: row.id,
    subject: row.subject,
    body: row.body,
    recipients: row.recipients,
    recipientCount: row.recipientCount,
    status: row.status,
    resendIds: row.resendIds ?? null,
    error: row.error ?? null,
    sentByUserId: row.sentByUserId ?? null,
    createdAt: row.createdAt.toISOString(),
  };
}

export const emailsRouter = createTRPCRouter({
  /**
   * Lists app users as candidate recipients for the email composer.
   * Admin-only.
   */
  recipients: adminProcedure
    .output(z.array(emailRecipientOptionSchema))
    .query(async () => listRecipients()),

  /**
   * Most recent email send history, newest first.
   * Admin-only.
   */
  history: adminProcedure.output(z.array(emailLogSchema)).query(async () => {
    const history = await db.select().from(emailLog).orderBy(desc(emailLog.createdAt)).limit(50);

    return history.map(toEmailLogDto);
  }),

  /**
   * Sends a notification email via Resend and records the outcome in
   * `email_log`. Admin-only.
   */
  send: adminProcedure
    .input(sendEmailInputSchema)
    .output(sendEmailResultSchema)
    .mutation(async ({ ctx, input }) => {
      const footerContact = await loadEmailFooterContact(ctx.session.user.id);

      const result = await sendEmail({
        ...input,
        footerContact,
      });

      try {
        await db.insert(emailLog).values({
          subject: input.subject,
          body: input.body,
          recipients: input.recipients,
          recipientCount: input.recipients.length,
          status: result.status,
          resendIds: result.resendIds,
          error: result.error ?? null,
          sentByUserId: ctx.session.user.id,
        });
      } catch (loggingError) {
        console.error("Failed to persist email log", loggingError);
      }

      if (result.status === "failed") {
        throw new TRPCError({
          code: "BAD_GATEWAY",
          message: "No se pudo enviar el correo",
        });
      }

      return {
        status: result.status,
        sent: result.sent,
        failed: result.failed,
      };
    }),
});
