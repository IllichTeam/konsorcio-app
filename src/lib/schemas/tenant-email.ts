import { z } from "@/lib/zod";

export const contactTypeSchema = z.enum(["propietario", "inquilino"]);

export const tenantEmailDtoSchema = z.object({
  id: z.string().uuid(),
  consortiumId: z.string().uuid(),
  floor: z.string().nullable(),
  departmentNumber: z.string().nullable(),
  letter: z.string().nullable(),
  email: z.email("Correo inválido"),
  contactType: contactTypeSchema,
});

export const listByConsortiumInputSchema = z.object({
  consortiumId: z.string().uuid(),
});

export const createTenantEmailInputSchema = z.object({
  consortiumId: z.string().uuid(),
  floor: z.string().optional(),
  departmentNumber: z.string().optional(),
  letter: z.string().optional(),
  email: z.email("Correo inválido"),
  contactType: contactTypeSchema,
});

export const updateTenantEmailInputSchema = z.object({
  id: z.string().uuid(),
  consortiumId: z.string().uuid(),
  email: z.email("Correo inválido"),
  contactType: contactTypeSchema,
});

export const tenantEmailIdInputSchema = z.object({
  id: z.string().uuid(),
  consortiumId: z.string().uuid(),
});

export type TenantEmailContactType = z.infer<typeof contactTypeSchema>;
export type TenantEmail = z.infer<typeof tenantEmailDtoSchema>;
export type CreateTenantEmailInput = z.infer<typeof createTenantEmailInputSchema>;
export type UpdateTenantEmailInput = z.infer<typeof updateTenantEmailInputSchema>;
