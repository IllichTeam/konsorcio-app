import { z } from "@/lib/zod";

/** Single email recipient used by send APIs and forms. */
export const recipientSchema = z.object({
  email: z.email(),
  name: z.string().optional(),
});

/**
 * Input for sending a notification email.
 * Shared by the Notificaciones form and the emails.send procedure.
 */
export const sendEmailInputSchema = z.object({
  subject: z.string().min(1, "El asunto es obligatorio"),
  body: z.string().min(1, "El mensaje es obligatorio"),
  recipients: z.array(recipientSchema).min(1, "Selecciona al menos un destinatario"),
});

/** Public send outcome returned to the client (excludes provider ids). */
export const sendEmailResultSchema = z.object({
  status: z.enum(["sent", "partial", "failed"]),
  sent: z.number().int().nonnegative(),
  failed: z.number().int().nonnegative(),
});

/** Candidate recipient for the email composer (app users). */
export const emailRecipientOptionSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.email(),
});

/**
 * Serialized email log row safe to cross the wire without a data transformer.
 * `createdAt` is an ISO-8601 string.
 */
export const emailLogSchema = z.object({
  id: z.string().uuid(),
  subject: z.string(),
  body: z.string(),
  recipients: z.array(recipientSchema),
  recipientCount: z.number().int(),
  status: z.string(),
  resendIds: z.array(z.string()).nullable(),
  error: z.string().nullable(),
  sentByUserId: z.string().nullable(),
  createdAt: z.string(),
});

export type Recipient = z.infer<typeof recipientSchema>;
export type SendEmailInput = z.infer<typeof sendEmailInputSchema>;
export type SendEmailClientResult = z.infer<typeof sendEmailResultSchema>;
export type EmailRecipientOption = z.infer<typeof emailRecipientOptionSchema>;
export type EmailLogDto = z.infer<typeof emailLogSchema>;
