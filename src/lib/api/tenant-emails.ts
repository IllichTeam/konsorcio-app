import type {
  CreateTenantEmailInput,
  TenantEmail,
  UpdateTenantEmailInput,
} from "@/types/tenant-email";
import { normalizeUnitFields } from "@/lib/tenant-email/format-unit";

const MOCK_TENANT_EMAILS: TenantEmail[] = [
  {
    id: "te-1",
    consorcioId: "a",
    floor: "1",
    departmentNumber: null,
    letter: "A",
    email: "juan.perez@example.com",
    contactType: "propietario",
  },
  {
    id: "te-2",
    consorcioId: "a",
    floor: "1",
    departmentNumber: null,
    letter: "A",
    email: "inquilino.1a@example.com",
    contactType: "inquilino",
  },
  {
    id: "te-3",
    consorcioId: "a",
    floor: "3",
    departmentNumber: "2",
    letter: "B",
    email: "maria.gomez@example.com",
    contactType: "inquilino",
  },
  {
    id: "te-4",
    consorcioId: "a",
    floor: "4",
    departmentNumber: "1",
    letter: null,
    email: "luis.lopez@example.com",
    contactType: "propietario",
  },
  {
    id: "te-5",
    consorcioId: "a",
    floor: "PB",
    departmentNumber: "1",
    letter: null,
    email: "ana.rodriguez@example.com",
    contactType: "inquilino",
  },
  {
    id: "te-6",
    consorcioId: "a",
    floor: "2",
    departmentNumber: "3",
    letter: null,
    email: "carlos.martinez@example.com",
    contactType: "propietario",
  },
  {
    id: "te-7",
    consorcioId: "a",
    floor: "5",
    departmentNumber: "4",
    letter: "C",
    email: "sofia.fernandez@example.com",
    contactType: "inquilino",
  },
  {
    id: "te-8",
    consorcioId: "b",
    floor: "1",
    departmentNumber: "1",
    letter: null,
    email: "contacto.b@example.com",
    contactType: "propietario",
  },
];

/** Lista emails de inquilinos de un consorcio. Sustituir por fetch o query Drizzle. */
export async function getTenantEmails(consorcioId: string): Promise<TenantEmail[]> {
  return MOCK_TENANT_EMAILS.filter((entry) => entry.consorcioId === consorcioId).map((entry) => ({
    ...entry,
  }));
}

/** Crea un email de unidad funcional. Sustituir por POST. */
export async function createTenantEmail(input: CreateTenantEmailInput): Promise<TenantEmail> {
  const unit = normalizeUnitFields(input);

  const newEntry: TenantEmail = {
    id: crypto.randomUUID(),
    consorcioId: input.consorcioId,
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
    (item) => item.id === input.id && item.consorcioId === input.consorcioId,
  );

  if (!entry) {
    throw new Error("Email no encontrado");
  }

  entry.email = input.email;
  entry.contactType = input.contactType;

  return { ...entry };
}

/** Elimina un email. Sustituir por DELETE. */
export async function deleteTenantEmail(consorcioId: string, id: string): Promise<void> {
  const index = MOCK_TENANT_EMAILS.findIndex(
    (item) => item.id === id && item.consorcioId === consorcioId,
  );

  if (index === -1) {
    throw new Error("Email no encontrado");
  }

  MOCK_TENANT_EMAILS.splice(index, 1);
}

/** Elimina todos los emails de un consorcio. Usado al borrar el consorcio. */
export async function deleteTenantEmailsByConsorcioId(consorcioId: string): Promise<void> {
  for (let index = MOCK_TENANT_EMAILS.length - 1; index >= 0; index -= 1) {
    if (MOCK_TENANT_EMAILS[index]?.consorcioId === consorcioId) {
      MOCK_TENANT_EMAILS.splice(index, 1);
    }
  }
}
