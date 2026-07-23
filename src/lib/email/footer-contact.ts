/**
 * Sender contact shown in outbound email footers (profile fields).
 */
export type EmailSenderContact = {
  address?: string | null;
  phone?: string | null;
  postalCode?: string | null;
};

/**
 * Builds `dirección - CP: #### / Teléfono: …`, omitting empty parts.
 * Returns `null` when nothing is set so templates can hide the row.
 */
export function buildEmailFooterContact(contact: EmailSenderContact): string | null {
  const address = contact.address?.trim() ?? "";
  const postalCode = contact.postalCode?.trim() ?? "";
  const phone = contact.phone?.trim() ?? "";

  const locationParts: string[] = [];
  if (address) {
    locationParts.push(address);
  }
  if (postalCode) {
    locationParts.push(`CP: ${postalCode}`);
  }

  const segments: string[] = [];
  if (locationParts.length > 0) {
    segments.push(locationParts.join(" - "));
  }
  if (phone) {
    segments.push(`Teléfono: ${phone}`);
  }

  return segments.length > 0 ? segments.join(" / ") : null;
}
