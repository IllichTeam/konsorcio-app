"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "@/lib/zod";

import { useConsortium, useCreateConsortium, useUpdateConsortium } from "@/hooks/use-consortiums";
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

const consortiumFormSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio"),
  location: z.string().min(1, "La ubicación es obligatoria"),
  paymentAlias: z.string(),
  email: z.union([z.email("Correo inválido"), z.literal("")]),
  driveLink: z.string(),
});

type ConsortiumFormValues = z.infer<typeof consortiumFormSchema>;

const emptyValues: ConsortiumFormValues = {
  name: "",
  location: "",
  paymentAlias: "",
  email: "",
  driveLink: "",
};

type ConsortiumFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consortiumId?: string | null;
};

export function ConsortiumFormDialog({
  open,
  onOpenChange,
  consortiumId = null,
}: ConsortiumFormDialogProps) {
  const isEditMode = Boolean(consortiumId);
  const { data: consortium, isLoading: isLoadingConsortium } = useConsortium(consortiumId ?? "");
  const createConsortium = useCreateConsortium();
  const updateConsortium = useUpdateConsortium();
  const { control, handleSubmit, reset, formState } = useForm<ConsortiumFormValues>({
    resolver: zodResolver(consortiumFormSchema),
    defaultValues: emptyValues,
  });

  const isSaving = createConsortium.isPending || updateConsortium.isPending;
  const isFormReady = !isEditMode || Boolean(consortium);

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEditMode && consortium) {
      reset({
        name: consortium.name,
        location: consortium.location,
        paymentAlias: consortium.paymentAlias ?? "",
        email: consortium.billingEmail ?? "",
        driveLink: consortium.driveLink ?? "",
      });
      return;
    }

    if (!isEditMode) {
      reset(emptyValues);
    }
  }, [open, isEditMode, consortium, reset]);

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      reset(emptyValues);
    }

    onOpenChange(nextOpen);
  }

  async function onSubmit(values: ConsortiumFormValues) {
    const payload = {
      name: values.name,
      location: values.location,
      paymentAlias: values.paymentAlias.trim() === "" ? null : values.paymentAlias,
      billingEmail: values.email.trim() === "" ? null : values.email,
      driveLink: values.driveLink.trim() === "" ? null : values.driveLink,
    };

    try {
      if (isEditMode && consortiumId) {
        await updateConsortium.mutateAsync({ id: consortiumId, ...payload });
        toast.success("Consorcio actualizado");
      } else {
        await createConsortium.mutateAsync(payload);
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

        {isEditMode && isLoadingConsortium ? (
          <div className="grid gap-4">
            {(["name", "location", "alias", "email", "drive"] as const).map((field) => (
              <Skeleton key={field} className="h-10 w-full" />
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
