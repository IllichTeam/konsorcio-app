"use client";

import { useEffect, useRef, useState, type SyntheticEvent } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";
import { z } from "@/lib/zod";

import { uploadExpenseEmailPdfs } from "@/lib/api/upload-expense-emails";
import { buildMonthlyExpenseMessage } from "@/lib/email/build-monthly-expense-message";
import {
  normalizeExpenseEmailLinkUrl,
  type ExpenseEmailAttachmentRef,
} from "@/lib/schemas/expense-email";
import { useCreateExpenseEmailSend, useExpenseEmailPreview } from "@/hooks/use-expense-emails";
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
  defaultDriveLink?: string | null;
};

const EMPTY_VALUES: SendMonthlyExpenseValues = {
  pdfs: [],
};

type UploadCache = {
  sendId: string;
  attachments: ExpenseEmailAttachmentRef[];
  /** Fingerprint of File list that was uploaded (name+size+lastModified). */
  filesKey: string;
};

function filesFingerprint(files: File[]): string {
  return files.map((file) => `${file.name}:${file.size}:${file.lastModified}`).join("|");
}

function errorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }
  return fallback;
}

export function SendMonthlyExpenseDialog({
  open,
  onOpenChange,
  consortiumId,
  consortiumName,
  defaultDriveLink = null,
}: SendMonthlyExpenseDialogProps) {
  const router = useRouter();
  const createSend = useCreateExpenseEmailSend();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const reservedSendIdRef = useRef<string | null>(null);
  const uploadCacheRef = useRef<UploadCache | null>(null);

  const { data: tenantEmails = [], isLoading: isTenantEmailsLoading } = useTenantEmails(
    open ? consortiumId : "",
  );

  const { control, handleSubmit, reset, formState } = useForm<SendMonthlyExpenseValues>({
    resolver: zodResolver(sendMonthlyExpenseSchema),
    defaultValues: EMPTY_VALUES,
  });

  const pdfs = useWatch({ control, name: "pdfs" }) ?? [];
  const linkUrl = normalizeExpenseEmailLinkUrl(defaultDriveLink);
  const recipientCount = tenantEmails.length;
  const fixedMessage = buildMonthlyExpenseMessage(consortiumName);
  const attachmentNames = pdfs.map((file) => file.name);

  const {
    data: previewData,
    isLoading: isPreviewLoading,
    isError: isPreviewError,
  } = useExpenseEmailPreview(
    {
      consortiumId,
      message: fixedMessage,
      linkUrl,
      attachmentNames,
    },
    { enabled: open },
  );
  // tsgo + TanStack `NoInfer` breaks `previewData?.html` property access; unwrap explicitly.
  const previewHtml = previewData == null ? undefined : (previewData as { html: string }).html;

  useEffect(() => {
    if (!open) {
      return;
    }
    reset(EMPTY_VALUES);
    setIsSubmitting(false);
    reservedSendIdRef.current = null;
    uploadCacheRef.current = null;
  }, [open, reset]);

  function ensureSendId(): string {
    if (!reservedSendIdRef.current) {
      reservedSendIdRef.current = crypto.randomUUID();
    }
    return reservedSendIdRef.current;
  }

  function handleClose(nextOpen: boolean) {
    if (isSubmitting) {
      return;
    }
    if (!nextOpen) {
      reset(EMPTY_VALUES);
      reservedSendIdRef.current = null;
      uploadCacheRef.current = null;
    }
    onOpenChange(nextOpen);
  }

  async function onSubmit(values: SendMonthlyExpenseValues) {
    if (isSubmitting) {
      return;
    }

    if (recipientCount === 0) {
      toast.error("No hay emails de inquilinos registrados para este consorcio");
      return;
    }

    setIsSubmitting(true);

    try {
      const sendId = ensureSendId();
      const filesKey = filesFingerprint(values.pdfs);
      let attachmentRefs = uploadCacheRef.current?.attachments;

      const cacheMatches =
        uploadCacheRef.current &&
        uploadCacheRef.current.sendId === sendId &&
        uploadCacheRef.current.filesKey === filesKey;

      if (!cacheMatches) {
        const uploaded = await uploadExpenseEmailPdfs({
          consortiumId,
          sendId,
          files: values.pdfs,
        });
        attachmentRefs = uploaded.attachments;
        uploadCacheRef.current = {
          sendId: uploaded.sendId,
          attachments: uploaded.attachments,
          filesKey,
        };
        reservedSendIdRef.current = uploaded.sendId;
      }

      if (!attachmentRefs?.length) {
        throw new Error("No se pudieron subir los PDFs");
      }

      const result = await createSend.mutateAsync({
        consortiumId,
        sendId: reservedSendIdRef.current ?? sendId,
        recipients: tenantEmails.map((row) => row.email),
        message: fixedMessage,
        linkUrl,
        attachmentRefs,
      });

      toast.success("Envío iniciado");
      onOpenChange(false);
      reservedSendIdRef.current = null;
      uploadCacheRef.current = null;
      router.push(`/consorcios/${consortiumId}/envios/${result.sendId}`);
    } catch (error) {
      toast.error(errorMessage(error, "No se pudo iniciar el envío"));
      setIsSubmitting(false);
    }
  }

  const canSubmit =
    !isSubmitting &&
    !createSend.isPending &&
    !isTenantEmailsLoading &&
    recipientCount > 0 &&
    pdfs.length >= 1;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-h-[min(92dvh,56rem)] overflow-y-auto sm:max-w-[48rem]">
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
            html={previewHtml}
            isLoading={isPreviewLoading && !previewHtml}
            isError={isPreviewError}
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
              {isSubmitting ? "Enviando…" : "Enviar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

type ExpenseEmailPreviewProps = {
  html?: string;
  isLoading: boolean;
  isError: boolean;
};

const PREVIEW_MIN_HEIGHT_PX = 192;

function ExpenseEmailPreview({ html, isLoading, isError }: ExpenseEmailPreviewProps) {
  const [iframeHeight, setIframeHeight] = useState<number | null>(null);

  useEffect(() => {
    setIframeHeight(null);
  }, [html]);

  function handleIframeLoad(event: SyntheticEvent<HTMLIFrameElement>) {
    const doc = event.currentTarget.contentDocument;
    if (!doc?.documentElement && !doc?.body) {
      return;
    }
    const nextHeight = Math.max(
      doc.documentElement?.scrollHeight ?? 0,
      doc.body?.scrollHeight ?? 0,
      PREVIEW_MIN_HEIGHT_PX,
    );
    setIframeHeight(nextHeight);
  }

  return (
    <div className="grid gap-2">
      <p className="text-sm font-medium text-foreground">Vista previa del correo</p>
      <div className="overflow-hidden rounded-lg border border-border bg-muted/20 shadow-card">
        {isLoading ? (
          <p className="p-4 text-sm text-muted-foreground">Cargando vista previa…</p>
        ) : isError ? (
          <p className="p-4 text-sm text-destructive">
            No se pudo cargar la vista previa del correo.
          </p>
        ) : html ? (
          <iframe
            title="Vista previa del correo de expensa mensual"
            srcDoc={html}
            sandbox="allow-same-origin"
            onLoad={handleIframeLoad}
            className="w-full border-0 bg-card"
            style={{
              height: iframeHeight ?? PREVIEW_MIN_HEIGHT_PX,
              minHeight: PREVIEW_MIN_HEIGHT_PX,
            }}
          />
        ) : (
          <p className="p-4 text-sm text-muted-foreground">
            La vista previa aparecerá cuando el correo esté listo.
          </p>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        Misma plantilla que el correo real (saludo fijo Vecino/a, mensaje del mes, link, alias y
        PDFs).
      </p>
    </div>
  );
}

export { buildMonthlyExpenseMessage };
