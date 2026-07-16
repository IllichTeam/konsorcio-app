import { z } from "@/lib/zod";

/** Fields shared by create/update forms and API payloads. */
export const consortiumWriteSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  location: z.string().min(1, "La ubicación es obligatoria"),
  paymentAlias: z.string().min(1, "El alias de cobro es obligatorio"),
  billingEmail: z.email("Correo inválido"),
  driveLink: z.string().min(1, "El link de drive es obligatorio"),
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

/** List card shape. */
export const consortiumListItemSchema = z.object({
  id: z.string().uuid(),
  name: z.string(),
  location: z.string(),
});

/** Full detail returned by byId / mutations. */
export const consortiumDetailSchema = consortiumListItemSchema.extend({
  amount: z.number().int(),
  paymentAlias: z.string(),
  billingEmail: z.string(),
  driveLink: z.string(),
});

export type CreateConsortiumInput = z.infer<typeof createConsortiumInputSchema>;
export type UpdateConsortiumInput = z.infer<typeof updateConsortiumInputSchema>;
export type UpdateConsortiumAmountInput = z.infer<typeof updateConsortiumAmountInputSchema>;
export type ConsortiumListItem = z.infer<typeof consortiumListItemSchema>;
export type ConsortiumDetailDto = z.infer<typeof consortiumDetailSchema>;
