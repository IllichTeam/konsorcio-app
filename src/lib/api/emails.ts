import type { EmailLog } from "@/db/schema";
import type { Recipient, SendEmailResult } from "@/lib/email/types";

/** Candidate recipient for the email composer, sourced from app users. */
export type EmailRecipientOption = {
  id: string;
  name: string;
  email: string;
};

/** Input accepted by {@link sendEmail}. */
export type SendEmailInput = {
  subject: string;
  body: string;
  recipients: Recipient[];
  consorcio?: string;
  remitente?: string;
};

/** Lists app users as candidate recipients. GET /api/emails/recipients. */
export async function getEmailRecipients(): Promise<EmailRecipientOption[]> {
  const res = await fetch("/api/emails/recipients");

  if (!res.ok) {
    throw new Error("No se pudo obtener la lista de destinatarios");
  }

  const { recipients } = (await res.json()) as { recipients: EmailRecipientOption[] };
  return recipients;
}

/** Sends a notification email to the given recipients. POST /api/emails. */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const res = await fetch("/api/emails", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? "No se pudo enviar el correo");
  }

  return res.json();
}

/** Fetches the most recent email send history. GET /api/emails. */
export async function getEmailHistory(): Promise<EmailLog[]> {
  const res = await fetch("/api/emails");

  if (!res.ok) {
    throw new Error("No se pudo obtener el historial de correos");
  }

  const { history } = (await res.json()) as { history: EmailLog[] };
  return history;
}
