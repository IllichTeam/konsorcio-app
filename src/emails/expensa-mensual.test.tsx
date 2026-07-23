import { render } from "react-email";
import { describe, expect, it } from "vitest";

import { ExpensaMensual } from "@/emails/expensa-mensual";

describe("ExpensaMensual", () => {
  it("renders the fixed greeting, period, message, alias, link and attachment names", async () => {
    const html = await render(
      <ExpensaMensual
        consorcio="Torre Norte"
        periodo="Julio de 2026"
        mensaje="Nos complace acercarle las expensas mensuales."
        linkUrl="https://drive.example/folder"
        paymentAlias="ALIAS.TORRE"
        attachmentNames={["Liquidacion.pdf", "Anexo.pdf"]}
        remitente="Administración"
      />,
    );

    expect(html).toContain("Hola Vecino/a");
    expect(html).toContain("Torre Norte");
    expect(html).toContain("del período:");
    expect(html).toContain("Julio de 2026");
    expect(html).toContain("Nos complace acercarle las expensas mensuales.");
    expect(html).toContain("ALIAS.TORRE");
    expect(html).toContain("<strong");
    expect(html).toContain("https://drive.example/folder");
    expect(html).toContain('href="https://drive.example/folder"');
    expect(html).toContain("Link de drive");
    expect(html).toContain("Un cordial saludo, Administración");
    expect(html).not.toContain("Un cordial saludo,<br");
    expect(html).toContain("Liquidacion.pdf");
    expect(html).toContain("Anexo.pdf");
    expect(html.match(/Hola Vecino\/a/g)?.length).toBe(1);
  });

  it("hides alias and link rows when they are empty", async () => {
    const html = await render(
      <ExpensaMensual
        periodo="Julio de 2026"
        mensaje="Solo mensaje"
        linkUrl=""
        paymentAlias="  "
      />,
    );

    expect(html).toContain("Julio de 2026");
    expect(html).toContain("Solo mensaje");
    expect(html).not.toContain("Alias de cobro");
    expect(html).not.toContain("href=");
  });

  it("hides the drive link row when linkUrl is not a valid URL", async () => {
    const html = await render(
      <ExpensaMensual
        periodo="Julio de 2026"
        mensaje="Sin drive"
        linkUrl="Link"
        paymentAlias={null}
      />,
    );

    expect(html).toContain("Sin drive");
    expect(html).not.toContain("A continuación dejamos información relevante");
    expect(html).not.toContain('href="Link"');
  });

  it("renders the sender footer contact line when provided", async () => {
    const html = await render(
      <ExpensaMensual
        periodo="Julio de 2026"
        mensaje="Con pie"
        footerContact="Gurruchaga 2222 - CP: 1414 / Teléfono: +54911-12345678"
      />,
    );

    expect(html).toContain("Gurruchaga 2222 - CP: 1414 / Teléfono: +54911-12345678");
    expect(html).not.toContain("123 Calle Principal");
  });

  it("hides the footer address row when contact is missing", async () => {
    const html = await render(<ExpensaMensual periodo="Julio de 2026" mensaje="Sin pie" />);

    expect(html).toContain("Sin pie");
    expect(html).not.toContain("123 Calle Principal");
  });
});
