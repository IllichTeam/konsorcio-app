import "server-only";

import { asc } from "drizzle-orm";

import { db } from "@/db";
import { user } from "@/db/schema";
import type { EmailRecipientOption } from "@/lib/schemas/email";

/** A recipient candidate for the email composer, sourced from app users. */
export type EmailRecipient = EmailRecipientOption;

/**
 * Lists every app user as a potential email recipient, ordered by name.
 *
 * This is the recipient source for the admin email composer: any signed-up
 * user (regardless of role) is a valid recipient.
 */
export async function listRecipients(): Promise<EmailRecipient[]> {
  return db
    .select({ id: user.id, name: user.name, email: user.email })
    .from(user)
    .orderBy(asc(user.name));
}
