import type { TenantEmail } from "@/types/tenant-email";

type FunctionalUnitFields = {
  floor: string | null;
  departmentNumber: string | null;
  letter: string | null;
};

function normalizeField(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeFloor(value: string | null | undefined): string | null {
  const trimmed = normalizeField(value);
  if (!trimmed) {
    return null;
  }

  return trimmed.toUpperCase() === "PB" ? "PB" : trimmed;
}

export function formatFunctionalUnit(unit: FunctionalUnitFields): string {
  const floor = normalizeField(unit.floor);
  const departmentNumber = normalizeField(unit.departmentNumber);
  const letter = normalizeField(unit.letter);

  const parts: string[] = [];

  if (floor) {
    parts.push(floor.toUpperCase() === "PB" ? "PB°" : `${floor}°`);
  }

  const departmentParts: string[] = [];
  if (departmentNumber) {
    departmentParts.push(departmentNumber);
  }
  if (letter) {
    departmentParts.push(letter.toUpperCase());
  }

  const departmentLabel = departmentParts.join(" ");
  if (departmentLabel) {
    parts.push(departmentLabel);
  }

  return parts.join(" - ") || "—";
}

export function normalizeUnitFields(input: {
  floor?: string;
  departmentNumber?: string;
  letter?: string;
}): Pick<TenantEmail, "floor" | "departmentNumber" | "letter"> {
  return {
    floor: normalizeFloor(input.floor),
    departmentNumber: normalizeField(input.departmentNumber),
    letter: normalizeField(input.letter),
  };
}

/** PB = 0, numeric floors ascend; unknown/missing floors go last. */
export function floorSortValue(floor: string | null | undefined): number {
  const normalized = normalizeFloor(floor);
  if (!normalized) {
    return Number.POSITIVE_INFINITY;
  }

  if (normalized === "PB") {
    return 0;
  }

  const numeric = Number.parseInt(normalized, 10);
  return Number.isFinite(numeric) ? numeric : Number.POSITIVE_INFINITY;
}

/** Bottom-to-top by floor, then department number, letter, and email. */
export function compareTenantEmailsByUnit(a: TenantEmail, b: TenantEmail): number {
  const floorDiff = floorSortValue(a.floor) - floorSortValue(b.floor);
  if (floorDiff !== 0) {
    return floorDiff;
  }

  const departmentA = a.departmentNumber ?? "";
  const departmentB = b.departmentNumber ?? "";
  const departmentDiff = departmentA.localeCompare(departmentB, undefined, {
    numeric: true,
    sensitivity: "base",
  });
  if (departmentDiff !== 0) {
    return departmentDiff;
  }

  const letterDiff = (a.letter ?? "").localeCompare(b.letter ?? "", undefined, {
    sensitivity: "base",
  });
  if (letterDiff !== 0) {
    return letterDiff;
  }

  return a.email.localeCompare(b.email, undefined, { sensitivity: "base" });
}

export function sortTenantEmailsByUnit(entries: TenantEmail[]): TenantEmail[] {
  return [...entries].toSorted(compareTenantEmailsByUnit);
}

/** Prefix match against email, unit label, or unit field pieces. */
export function tenantEmailMatchesPrefix(entry: TenantEmail, query: string): boolean {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return true;
  }

  if (entry.email.toLowerCase().startsWith(normalizedQuery)) {
    return true;
  }

  const unitLabel = formatFunctionalUnit(entry).toLowerCase();
  if (unitLabel.startsWith(normalizedQuery)) {
    return true;
  }

  if (entry.floor?.toLowerCase().startsWith(normalizedQuery)) {
    return true;
  }

  if (entry.departmentNumber?.toLowerCase().startsWith(normalizedQuery)) {
    return true;
  }

  if (entry.letter?.toLowerCase().startsWith(normalizedQuery)) {
    return true;
  }

  return false;
}

/**
 * Text to show as inline autocomplete for the typed query.
 * Prefers email when the query matches the email prefix; otherwise the unit label.
 */
export function getTenantEmailAutocompleteText(entry: TenantEmail, query: string): string | null {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return null;
  }

  if (entry.email.toLowerCase().startsWith(normalizedQuery)) {
    return entry.email;
  }

  const unitLabel = formatFunctionalUnit(entry);
  if (
    unitLabel.toLowerCase().startsWith(normalizedQuery) ||
    entry.floor?.toLowerCase().startsWith(normalizedQuery) ||
    entry.departmentNumber?.toLowerCase().startsWith(normalizedQuery) ||
    entry.letter?.toLowerCase().startsWith(normalizedQuery)
  ) {
    return unitLabel === "—" ? null : unitLabel;
  }

  return null;
}
