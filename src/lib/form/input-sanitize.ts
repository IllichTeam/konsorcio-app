export function sanitizeDigitsOnly(value: string): string {
  return value.replace(/\D/g, "");
}

export function sanitizeLettersOnly(value: string): string {
  return value.replace(/[^A-Za-zÁÉÍÓÚáéíóúÑñ]/g, "");
}
