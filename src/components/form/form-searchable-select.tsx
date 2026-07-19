"use client";

import * as React from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import {
  SearchableSelect,
  type SearchableSelectOption,
  type SearchableSelectProps,
} from "@/components/ui/searchable-select";
import { Label } from "@/components/ui/label";

type FormSearchableSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  options: SearchableSelectOption[];
  multiple?: boolean;
  loading?: boolean;
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
  loadingMessage?: string;
  noResultsMessage?: string;
  selectedEmptyMessage?: string;
  listLabel?: string;
  filterOption?: SearchableSelectProps["filterOption"];
  getAutocompleteText?: SearchableSelectProps["getAutocompleteText"];
};

function FormSearchableSelect<T extends FieldValues>({
  control,
  name,
  label,
  options,
  multiple = false,
  loading = false,
  disabled = false,
  placeholder,
  emptyMessage,
  loadingMessage,
  noResultsMessage,
  selectedEmptyMessage,
  listLabel,
  filterOption,
  getAutocompleteText,
}: FormSearchableSelectProps<T>) {
  const selectId = React.useId();
  const errorId = `${selectId}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const selected = (field.value as string[] | undefined) ?? [];

        return (
          <div className="grid gap-2">
            <Label htmlFor={selectId}>{label}</Label>
            <SearchableSelect
              id={selectId}
              options={options}
              value={selected}
              onChange={field.onChange}
              multiple={multiple}
              loading={loading}
              disabled={disabled}
              placeholder={placeholder}
              emptyMessage={emptyMessage}
              loadingMessage={loadingMessage}
              noResultsMessage={noResultsMessage}
              selectedEmptyMessage={selectedEmptyMessage}
              listLabel={listLabel}
              filterOption={filterOption}
              getAutocompleteText={getAutocompleteText}
              aria-invalid={fieldState.invalid || undefined}
              aria-describedby={fieldState.error ? errorId : undefined}
            />
            {fieldState.error ? (
              <p id={errorId} role="alert" className="text-sm text-destructive">
                {fieldState.error.message}
              </p>
            ) : null}
          </div>
        );
      }}
    />
  );
}

export { FormSearchableSelect };
export type { SearchableSelectOption };
