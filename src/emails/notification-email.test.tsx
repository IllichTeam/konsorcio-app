import { render } from "react-email";
import { describe, expect, it } from "vitest";

import { NotificationEmail } from "@/emails/notification-email";

describe("NotificationEmail", () => {
  it("renders subject, greeting and multi-line body preserving line breaks", async () => {
    const html = await render(
      <NotificationEmail subject="Aviso" body={"Línea 1\nLínea 2"} recipientName="Ana" />,
    );

    expect(html).toContain("Aviso");
    expect(html).toContain("Línea 1");
    expect(html).toContain("Línea 2");
    expect(html).toContain("Hola Ana");
  });

  it("falls back to a generic greeting when no recipient name is given", async () => {
    const html = await render(<NotificationEmail subject="Aviso" body="Contenido" />);

    expect(html).toContain("Hola,");
  });
});
