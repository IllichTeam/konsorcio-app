import { getSession } from "@/lib/auth/session";
import { listRecipients } from "@/lib/email/recipients";

/**
 * GET /api/emails/recipients
 *
 * Admin-only endpoint listing app users as candidate recipients for the
 * email composer.
 */
export async function GET(_request: Request) {
  const session = await getSession();

  if (!session) {
    return Response.json({ error: "No autorizado" }, { status: 401 });
  }

  if (session.user.role !== "admin") {
    return Response.json({ error: "Prohibido" }, { status: 403 });
  }

  try {
    const recipients = await listRecipients();
    return Response.json({ recipients }, { status: 200 });
  } catch (error) {
    console.error("Failed to list email recipients", error);
    return Response.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
