"use client";

import * as React from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormInputProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  labelAction?: React.ReactNode;
  description?: string;
  endAdornment?: React.ReactNode;
  sanitize?: (value: string) => string;
} & Omit<React.ComponentProps<typeof Input>, "name" | "onChange" | "value">;

function FormInput<T extends FieldValues>({
  control,
  name,
  label,
  labelAction,
  description,
  endAdornment,
  className,
  sanitize,
  ...inputProps
}: FormInputProps<T>) {
  const inputId = React.useId();
  const errorId = `${inputId}-error`;
  const descriptionId = `${inputId}-description`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const describedBy = [
          fieldState.error ? errorId : null,
          description && !fieldState.error ? descriptionId : null,
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <Label htmlFor={inputId}>{label}</Label>
              {labelAction}
            </div>
            <div className="relative">
              <Input
                id={inputId}
                aria-invalid={fieldState.invalid || undefined}
                aria-describedby={describedBy || undefined}
                className={cn(endAdornment && "pr-10", className)}
                {...inputProps}
                name={field.name}
                ref={field.ref}
                value={field.value ?? ""}
                onBlur={field.onBlur}
                onChange={(event) => {
                  const nextValue = sanitize ? sanitize(event.target.value) : event.target.value;
                  field.onChange(nextValue);
                }}
              />
              {endAdornment}
            </div>
            {fieldState.error ? (
              <p id={errorId} role="alert" className="text-sm text-destructive">
                {fieldState.error.message}
              </p>
            ) : description ? (
              <p id={descriptionId} className="text-xs text-muted-foreground">
                {description}
              </p>
            ) : null}
          </div>
        );
      }}
    />
  );
}

export { FormInput };
