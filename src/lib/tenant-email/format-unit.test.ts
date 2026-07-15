import { describe, expect, it } from "vitest";

import { formatFunctionalUnit, normalizeUnitFields } from "@/lib/tenant-email/format-unit";

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
