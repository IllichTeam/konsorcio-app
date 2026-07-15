"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useConsorcio, useCreateConsorcio, useUpdateConsorcio } from "@/hooks/use-consorcios";
import { FormInput } from "@/components/form/form-input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";

const consorcioFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  location: z.string().min(1, "La ubicación es obligatoria"),
  paymentAlias: z.string().min(1, "El alias de cobro es obligatorio"),
  email: z.email("Correo inválido"),
  driveLink: z.string().min(1, "El link de drive es obligatorio"),
});

type ConsorcioFormValues = z.infer<typeof consorcioFormSchema>;

const emptyValues: ConsorcioFormValues = {
  name: "",
  location: "",
  paymentAlias: "",
  email: "",
  driveLink: "",
};

type ConsorcioFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consorcioId?: string | null;
};

export function ConsorcioFormDialog({
  open,
  onOpenChange,
  consorcioId = null,
}: ConsorcioFormDialogProps) {
  const isEditMode = Boolean(consorcioId);
  const { data: consorcio, isLoading: isLoadingConsorcio } = useConsorcio(consorcioId ?? "");
  const createConsorcio = useCreateConsorcio();
  const updateConsorcio = useUpdateConsorcio();
  const { control, handleSubmit, reset, formState } = useForm<ConsorcioFormValues>({
    resolver: zodResolver(consorcioFormSchema),
    defaultValues: emptyValues,
  });

  const isSaving = createConsorcio.isPending || updateConsorcio.isPending;
  const isFormReady = !isEditMode || Boolean(consorcio);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEditMode && consorcio) {
      reset({
        name: consorcio.name,
        location: consorcio.location,
        paymentAlias: consorcio.paymentAlias,
        email: consorcio.billingEmail,
        driveLink: consorcio.driveLink,
      });
      return;
    }

    if (!isEditMode) {
      reset(emptyValues);
    }
  }, [open, isEditMode, consorcio, reset]);

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      reset(emptyValues);
    }

    onOpenChange(nextOpen);
  }

  async function onSubmit(values: ConsorcioFormValues) {
    const payload = {
      name: values.name,
      location: values.location,
      paymentAlias: values.paymentAlias,
      billingEmail: values.email,
      driveLink: values.driveLink,
    };

    try {
      if (isEditMode && consorcioId) {
        await updateConsorcio.mutateAsync({ id: consorcioId, ...payload });
        toast.success("Consorcio actualizado");
      } else {
        await createConsorcio.mutateAsync(payload);
        toast.success("Consorcio creado", { toasterId: "center" });
      }

      reset(emptyValues);
      onOpenChange(false);
    } catch {
      toast.error(
        isEditMode ? "No se pudo actualizar el consorcio" : "No se pudo crear el consorcio",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-base font-bold tracking-wide">
            {isEditMode ? "Editar consorcio" : "Agregar nuevo consorcio"}
          </DialogTitle>
        </DialogHeader>

        {isEditMode && isLoadingConsorcio ? (
          <div className="grid gap-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-10 w-full" />
            ))}
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-4">
            <FormInput
              control={control}
              name="name"
              label="Nombre del consorcio"
              autoComplete="off"
            />
            <FormInput control={control} name="location" label="Ubicación" autoComplete="off" />
            <FormInput
              control={control}
              name="paymentAlias"
              label="Alias de cobro"
              autoComplete="off"
            />
            <FormInput
              control={control}
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
            />
            <FormInput
              control={control}
              name="driveLink"
              label="Link de drive"
              type="url"
              autoComplete="off"
              placeholder="https://drive.google.com/..."
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!isFormReady || formState.isSubmitting || isSaving}>
                {formState.isSubmitting || isSaving ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
