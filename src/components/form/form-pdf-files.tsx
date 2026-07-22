"use client";

import * as React from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { FileText, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const MAX_PDF_BYTES = 5 * 1024 * 1024;
const MAX_PDF_COUNT = 3;

type FormPdfFilesProps<T extends FieldValues> = {
  control: Control<T>;
  name: FieldPath<T>;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FormPdfFiles<T extends FieldValues>({
  control,
  name,
  label,
  description,
  disabled,
  className,
}: FormPdfFilesProps<T>) {
  const inputId = React.useId();
  const errorId = `${inputId}-error`;
  const descriptionId = `${inputId}-description`;
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => {
        const files = (field.value as File[] | undefined) ?? [];
        const describedBy = [
          fieldState.error ? errorId : null,
          description && !fieldState.error ? descriptionId : null,
        ]
          .filter(Boolean)
          .join(" ");

        function mergeFiles(incoming: FileList | null) {
          if (!incoming?.length) {
            return;
          }

          const next = [...files];
          for (const file of Array.from(incoming)) {
            if (next.length >= MAX_PDF_COUNT) {
              break;
            }
            const alreadyAdded = next.some(
              (existing) =>
                existing.name === file.name &&
                existing.size === file.size &&
                existing.lastModified === file.lastModified,
            );
            if (!alreadyAdded) {
              next.push(file);
            }
          }
          field.onChange(next);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }

        function removeFile(index: number) {
          field.onChange(files.filter((_, i) => i !== index));
        }

        const canAddMore = !disabled && files.length < MAX_PDF_COUNT;

        return (
          <div className={cn("grid gap-2", className)}>
            <Label htmlFor={inputId}>{label}</Label>
            <input
              id={inputId}
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              disabled={!canAddMore}
              aria-invalid={fieldState.invalid || undefined}
              aria-describedby={describedBy || undefined}
              className="sr-only"
              onBlur={field.onBlur}
              onChange={(event) => mergeFiles(event.target.files)}
            />
            <Button
              type="button"
              variant="outline"
              disabled={!canAddMore}
              className="w-fit border-primary/30 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary"
              onClick={() => fileInputRef.current?.click()}
            >
              Seleccionar PDFs
            </Button>
            {files.length > 0 ? (
              <ul className="grid gap-1.5">
                {files.map((file, index) => (
                  <li
                    key={`${file.name}-${file.size}-${file.lastModified}`}
                    className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5"
                  >
                    <FileText
                      className="size-4 shrink-0 text-muted-foreground"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-foreground">{file.name}</p>
                      <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      disabled={disabled}
                      onClick={() => removeFile(index)}
                      aria-label={`Quitar ${file.name}`}
                    >
                      <X className="size-4" aria-hidden="true" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : null}
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

export { FormPdfFiles, MAX_PDF_BYTES, MAX_PDF_COUNT };
