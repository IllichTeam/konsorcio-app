import { format, isValid, parseISO } from "date-fns";

function toValidDate(value: string | Date | null | undefined): Date | null {
  if (value == null || value === "") {
    return null;
  }

  const date = value instanceof Date ? value : parseISO(value);
  if (!isValid(date)) {
    return null;
  }

  return date;
}

/** User-facing calendar date: `DD/MM/YYYY` (e.g. `23/07/2026`). */
export function formatDate(value: string | Date | null | undefined): string {
  const date = toValidDate(value);
  if (!date) {
    return "—";
  }

  return format(date, "dd/MM/yyyy");
}

/** User-facing date+time: `DD/MM/YYYY HH:mm` in local timezone (e.g. `23/07/2026 09:12`). */
export function formatDateTime(value: string | Date | null | undefined): string {
  const date = toValidDate(value);
  if (!date) {
    return "—";
  }

  return format(date, "dd/MM/yyyy HH:mm");
}

/** History-style date+time with 12h clock: `23/07/2026 - 5:48 PM`. */
export function formatDateTimeAmPm(value: string | Date | null | undefined): string {
  const date = toValidDate(value);
  if (!date) {
    return "—";
  }

  return format(date, "dd/MM/yyyy - h:mm a");
}
