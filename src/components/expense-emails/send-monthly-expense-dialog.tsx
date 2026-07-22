"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "@/lib/zod";

import { useTenantEmails } from "@/hooks/use-tenant-emails";
import { FormPdfFiles, MAX_PDF_BYTES, MAX_PDF_COUNT } from "@/components/form/form-pdf-files";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MONTHS_ES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

/** Fixed body used in preview now and at send time later. */
export function buildMonthlyExpenseMessage(consortiumName: string, date = new Date()): string {
  const month = MONTHS_ES[date.getMonth()];
  const year = date.getFullYear();
  return `Hola Vecino/a, nos complace acercarle las expensas mensuales del consorcio ${consortiumName.trim()} correspondientes a ${month} de ${year}.`;
}

const sendMonthlyExpenseSchema = z.object({
  pdfs: z
    .array(z.custom<File>((value) => value instanceof File))
    .min(1, "Adjuntá al menos un PDF")
    .max(MAX_PDF_COUNT, `Máximo ${MAX_PDF_COUNT} PDFs`)
    .superRefine((files, ctx) => {
      for (const file of files) {
        const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
        if (!isPdf) {
          ctx.addIssue({
            code: "custom",
            message: `"${file.name}" no es un PDF`,
          });
          return;
        }
        if (file.size > MAX_PDF_BYTES) {
          ctx.addIssue({
            code: "custom",
            message: `"${file.name}" supera los 5 MB`,
          });
          return;
        }
      }
    }),
});

type SendMonthlyExpenseValues = z.infer<typeof sendMonthlyExpenseSchema>;

type SendMonthlyExpenseDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consortiumId: string;
  consortiumName: string;
  paymentAlias?: string | null;
  defaultDriveLink?: string | null;
};

const EMPTY_VALUES: SendMonthlyExpenseValues = {
  pdfs: [],
};

export function SendMonthlyExpenseDialog({
  open,
  onOpenChange,
  consortiumId,
  consortiumName,
  paymentAlias = null,
  defaultDriveLink = null,
}: SendMonthlyExpenseDialogProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { data: tenantEmails = [], isLoading: isTenantEmailsLoading } = useTenantEmails(
    open ? consortiumId : "",
  );

  const { control, handleSubmit, reset, formState } = useForm<SendMonthlyExpenseValues>({
    resolver: zodResolver(sendMonthlyExpenseSchema),
    defaultValues: EMPTY_VALUES,
  });

  const pdfs = useWatch({ control, name: "pdfs" }) ?? [];
  const linkUrl = defaultDriveLink?.trim() ?? "";
  const recipientCount = tenantEmails.length;
  const fixedMessage = buildMonthlyExpenseMessage(consortiumName);

  useEffect(() => {
    if (!open) {
      return;
    }
    reset(EMPTY_VALUES);
    setIsSubmitting(false);
  }, [open, reset]);

  function handleClose(nextOpen: boolean) {
    if (isSubmitting) {
      return;
    }
    if (!nextOpen) {
      reset(EMPTY_VALUES);
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(_values: SendMonthlyExpenseValues) {
    if (recipientCount === 0) {
      toast.error("No hay emails de inquilinos registrados para este consorcio");
      return;
    }

    setIsSubmitting(true);
    // UI mock: navigate to status screen; real upload/send lands in a later pass.
    // Message at send time: buildMonthlyExpenseMessage(consortiumName, new Date())
    const placeholderSendId = crypto.randomUUID();
    toast.success("Envío iniciado (maqueta)");
    onOpenChange(false);
    router.push(`/consorcios/${consortiumId}/envios/${placeholderSendId}`);
  }

  const canSubmit =
    !isSubmitting && !isTenantEmailsLoading && recipientCount > 0 && pdfs.length >= 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[min(90dvh,44rem)] overflow-y-auto sm:max-w-[39.6rem]">
        <DialogHeader>
          <DialogTitle>Enviar expensa mensual</DialogTitle>
          <DialogDescription className="sr-only">
            Adjuntá los PDFs para enviar la expensa mensual a todos los destinatarios del consorcio.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
          <FormPdfFiles
            control={control}
            name="pdfs"
            label="PDFs a adjuntar"
            description={`Entre 1 y ${MAX_PDF_COUNT} archivos PDF, máximo 5 MB cada uno.`}
            disabled={isSubmitting}
          />

          {isTenantEmailsLoading ? (
            <p className="text-sm font-medium text-muted-foreground">Cargando destinatarios…</p>
          ) : recipientCount === 0 ? (
            <p className="text-sm font-medium text-destructive">
              No hay emails registrados. Agregá destinatarios antes de enviar.
            </p>
          ) : (
            <p className="text-sm font-medium text-primary">
              Se enviará a todos los inquilinos y propietarios registrados en{" "}
              {consortiumName.trim()}.
              <br />({recipientCount} personas)
            </p>
          )}

          <ExpenseEmailPreview
            consortiumName={consortiumName}
            paymentAlias={paymentAlias}
            message={fixedMessage}
            linkUrl={linkUrl}
            attachmentNames={pdfs.map((file) => file.name)}
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={!canSubmit || formState.isSubmitting}>
              {isSubmitting ? "Iniciando…" : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ExpenseEmailPreviewProps = {
  consortiumName: string;
  paymentAlias?: string | null;
  message: string;
  linkUrl: string;
  attachmentNames: string[];
};

function ExpenseEmailPreview({
  consortiumName,
  paymentAlias,
  message,
  linkUrl,
  attachmentNames,
}: ExpenseEmailPreviewProps) {
  const alias = paymentAlias?.trim();

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-foreground">Vista previa del correo</p>
      <div className="rounded-lg border border-border bg-muted/20 p-4 shadow-card">
        <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
          Asunto · Expensa Mensual
        </p>
        <div className="mt-3 space-y-3 rounded-md border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">
            Administración de <span className="text-foreground">{consortiumName.trim()}</span>
          </p>
          <p className="whitespace-pre-wrap text-sm text-foreground">{message}</p>
          {alias || linkUrl ? (
            <div className="space-y-2 border-t border-border pt-3">
              <p className="text-xs font-medium text-muted-foreground">
                A continuación dejamos información relevante:
              </p>
              {alias ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Alias de cobro: </span>
                  <span className="text-foreground">{alias}</span>
                </p>
              ) : null}
              {linkUrl ? (
                <p className="text-sm">
                  <span className="text-muted-foreground">Link: </span>
                  <span className="break-all text-primary underline underline-offset-2">
                    {linkUrl}
                  </span>
                </p>
              ) : null}
            </div>
          ) : null}
          {attachmentNames.length > 0 ? (
            <div>
              <p className="text-xs font-medium text-muted-foreground">Adjuntos</p>
              <ul className="mt-1 list-inside list-disc text-sm text-foreground">
                {attachmentNames.map((name) => (
                  <li key={name}>{name}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p className="text-xs text-muted-foreground">Los PDFs adjuntos se listarán acá.</p>
          )}
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Esto es una previsualización: el email irá con el estilo y la estructura de la plantilla
        realizada.
      </p>
    </div>
  );
}
