import { recipientSchema } from "@/lib/schemas/email";
import { expenseEmailSendStatusSchema } from "@/lib/schemas/expense-email";
import { z } from "@/lib/zod";

/** Fields shared by create/update forms and API payloads. */
export const consortiumWriteSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  location: z.string().min(1, "La ubicación es obligatoria"),
  paymentAlias: z.string().nullable(),
  billingEmail: z.email("Correo inválido").nullable(),
  driveLink: z.string().nullable(),
});

export const createConsortiumInputSchema = consortiumWriteSchema;

export const updateConsortiumInputSchema = consortiumWriteSchema.extend({
  id: z.string().uuid(),
});

export const updateConsortiumAmountInputSchema = z.object({
  id: z.string().uuid(),
  amount: z.number().int().positive("El monto debe ser mayor a cero"),
});

export const consortiumIdInputSchema = z.object({
  id: z.string().uuid(),
});

/** Send a comment email for a consortium card. */
export const sendConsortiumCommentInputSchema = z.object({
  id: z.string().uuid(),
  message: z.string().trim().min(1, "Escribe un comentario"),
  recipients: z.array(recipientSchema).min(1, "Selecciona al menos un destinatario"),
});

/** Shared identity / contact fields for consortium DTOs. */
const consortiumBaseSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.string(),
  paymentAlias: z.string().nullable(),
  billingEmail: z.string().nullable(),
  driveLink: z.string().nullable(),
});

/** List card + edit-form shape (amount stays on detail only). */
export const consortiumListItemSchema = consortiumBaseSchema.extend({
  /** Distinct functional units (floor/dept/letter) across active tenant emails. */
  unitCount: z.number().int().nonnegative(),
  /** Active tenant-email contacts (propietario + inquilino). */
  contactCount: z.number().int().nonnegative(),
});

/** Full detail returned by byId / mutations. */
export const consortiumDetailSchema = consortiumBaseSchema.extend({
  amount: z.number().int(),
});

/** Curated action-history event types (v1). */
export const consortiumActivityTypeSchema = z.enum([
  "expense_sent",
  "notification_sent",
  "drive_link_updated",
  "consortium_updated",
  "amount_updated",
]);

/** Optional metadata stored with a history row; fields depend on `type`. */
export const consortiumActivityPayloadSchema = z.object({
  sendId: z.string().uuid().optional(),
  sendNumber: z.number().int().optional(),
  recipientCount: z.number().int().optional(),
  subject: z.string().optional(),
  messagePreview: z.string().optional(),
  previousDriveLink: z.string().nullable().optional(),
  newDriveLink: z.string().nullable().optional(),
  fieldsChanged: z.array(z.string()).optional(),
  previousAmount: z.number().int().optional(),
  newAmount: z.number().int().optional(),
});

/** Action-history row from `consortium_activities`. */
export const consortiumHistoryEntrySchema = z.object({
  id: z.string().uuid(),
  type: consortiumActivityTypeSchema,
  /** Spanish summary stored at write time. */
  summary: z.string(),
  /** ISO-8601 timestamp. */
  timestamp: z.string(),
  payload: consortiumActivityPayloadSchema,
  /**
   * Live expense-send status when `type === "expense_sent"` and the send still
   * exists. Omitted / undefined when unknown (non-expense rows or missing send).
   */
  sendStatus: expenseEmailSendStatusSchema.optional(),
});

export const consortiumHistoryInputSchema = consortiumIdInputSchema.extend({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(1).max(50).default(10),
});

export const consortiumHistoryPageSchema = z.object({
  items: z.array(consortiumHistoryEntrySchema),
  total: z.number().int().nonnegative(),
});

export type ConsortiumActivityType = z.infer<typeof consortiumActivityTypeSchema>;
export type ConsortiumActivityPayload = z.infer<typeof consortiumActivityPayloadSchema>;

export type CreateConsortiumInput = z.infer<typeof createConsortiumInputSchema>;
export type UpdateConsortiumInput = z.infer<typeof updateConsortiumInputSchema>;
export type UpdateConsortiumAmountInput = z.infer<typeof updateConsortiumAmountInputSchema>;
export type SendConsortiumCommentInput = z.infer<typeof sendConsortiumCommentInputSchema>;
export type ConsortiumListItem = z.infer<typeof consortiumListItemSchema>;
export type ConsortiumDetailDto = z.infer<typeof consortiumDetailSchema>;
export type ConsortiumHistoryEntry = z.infer<typeof consortiumHistoryEntrySchema>;
export type ConsortiumHistoryInput = z.infer<typeof consortiumHistoryInputSchema>;
export type ConsortiumHistoryPage = z.infer<typeof consortiumHistoryPageSchema>;
