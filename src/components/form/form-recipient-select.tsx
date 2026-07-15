"use client";

import * as React from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import type { Recipient } from "@/lib/email/types";
import type { EmailRecipientOption } from "@/lib/schemas/email";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

/** Candidate recipient offered as a selectable option. */
export type RecipientOption = EmailRecipientOption;

type FormRecipientSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: RecipientOption[];
  /** Shows a loading message instead of the checklist. */
  loading?: boolean;
  disabled?: boolean;
  /** Message shown when `options` is empty and not loading. */
  emptyMessage?: string;
};

function FormRecipientSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  loading = false,
  disabled = false,
  emptyMessage = "No hay destinatarios disponibles",
}: FormRecipientSelectProps<T>) {
  const groupId = React.useId();
  const errorId = `${groupId}-error`;
  const searchId = `${groupId}-search`;
  const [filter, setFilter] = React.useState("");

  const filteredOptions = React.useMemo(() => {
    const query = filter.trim().toLowerCase();

    if (!query) {
      return options;
    }

    return options.filter(
      (option) =>
        option.name.toLowerCase().includes(query) || option.email.toLowerCase().includes(query),
    );
  }, [filter, options]);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected = (field.value as Recipient[] | undefined) ?? [];
        const selectedEmails = new Set(selected.map((recipient) => recipient.email));
        const isDisabled = disabled || loading;

        function toggleOption(option: RecipientOption, checked: boolean) {
          if (checked) {
            if (selectedEmails.has(option.email)) {
              return;
            }

            field.onChange([...selected, { email: option.email, name: option.name }]);
            return;
          }

          field.onChange(selected.filter((recipient) => recipient.email !== option.email));
        }

        const allFilteredSelected =
          filteredOptions.length > 0 &&
          filteredOptions.every((option) => selectedEmails.has(option.email));

        function toggleSelectAll(checked: boolean) {
          if (checked) {
            const merged = new Map(selected.map((recipient) => [recipient.email, recipient]));

            for (const option of filteredOptions) {
              merged.set(option.email, { email: option.email, name: option.name });
            }

            field.onChange(Array.from(merged.values()));
            return;
          }

          const filteredEmails = new Set(filteredOptions.map((option) => option.email));
          field.onChange(selected.filter((recipient) => !filteredEmails.has(recipient.email)));
        }

        return (
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor={searchId}>{label}</Label>
              <span className="text-sm text-muted-foreground">
                {selected.length} seleccionado{selected.length === 1 ? "" : "s"}
              </span>
            </div>

            <fieldset
              aria-invalid={fieldState.invalid || undefined}
              aria-describedby={fieldState.error ? errorId : undefined}
              className={cn(
                "flex flex-col gap-2 rounded-md border border-input p-2",
                fieldState.invalid && "border-destructive",
              )}
            >
              <legend className="sr-only">{label}</legend>
              <Input
                id={searchId}
                type="search"
                placeholder="Buscar destinatario..."
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                disabled={isDisabled || options.length === 0}
              />

              <label className="flex items-center gap-2 border-b border-border pb-2 text-sm font-medium text-foreground">
                <input
                  type="checkbox"
                  className="size-4 rounded border-input accent-primary"
                  checked={allFilteredSelected}
                  disabled={isDisabled || filteredOptions.length === 0}
                  onChange={(event) => toggleSelectAll(event.target.checked)}
                />
                Seleccionar todos
              </label>

              <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto">
                {loading ? (
                  <li className="px-1 py-2 text-sm text-muted-foreground">
                    Cargando destinatarios…
                  </li>
                ) : filteredOptions.length === 0 ? (
                  <li className="px-1 py-2 text-sm text-muted-foreground">{emptyMessage}</li>
                ) : (
                  filteredOptions.map((option) => (
                    <li key={option.id}>
                      <label className="grid grid-cols-[auto_1fr] items-center gap-x-2 gap-y-0 rounded-md px-1 py-1.5 text-sm hover:bg-muted">
                        <input
                          type="checkbox"
                          className="row-span-2 size-4 rounded border-input accent-primary"
                          checked={selectedEmails.has(option.email)}
                          disabled={isDisabled}
                          onChange={(event) => toggleOption(option, event.target.checked)}
                        />
                        <span className="font-medium text-foreground">{option.name}</span>
                        <span className="text-muted-foreground">{option.email}</span>
                      </label>
                    </li>
                  ))
                )}
              </ul>
            </fieldset>

            {fieldState.error ? (
              <p id={errorId} className="text-sm text-destructive">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        );
      }}
    />
  );
}

export { FormRecipientSelect };
