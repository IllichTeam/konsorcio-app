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
        remitente="Administración"
      />,
    );

    expect(html).toContain("Hola Ana");
    expect(html).toContain("Edificio Rivadavia 1234");
    expect(html).toContain("Línea 1");
    expect(html).toContain("Línea 2");
    expect(html).toContain("Administración");
    expect(html).toContain(">K</");
  });

  it("falls back to a generic greeting when no recipient name is given", async () => {
    const html = await render(<NotificacionConsorcio mensaje="Contenido" />);

    expect(html).toContain("Hola Vecino");
    expect(html).toContain("Nos comunicamos desde la administración para compartir");
  });
});
