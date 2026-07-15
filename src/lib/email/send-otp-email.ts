import { env } from "@/env";

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
 */
export async function sendOtpEmail({ to, subject, text }: SendOtpEmailParams) {
  if (!env.RESEND_API_KEY) {
    console.info("[sendOtpEmail]", { to, subject, text });
    return;
  }

  const { getResendClient } = await import("./client");
  const resend = getResendClient();
  await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    text,
  });
}
