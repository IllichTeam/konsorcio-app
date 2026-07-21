import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { tenantEmails, type TenantEmailRow } from "@/db/schema";
import {
  createTenantEmailInputSchema,
  listByConsortiumInputSchema,
  tenantEmailDtoSchema,
  tenantEmailIdInputSchema,
  updateTenantEmailInputSchema,
} from "@/lib/schemas/tenant-email";
import { normalizeUnitFields } from "@/lib/tenant-email/format-unit";
import { z } from "@/lib/zod";
import { createTRPCRouter, protectedProcedure } from "@/server/trpc/init";
import { findAccessibleConsortium } from "@/server/trpc/lib/consortium-access";

const listColumns = {
  id: tenantEmails.id,
  consortiumId: tenantEmails.consortiumId,
  floor: tenantEmails.floor,
  departmentNumber: tenantEmails.departmentNumber,
  letter: tenantEmails.letter,
  email: tenantEmails.email,
  contactType: tenantEmails.contactType,
} as const;

function toDto(row: Pick<TenantEmailRow, keyof typeof listColumns>) {
  return {
    id: row.id,
    consortiumId: row.consortiumId,
    floor: row.floor,
    departmentNumber: row.departmentNumber,
    letter: row.letter,
    email: row.email,
    contactType: row.contactType,
  };
}

export const tenantEmailsRouter = createTRPCRouter({
  listByConsortium: protectedProcedure
    .input(listByConsortiumInputSchema)
    .output(z.array(tenantEmailDtoSchema))
    .query(async ({ ctx, input }) => {
      await findAccessibleConsortium(
        input.consortiumId,
        ctx.session.user.id,
        ctx.session.user.role,
      );

      const rows = await db
        .select(listColumns)
        .from(tenantEmails)
        .where(
          and(eq(tenantEmails.consortiumId, input.consortiumId), eq(tenantEmails.isDeleted, false)),
        );

      return rows.map(toDto);
    }),

  create: protectedProcedure
    .input(createTenantEmailInputSchema)
    .output(tenantEmailDtoSchema)
    .mutation(async ({ ctx, input }) => {
      await findAccessibleConsortium(
        input.consortiumId,
        ctx.session.user.id,
        ctx.session.user.role,
      );

      const unit = normalizeUnitFields(input);

      const [row] = await db
        .insert(tenantEmails)
        .values({
          consortiumId: input.consortiumId,
          floor: unit.floor,
          departmentNumber: unit.departmentNumber,
          letter: unit.letter,
          email: input.email,
          contactType: input.contactType,
        })
        .returning();

      return toDto(row);
    }),

  update: protectedProcedure
    .input(updateTenantEmailInputSchema)
    .output(tenantEmailDtoSchema)
    .mutation(async ({ ctx, input }) => {
      await findAccessibleConsortium(
        input.consortiumId,
        ctx.session.user.id,
        ctx.session.user.role,
      );

      const [row] = await db
        .update(tenantEmails)
        .set({
          email: input.email,
          contactType: input.contactType,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tenantEmails.id, input.id),
            eq(tenantEmails.consortiumId, input.consortiumId),
            eq(tenantEmails.isDeleted, false),
          ),
        )
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email no encontrado" });
      }

      return toDto(row);
    }),

  delete: protectedProcedure
    .input(tenantEmailIdInputSchema)
    .output(z.void())
    .mutation(async ({ ctx, input }) => {
      await findAccessibleConsortium(
        input.consortiumId,
        ctx.session.user.id,
        ctx.session.user.role,
      );

      const [row] = await db
        .update(tenantEmails)
        .set({
          isDeleted: true,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(tenantEmails.id, input.id),
            eq(tenantEmails.consortiumId, input.consortiumId),
            eq(tenantEmails.isDeleted, false),
          ),
        )
        .returning();

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Email no encontrado" });
      }
    }),
});
