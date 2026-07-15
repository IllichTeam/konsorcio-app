"use client";

import * as React from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type FormInputOTPProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  maxLength?: number;
  className?: string;
};

function FormInputOTP<T extends FieldValues>({
  control,
  name,
  label,
  maxLength = 6,
  className,
}: FormInputOTPProps<T>) {
  const inputId = React.useId();
  const errorId = `${inputId}-error`;

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <div className={cn("grid gap-2", className)}>
          <Label htmlFor={inputId} className="justify-center text-center">
            {label}
          </Label>
          <InputOTP
            id={inputId}
            maxLength={maxLength}
            value={field.value}
            onChange={field.onChange}
            onBlur={field.onBlur}
            containerClassName="justify-center"
            aria-invalid={fieldState.invalid || undefined}
            aria-describedby={fieldState.error ? errorId : undefined}
          >
            <InputOTPGroup aria-invalid={fieldState.invalid || undefined}>
              {Array.from({ length: maxLength }, (_, index) => (
                <InputOTPSlot key={`otp-slot-${index}`} index={index} />
              ))}
            </InputOTPGroup>
          </InputOTP>
          {fieldState.error ? (
            <p id={errorId} className="text-center text-sm text-destructive">
              {fieldState.error.message}
            </p>
          ) : null}
        </div>
      )}
    />
  );
}

export { FormInputOTP };
