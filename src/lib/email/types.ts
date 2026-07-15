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
};

/** Outcome of a send attempt, aggregated across all recipients. */
export type SendEmailResult = {
  status: "sent" | "partial" | "failed";
  sent: number;
  failed: number;
  resendIds: string[];
  error?: string;
};
