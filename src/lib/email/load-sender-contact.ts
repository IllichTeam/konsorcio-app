import "server-only";

import { eq } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";

import { buildEmailFooterContact, type EmailSenderContact } from "./footer-contact";

/**
 * Loads profile contact fields from the DB (not the session cookie cache).
 * Cookie-cached sessions can lag behind `updateUser` and omit phone / address / CP.
 */
export async function loadEmailSenderContact(userId: string): Promise<EmailSenderContact> {
  const [row] = await db
    .select({
      address: user.address,
      phone: user.phone,
      postalCode: user.postalCode,
    })
    .from(user)
    .where(eq(user.id, userId))
    .limit(1);

  return row ?? {};
}

/** Footer line for outbound emails from the sender's saved profile. */
export async function loadEmailFooterContact(userId: string): Promise<string | null> {
  return buildEmailFooterContact(await loadEmailSenderContact(userId));
}
