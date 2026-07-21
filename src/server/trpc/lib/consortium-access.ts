import { and, eq } from "drizzle-orm";
import { TRPCError } from "@trpc/server";

import { db } from "@/db";
import { consortiums, type ConsortiumRow } from "@/db/schema";
import { isSuperadmin } from "@/lib/auth/roles";

export function ownershipFilter(userId: string, role: string | null | undefined) {
  if (isSuperadmin(role)) {
    return eq(consortiums.isDeleted, false);
  }

  return and(eq(consortiums.isDeleted, false), eq(consortiums.ownerId, userId));
}

export async function findAccessibleConsortium(
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
