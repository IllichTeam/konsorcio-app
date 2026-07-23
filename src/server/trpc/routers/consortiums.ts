import { and, count, desc, eq, inArray, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import {
  consortiumActivities,
  consortiums,
  emailLog,
  expenseEmailSends,
  tenantEmails,
  type ConsortiumRow,
} from "@/db/schema";
import { sendEmail } from "@/lib/email/send";
import {
  normalizeExpenseEmailLinkUrl,
  type ExpenseEmailSendStatus,
} from "@/lib/schemas/expense-email";
import {
  consortiumDetailSchema,
  consortiumHistoryInputSchema,
  consortiumHistoryPageSchema,
  consortiumIdInputSchema,
  consortiumListItemSchema,
  createConsortiumInputSchema,
  sendConsortiumCommentInputSchema,
  updateConsortiumAmountInputSchema,
  updateConsortiumInputSchema,
  type ConsortiumActivityPayload,
  type ConsortiumHistoryEntry,
} from "@/lib/schemas/consortium";
import { z } from "@/lib/zod";
import { recordConsortiumActivity } from "@/server/consortiums/record-consortium-activity";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { findAccessibleConsortium, ownershipFilter } from "@/server/trpc/lib/consortium-access";

const COMMENT_SENDER = "Administración";
const MESSAGE_PREVIEW_MAX = 120;

const listColumns = {
  id: consortiums.id,
  name: consortiums.name,
  location: consortiums.location,
  paymentAlias: consortiums.paymentAlias,
  billingEmail: consortiums.billingEmail,
  driveLink: consortiums.driveLink,
} as const;

const detailColumns = {
  ...listColumns,
  amount: consortiums.amount,
} as const;

type UpdateComparable = {
  name: string;
  location: string;
  paymentAlias: string | null;
  billingEmail: string | null;
  driveLink: string | null;
};

const UPDATE_FIELD_KEYS = [
  "name",
  "location",
  "paymentAlias",
  "billingEmail",
  "driveLink",
] as const satisfies ReadonlyArray<keyof UpdateComparable>;

function toListItem(row: Pick<ConsortiumRow, keyof typeof listColumns>) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    paymentAlias: row.paymentAlias,
    billingEmail: row.billingEmail,
    driveLink: row.driveLink,
  };
}

function toDetail(row: ConsortiumRow) {
  return {
    ...toListItem(row),
    amount: row.amount,
  };
}

function changedUpdateFields(previous: UpdateComparable, next: UpdateComparable): string[] {
  return UPDATE_FIELD_KEYS.filter((key) => previous[key] !== next[key]);
}

function truncatePreview(message: string): string {
  const trimmed = message.trim();
  if (trimmed.length <= MESSAGE_PREVIEW_MAX) {
    return trimmed;
  }
  return `${trimmed.slice(0, MESSAGE_PREVIEW_MAX - 1)}…`;
}

function toHistoryEntry(row: {
  id: string;
  type: ConsortiumHistoryEntry["type"];
  summary: string;
  payload: ConsortiumHistoryEntry["payload"] | null;
  createdAt: Date;
  sendStatus?: ExpenseEmailSendStatus;
}): ConsortiumHistoryEntry {
  return {
    id: row.id,
    type: row.type,
    summary: row.summary,
    timestamp: row.createdAt.toISOString(),
    payload: row.payload ?? {},
    ...(row.sendStatus ? { sendStatus: row.sendStatus } : {}),
  };
}

async function loadExpenseSendStatuses(
  sendIds: string[],
): Promise<Map<string, ExpenseEmailSendStatus>> {
  if (sendIds.length === 0) {
    return new Map();
  }

  const rows = await db
    .select({
      id: expenseEmailSends.id,
      status: expenseEmailSends.status,
    })
    .from(expenseEmailSends)
    .where(inArray(expenseEmailSends.id, sendIds));

  return new Map(rows.map((row) => [row.id, row.status]));
}

export const consortiumsRouter = createTRPCRouter({
  list: protectedProcedure.output(z.array(consortiumListItemSchema)).query(async ({ ctx }) => {
    return db
      .select({
        ...listColumns,
        unitCount:
          sql<number>`count(distinct (${tenantEmails.floor}, ${tenantEmails.departmentNumber}, ${tenantEmails.letter})) filter (where ${tenantEmails.id} is not null)`.mapWith(
            Number,
          ),
        contactCount: sql<number>`count(${tenantEmails.id})`.mapWith(Number),
      })
      .from(consortiums)
      .leftJoin(
        tenantEmails,
        and(eq(tenantEmails.consortiumId, consortiums.id), eq(tenantEmails.isDeleted, false)),
      )
      .where(ownershipFilter(ctx.session.user.id, ctx.session.user.role))
      .groupBy(consortiums.id);
  }),

  byId: protectedProcedure
    .input(consortiumIdInputSchema)
    .output(consortiumDetailSchema.nullable())
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select(detailColumns)
        .from(consortiums)
        .where(
          and(
            eq(consortiums.id, input.id),
            ownershipFilter(ctx.session.user.id, ctx.session.user.role),
          ),
        )
        .limit(1);

      return row ?? null;
    }),

  /** Paginated curated action history for a consortium. */
  history: protectedProcedure
    .input(consortiumHistoryInputSchema)
    .output(consortiumHistoryPageSchema)
    .query(async ({ ctx, input }) => {
      await findAccessibleConsortium(input.id, ctx.session.user.id, ctx.session.user.role);

      const offset = (input.page - 1) * input.pageSize;

      const [items, totals] = await Promise.all([
        db
          .select({
            id: consortiumActivities.id,
            type: consortiumActivities.type,
            summary: consortiumActivities.summary,
            payload: consortiumActivities.payload,
            createdAt: consortiumActivities.createdAt,
          })
          .from(consortiumActivities)
          .where(eq(consortiumActivities.consortiumId, input.id))
          .orderBy(desc(consortiumActivities.createdAt))
          .limit(input.pageSize)
          .offset(offset),
        db
          .select({ total: count() })
          .from(consortiumActivities)
          .where(eq(consortiumActivities.consortiumId, input.id)),
      ]);

      const expenseSendIds = [
        ...new Set(
          items
            .filter((row) => row.type === "expense_sent" && row.payload?.sendId)
            .map((row) => row.payload!.sendId!),
        ),
      ];
      const sendStatusById = await loadExpenseSendStatuses(expenseSendIds);

      return {
        items: items.map((row) => {
          const sendId = row.type === "expense_sent" ? row.payload?.sendId : undefined;
          return toHistoryEntry({
            ...row,
            sendStatus: sendId ? sendStatusById.get(sendId) : undefined,
          });
        }),
        total: totals[0]?.total ?? 0,
      };
    }),

  create: protectedProcedure
    .input(createConsortiumInputSchema)
    .output(consortiumDetailSchema)
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .insert(consortiums)
        .values({
          name: input.name,
          location: input.location,
          paymentAlias: input.paymentAlias,
          billingEmail: input.billingEmail,
          driveLink: input.driveLink,
          amount: 0,
          ownerId: ctx.session.user.id,
        })
        .returning();

      return toDetail(row);
    }),

  update: protectedProcedure
    .input(updateConsortiumInputSchema)
    .output(consortiumDetailSchema)
    .mutation(async ({ ctx, input }) => {
      const previous = await findAccessibleConsortium(
        input.id,
        ctx.session.user.id,
        ctx.session.user.role,
      );

      const [row] = await db
        .update(consortiums)
        .set({
          name: input.name,
          location: input.location,
          paymentAlias: input.paymentAlias,
          billingEmail: input.billingEmail,
          driveLink: input.driveLink,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(consortiums.id, input.id),
            ownershipFilter(ctx.session.user.id, ctx.session.user.role),
          ),
        )
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Consorcio no encontrado" });
      }

      const fieldsChanged = changedUpdateFields(previous, input);
      if (fieldsChanged.length === 1 && fieldsChanged[0] === "driveLink") {
        await recordConsortiumActivity({
          consortiumId: row.id,
          actorUserId: ctx.session.user.id,
          type: "drive_link_updated",
          summary: "Se actualizó el link del drive",
          payload: {
            previousDriveLink: previous.driveLink,
            newDriveLink: input.driveLink,
          },
        });
      } else if (fieldsChanged.length > 0) {
        const payload: ConsortiumActivityPayload = {
          fieldsChanged,
        };
        if (fieldsChanged.includes("driveLink")) {
          payload.previousDriveLink = previous.driveLink;
          payload.newDriveLink = input.driveLink;
        }
        await recordConsortiumActivity({
          consortiumId: row.id,
          actorUserId: ctx.session.user.id,
          type: "consortium_updated",
          summary: "Se editaron los datos del consorcio",
          payload,
        });
      }

      return toDetail(row);
    }),

  updateAmount: protectedProcedure
    .input(updateConsortiumAmountInputSchema)
    .output(consortiumDetailSchema)
    .mutation(async ({ ctx, input }) => {
      const previous = await findAccessibleConsortium(
        input.id,
        ctx.session.user.id,
        ctx.session.user.role,
      );

      const [row] = await db
        .update(consortiums)
        .set({
          amount: input.amount,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(consortiums.id, input.id),
            ownershipFilter(ctx.session.user.id, ctx.session.user.role),
          ),
        )
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Consorcio no encontrado" });
      }

      if (previous.amount !== input.amount) {
        await recordConsortiumActivity({
          consortiumId: row.id,
          actorUserId: ctx.session.user.id,
          type: "amount_updated",
          summary: "Se actualizó el monto de caja",
          payload: {
            previousAmount: previous.amount,
            newAmount: input.amount,
          },
        });
      }

      return toDetail(row);
    }),

  delete: protectedProcedure
    .input(consortiumIdInputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const [row] = await db
        .update(consortiums)
        .set({
          isDeleted: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(consortiums.id, input.id),
            ownershipFilter(ctx.session.user.id, ctx.session.user.role),
          ),
        )
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Consorcio no encontrado" });
      }
    }),

  /**
   * Sends a card comment as a `NotificacionConsorcio` email to the selected
   * tenant-email recipients for the consortium.
   */
  sendComment: protectedProcedure
    .input(sendConsortiumCommentInputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      const consortium = await findAccessibleConsortium(
        input.id,
        ctx.session.user.id,
        ctx.session.user.role,
      );

      if (!consortium.billingEmail?.trim()) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Debés configurar primero el correo del consorcio",
        });
      }

      const recipients = input.recipients;
      const subject = `Comentario — ${consortium.name}`;
      const linkUrl = normalizeExpenseEmailLinkUrl(consortium.driveLink) || null;
      const paymentAlias = consortium.paymentAlias?.trim() || null;

      const result = await sendEmail({
        subject,
        body: input.message,
        recipients,
        consortium: consortium.name,
        sender: COMMENT_SENDER,
        replyTo: consortium.billingEmail,
        linkUrl,
        paymentAlias,
      });

      try {
        await db.insert(emailLog).values({
          subject,
          body: input.message,
          recipients,
          recipientCount: recipients.length,
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

      await recordConsortiumActivity({
        consortiumId: consortium.id,
        actorUserId: ctx.session.user.id,
        type: "notification_sent",
        summary: "Se envió una notificación a los inquilinos",
        payload: {
          messagePreview: truncatePreview(input.message),
          recipientCount: recipients.length,
        },
      });
    }),
});
