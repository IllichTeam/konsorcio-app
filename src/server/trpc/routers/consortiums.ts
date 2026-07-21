import { and, eq, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { consortiums, emailLog, tenantEmails, type ConsortiumRow } from "@/db/schema";
import { sendEmail } from "@/lib/email/send";
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
  type ConsortiumHistoryEntry,
} from "@/lib/schemas/consortium";
import { z } from "@/lib/zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { findAccessibleConsortium, ownershipFilter } from "@/server/trpc/lib/consortium-access";

const COMMENT_SENDER = "Administración";

/** Mock action history until the domain is modeled in the DB. */
const MOCK_HISTORY: ConsortiumHistoryEntry[] = [
  { id: 1, timestamp: "2026-07-20 09:12", description: "Se actualizó el monto de caja" },
  { id: 2, timestamp: "2026-07-18 16:40", description: "Se envió la expensa mensual" },
  { id: 3, timestamp: "2026-07-15 11:05", description: "Se editaron los datos del consorcio" },
  { id: 4, timestamp: "2026-07-12 14:22", description: "Se agregó un email de inquilino" },
  { id: 5, timestamp: "2026-07-10 10:00", description: "Se envió un comentario a los inquilinos" },
  { id: 6, timestamp: "2026-07-08 18:31", description: "Se eliminó un email de inquilino" },
  { id: 7, timestamp: "2026-07-05 09:45", description: "Se actualizó el alias de cobro" },
  { id: 8, timestamp: "2026-07-02 13:18", description: "Se actualizó el link del drive" },
  { id: 9, timestamp: "2026-06-28 17:50", description: "Se envió la expensa mensual" },
  { id: 10, timestamp: "2026-06-25 08:20", description: "Se cambió el email de facturación" },
  { id: 11, timestamp: "2026-06-20 12:00", description: "Se creó el consorcio" },
  {
    id: 12,
    timestamp: "2026-06-18 15:33",
    description: "Se sincronizaron los emails de inquilinos",
  },
  { id: 13, timestamp: "2026-06-15 11:11", description: "Se actualizó la ubicación" },
  { id: 14, timestamp: "2026-06-12 19:05", description: "Se reenvió la notificación de expensa" },
  { id: 15, timestamp: "2026-06-10 10:30", description: "Se registró el primer monto de caja" },
];

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

  /**
   * Paginated action history for a consortium.
   * Backed by mock data until history is persisted.
   */
  history: protectedProcedure
    .input(consortiumHistoryInputSchema)
    .output(consortiumHistoryPageSchema)
    .query(async ({ ctx, input }) => {
      await findAccessibleConsortium(input.id, ctx.session.user.id, ctx.session.user.role);

      const offset = (input.page - 1) * input.pageSize;

      return {
        items: MOCK_HISTORY.slice(offset, offset + input.pageSize),
        total: MOCK_HISTORY.length,
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

      return toDetail(row);
    }),

  updateAmount: protectedProcedure
    .input(updateConsortiumAmountInputSchema)
    .output(consortiumDetailSchema)
    .mutation(async ({ ctx, input }) => {
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

      const recipients = input.recipients;
      const subject = `Comentario — ${consortium.name}`;

      const result = await sendEmail({
        subject,
        body: input.message,
        recipients,
        consortium: consortium.name,
        sender: COMMENT_SENDER,
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
    }),
});
