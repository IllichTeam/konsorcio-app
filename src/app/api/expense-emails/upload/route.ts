import { TRPCError } from "@trpc/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { getSession } from "@/lib/auth/session";
import {
  EXPENSE_EMAIL_MAX_ATTACHMENT_BYTES,
  EXPENSE_EMAIL_MAX_ATTACHMENTS,
  expenseEmailUploadResponseSchema,
} from "@/lib/schemas/expense-email";
import { isPdfFile, uploadExpenseEmailPdfs } from "@/lib/storage/expense-emails";
import { isSupabaseStorageConfigured } from "@/lib/storage/supabase-admin";
import { z } from "@/lib/zod";
import { findAccessibleConsortium } from "@/server/trpc/lib/consortium-access";

/** Prefer São Paulo (near Supabase). Project default also set in vercel.json. */
export const preferredRegion = "gru1";

/** Multipart upload of up to 3 × 5 MB PDFs. */
export const maxDuration = 60;

const uuidFieldSchema = z.string().uuid();

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

/**
 * POST multipart — upload 1–3 PDFs for a monthly expense send.
 *
 * Form fields:
 * - `consortiumId` (uuid, required)
 * - `sendId` (uuid, optional) — reserved id reused by Phase 3 as the send PK;
 *   if omitted the server generates one and returns it
 * - `files` (File, 1–3) — PDF only, ≤ 5 MB each
 *
 * Response 200: `{ sendId, attachments: [{ storagePath, filename, sizeBytes }] }`
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return jsonError("No autorizado", 401);
  }

  if (!isSupabaseStorageConfigured()) {
    return jsonError("Almacenamiento de archivos no configurado", 503);
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return jsonError("No se pudo leer el formulario multipart", 400);
  }

  const consortiumIdRaw = formData.get("consortiumId");
  if (typeof consortiumIdRaw !== "string") {
    return jsonError("Falta el consorcio", 400);
  }

  const consortiumIdParsed = uuidFieldSchema.safeParse(consortiumIdRaw);
  if (!consortiumIdParsed.success) {
    return jsonError("Identificador de consorcio inválido", 400);
  }
  const consortiumId = consortiumIdParsed.data;

  const sendIdRaw = formData.get("sendId");
  let sendId: string;
  if (sendIdRaw == null || sendIdRaw === "") {
    sendId = crypto.randomUUID();
  } else if (typeof sendIdRaw !== "string") {
    return jsonError("Identificador de envío inválido", 400);
  } else {
    const sendIdParsed = uuidFieldSchema.safeParse(sendIdRaw);
    if (!sendIdParsed.success) {
      return jsonError("Identificador de envío inválido", 400);
    }
    sendId = sendIdParsed.data;
  }

  try {
    await findAccessibleConsortium(consortiumId, session.user.id, session.user.role);
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      return jsonError("Consorcio no encontrado", 404);
    }
    throw error;
  }

  const fileEntries = formData
    .getAll("files")
    .filter((entry): entry is File => entry instanceof File && entry.size > 0);

  if (fileEntries.length < 1) {
    return jsonError("Adjuntá al menos un PDF", 400);
  }

  if (fileEntries.length > EXPENSE_EMAIL_MAX_ATTACHMENTS) {
    return jsonError("Máximo 3 PDFs", 400);
  }

  for (const file of fileEntries) {
    if (file.size > EXPENSE_EMAIL_MAX_ATTACHMENT_BYTES) {
      return jsonError("Cada PDF debe pesar 5 MB o menos", 400);
    }

    if (!(await isPdfFile(file))) {
      return jsonError("Solo se permiten archivos PDF", 400);
    }
  }

  try {
    const attachments = await uploadExpenseEmailPdfs({
      consortiumId,
      sendId,
      files: fileEntries,
    });

    const body = expenseEmailUploadResponseSchema.parse({ sendId, attachments });
    return NextResponse.json(body);
  } catch (error) {
    const message = error instanceof Error ? error.message : "upload failed";
    console.error("[expense-emails/upload]", { message });
    return jsonError("No se pudieron subir los PDFs. Intentá de nuevo.", 500);
  }
}
