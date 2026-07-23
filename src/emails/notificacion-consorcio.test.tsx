import { render } from "react-email";
import { describe, expect, it } from "vitest";

import { NotificacionConsorcio } from "@/emails/notificacion-consorcio";

describe("NotificacionConsorcio", () => {
  it("renders recipient name, consortium and message body", async () => {
    const html = await render(
      <NotificacionConsorcio
        nombre="Ana"
        consorcio="Edificio Rivadavia 1234"
        mensaje={"Línea 1\nLínea 2"}
        linkUrl="https://drive.example/folder"
        paymentAlias="ALIAS.NOTIF"
        remitente="Administración"
      />,
    );

    expect(html).toContain("Hola Ana");
    expect(html).toContain("Edificio Rivadavia 1234");
    expect(html).toContain("Línea 1");
    expect(html).toContain("Línea 2");
    expect(html).toContain("ALIAS.NOTIF");
    expect(html).toContain("<strong");
    expect(html).toContain('href="https://drive.example/folder"');
    expect(html).toContain("Link de drive");
    expect(html).toContain("Un cordial saludo, Administración");
    expect(html).not.toContain("Un cordial saludo,<br");
    expect(html).toContain(">K</");
  });

  it("hides alias and link rows when they are empty", async () => {
    const html = await render(
      <NotificacionConsorcio mensaje="Solo mensaje" linkUrl="" paymentAlias="  " />,
    );

    expect(html).toContain("Solo mensaje");
    expect(html).not.toContain("Alias de cobro");
    expect(html).not.toContain("Link de drive");
  });

  it("falls back to a generic greeting when no recipient name is given", async () => {
    const html = await render(<NotificacionConsorcio mensaje="Contenido" />);

    expect(html).toContain("Hola Vecino");
    expect(html).toContain("Nos comunicamos desde la administración para compartir");
  });

  it("renders the sender footer contact line when provided", async () => {
    const html = await render(
      <NotificacionConsorcio
        mensaje="Aviso"
        footerContact="Gurruchaga 2222 - CP: 1414 / Teléfono: +54911-12345678"
      />,
    );

    expect(html).toContain("Gurruchaga 2222 - CP: 1414 / Teléfono: +54911-12345678");
    expect(html).not.toContain("123 Calle Principal");
  });
});
