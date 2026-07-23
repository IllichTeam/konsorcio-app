import { describe, expect, it } from "vitest";

import { buildMonthlyExpenseMessage, formatExpensePeriod } from "./build-monthly-expense-message";

describe("formatExpensePeriod", () => {
  it("formats month and year in Spanish", () => {
    expect(formatExpensePeriod(new Date(2026, 6, 21))).toBe("Julio de 2026");
    expect(formatExpensePeriod(new Date(2025, 0, 1))).toBe("Enero de 2025");
  });
});

describe("buildMonthlyExpenseMessage", () => {
  it("builds the automatic monthly body without greeting or period", () => {
    const message = buildMonthlyExpenseMessage("Torre Norte");

    expect(message).toBe(
      "Nos complace acercarle las expensas mensuales del consorcio Torre Norte.",
    );
    expect(message.toLowerCase()).not.toContain("hola");
    expect(message).not.toContain("Vecino/a");
    expect(message).not.toContain("Julio");
    expect(message).not.toContain("2026");
  });
});
