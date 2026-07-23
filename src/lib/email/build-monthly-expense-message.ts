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

/**
 * Automatic monthly expense body for UI + create mutation.
 * Does **not** include "Hola Vecino/a," — the React Email template owns that greeting.
 */
export function buildMonthlyExpenseMessage(consortiumName: string, date = new Date()): string {
  const month = MONTHS_ES[date.getMonth()];
  const year = date.getFullYear();
  return `Nos complace acercarle las expensas mensuales del consorcio ${consortiumName.trim()} correspondientes a ${month} de ${year}.`;
}
