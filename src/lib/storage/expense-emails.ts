import "server-only";

import {
  EXPENSE_EMAIL_SIGNED_URL_TTL_SECONDS,
  EXPENSE_EMAIL_STORAGE_BUCKET,
  EXPENSE_EMAIL_STORAGE_PATH_PREFIX,
  type ExpenseEmailAttachmentRef,
} from "@/lib/schemas/expense-email";

import { getSupabaseAdminClient } from "./supabase-admin";

/**
 * Object key inside the bucket (no bucket name):
 * `{consortiumId}/{sendId}/{safeFilename}`
 */
export function buildExpenseEmailObjectKey(
  consortiumId: string,
  sendId: string,
  objectFilename: string,
): string {
  return `${consortiumId}/${sendId}/${objectFilename}`;
}

/**
 * Canonical `storagePath` stored in DB / returned by upload:
 * `expense-emails/{consortiumId}/{sendId}/{safeFilename}`
 *
 * The bucket name is the logical prefix only — it must not be duplicated
 * again inside the Supabase object key.
 */
export function buildExpenseEmailStoragePath(
  consortiumId: string,
  sendId: string,
  objectFilename: string,
): string {
  return `${EXPENSE_EMAIL_STORAGE_PATH_PREFIX}/${buildExpenseEmailObjectKey(consortiumId, sendId, objectFilename)}`;
}

/** Strip the logical prefix so Storage APIs receive the object key only. */
export function storagePathToObjectKey(storagePath: string): string {
  const prefix = `${EXPENSE_EMAIL_STORAGE_PATH_PREFIX}/`;
  if (storagePath.startsWith(prefix)) {
    return storagePath.slice(prefix.length);
  }
  return storagePath;
}

/**
 * Ensures a ref belongs to this consortium + reserved send id.
 * Phase 3 must call this before inserting `expense_email_sends`.
 *
 * Expected shape: `expense-emails/{consortiumId}/{sendId}/{filename}`
 * (exactly four `/`-separated segments after normalization; no `..`).
 */
export function isAttachmentRefForSend(
  ref: Pick<ExpenseEmailAttachmentRef, "storagePath">,
  consortiumId: string,
  sendId: string,
): boolean {
  const path = ref.storagePath.trim();
  if (!path || path.includes("..") || path.includes("\\")) {
    return false;
  }

  const expectedPrefix = `${EXPENSE_EMAIL_STORAGE_PATH_PREFIX}/${consortiumId}/${sendId}/`;
  if (!path.startsWith(expectedPrefix)) {
    return false;
  }

  const remainder = path.slice(expectedPrefix.length);
  if (!remainder || remainder.includes("/")) {
    return false;
  }

  return true;
}

/**
 * Sanitize a user-facing filename for use as an object key segment.
 * Returns a safe unique name; the original display name is kept separately
 * in attachment metadata (`filename`).
 */
export function sanitizeExpenseEmailObjectFilename(
  originalFilename: string,
  usedObjectNames: Set<string>,
): string {
  const leaf = originalFilename.split(/[/\\]/).pop()?.trim() || "archivo.pdf";
  let name = [...leaf]
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code >= 32 && code !== 127;
    })
    .join("")
    .replace(/[^\w.\-ÁÉÍÓÚÜÑáéíóúüñ ]+/gi, "_")
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");

  if (!name.toLowerCase().endsWith(".pdf")) {
    name = `${name || "archivo"}.pdf`;
  }

  if (name.length <= 4 || name.toLowerCase() === ".pdf") {
    name = "archivo.pdf";
  }

  const maxLen = 180;
  if (name.length > maxLen) {
    name = `${name.slice(0, maxLen - 4)}.pdf`;
  }

  let candidate = name;
  let n = 2;
  while (usedObjectNames.has(candidate.toLowerCase())) {
    const stem = name.slice(0, -4);
    candidate = `${stem}-${n}.pdf`;
    n += 1;
  }

  usedObjectNames.add(candidate.toLowerCase());
  return candidate;
}

/** Display filename kept in metadata (path segments stripped, empty → fallback). */
export function normalizeDisplayFilename(originalFilename: string): string {
  const leaf = originalFilename.split(/[/\\]/).pop()?.trim();
  return leaf && leaf.length > 0 ? leaf : "archivo.pdf";
}

export async function isPdfFile(file: File): Promise<boolean> {
  if (file.type && file.type !== "application/pdf" && file.type !== "application/x-pdf") {
    return false;
  }

  const header = new Uint8Array(await file.slice(0, 5).arrayBuffer());
  if (header.length < 4) {
    return false;
  }

  return header[0] === 0x25 && header[1] === 0x50 && header[2] === 0x44 && header[3] === 0x46;
}

export type UploadExpenseEmailPdfsParams = {
  consortiumId: string;
  /** Reserved send UUID — Phase 3 must reuse as `expense_email_sends.id`. */
  sendId: string;
  files: File[];
};

/**
 * Uploads 1–3 PDFs to the private `expense-emails` bucket.
 * Caller must already authenticate and verify consortium access.
 */
export async function uploadExpenseEmailPdfs(
  params: UploadExpenseEmailPdfsParams,
): Promise<ExpenseEmailAttachmentRef[]> {
  const { consortiumId, sendId, files } = params;
  const supabase = getSupabaseAdminClient();
  const usedNames = new Set<string>();
  const refs: ExpenseEmailAttachmentRef[] = [];

  for (const file of files) {
    const objectFilename = sanitizeExpenseEmailObjectFilename(file.name, usedNames);
    const objectKey = buildExpenseEmailObjectKey(consortiumId, sendId, objectFilename);
    const storagePath = buildExpenseEmailStoragePath(consortiumId, sendId, objectFilename);
    const buffer = Buffer.from(await file.arrayBuffer());

    const { error } = await supabase.storage
      .from(EXPENSE_EMAIL_STORAGE_BUCKET)
      .upload(objectKey, buffer, {
        contentType: "application/pdf",
        upsert: false,
      });

    if (error) {
      throw new Error(`Storage upload failed: ${error.message}`);
    }

    refs.push({
      storagePath,
      filename: normalizeDisplayFilename(file.name),
      sizeBytes: file.size,
    });
  }

  return refs;
}

/**
 * Creates a signed URL for a stored PDF (bucket stays private).
 * TTL defaults to `EXPENSE_EMAIL_SIGNED_URL_TTL_SECONDS` (fan-out + retry).
 */
export async function createExpenseEmailSignedUrl(
  storagePath: string,
  expiresInSeconds: number = EXPENSE_EMAIL_SIGNED_URL_TTL_SECONDS,
): Promise<string> {
  const supabase = getSupabaseAdminClient();
  const objectKey = storagePathToObjectKey(storagePath);

  const { data, error } = await supabase.storage
    .from(EXPENSE_EMAIL_STORAGE_BUCKET)
    .createSignedUrl(objectKey, expiresInSeconds);

  if (error || !data?.signedUrl) {
    throw new Error(`Signed URL failed: ${error?.message ?? "missing url"}`);
  }

  return data.signedUrl;
}

/** Signed URLs for every attachment ref (same TTL). */
export async function createExpenseEmailSignedUrls(
  refs: Pick<ExpenseEmailAttachmentRef, "storagePath">[],
  expiresInSeconds: number = EXPENSE_EMAIL_SIGNED_URL_TTL_SECONDS,
): Promise<{ storagePath: string; signedUrl: string }[]> {
  return Promise.all(
    refs.map(async (ref) => ({
      storagePath: ref.storagePath,
      signedUrl: await createExpenseEmailSignedUrl(ref.storagePath, expiresInSeconds),
    })),
  );
}
