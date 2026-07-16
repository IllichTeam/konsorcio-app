import type {
  CreateTenantEmailInput,
  TenantEmail,
  UpdateTenantEmailInput,
} from "@/types/tenant-email";
import { normalizeUnitFields } from "@/lib/tenant-email/format-unit";

const MOCK_TENANT_EMAILS: TenantEmail[] = [
  {
    id: "te-1",
    consortiumId: "a",
    floor: "1",
    departmentNumber: null,
    letter: "A",
    email: "juan.perez@example.com",
    contactType: "propietario",
  },
  {
    id: "te-2",
    consortiumId: "a",
    floor: "1",
    departmentNumber: null,
    letter: "A",
    email: "inquilino.1a@example.com",
    contactType: "inquilino",
  },
  {
    id: "te-3",
    consortiumId: "a",
    floor: "3",
    departmentNumber: "2",
    letter: "B",
    email: "maria.gomez@example.com",
    contactType: "inquilino",
  },
  {
    id: "te-4",
    consortiumId: "a",
    floor: "4",
    departmentNumber: "1",
    letter: null,
    email: "luis.lopez@example.com",
    contactType: "propietario",
  },
  {
    id: "te-5",
    consortiumId: "a",
    floor: "PB",
    departmentNumber: "1",
    letter: null,
    email: "ana.rodriguez@example.com",
    contactType: "inquilino",
  },
  {
    id: "te-6",
    consortiumId: "a",
    floor: "2",
    departmentNumber: "3",
    letter: null,
    email: "carlos.martinez@example.com",
    contactType: "propietario",
  },
  {
    id: "te-7",
    consortiumId: "a",
    floor: "5",
    departmentNumber: "4",
    letter: "C",
    email: "sofia.fernandez@example.com",
    contactType: "inquilino",
  },
  {
    id: "te-8",
    consortiumId: "b",
    floor: "1",
    departmentNumber: "1",
    letter: null,
    email: "contacto.b@example.com",
    contactType: "propietario",
  },
];

/** Lista tenant emails for a consortium. Sustituir por fetch o query Drizzle. */
export async function getTenantEmails(consortiumId: string): Promise<TenantEmail[]> {
  return MOCK_TENANT_EMAILS.filter((entry) => entry.consortiumId === consortiumId).map((entry) =>
    Object.assign({}, entry),
  );
}

/** Crea un email de unidad funcional. Sustituir por POST. */
export async function createTenantEmail(input: CreateTenantEmailInput): Promise<TenantEmail> {
  const unit = normalizeUnitFields(input);

  const newEntry: TenantEmail = {
    id: crypto.randomUUID(),
    consortiumId: input.consortiumId,
    floor: unit.floor,
    departmentNumber: unit.departmentNumber,
    letter: unit.letter,
    email: input.email,
    contactType: input.contactType,
  };

  MOCK_TENANT_EMAILS.push(newEntry);
  return { ...newEntry };
}

/** Actualiza email y tipo de contacto. Sustituir por PATCH. */
export async function updateTenantEmail(input: UpdateTenantEmailInput): Promise<TenantEmail> {
  const entry = MOCK_TENANT_EMAILS.find(
    (item) => item.id === input.id && item.consortiumId === input.consortiumId,
  );

  if (!entry) {
    throw new Error("Tenant email not found");
  }

  entry.email = input.email;
  entry.contactType = input.contactType;

  return { ...entry };
}

/** Elimina un email. Sustituir por DELETE. */
export async function deleteTenantEmail(consortiumId: string, id: string): Promise<void> {
  const index = MOCK_TENANT_EMAILS.findIndex(
    (item) => item.id === id && item.consortiumId === consortiumId,
  );

  if (index === -1) {
    throw new Error("Tenant email not found");
  }

  MOCK_TENANT_EMAILS.splice(index, 1);
}

/** Deletes all tenant emails for a consortium. Usado when deleting the consortium. */
export async function deleteTenantEmailsByConsortiumId(consortiumId: string): Promise<void> {
  for (let index = MOCK_TENANT_EMAILS.length - 1; index >= 0; index -= 1) {
    if (MOCK_TENANT_EMAILS[index]?.consortiumId === consortiumId) {
      MOCK_TENANT_EMAILS.splice(index, 1);
    }
  }
}
