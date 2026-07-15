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
