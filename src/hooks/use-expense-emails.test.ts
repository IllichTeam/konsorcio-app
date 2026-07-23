import { describe, expect, it } from "vitest";

import { expenseEmailSendStatusLabel } from "./use-expense-emails";

describe("expenseEmailSendStatusLabel", () => {
  it("returns Spanish labels for every send status", () => {
    expect(expenseEmailSendStatusLabel("queued")).toBe("En cola");
    expect(expenseEmailSendStatusLabel("sending")).toBe("Enviando");
    expect(expenseEmailSendStatusLabel("sent")).toBe("Enviado");
    expect(expenseEmailSendStatusLabel("partial")).toBe("Parcial");
    expect(expenseEmailSendStatusLabel("failed")).toBe("Fallido");
  });
});
