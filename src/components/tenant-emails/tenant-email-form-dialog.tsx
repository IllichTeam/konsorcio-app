"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "@/lib/zod";

import { useCreateTenantEmail, useUpdateTenantEmail } from "@/hooks/use-tenant-emails";
import { FormInput } from "@/components/form/form-input";
import { FormSelect } from "@/components/form/form-select";
import { UnitBadge } from "@/components/tenant-emails/tenant-email-badges";
import { sanitizeDigitsOnly, sanitizeLettersOnly } from "@/lib/form/input-sanitize";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { TenantEmail, TenantEmailContactType } from "@/types/tenant-email";

const contactTypeOptions: { value: TenantEmailContactType; label: string }[] = [
  { value: "propietario", label: "Propietario" },
  { value: "inquilino", label: "Inquilino" },
];

const optionalNumericField = z.string().refine((value) => value === "" || /^\d+$/.test(value), {
  message: "Solo se permiten números",
});

const optionalLetterField = z
  .string()
  .refine((value) => value === "" || /^[A-Za-zÁÉÍÓÚáéíóúÑñ]+$/.test(value), {
    message: "Solo se permiten letras",
  });

const createFormSchema = z
  .object({
    floor: optionalNumericField,
    departmentNumber: optionalNumericField,
    letter: optionalLetterField,
    email: z.email("Correo inválido"),
    contactType: z.enum(["propietario", "inquilino"]),
  })
  .refine(
    (values) =>
      values.floor.trim().length > 0 ||
      values.departmentNumber.trim().length > 0 ||
      values.letter.trim().length > 0,
    {
      message: "Ingresa al menos un dato de la unidad funcional",
      path: ["floor"],
    },
  );

const editFormSchema = z.object({
  email: z.email("Correo inválido"),
  contactType: z.enum(["propietario", "inquilino"]),
});

type CreateFormValues = z.infer<typeof createFormSchema>;
type EditFormValues = z.infer<typeof editFormSchema>;

const emptyCreateValues: CreateFormValues = {
  floor: "",
  departmentNumber: "",
  letter: "",
  email: "",
  contactType: "propietario",
};

type TenantEmailFormDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  consorcioId: string;
  editingEntry?: TenantEmail | null;
};

export function TenantEmailFormDialog({
  open,
  onOpenChange,
  consorcioId,
  editingEntry = null,
}: TenantEmailFormDialogProps) {
  const isEditMode = Boolean(editingEntry);
  const createTenantEmail = useCreateTenantEmail(consorcioId);
  const updateTenantEmail = useUpdateTenantEmail(consorcioId);

  const createForm = useForm<CreateFormValues>({
    resolver: zodResolver(createFormSchema),
    defaultValues: emptyCreateValues,
  });

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: { email: "", contactType: "propietario" },
  });

  const isSaving = createTenantEmail.isPending || updateTenantEmail.isPending;

  useEffect(() => {
    if (!open) {
      return;
    }

    if (isEditMode && editingEntry) {
      editForm.reset({
        email: editingEntry.email,
        contactType: editingEntry.contactType,
      });
      return;
    }

    createForm.reset(emptyCreateValues);
  }, [open, isEditMode, editingEntry, createForm, editForm]);

  function handleClose(nextOpen: boolean) {
    if (!nextOpen) {
      createForm.reset(emptyCreateValues);
      editForm.reset({ email: "", contactType: "propietario" });
    }

    onOpenChange(nextOpen);
  }

  async function onSubmitCreate(values: CreateFormValues) {
    try {
      await createTenantEmail.mutateAsync({
        consorcioId,
        floor: values.floor,
        departmentNumber: values.departmentNumber,
        letter: values.letter,
        email: values.email,
        contactType: values.contactType,
      });
      toast.success("Email agregado");
      createForm.reset(emptyCreateValues);
      onOpenChange(false);
    } catch {
      toast.error("No se pudo agregar el email");
    }
  }

  async function onSubmitEdit(values: EditFormValues) {
    if (!editingEntry) {
      return;
    }

    try {
      await updateTenantEmail.mutateAsync({
        id: editingEntry.id,
        consorcioId,
        email: values.email,
        contactType: values.contactType,
      });
      toast.success("Email actualizado");
      onOpenChange(false);
    } catch {
      toast.error("No se pudo actualizar el email");
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditMode ? "Editar email" : "Agregar email"}</DialogTitle>
        </DialogHeader>

        {isEditMode && editingEntry ? (
          <form onSubmit={editForm.handleSubmit(onSubmitEdit)} noValidate className="grid gap-4">
            <div className="grid gap-2">
              <p className="text-sm font-medium text-foreground">Unidad funcional</p>
              <UnitBadge entry={editingEntry} />
            </div>
            <FormInput
              control={editForm.control}
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
            />
            <FormSelect
              control={editForm.control}
              name="contactType"
              label="Tipo de contacto"
              placeholder="Seleccionar tipo"
              options={contactTypeOptions}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={editForm.formState.isSubmitting || isSaving}>
                {isSaving ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        ) : (
          <form
            onSubmit={createForm.handleSubmit(onSubmitCreate)}
            noValidate
            className="grid gap-4"
          >
            <FormInput
              control={createForm.control}
              name="floor"
              label="Piso"
              autoComplete="off"
              placeholder="Ej: 1"
              inputMode="numeric"
              pattern="[0-9]*"
              sanitize={sanitizeDigitsOnly}
            />
            <FormInput
              control={createForm.control}
              name="departmentNumber"
              label="Número de departamento"
              autoComplete="off"
              placeholder="Ej: 2"
              inputMode="numeric"
              pattern="[0-9]*"
              sanitize={sanitizeDigitsOnly}
            />
            <FormInput
              control={createForm.control}
              name="letter"
              label="Letra"
              autoComplete="off"
              placeholder="Ej: A"
              autoCapitalize="characters"
              pattern="[A-Za-zÁÉÍÓÚáéíóúÑñ]*"
              sanitize={sanitizeLettersOnly}
            />
            <FormInput
              control={createForm.control}
              name="email"
              label="Email"
              type="email"
              autoComplete="email"
            />
            <FormSelect
              control={createForm.control}
              name="contactType"
              label="Tipo de contacto"
              placeholder="Seleccionar tipo"
              options={contactTypeOptions}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={createForm.formState.isSubmitting || isSaving}>
                {isSaving ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
