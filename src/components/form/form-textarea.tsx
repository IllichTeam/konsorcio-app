"use client";

import * as React from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type FormTextareaProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  labelAction?: React.ReactNode;
} & Omit<React.ComponentProps<typeof Textarea>, "name">;

function FormTextarea<T extends FieldValues>({
  control,
  name,
  label,
  labelAction,
  className,
  ...textareaProps
}: FormTextareaProps<T>) {
  const textareaId = React.useId();
  const errorId = `${textareaId}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className="grid gap-2">
          <div className="flex items-center justify-between">
            <Label htmlFor={textareaId}>{label}</Label>
            {labelAction}
          </div>
          <Textarea
            id={textareaId}
            aria-invalid={fieldState.invalid || undefined}
            aria-describedby={fieldState.error ? errorId : undefined}
            className={cn(className)}
            {...textareaProps}
            {...field}
          />
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

export { FormTextarea };
