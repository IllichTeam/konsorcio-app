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
});

/** List card + edit-form shape (amount stays on detail only). */
export const consortiumListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.string(),
  paymentAlias: z.string().nullable(),
  billingEmail: z.string().nullable(),
  driveLink: z.string().nullable(),
});

/** Full detail returned by byId / mutations. */
export const consortiumDetailSchema = consortiumListItemSchema.extend({
  amount: z.number().int(),
});

export type CreateConsortiumInput = z.infer<typeof createConsortiumInputSchema>;
export type UpdateConsortiumInput = z.infer<typeof updateConsortiumInputSchema>;
export type UpdateConsortiumAmountInput = z.infer<typeof updateConsortiumAmountInputSchema>;
export type SendConsortiumCommentInput = z.infer<typeof sendConsortiumCommentInputSchema>;
export type ConsortiumListItem = z.infer<typeof consortiumListItemSchema>;
export type ConsortiumDetailDto = z.infer<typeof consortiumDetailSchema>;
