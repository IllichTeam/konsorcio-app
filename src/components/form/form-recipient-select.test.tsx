import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { FormRecipientSelect, type RecipientOption } from "./form-recipient-select";

type FormValues = {
  recipients: { email: string; name?: string }[];
};

function Harness({ options }: { options: RecipientOption[] }) {
  const { control, watch } = useForm<FormValues>({ defaultValues: { recipients: [] } });
  const recipients = watch("recipients");

  return (
    <div>
      <FormRecipientSelect
        control={control}
        name="recipients"
        label="Destinatarios"
        options={options}
      />
      <output data-testid="count">{recipients.length}</output>
    </div>
  );
}

const options: RecipientOption[] = [
  { id: "user-1", name: "Ana Torres", email: "ana@example.com" },
  { id: "user-2", name: "Beto Ruiz", email: "beto@example.com" },
];

describe("FormRecipientSelect", () => {
  it("selects and deselects every option via 'Seleccionar todos'", async () => {
    const user = userEvent.setup();
    render(<Harness options={options} />);

    const selectAll = screen.getByRole("checkbox", { name: "Seleccionar todos" });

    await user.click(selectAll);
    expect(screen.getByTestId("count")).toHaveTextContent("2");
    expect(screen.getByText("2 seleccionados")).toBeInTheDocument();

    await user.click(selectAll);
    expect(screen.getByTestId("count")).toHaveTextContent("0");
    expect(screen.getByText("0 seleccionados")).toBeInTheDocument();
  });

  it("filters the checklist by name or email", async () => {
    const user = userEvent.setup();
    render(<Harness options={options} />);

    await user.type(screen.getByPlaceholderText("Buscar destinatario..."), "beto");

    expect(screen.queryByText("Ana Torres")).not.toBeInTheDocument();
    expect(screen.getByText("Beto Ruiz")).toBeInTheDocument();
  });
});
