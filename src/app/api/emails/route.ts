import { desc } from "drizzle-orm";

import { db } from "@/db";
import { emailLog } from "@/db/schema";
import { getSession } from "@/lib/auth/session";
import { sendEmail } from "@/lib/email/send";
import { z } from "@/lib/zod";

const recipientSchema = z.object({
  email: z.email(),
  name: z.string().optional(),
});

const sendEmailSchema = z.object({
  subject: z.string().min(1),
  body: z.string().min(1),
  recipients: z.array(recipientSchema).min(1),
});

/**
 * POST /api/emails
 *
 * Admin-only endpoint that sends a notification email to the given
 * recipients via Resend and records the outcome in `email_log`, regardless
 * of whether the send fully succeeded, partially failed, or failed outright.
 */
export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return Response.json({ error: "Prohibido" }, { status: 403 });
    }

    const json = await request.json();
    const parsed = sendEmailSchema.safeParse(json);

    if (!parsed.success) {
      const message = parsed.error.issues[0]?.message ?? "Datos inválidos";
      return Response.json({ error: message }, { status: 400 });
    }

    const input = parsed.data;
    const result = await sendEmail(input);

    // A logging failure must not turn a successful (or partial) send into an
    // error response, so it's isolated in its own try/catch.
    try {
      await db.insert(emailLog).values({
        subject: input.subject,
        body: input.body,
        recipients: input.recipients,
        recipientCount: input.recipients.length,
        status: result.status,
        resendIds: result.resendIds,
        error: result.error ?? null,
        sentByUserId: session.user.id,
      });
    } catch (loggingError) {
      console.error("Failed to persist email log", loggingError);
    }

    if (result.status === "failed") {
      return Response.json({ error: "No se pudo enviar el correo", ...result }, { status: 502 });
    }

    return Response.json(
      { status: result.status, sent: result.sent, failed: result.failed },
      { status: 200 },
    );
  } catch (error) {
    console.error("Failed to send email", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

/**
 * GET /api/emails
 *
 * Admin-only endpoint returning the most recent email send history, newest
 * first.
 */
export async function GET(_request: Request) {
  try {
    const session = await getSession();

    if (!session) {
      return Response.json({ error: "No autorizado" }, { status: 401 });
    }

    if (session.user.role !== "admin") {
      return Response.json({ error: "Prohibido" }, { status: 403 });
    }

    const history = await db.select().from(emailLog).orderBy(desc(emailLog.createdAt)).limit(50);

    return Response.json({ history }, { status: 200 });
  } catch (error) {
    console.error("Failed to fetch email history", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
