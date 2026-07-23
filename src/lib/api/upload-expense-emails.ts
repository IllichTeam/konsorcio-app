import {
  expenseEmailUploadResponseSchema,
  type ExpenseEmailUploadResponse,
} from "@/lib/schemas/expense-email";

export type UploadExpenseEmailPdfsParams = {
  consortiumId: string;
  sendId: string;
  files: File[];
};

/**
 * Client helper for `POST /api/expense-emails/upload` (multipart).
 * Errors throw with a Spanish message suitable for toasts.
 */
export async function uploadExpenseEmailPdfs(
  params: UploadExpenseEmailPdfsParams,
): Promise<ExpenseEmailUploadResponse> {
  const formData = new FormData();
  formData.append("consortiumId", params.consortiumId);
  formData.append("sendId", params.sendId);
  for (const file of params.files) {
    formData.append("files", file);
  }

  const response = await fetch("/api/expense-emails/upload", {
    method: "POST",
    body: formData,
  });

  let payload: unknown;
  try {
    payload = await response.json();
  } catch {
    throw new Error(response.ok ? "Respuesta de subida inválida" : "No se pudieron subir los PDFs");
  }

  if (!response.ok) {
    const message =
      payload &&
      typeof payload === "object" &&
      "error" in payload &&
      typeof (payload as { error: unknown }).error === "string"
        ? (payload as { error: string }).error
        : "No se pudieron subir los PDFs";
    throw new Error(message);
  }

  const parsed = expenseEmailUploadResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Respuesta de subida inválida");
  }

  return parsed.data;
}
