import { describe, expect, it } from "vitest";

import {
  compareTenantEmailsByUnit,
  formatFunctionalUnit,
  getTenantEmailAutocompleteText,
  normalizeUnitFields,
  tenantEmailMatchesPrefix,
} from "@/lib/tenant-email/format-unit";
import type { TenantEmail } from "@/types/tenant-email";

function entry(
  partial: Pick<TenantEmail, "floor" | "departmentNumber" | "letter" | "email"> &
    Partial<TenantEmail>,
): TenantEmail {
  return {
    id: partial.id ?? partial.email,
    consortiumId: partial.consortiumId ?? "c1",
    contactType: partial.contactType ?? "inquilino",
    floor: partial.floor,
    departmentNumber: partial.departmentNumber,
    letter: partial.letter,
    email: partial.email,
  };
}

describe("formatFunctionalUnit", () => {
  it("formats numeric floor with degree mark", () => {
    expect(formatFunctionalUnit({ floor: "1", departmentNumber: null, letter: "A" })).toBe(
      "1° - A",
    );
  });

  it("formats PB as PB°", () => {
    expect(formatFunctionalUnit({ floor: "PB", departmentNumber: "1", letter: null })).toBe(
      "PB° - 1",
    );
    expect(formatFunctionalUnit({ floor: "pb", departmentNumber: null, letter: null })).toBe("PB°");
  });

  it("returns em dash when empty", () => {
    expect(formatFunctionalUnit({ floor: null, departmentNumber: null, letter: null })).toBe("—");
  });
});

describe("normalizeUnitFields", () => {
  it("trims empty strings to null", () => {
    expect(normalizeUnitFields({ floor: "  ", departmentNumber: "", letter: " a " })).toEqual({
      floor: null,
      departmentNumber: null,
      letter: "a",
    });
  });

  it("normalizes PB to uppercase", () => {
    expect(normalizeUnitFields({ floor: "pb" })).toEqual({
      floor: "PB",
      departmentNumber: null,
      letter: null,
    });
  });
});

describe("compareTenantEmailsByUnit", () => {
  it("orders bottom-to-top by floor then unit", () => {
    const unordered = [
      entry({ floor: "3", departmentNumber: "2", letter: "B", email: "c@example.com" }),
      entry({ floor: "PB", departmentNumber: "1", letter: null, email: "a@example.com" }),
      entry({ floor: "1", departmentNumber: null, letter: "A", email: "b@example.com" }),
      entry({ floor: "1", departmentNumber: null, letter: "B", email: "d@example.com" }),
    ];

    const ordered = [...unordered].toSorted(compareTenantEmailsByUnit).map((item) => item.email);
    expect(ordered).toEqual(["a@example.com", "b@example.com", "d@example.com", "c@example.com"]);
  });
});

describe("tenantEmailMatchesPrefix", () => {
  const sample = entry({
    floor: "1",
    departmentNumber: null,
    letter: "A",
    email: "roberto@example.com",
  });

  it("matches email and unit prefixes", () => {
    expect(tenantEmailMatchesPrefix(sample, "r")).toBe(true);
    expect(tenantEmailMatchesPrefix(sample, "rob")).toBe(true);
    expect(tenantEmailMatchesPrefix(sample, "1")).toBe(true);
    expect(tenantEmailMatchesPrefix(sample, "a")).toBe(true);
    expect(tenantEmailMatchesPrefix(sample, "z")).toBe(false);
  });
});

describe("getTenantEmailAutocompleteText", () => {
  const sample = entry({
    floor: "1",
    departmentNumber: null,
    letter: "A",
    email: "roberto@example.com",
  });

  it("prefers email completion when the query matches the email", () => {
    expect(getTenantEmailAutocompleteText(sample, "ro")).toBe("roberto@example.com");
  });

  it("returns the unit label when the query matches the unit", () => {
    expect(getTenantEmailAutocompleteText(sample, "1")).toBe("1° - A");
  });
});
