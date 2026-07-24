import type { SendEmailInput } from "@/lib/schemas/email";

/** A single email recipient. */
export type { Recipient, SendEmailInput } from "@/lib/schemas/email";

/**
 * Server-only send params. Extends the shared client input with optional
 * `replyTo` (not exposed on `sendEmailInputSchema` / admin Notificaciones).
 */
export type SendEmailParams = SendEmailInput & {
  replyTo?: string;
  /** Sender profile footer: address / phone / postal code. */
  footerContact?: string | null;
};

/** Outcome of a send attempt, aggregated across all recipients. */
export type SendEmailResult = {
  status: "sent" | "partial" | "failed";
  sent: number;
  failed: number;
  resendIds: string[];
  error?: string;
};
