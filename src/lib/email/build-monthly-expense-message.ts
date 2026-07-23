const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/** Spanish month + year for the dedicated period line in the expense email. */
export function formatExpensePeriod(date = new Date()): string {
  const month = MONTHS_ES[date.getMonth()];
  const year = date.getFullYear();
  return `${month} de ${year}`;
}

/**
 * Automatic monthly expense body for UI + create mutation.
 * Does **not** include "Hola Vecino/a," — the React Email template owns that greeting.
 * Does **not** include month/year — the template renders that via `formatExpensePeriod`.
 */
export function buildMonthlyExpenseMessage(consortiumName: string): string {
  return `Nos complace acercarle las expensas mensuales del consorcio ${consortiumName.trim()}.`;
}
