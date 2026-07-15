"use client";

import * as React from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type FormSelectOption = {
  value: string;
  label: string;
};

type FormSelectProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  placeholder?: string;
  options: FormSelectOption[];
  className?: string;
};

function FormSelect<T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  options,
  className,
}: FormSelectProps<T>) {
  const selectId = React.useId();
  const errorId = `${selectId}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="grid gap-2">
          <Label htmlFor={selectId}>{label}</Label>
          <Select value={field.value} onValueChange={field.onChange}>
            <SelectTrigger
              id={selectId}
              className={cn("w-full", className)}
              aria-invalid={fieldState.invalid || undefined}
              aria-describedby={fieldState.error ? errorId : undefined}
            >
              <SelectValue placeholder={placeholder} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {fieldState.error ? (
            <p id={errorId} className="text-sm text-destructive">
              {fieldState.error.message}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}

export { FormSelect };
