export type TenantEmailContactType = "propietario" | "inquilino";

export type TenantEmail = {
  id: string;
  consorcioId: string;
  floor: string | null;
  departmentNumber: string | null;
  letter: string | null;
  email: string;
  contactType: TenantEmailContactType;
};

export type CreateTenantEmailInput = {
  consorcioId: string;
  floor?: string;
  departmentNumber?: string;
  letter?: string;
  email: string;
  contactType: TenantEmailContactType;
};

export type UpdateTenantEmailInput = {
  id: string;
  consorcioId: string;
  email: string;
  contactType: TenantEmailContactType;
};
