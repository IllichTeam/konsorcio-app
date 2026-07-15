/** A single email recipient. */
export type { Recipient, SendEmailInput } from "@/lib/schemas/email";

/** Outcome of a send attempt, aggregated across all recipients. */
export type SendEmailResult = {
  status: "sent" | "partial" | "failed";
  sent: number;
  failed: number;
  resendIds: string[];
  error?: string;
};
