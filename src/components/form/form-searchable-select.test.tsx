import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";

import { FormSearchableSelect, type SearchableSelectOption } from "./form-searchable-select";

type FormValues = {
  recipientEmails: string[];
};

function Harness({
  options,
  multiple = false,
}: {
  options: SearchableSelectOption[];
  multiple?: boolean;
}) {
  const { control, watch } = useForm<FormValues>({
    defaultValues: { recipientEmails: [] },
  });
  const recipientEmails = watch("recipientEmails");

  return (
    <div>
      <FormSearchableSelect
        control={control}
        name="recipientEmails"
        label="Destinatarios"
        options={options}
        multiple={multiple}
        placeholder="Buscar por email o unidad"
      />
      <output data-testid="count">{recipientEmails.length}</output>
      <output data-testid="values">{recipientEmails.join(",")}</output>
    </div>
  );
}

const options: SearchableSelectOption[] = [
  {
    value: "ana@example.com",
    label: "ana@example.com",
    description: "1° - A",
    keywords: ["1", "A"],
  },
  {
    value: "beto@example.com",
    label: "beto@example.com",
    description: "2° - B",
    keywords: ["2", "B"],
  },
];

describe("FormSearchableSelect", () => {
  it("selects a single option from the combobox", async () => {
    const user = userEvent.setup();
    render(<Harness options={options} />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("button", { name: /ana@example.com/i }));

    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("values")).toHaveTextContent("ana@example.com");
  });

  it("supports multi select and chip removal", async () => {
    const user = userEvent.setup();
    render(<Harness options={options} multiple />);

    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("button", { name: /ana@example.com/i }));
    await user.click(screen.getByRole("combobox"));
    await user.click(screen.getByRole("button", { name: /beto@example.com/i }));

    expect(screen.getByTestId("count")).toHaveTextContent("2");

    await user.click(screen.getByRole("button", { name: "Quitar ana@example.com" }));
    expect(screen.getByTestId("count")).toHaveTextContent("1");
    expect(screen.getByTestId("values")).toHaveTextContent("beto@example.com");
  });
});
