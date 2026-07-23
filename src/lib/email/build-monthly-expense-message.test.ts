import { describe, expect, it } from "vitest";

import { buildMonthlyExpenseMessage } from "./build-monthly-expense-message";

describe("buildMonthlyExpenseMessage", () => {
  it("builds the automatic monthly body without the template greeting", () => {
    const message = buildMonthlyExpenseMessage("Torre Norte", new Date(2026, 6, 21));

    expect(message).toBe(
      "Nos complace acercarle las expensas mensuales del consorcio Torre Norte correspondientes a Julio de 2026.",
    );
    expect(message.toLowerCase()).not.toContain("hola");
    expect(message).not.toContain("Vecino/a");
  });
});
