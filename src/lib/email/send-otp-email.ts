import { env } from "@/env";

import { isEmailToOverridden, resolveEmailTo } from "./resolve-to";

type SendOtpEmailParams = {
  to: string;
  subject: string;
  text: string;
};

/**
 * Sends a plain-text OTP email via the shared Resend client.
 *
 * When `RESEND_API_KEY` is unset (typical local/pglite setup), logs the payload
 * to stdout instead of throwing so forgot-password works without Resend.
 * `getResendClient` is imported only when a key is present so test environments
 * that load `auth.ts` without Resend never hit `server-only`.
 *
 * When `EMAIL_OVERRIDE_TO` is set, delivery is redirected and the intended
 * recipient is noted in the body (and log) for debugging.
 */
export async function sendOtpEmail({ to, subject, text }: SendOtpEmailParams) {
  const resolvedTo = resolveEmailTo(to);
  const resolvedText = isEmailToOverridden() ? `${text}\n\nDestinatario: ${to}` : text;

  if (!env.RESEND_API_KEY) {
    console.info("[sendOtpEmail]", {
      to: resolvedTo,
      intended: to,
      subject,
      text: resolvedText,
    });
    return;
  }

  const { getResendClient } = await import("./client");
  const resend = getResendClient();
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to: resolvedTo,
    subject,
    text: resolvedText,
  });
}
