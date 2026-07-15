import { Resend } from "resend";

import { env } from "@/env";

type SendEmailParams = {
  to: string;
  subject: string;
  text: string;
};

export async function sendEmail({ to, subject, text }: SendEmailParams) {
  if (!env.RESEND_API_KEY) {
    console.info("[sendEmail]", { to, subject, text });
    return;
  }

  const resend = new Resend(env.RESEND_API_KEY);
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
  });
}
