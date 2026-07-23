import { render } from "react-email";
import { describe, expect, it } from "vitest";

import { ExpensaMensual } from "@/emails/expensa-mensual";

describe("ExpensaMensual", () => {
  it("renders the fixed greeting, message, alias, link and attachment names", async () => {
    const html = await render(
      <ExpensaMensual
        consorcio="Torre Norte"
        mensaje="Nos complace acercarle las expensas mensuales."
        linkUrl="https://drive.example/folder"
        paymentAlias="ALIAS.TORRE"
        attachmentNames={["Liquidacion.pdf", "Anexo.pdf"]}
        remitente="Administración"
      />,
    );

    expect(html).toContain("Hola Vecino/a");
    expect(html).toContain("Torre Norte");
    expect(html).toContain("Nos complace acercarle las expensas mensuales.");
    expect(html).toContain("ALIAS.TORRE");
    expect(html).toContain("https://drive.example/folder");
    expect(html).toContain("Liquidacion.pdf");
    expect(html).toContain("Anexo.pdf");
    expect(html.match(/Hola Vecino\/a/g)?.length).toBe(1);
  });

  it("hides alias and link rows when they are empty", async () => {
    const html = await render(
      <ExpensaMensual mensaje="Solo mensaje" linkUrl="" paymentAlias="  " />,
    );

    expect(html).toContain("Solo mensaje");
    expect(html).not.toContain("Alias de cobro");
    expect(html).not.toContain("href=");
  });
});
