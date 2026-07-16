export type TenantEmailContactType = "propietario" | "inquilino";

export type TenantEmail = {
  id: string;
  consortiumId: string;
  floor: string | null;
  departmentNumber: string | null;
  letter: string | null;
  email: string;
  contactType: TenantEmailContactType;
};

export type CreateTenantEmailInput = {
  consortiumId: string;
  floor?: string;
  departmentNumber?: string;
  letter?: string;
  email: string;
  contactType: TenantEmailContactType;
};

export type UpdateTenantEmailInput = {
  id: string;
  consortiumId: string;
  email: string;
  contactType: TenantEmailContactType;
};
