import "server-only";

import { createServerCaller } from "@/server/trpc/server-caller";

/** Resolves consortium display name for document titles; null if missing/unauthorized. */
export async function getConsortiumTitleName(id: string): Promise<string | null> {
  try {
    const caller = await createServerCaller();
    const consortium = await caller.consortiums.byId({ id });
    return consortium?.name ?? null;
  } catch {
    return null;
  }
}

/** Resolves user-facing send number for document titles; null if missing/unauthorized. */
export async function getExpenseSendNumber(
  consortiumId: string,
  sendId: string,
): Promise<number | null> {
  try {
    const caller = await createServerCaller();
    const detail = await caller.expenseEmails.getSend({ consortiumId, sendId });
    return detail.send.sendNumber;
  } catch {
    return null;
  }
}

export function consortiumDetailTitle(name: string | null): string {
  return name ? `Consorcio ${name}` : "Consorcio";
}

export function tenantEmailsTitle(name: string | null): string {
  return name ? `Emails de inquilinos · ${name}` : "Emails de inquilinos";
}

export function expenseSendTitle(sendNumber: number | null): string {
  return sendNumber != null ? `Envío #${sendNumber}` : "Envío";
}
