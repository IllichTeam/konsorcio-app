import { describe, expect, it } from "vitest";

import { SERVERLESS_POSTGRES_OPTIONS } from "./postgres-client-options";

describe("SERVERLESS_POSTGRES_OPTIONS", () => {
  it("disables prepared statements for transaction-mode poolers", () => {
    expect(SERVERLESS_POSTGRES_OPTIONS.prepare).toBe(false);
  });

  it("limits each serverless isolate to one connection", () => {
    expect(SERVERLESS_POSTGRES_OPTIONS.max).toBe(1);
  });
});
