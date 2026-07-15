import { beforeEach, describe, expect, it, vi } from "vitest";

const { mockEnv } = vi.hoisted(() => ({
  mockEnv: {
    EMAIL_OVERRIDE_TO: undefined as string | undefined,
  },
}));

vi.mock("@/env", () => ({
  env: mockEnv,
}));

import { isEmailToOverridden, resolveEmailTo } from "./resolve-to";

describe("resolveEmailTo", () => {
  beforeEach(() => {
    mockEnv.EMAIL_OVERRIDE_TO = undefined;
  });

  it("returns the intended address when no override is set", () => {
    expect(resolveEmailTo("user@example.com")).toBe("user@example.com");
    expect(isEmailToOverridden()).toBe(false);
  });

  it("returns EMAIL_OVERRIDE_TO when set", () => {
    mockEnv.EMAIL_OVERRIDE_TO = "illich570@gmail.com";
    expect(resolveEmailTo("user@example.com")).toBe("illich570@gmail.com");
    expect(isEmailToOverridden()).toBe(true);
  });
});
