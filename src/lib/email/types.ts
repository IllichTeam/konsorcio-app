/** A single email recipient. */
export type Recipient = {
  email: string;
  name?: string;
};

/** Input for sending an email to one or more recipients. */
export type SendEmailInput = {
  subject: string;
  body: string;
  recipients: Recipient[];
  /** Building / consortium name shown in the email body. */
  consorcio?: string;
  /** Sign-off line (e.g. "Administración Edificio Rivadavia"). */
  remitente?: string;
};

/** Outcome of a send attempt, aggregated across all recipients. */
export type SendEmailResult = {
  status: "sent" | "partial" | "failed";
  sent: number;
  failed: number;
  resendIds: string[];
  error?: string;
};
