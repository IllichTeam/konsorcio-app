"use client";

import * as React from "react";
import { Controller, type Control, type FieldPath, type FieldValues } from "react-hook-form";
import { useDropzone, type FileRejection } from "react-dropzone";
import { FileText, Upload, X } from "lucide-react";
import { toast } from "sonner";

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

function fileKey(file: File): string {
  return `${file.name}-${file.size}-${file.lastModified}`;
}

function mergePdfFiles(current: File[], incoming: File[]): File[] {
  const next = [...current];
  for (const file of incoming) {
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
  return next;
}

function rejectionMessage(rejection: FileRejection): string {
  const code = rejection.errors[0]?.code;
  if (code === "file-invalid-type") {
    return `"${rejection.file.name}" no es un PDF`;
  }
  if (code === "file-too-large") {
    return `"${rejection.file.name}" supera los 5 MB`;
  }
  if (code === "too-many-files") {
    return `Máximo ${MAX_PDF_COUNT} PDFs`;
  }
  return rejection.errors[0]?.message || "No se pudo agregar el archivo";
}

type PdfFilesFieldProps = {
  files: File[];
  onChange: (files: File[]) => void;
  onBlur: () => void;
  invalid: boolean;
  errorMessage?: string;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  inputId: string;
  errorId: string;
  descriptionId: string;
};

function PdfFilesField({
  files,
  onChange,
  onBlur,
  invalid,
  errorMessage,
  label,
  description,
  disabled,
  className,
  inputId,
  errorId,
  descriptionId,
}: PdfFilesFieldProps) {
  const remainingSlots = MAX_PDF_COUNT - files.length;
  const canAddMore = !disabled && remainingSlots > 0;
  const hasFiles = files.length > 0;

  const onDrop = React.useCallback(
    (acceptedFiles: File[], fileRejections: FileRejection[]) => {
      if (acceptedFiles.length > 0) {
        onChange(mergePdfFiles(files, acceptedFiles));
      }

      if (fileRejections.length > 0) {
        toast.error(rejectionMessage(fileRejections[0]!));
      }
    },
    [files, onChange],
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { "application/pdf": [".pdf"] },
    // maxFiles: 0 means "no limit" in react-dropzone — only set when slots remain.
    ...(remainingSlots > 0 ? { maxFiles: remainingSlots } : {}),
    maxSize: MAX_PDF_BYTES,
    multiple: true,
    disabled: !canAddMore,
    onDrop,
  });

  const describedBy = [invalid ? errorId : null, description && !invalid ? descriptionId : null]
    .filter(Boolean)
    .join(" ");

  const showDragHighlight = canAddMore && isDragActive;

  return (
    <div className={cn("grid gap-2", className)}>
      <Label htmlFor={inputId}>{label}</Label>
      <div
        {...getRootProps({
          className: cn(
            "flex w-full cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border bg-muted/30 text-center shadow-card transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
            hasFiles ? "gap-1 px-4 py-3" : "gap-1.5 px-4 py-8",
            showDragHighlight && "border-primary/50 bg-primary/5",
            invalid && "border-destructive/50 bg-destructive/5",
            !canAddMore && "cursor-not-allowed bg-muted/20 opacity-60",
          ),
        })}
      >
        <input
          {...getInputProps({
            id: inputId,
            "aria-invalid": invalid || undefined,
            "aria-describedby": describedBy || undefined,
            onBlur,
          })}
        />
        <Upload
          className={cn(
            "text-muted-foreground",
            hasFiles ? "size-4" : "size-5",
            showDragHighlight && "text-primary",
          )}
          aria-hidden="true"
        />
        {canAddMore ? (
          hasFiles ? (
            <>
              <p className="text-sm font-medium text-foreground">Agregar otro PDF</p>
              <p className="text-xs text-muted-foreground">
                {files.length}/{MAX_PDF_COUNT}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-foreground">Arrastrá PDFs acá</p>
              <p className="text-xs text-muted-foreground">o hacé clic para seleccionar</p>
            </>
          )
        ) : (
          <p className="text-sm text-muted-foreground">
            {disabled ? "Carga deshabilitada" : `Máximo ${MAX_PDF_COUNT} PDFs`}
          </p>
        )}
      </div>
      {hasFiles ? (
        <ul className="grid gap-1.5">
          {files.map((file, index) => (
            <li
              key={fileKey(file)}
              className="flex items-center gap-2 rounded-md border border-border bg-muted/40 px-2.5 py-1.5"
            >
              <FileText className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                disabled={disabled}
                onClick={() => onChange(files.filter((_, i) => i !== index))}
                aria-label={`Quitar ${file.name}`}
              >
                <X className="size-4" aria-hidden="true" />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {invalid && errorMessage ? (
        <p id={errorId} role="alert" className="text-sm text-destructive">
          {errorMessage}
        </p>
      ) : description ? (
        <p id={descriptionId} className="text-xs text-muted-foreground">
          {description}
        </p>
      ) : null}
    </div>
  );
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

  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <PdfFilesField
          files={(field.value as File[] | undefined) ?? []}
          onChange={field.onChange}
          onBlur={field.onBlur}
          invalid={fieldState.invalid}
          errorMessage={fieldState.error?.message}
          label={label}
          description={description}
          disabled={disabled}
          className={className}
          inputId={inputId}
          errorId={errorId}
          descriptionId={descriptionId}
        />
      )}
    />
  );
}

export { FormPdfFiles, MAX_PDF_BYTES, MAX_PDF_COUNT };
