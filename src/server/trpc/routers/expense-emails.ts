import { and, asc, desc, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { expenseEmailRecipients, expenseEmailSends, tenantEmails, user } from "@/db/schema";
import {
  createExpenseEmailSendInputSchema,
  EXPENSE_EMAIL_SUBJECT,
  expenseEmailSendDetailDtoSchema,
  expenseEmailSendDtoSchema,
  expenseEmailSendIdInputSchema,
  expenseEmailSendIdResultSchema,
  listExpenseEmailSendsInputSchema,
  previewExpenseEmailInputSchema,
  previewExpenseEmailResultSchema,
} from "@/lib/schemas/expense-email";
import { renderExpenseEmailHtml } from "@/lib/email/render-expense-email";
import { isAttachmentRefForSend } from "@/lib/storage/expense-emails";
import { z } from "@/lib/zod";
import {
  toExpenseEmailSendDetailDto,
  toExpenseEmailSendDto,
} from "@/server/expense-emails/map-expense-email-dto";
import { isExpenseEmailSendStale } from "@/server/expense-emails/run-expense-email-send";
import { scheduleExpenseEmailSend } from "@/server/expense-emails/schedule-expense-email-send";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { findAccessibleConsortium } from "@/server/trpc/lib/consortium-access";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function uniqueNormalizedEmails(emails: string[]): string[] {
  return [...new Set(emails.map(normalizeEmail).filter(Boolean))].toSorted();
}

function sameEmailSet(a: string[], b: string[]): boolean {
  const left = uniqueNormalizedEmails(a);
  const right = uniqueNormalizedEmails(b);
  if (left.length !== right.length) {
    return false;
  }
  return left.every((email, index) => email === right[index]);
}

async function loadActiveTenantEmails(consortiumId: string): Promise<string[]> {
  const rows = await db
    .select({ email: tenantEmails.email })
    .from(tenantEmails)
    .where(and(eq(tenantEmails.consortiumId, consortiumId), eq(tenantEmails.isDeleted, false)));

  const byNorm = new Map<string, string>();
  for (const row of rows) {
    const trimmed = row.email.trim();
    const norm = normalizeEmail(trimmed);
    if (!norm || byNorm.has(norm)) {
      continue;
    }
    byNorm.set(norm, trimmed);
  }

  return [...byNorm.values()].toSorted((a, b) =>
    normalizeEmail(a).localeCompare(normalizeEmail(b)),
  );
}

function normalizeLinkUrl(linkUrl: string | undefined): string | null {
  if (linkUrl == null) {
    return null;
  }
  const trimmed = linkUrl.trim();
  return trimmed === "" ? null : trimmed;
}

/**
 * Idempotent create / race recovery: if the send is still waiting for a runner,
 * (re)schedule so a crashed create-before-after() path does not stay stuck.
 */
function maybeRescheduleQueuedSend(status: string, sendId: string): void {
  if (status === "queued") {
    scheduleExpenseEmailSend(sendId);
  }
}

export const expenseEmailsRouter = createTRPCRouter({
  /**
   * HTML preview of the same React Email template used when sending.
   * Loads consortium name + paymentAlias server-side; link/message/names from input.
   */
  preview: protectedProcedure
    .input(previewExpenseEmailInputSchema)
    .output(previewExpenseEmailResultSchema)
    .query(async ({ ctx, input }) => {
      const consortium = await findAccessibleConsortium(
        input.consortiumId,
        ctx.session.user.id,
        ctx.session.user.role,
      );

      const linkUrl = input.linkUrl === undefined ? (consortium.driveLink ?? "") : input.linkUrl;

      const html = await renderExpenseEmailHtml({
        consorcio: consortium.name,
        mensaje: input.message.trim(),
        linkUrl: linkUrl.trim() || null,
        paymentAlias: consortium.paymentAlias,
        attachmentNames: input.attachmentNames,
      });

      return { html };
    }),

  /**
   * Creates a monthly expense send from a reserved upload `sendId`, inserts
   * pending recipients, returns immediately, and fans out in background.
   */
  create: protectedProcedure
    .input(createExpenseEmailSendInputSchema)
    .output(expenseEmailSendIdResultSchema)
    .mutation(async ({ ctx, input }) => {
      const consortium = await findAccessibleConsortium(
        input.consortiumId,
        ctx.session.user.id,
        ctx.session.user.role,
      );

      const [existing] = await db
        .select()
        .from(expenseEmailSends)
        .where(eq(expenseEmailSends.id, input.sendId))
        .limit(1);

      if (existing) {
        if (existing.consortiumId !== input.consortiumId) {
          throw new TRPCError({
            code: "NOT_FOUND",
            message: "Envío no encontrado",
          });
        }
        // Idempotent ack for double-submit with the same reserved upload id.
        maybeRescheduleQueuedSend(existing.status, existing.id);
        return { sendId: existing.id };
      }

      for (const ref of input.attachmentRefs) {
        if (!isAttachmentRefForSend(ref, input.consortiumId, input.sendId)) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Los archivos adjuntos no pertenecen a este envío",
          });
        }
      }

      const activeEmails = await loadActiveTenantEmails(input.consortiumId);
      if (activeEmails.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No hay emails de inquilinos activos en este consorcio",
        });
      }

      if (!sameEmailSet(input.recipients, activeEmails)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Los destinatarios deben ser exactamente los emails activos del consorcio",
        });
      }

      const linkUrl =
        normalizeLinkUrl(input.linkUrl) ?? normalizeLinkUrl(consortium.driveLink ?? undefined);
      const body = input.message.trim();

      try {
        await db.transaction(async (tx) => {
          await tx.insert(expenseEmailSends).values({
            id: input.sendId,
            consortiumId: input.consortiumId,
            subject: EXPENSE_EMAIL_SUBJECT,
            body,
            linkUrl,
            status: "queued",
            attachmentRefs: input.attachmentRefs,
            sentByUserId: ctx.session.user.id,
            recipientCount: activeEmails.length,
            sentCount: 0,
            failedCount: 0,
          });

          await tx.insert(expenseEmailRecipients).values(
            activeEmails.map((email) => ({
              sendId: input.sendId,
              email,
              status: "pending" as const,
            })),
          );
        });
      } catch (error) {
        // Concurrent create with the same PK — treat as idempotent success.
        const [race] = await db
          .select()
          .from(expenseEmailSends)
          .where(eq(expenseEmailSends.id, input.sendId))
          .limit(1);

        if (race && race.consortiumId === input.consortiumId) {
          maybeRescheduleQueuedSend(race.status, race.id);
          return { sendId: race.id };
        }

        console.error("Failed to create expense email send", {
          sendId: input.sendId,
          message: error instanceof Error ? error.message : String(error),
        });
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "No se pudo crear el envío",
        });
      }

      scheduleExpenseEmailSend(input.sendId);
      return { sendId: input.sendId };
    }),

  /**
   * Status screen payload: send summary + per-recipient rows.
   */
  getSend: protectedProcedure
    .input(expenseEmailSendIdInputSchema)
    .output(expenseEmailSendDetailDtoSchema)
    .query(async ({ ctx, input }) => {
      await findAccessibleConsortium(
        input.consortiumId,
        ctx.session.user.id,
        ctx.session.user.role,
      );

      const [row] = await db
        .select({
          send: expenseEmailSends,
          sentByUserName: user.name,
        })
        .from(expenseEmailSends)
        .leftJoin(user, eq(expenseEmailSends.sentByUserId, user.id))
        .where(
          and(
            eq(expenseEmailSends.id, input.sendId),
            eq(expenseEmailSends.consortiumId, input.consortiumId),
          ),
        )
        .limit(1);

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Envío no encontrado" });
      }

      const recipients = await db
        .select()
        .from(expenseEmailRecipients)
        .where(eq(expenseEmailRecipients.sendId, row.send.id))
        .orderBy(asc(expenseEmailRecipients.email));

      return toExpenseEmailSendDetailDto(row.send, recipients, row.sentByUserName ?? null);
    }),

  /**
   * Recent expense sends for the consortium historial (Fase 5 UI).
   */
  listRecentByConsortium: protectedProcedure
    .input(listExpenseEmailSendsInputSchema)
    .output(z.array(expenseEmailSendDtoSchema))
    .query(async ({ ctx, input }) => {
      await findAccessibleConsortium(
        input.consortiumId,
        ctx.session.user.id,
        ctx.session.user.role,
      );

      const rows = await db
        .select({
          send: expenseEmailSends,
          sentByUserName: user.name,
        })
        .from(expenseEmailSends)
        .leftJoin(user, eq(expenseEmailSends.sentByUserId, user.id))
        .where(eq(expenseEmailSends.consortiumId, input.consortiumId))
        .orderBy(desc(expenseEmailSends.createdAt))
        .limit(input.limit);

      return rows.map((row) => toExpenseEmailSendDto(row.send, row.sentByUserName ?? null));
    }),

  /**
   * Re-queues pending + failed recipients (never `sent`) and runs background
   * fan-out again with the same body / link / subject / attachments.
   */
  retryPending: protectedProcedure
    .input(expenseEmailSendIdInputSchema)
    .output(expenseEmailSendIdResultSchema)
    .mutation(async ({ ctx, input }) => {
      await findAccessibleConsortium(
        input.consortiumId,
        ctx.session.user.id,
        ctx.session.user.role,
      );

      const [send] = await db
        .select()
        .from(expenseEmailSends)
        .where(
          and(
            eq(expenseEmailSends.id, input.sendId),
            eq(expenseEmailSends.consortiumId, input.consortiumId),
          ),
        )
        .limit(1);

      if (!send) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Envío no encontrado" });
      }

      const recipients = await db
        .select()
        .from(expenseEmailRecipients)
        .where(eq(expenseEmailRecipients.sendId, send.id));

      const retryable = recipients.filter(
        (row) => row.status === "pending" || row.status === "failed",
      );

      if (retryable.length === 0) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "No hay destinatarios pendientes para reintentar",
        });
      }

      if (send.status === "sending" && !isExpenseEmailSendStale(send, recipients)) {
        throw new TRPCError({
          code: "CONFLICT",
          message: "El envío todavía está en curso. Probá de nuevo en unos minutos",
        });
      }

      // Runner claim + recipient attempts CAS prevent duplicate Resend calls.
      scheduleExpenseEmailSend(send.id);
      return { sendId: send.id };
    }),
});
