"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { Send } from "lucide-react";
import { useForm } from "react-hook-form";

import { useEmailRecipients, useSendEmail } from "@/hooks/use-emails";
import { FormInput } from "@/components/form/form-input";
import { FormRecipientSelect } from "@/components/form/form-recipient-select";
import { FormTextarea } from "@/components/form/form-textarea";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { sendEmailInputSchema, type SendEmailInput } from "@/lib/schemas/email";

type NotificacionFormValues = SendEmailInput;

const emptyValues: NotificacionFormValues = {
  recipients: [],
  subject: "",
  body: "",
};

export function NotificacionesScreen() {
  const {
    data: recipientOptions = [],
    isLoading: isLoadingRecipients,
    isError: isRecipientsError,
  } = useEmailRecipients();
  const sendEmail = useSendEmail();

  const { control, handleSubmit, reset, formState } = useForm<NotificacionFormValues>({
    resolver: zodResolver(sendEmailInputSchema),
    defaultValues: emptyValues,
  });

  const isSending = sendEmail.isPending;

  async function onSubmit(values: NotificacionFormValues) {
    try {
      await sendEmail.mutateAsync(values);
      reset(emptyValues);
    } catch {
      // The `useSendEmail` mutation already surfaces a toast on failure.
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-lg font-semibold tracking-tight text-foreground">Notificaciones</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Envía un correo a uno o varios destinatarios de la plataforma.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nueva notificación</CardTitle>
        </CardHeader>
        <CardContent>
          {isRecipientsError ? (
            <p className="text-sm text-destructive">No se pudieron cargar los destinatarios.</p>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
              <FormRecipientSelect
                control={control}
                name="recipients"
                label="Destinatarios"
                options={recipientOptions}
                loading={isLoadingRecipients}
                disabled={isSending}
              />

              <FormInput
                control={control}
                name="subject"
                label="Asunto"
                autoComplete="off"
                disabled={isSending}
              />

              <FormTextarea
                control={control}
                name="body"
                label="Mensaje"
                placeholder="Escribe el mensaje de la notificación..."
                rows={8}
                disabled={isSending}
              />

              <div className="flex justify-end">
                <Button type="submit" disabled={formState.isSubmitting || isSending}>
                  <Send className="size-4" aria-hidden="true" />
                  {isSending ? "Enviando…" : "Enviar"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
