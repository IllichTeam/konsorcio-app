import { z } from "@/lib/zod";

/** Max PDFs per expense send (SPEC C5). */
export const EXPENSE_EMAIL_MAX_ATTACHMENTS = 3;

/** Max bytes per PDF (5 MB). */
export const EXPENSE_EMAIL_MAX_ATTACHMENT_BYTES = 5 * 1024 * 1024;

/** Fixed subject for monthly expense emails. */
export const EXPENSE_EMAIL_SUBJECT = "Expensa Mensual";

/** Storage bucket name (private). */
export const EXPENSE_EMAIL_STORAGE_BUCKET = "expense-emails";

/**
 * Logical prefix for `storagePath` values (docs / DB / API).
 * Object key inside the bucket is `{consortiumId}/{sendId}/{filename}` —
 * do **not** put the bucket name again in the object key.
 * Canonical storagePath: `expense-emails/{consortiumId}/{sendId}/{filename}`.
 */
export const EXPENSE_EMAIL_STORAGE_PATH_PREFIX = "expense-emails";

/** PDF retention in days (cleanup job / lifecycle — see STORAGE.md). */
export const EXPENSE_EMAIL_RETENTION_DAYS = 60;

/**
 * Signed URL TTL for Resend fan-out + retry (private bucket).
 * Long enough for the full send run — not a short 60s window.
 */
export const EXPENSE_EMAIL_SIGNED_URL_TTL_SECONDS = 6 * 60 * 60;

/**
 * A send stuck in `sending` is reclaimable after this window (crash / timeout).
 * Also used by the status UI to stop polling a stale runner.
 */
export const EXPENSE_EMAIL_STALE_SENDING_MS = 2 * 60 * 1000;

/**
 * Drive / payment link from UI or DB (`string`), empty allowed.
 * Use a plain string + refine so callers with `string` props type-check
 * (a `z.url()` union brands the input and collapses tRPC query data to `never`).
 */
export const expenseEmailOptionalLinkUrlSchema = z
  .string()
  .refine((value) => value === "" || URL.canParse(value), {
    message: "URL inválida",
  })
  .optional();

export const expenseEmailSendStatusSchema = z.enum([
  "queued",
  "sending",
  "sent",
  "partial",
  "failed",
]);

export const expenseEmailRecipientStatusSchema = z.enum(["pending", "sent", "failed"]);

/** Metadata for one PDF stored in Supabase Storage (no binary). */
export const expenseEmailAttachmentRefSchema = z.object({
  storagePath: z.string().min(1),
  filename: z.string().min(1),
  sizeBytes: z.number().int().positive().max(EXPENSE_EMAIL_MAX_ATTACHMENT_BYTES),
});

/**
 * Input to create a monthly expense send (Fase 3+).
 * UI maqueta envía siempre todos los tenant emails; el contrato sigue
 * aceptando la lista explícita para validación server-side.
 *
 * `sendId` **must** be the reserved UUID returned by
 * `POST /api/expense-emails/upload` (Fase 2) — Phase 3 inserts the send row
 * with that primary key and must reject attachment refs outside
 * `expense-emails/{consortiumId}/{sendId}/`.
 */
export const createExpenseEmailSendInputSchema = z.object({
  consortiumId: z.string().uuid(),
  /** Reserved id from PDF upload; becomes `expense_email_sends.id`. */
  sendId: z.string().uuid(),
  /** Recipient emails from this consortium's `tenant_emails`. */
  recipients: z.array(z.email()).min(1, "Selecciona al menos un destinatario"),
  message: z.string().trim().min(1, "El mensaje es obligatorio"),
  /** Drive / payment link; empty or omitted is allowed. */
  linkUrl: expenseEmailOptionalLinkUrlSchema,
  attachmentRefs: z
    .array(expenseEmailAttachmentRefSchema)
    .min(1, "Adjuntá al menos un PDF")
    .max(EXPENSE_EMAIL_MAX_ATTACHMENTS, "Máximo 3 PDFs"),
});

/**
 * Response from `POST /api/expense-emails/upload`.
 * `attachments` matches `expenseEmailAttachmentRefSchema` (Fase 0).
 */
export const expenseEmailUploadResponseSchema = z.object({
  sendId: z.string().uuid(),
  attachments: z.array(expenseEmailAttachmentRefSchema).min(1).max(EXPENSE_EMAIL_MAX_ATTACHMENTS),
});

export const expenseEmailSendIdInputSchema = z.object({
  consortiumId: z.string().uuid(),
  sendId: z.string().uuid(),
});

/** Quick ack from create / retry — fan-out continues in background. */
export const expenseEmailSendIdResultSchema = z.object({
  sendId: z.string().uuid(),
});

/**
 * Server-side HTML preview of the same React Email template used on send.
 * Alias / consortium name come from the accessible consortium row.
 */
export const previewExpenseEmailInputSchema = z.object({
  consortiumId: z.string().uuid(),
  message: z.string().trim().min(1, "El mensaje es obligatorio"),
  /** Drive / payment link; empty string hides the link row. */
  linkUrl: expenseEmailOptionalLinkUrlSchema,
  attachmentNames: z
    .array(z.string().min(1))
    .max(EXPENSE_EMAIL_MAX_ATTACHMENTS, "Máximo 3 PDFs")
    .optional()
    .default([]),
});

export const previewExpenseEmailResultSchema = z.object({
  html: z.string().min(1),
});

/** Recent expense sends for a consortium (historial UI — Fase 5). */
export const listExpenseEmailSendsInputSchema = z.object({
  consortiumId: z.string().uuid(),
  limit: z.number().int().min(1).max(50).default(20),
});

/**
 * Serialized send row safe to cross the wire without a data transformer.
 * Timestamps are ISO-8601 strings.
 */
export const expenseEmailSendDtoSchema = z.object({
  id: z.string().uuid(),
  consortiumId: z.string().uuid(),
  /** Per-consortium sequential display number (unpadded in UI). */
  sendNumber: z.number().int().positive(),
  subject: z.string(),
  body: z.string(),
  linkUrl: z.string().nullable(),
  status: expenseEmailSendStatusSchema,
  attachmentRefs: z.array(expenseEmailAttachmentRefSchema),
  sentByUserId: z.string().nullable(),
  /** Display name from `user.name` when the sender row still exists. */
  sentByUserName: z.string().nullable(),
  recipientCount: z.number().int().nonnegative(),
  sentCount: z.number().int().nonnegative(),
  failedCount: z.number().int().nonnegative(),
  createdAt: z.string(),
  finishedAt: z.string().nullable(),
});

export const expenseEmailRecipientDtoSchema = z.object({
  id: z.string().uuid(),
  sendId: z.string().uuid(),
  email: z.email(),
  status: expenseEmailRecipientStatusSchema,
  resendId: z.string().nullable(),
  error: z.string().nullable(),
  attempts: z.number().int().nonnegative(),
  lastAttemptAt: z.string().nullable(),
});

/** Status screen payload: send summary + per-recipient rows. */
export const expenseEmailSendDetailDtoSchema = z.object({
  send: expenseEmailSendDtoSchema,
  recipients: z.array(expenseEmailRecipientDtoSchema),
});

export type ExpenseEmailSendStatus = z.infer<typeof expenseEmailSendStatusSchema>;
export type ExpenseEmailRecipientStatus = z.infer<typeof expenseEmailRecipientStatusSchema>;
export type ExpenseEmailAttachmentRef = z.infer<typeof expenseEmailAttachmentRefSchema>;
export type CreateExpenseEmailSendInput = z.infer<typeof createExpenseEmailSendInputSchema>;
export type ExpenseEmailUploadResponse = z.infer<typeof expenseEmailUploadResponseSchema>;
export type ExpenseEmailSendIdInput = z.infer<typeof expenseEmailSendIdInputSchema>;
export type ExpenseEmailSendIdResult = z.infer<typeof expenseEmailSendIdResultSchema>;
export type PreviewExpenseEmailInput = z.infer<typeof previewExpenseEmailInputSchema>;
export type PreviewExpenseEmailResult = z.infer<typeof previewExpenseEmailResultSchema>;
export type ListExpenseEmailSendsInput = z.infer<typeof listExpenseEmailSendsInputSchema>;
export type ExpenseEmailSendDto = z.infer<typeof expenseEmailSendDtoSchema>;
export type ExpenseEmailRecipientDto = z.infer<typeof expenseEmailRecipientDtoSchema>;
export type ExpenseEmailSendDetailDto = z.infer<typeof expenseEmailSendDetailDtoSchema>;
