export function sanitizeDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function sanitizeLettersOnly(value: string): string {
  return value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, "");
}

/**
 * Floor values are either a numeric floor ("1", "12") or planta baja ("PB").
 * Progressive input: digits strip letters; starting with P/B builds toward "PB".
 */
export function sanitizeFloor(value: string): string {
  let out = "";

  for (const ch of value.toUpperCase()) {
    if (/\d/.test(ch)) {
      out = out === "P" || out === "PB" ? ch : `${out}${ch}`;
      continue;
    }

    if (ch === "P" && out === "") {
      out = "P";
      continue;
    }

    if (ch === "B" && out === "P") {
      out = "PB";
    }
  }

  return out;
}
