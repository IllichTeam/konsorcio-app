import { describe, expect, it } from "vitest";

import { buildEmailFooterContact } from "./footer-contact";

describe("buildEmailFooterContact", () => {
  it("formats address, CP and phone with labels", () => {
    expect(
      buildEmailFooterContact({
        address: "Gurruchaga 2222",
        phone: "+54911-12345678",
        postalCode: "1414",
      }),
    ).toBe("Gurruchaga 2222 - CP: 1414 / Teléfono: +54911-12345678");
  });

  it("omits empty parts and returns null when nothing is set", () => {
    expect(buildEmailFooterContact({ address: "  ", phone: null, postalCode: "" })).toBeNull();
    expect(
      buildEmailFooterContact({
        address: "Av. Corrientes 1847",
        phone: "",
        postalCode: "1043",
      }),
    ).toBe("Av. Corrientes 1847 - CP: 1043");
    expect(
      buildEmailFooterContact({
        address: "",
        phone: "91123878467",
        postalCode: "",
      }),
    ).toBe("Teléfono: 91123878467");
  });
});
