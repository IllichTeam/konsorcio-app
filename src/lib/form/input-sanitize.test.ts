import { describe, expect, it } from "vitest";

import { sanitizeDigitsOnly, sanitizeFloor, sanitizeLettersOnly } from "@/lib/form/input-sanitize";

describe("sanitizeDigitsOnly", () => {
  it("keeps only digits", () => {
    expect(sanitizeDigitsOnly("12a3")).toBe("123");
    expect(sanitizeDigitsOnly("PB")).toBe("");
  });
});

describe("sanitizeLettersOnly", () => {
  it("keeps letters including accents", () => {
    expect(sanitizeLettersOnly("A1B")).toBe("AB");
    expect(sanitizeLettersOnly("Ñá")).toBe("Ñá");
  });
});

describe("sanitizeFloor", () => {
  it("keeps numeric floors", () => {
    expect(sanitizeFloor("12")).toBe("12");
    expect(sanitizeFloor("1a2")).toBe("12");
  });

  it("builds PB progressively and uppercases", () => {
    expect(sanitizeFloor("p")).toBe("P");
    expect(sanitizeFloor("pb")).toBe("PB");
    expect(sanitizeFloor("PB")).toBe("PB");
  });

  it("switches to digits if a digit is typed after starting PB", () => {
    expect(sanitizeFloor("P1")).toBe("1");
  });

  it("ignores invalid letters for PB", () => {
    expect(sanitizeFloor("PX")).toBe("P");
    expect(sanitizeFloor("BP")).toBe("P");
  });
});
