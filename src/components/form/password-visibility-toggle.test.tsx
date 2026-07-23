import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { PasswordVisibilityToggle } from "@/components/form/password-visibility-toggle";

describe("PasswordVisibilityToggle", () => {
  it("toggles once per pointer press", async () => {
    const onToggle = vi.fn();
    const events = userEvent.setup();

    render(<PasswordVisibilityToggle visible={false} onToggle={onToggle} />);

    await events.click(screen.getByRole("button", { name: "Mostrar contraseña" }));

    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it("exposes pressed state for the visible password", () => {
    render(<PasswordVisibilityToggle visible onToggle={() => undefined} />);

    expect(screen.getByRole("button", { name: "Ocultar contraseña" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("does not toggle when disabled", async () => {
    const onToggle = vi.fn();
    const events = userEvent.setup();

    render(<PasswordVisibilityToggle visible={false} onToggle={onToggle} disabled />);

    await events.click(screen.getByRole("button", { name: "Mostrar contraseña" }));

    expect(onToggle).not.toHaveBeenCalled();
  });
});
