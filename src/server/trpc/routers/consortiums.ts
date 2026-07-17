import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { consortiums, emailLog, type ConsortiumRow } from "@/db/schema";
import { env } from "@/env";
import { isSuperadmin } from "@/lib/auth/roles";
import { sendEmail } from "@/lib/email/send";
import {
  consortiumDetailSchema,
  consortiumIdInputSchema,
  consortiumListItemSchema,
  createConsortiumInputSchema,
  sendConsortiumCommentInputSchema,
  updateConsortiumAmountInputSchema,
  updateConsortiumInputSchema,
} from "@/lib/schemas/consortium";
import { z } from "@/lib/zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";

const COMMENT_RECIPIENT_NAME = "Vecino/a";
const COMMENT_SENDER = "Administración";
const COMMENT_EMAIL_FALLBACK = "demo@konsorcio.app";

function toDetail(row: ConsortiumRow) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
    amount: row.amount,
    paymentAlias: row.paymentAlias,
    billingEmail: row.billingEmail,
    driveLink: row.driveLink,
  };
}

function toListItem(row: ConsortiumRow) {
  return {
    id: row.id,
    name: row.name,
    location: row.location,
  };
}

function ownershipFilter(userId: string, role: string | null | undefined) {
  if (isSuperadmin(role)) {
    return eq(consortiums.isDeleted, false);
  }

  return and(eq(consortiums.isDeleted, false), eq(consortiums.ownerId, userId));
}

async function findAccessibleConsortium(
  id: string,
  userId: string,
  role: string | null | undefined,
): Promise<ConsortiumRow> {
  const [row] = await db
    .select()
    .from(consortiums)
    .where(and(eq(consortiums.id, id), ownershipFilter(userId, role)))
    .limit(1);

  if (!row) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Consorcio no encontrado" });
  }

  return row;
}

export const consortiumsRouter = createTRPCRouter({
  list: protectedProcedure.output(z.array(consortiumListItemSchema)).query(async ({ ctx }) => {
    const rows = await db
      .select()
      .from(consortiums)
      .where(ownershipFilter(ctx.session.user.id, ctx.session.user.role));

    return rows.map(toListItem);
  }),

  byId: protectedProcedure
    .input(consortiumIdInputSchema)
    .output(consortiumDetailSchema.nullable())
    .query(async ({ ctx, input }) => {
      const [row] = await db
        .select()
        .from(consortiums)
        .where(
          and(
            eq(consortiums.id, input.id),
            ownershipFilter(ctx.session.user.id, ctx.session.user.role),
          ),
        )
        .limit(1);

      return row ? toDetail(row) : null;
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
      await findAccessibleConsortium(input.id, ctx.session.user.id, ctx.session.user.role);

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
        .where(and(eq(consortiums.id, input.id), eq(consortiums.isDeleted, false)))
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
      await findAccessibleConsortium(input.id, ctx.session.user.id, ctx.session.user.role);

      const [row] = await db
        .update(consortiums)
        .set({
          amount: input.amount,
          updatedAt: new Date(),
        })
        .where(and(eq(consortiums.id, input.id), eq(consortiums.isDeleted, false)))
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
      await findAccessibleConsortium(input.id, ctx.session.user.id, ctx.session.user.role);

      const [row] = await db
        .update(consortiums)
        .set({
          isDeleted: true,
          updatedAt: new Date(),
        })
        .where(and(eq(consortiums.id, input.id), eq(consortiums.isDeleted, false)))
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Consorcio no encontrado" });
      }
    }),

  /**
   * Sends a card comment as a `NotificacionConsorcio` email to the consortium
   * billing address (or a placeholder that still resolves via EMAIL_OVERRIDE_TO).
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

      const intendedEmail =
        consortium.billingEmail ?? env.EMAIL_OVERRIDE_TO ?? COMMENT_EMAIL_FALLBACK;
      const recipients = [{ email: intendedEmail, name: COMMENT_RECIPIENT_NAME }];
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
