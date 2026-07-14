import type {
  Consorcio,
  ConsorcioDetail,
  ConsorcioHistoryEntry,
  CreateConsorcioCommentInput,
  UpdateConsorcioAmountInput,
} from "@/types/consorcio";

const MOCK_CONSORCIOS: ConsorcioDetail[] = [
  {
    id: "a",
    name: "Consorcio A",
    location: "Locatoria",
    amount: 125_500,
    paymentAlias: "alias_example",
    billingEmail: "email@example.com",
    driveLink: "http://drive.google.com",
  },
  {
    id: "b",
    name: "Consorcio B",
    location: "Locatoria",
    amount: 98_200,
    paymentAlias: "alias_b",
    billingEmail: "consorcio.b@example.com",
    driveLink: "http://drive.google.com/b",
  },
  {
    id: "c",
    name: "Consorcio C",
    location: "Locatoria",
    amount: 110_000,
    paymentAlias: "alias_c",
    billingEmail: "consorcio.c@example.com",
    driveLink: "http://drive.google.com/c",
  },
  {
    id: "d",
    name: "Consorcio D",
    location: "Locatoria",
    amount: 87_450,
    paymentAlias: "alias_d",
    billingEmail: "consorcio.d@example.com",
    driveLink: "http://drive.google.com/d",
  },
  {
    id: "e",
    name: "Consorcio E",
    location: "Locatoria",
    amount: 132_800,
    paymentAlias: "alias_e",
    billingEmail: "consorcio.e@example.com",
    driveLink: "http://drive.google.com/e",
  },
];

const MOCK_HISTORY: Record<string, ConsorcioHistoryEntry[]> = {
  a: [
    {
      id: 1,
      timestamp: "23/10/2023 09:15",
      description: "Cambio de Monto a $125,500 by Admin Name",
    },
    {
      id: 2,
      timestamp: "22/10/2023 16:30",
      description: "Actualización de Link del drive by User 2",
    },
    {
      id: 3,
      timestamp: "22/10/2023 11:10",
      description: "Nuevo Alias de Cobro asignado by Admin Name",
    },
    { id: 4, timestamp: "21/10/2023 18:00", description: "Envío de Formulario Mensual exitoso" },
    {
      id: 5,
      timestamp: "20/10/2023 10:45",
      description: "Comentario rápido enviado by Admin Name",
    },
    {
      id: 6,
      timestamp: "19/10/2023 14:20",
      description: "Actualización de Email de contacto by User 2",
    },
  ],
};

/** Lista consorcios del administrador. Sustituir por fetch('/api/consorcios') o query Drizzle. */
export async function getConsorcios(): Promise<Consorcio[]> {
  return MOCK_CONSORCIOS.map(({ id, name, location }) => ({ id, name, location }));
}

/** Detalle de un consorcio. Sustituir por fetch(`/api/consorcios/${id}`). */
export async function getConsorcioById(id: string): Promise<ConsorcioDetail | null> {
  return MOCK_CONSORCIOS.find((consorcio) => consorcio.id === id) ?? null;
}

/** Historial de acciones. Sustituir por fetch(`/api/consorcios/${id}/history`). */
export async function getConsorcioHistory(id: string): Promise<ConsorcioHistoryEntry[]> {
  return MOCK_HISTORY[id] ?? [];
}

/** Envía comentario rápido. Sustituir por POST /api/consorcios/:id/comments. */
export async function createConsorcioComment(input: CreateConsorcioCommentInput): Promise<void> {
  void input;
  // TODO: persistir comentario en base de datos.
}

/** Actualiza monto de caja. Sustituir por PATCH /api/consorcios/:id/amount. */
export async function updateConsorcioAmount(
  input: UpdateConsorcioAmountInput,
): Promise<ConsorcioDetail> {
  const consorcio = MOCK_CONSORCIOS.find((item) => item.id === input.consorcioId);

  if (!consorcio) {
    throw new Error("Consorcio no encontrado");
  }

  consorcio.amount = input.amount;
  return { ...consorcio };
}
