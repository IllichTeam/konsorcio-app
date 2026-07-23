"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "@/lib/zod";

import { authClient } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/auth/session";
import { useDashboardUserActions } from "@/components/dashboard/dashboard-user-context";
import { FormInput } from "@/components/form/form-input";
import { PasswordVisibilityToggle } from "@/components/form/password-visibility-toggle";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const MIN_PASSWORD_LENGTH = 8;

/** Digits only; must include Buenos Aires area code 911 plus ≥8 more digits. */
export function isValidProfilePhone(phone: string): boolean {
  const digits = phone.replace(/\D/g, "");
  if (!digits.includes("911")) {
    return false;
  }
  const withoutAreaCode = digits.replace("911", "");
  return withoutAreaCode.length >= 8;
}

/** Argentine-style numeric postal code: exactly 4 digits. */
export function isValidPostalCode(postalCode: string): boolean {
  return /^\d{4}$/.test(postalCode.trim());
}

/** Rejects empty-looking or number-only fiscal addresses. */
export function isValidFiscalAddress(address: string): boolean {
  const trimmed = address.trim();
  if (trimmed.length < 5) {
    return false;
  }
  if (!/[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/.test(trimmed)) {
    return false;
  }
  const withoutSeparators = trimmed.replace(/[\s\-.,/#º°]/g, "");
  if (/^\d+$/.test(withoutSeparators)) {
    return false;
  }
  return true;
}

const profileSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    email: z.string(),
    phone: z.string(),
    address: z.string(),
    postalCode: z.string(),
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    const phone = values.phone.trim();
    if (phone.length > 0 && !isValidProfilePhone(phone)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["phone"],
        message: "Usá un teléfono con 911 y al menos 8 números más",
      });
    }

    const address = values.address.trim();
    if (address.length > 0 && !isValidFiscalAddress(address)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["address"],
        message: "Se necesita una dirección fiscal real",
      });
    }

    const postalCode = values.postalCode.trim();
    if (postalCode.length > 0 && !isValidPostalCode(postalCode)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["postalCode"],
        message: "El código postal debe tener exactamente 4 dígitos",
      });
    }

    const attemptingPasswordChange =
      values.currentPassword.length > 0 ||
      values.newPassword.length > 0 ||
      values.confirmPassword.length > 0;

    // Touching any security field requires all three to be complete and valid.
    if (!attemptingPasswordChange) {
      return;
    }

    if (values.currentPassword.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["currentPassword"],
        message: "Ingresá tu contraseña actual",
      });
    }

    if (values.newPassword.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Ingresá la nueva contraseña",
      });
    } else if (values.newPassword.length < MIN_PASSWORD_LENGTH) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "Mínimo 8 caracteres",
      });
    } else if (values.currentPassword.length > 0 && values.newPassword === values.currentPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["newPassword"],
        message: "La nueva contraseña debe ser distinta a la actual",
      });
    }

    if (values.confirmPassword.length === 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Repetí la nueva contraseña",
      });
    } else if (
      values.newPassword.length >= MIN_PASSWORD_LENGTH &&
      values.newPassword !== values.confirmPassword
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirmPassword"],
        message: "Las contraseñas no coinciden",
      });
    }
  });

type ProfileValues = z.infer<typeof profileSchema>;

/** Exported for unit tests of profile field rules. */
export { profileSchema, MIN_PASSWORD_LENGTH };

export function isInvalidCurrentPasswordError(error: {
  code?: string | undefined;
  message?: string | undefined;
}) {
  return error.code === "INVALID_PASSWORD" || /invalid password/i.test(error.message ?? "");
}

type ProfileFormProps = {
  user: SessionUser;
};

function optionalField(value: string | null | undefined): string {
  return value ?? "";
}

export function ProfileForm({ user }: ProfileFormProps) {
  const router = useRouter();
  const { patchUser } = useDashboardUserActions();
  const [changePasswordOpen, setChangePasswordOpen] = React.useState(false);
  const [showCurrent, setShowCurrent] = React.useState(false);
  const [showNew, setShowNew] = React.useState(false);
  const [showConfirm, setShowConfirm] = React.useState(false);

  const { control, handleSubmit, formState, reset, watch, setValue, setError, clearErrors } =
    useForm<ProfileValues>({
      resolver: zodResolver(profileSchema),
      defaultValues: {
        name: user.name,
        email: user.email,
        phone: optionalField(user.phone),
        address: optionalField(user.address),
        postalCode: optionalField(user.postalCode),
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      },
    });

  const newPassword = watch("newPassword");
  const currentPassword = watch("currentPassword");
  const isNewPasswordValid = newPassword.length >= MIN_PASSWORD_LENGTH;

  React.useEffect(() => {
    reset({
      name: user.name,
      email: user.email,
      phone: optionalField(user.phone),
      address: optionalField(user.address),
      postalCode: optionalField(user.postalCode),
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }, [user, reset]);

  React.useEffect(() => {
    clearErrors("currentPassword");
  }, [currentPassword, clearErrors]);

  React.useEffect(() => {
    if (isNewPasswordValid) {
      return;
    }
    setValue("confirmPassword", "");
    setShowConfirm(false);
    clearErrors("confirmPassword");
  }, [isNewPasswordValid, setValue, clearErrors]);

  function closePasswordPanel() {
    setChangePasswordOpen(false);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    reset((current) => ({
      ...current,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    }));
  }

  async function onSubmit(values: ProfileValues) {
    const phone = values.phone.trim();
    const address = values.address.trim();
    const postalCode = values.postalCode.trim();
    const shouldChangePassword =
      changePasswordOpen &&
      (values.currentPassword.length > 0 ||
        values.newPassword.length > 0 ||
        values.confirmPassword.length > 0);

    // Verify current password against the credential used to sign in before
    // updating profile fields, so a wrong password never partially saves.
    if (shouldChangePassword) {
      const { error: passwordError } = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (passwordError) {
        if (isInvalidCurrentPasswordError(passwordError)) {
          setError("currentPassword", {
            type: "server",
            message: "La contraseña actual es incorrecta",
          });
        } else {
          toast.error(passwordError.message ?? "No se pudo cambiar la contraseña");
        }
        return;
      }
    }

    const { error: updateError } = await authClient.updateUser({
      name: values.name.trim(),
      phone,
      address,
      postalCode,
    });

    if (updateError) {
      toast.error(updateError.message ?? "No se pudo guardar el perfil");
      return;
    }

    patchUser({
      name: values.name.trim(),
      phone,
      address,
      postalCode,
    });

    toast.success("Perfil actualizado");
    reset({
      name: values.name.trim(),
      email: user.email,
      phone,
      address,
      postalCode,
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setChangePasswordOpen(false);
    setShowCurrent(false);
    setShowNew(false);
    setShowConfirm(false);
    router.refresh();
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <header className="mb-6 space-y-1">
        <h1 className="text-balance text-2xl font-semibold tracking-tight text-foreground sm:text-[1.75rem]">
          Configuración de usuario
        </h1>
        <p className="text-sm text-muted-foreground">
          Actualizá tus datos de contacto y preferencias de cuenta.
        </p>
      </header>

      <Card className="border-0 shadow-card">
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-8 pb-2">
            <section className="space-y-4" aria-labelledby="personal-heading">
              <div className="space-y-1">
                <h2
                  id="personal-heading"
                  className="text-sm font-semibold tracking-tight text-foreground"
                >
                  Información personal
                </h2>
                <p className="text-xs text-muted-foreground">
                  El teléfono, la dirección fiscal y el código postal aparecen en los correos que
                  enviás.
                </p>
              </div>

              <FormInput control={control} name="name" label="Nombre" autoComplete="name" />

              <FormInput
                control={control}
                name="email"
                label="Email"
                type="email"
                readOnly
                disabled
                autoComplete="email"
                description="No se puede cambiar desde aquí"
                labelAction={
                  <span className="inline-flex items-center rounded border border-border bg-secondary px-1.5 py-0.5 text-[11px] font-medium text-muted-foreground">
                    Solo lectura
                  </span>
                }
              />

              <FormInput
                control={control}
                name="phone"
                label="Teléfono"
                autoComplete="tel"
                placeholder="+54911-12345678"
                description="Incluí el código 911 y al menos 8 números más"
              />

              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_7.5rem] sm:items-start">
                <FormInput
                  control={control}
                  name="address"
                  label="Dirección Fiscal"
                  autoComplete="street-address"
                  placeholder="Av. Corrientes 1847, Piso 5 Of. B, CABA"
                />
                <FormInput
                  control={control}
                  name="postalCode"
                  label="Código postal"
                  inputMode="numeric"
                  autoComplete="postal-code"
                  placeholder="1000"
                  maxLength={4}
                  sanitize={(value) => value.replace(/\D/g, "").slice(0, 4)}
                />
              </div>
            </section>

            <section className="space-y-2" aria-labelledby="password-heading">
              <h2
                id="password-heading"
                className="text-sm font-semibold tracking-tight text-foreground"
              >
                Seguridad
              </h2>

              {changePasswordOpen ? (
                <section
                  className="animate-rise-in space-y-4 rounded-md border border-border bg-secondary/40 p-4"
                  aria-labelledby="password-panel-title"
                >
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0 space-y-0.5">
                      <p id="password-panel-title" className="text-sm font-medium text-foreground">
                        Cambiar contraseña
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Completá los tres campos para actualizarla.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-8 shrink-0 bg-card"
                      onClick={closePasswordPanel}
                    >
                      Cancelar
                    </Button>
                  </div>

                  <div className="space-y-3">
                    <FormInput
                      control={control}
                      name="currentPassword"
                      label="Contraseña actual"
                      type={showCurrent ? "text" : "password"}
                      autoComplete="current-password"
                      endAdornment={
                        <PasswordVisibilityToggle
                          visible={showCurrent}
                          onToggle={() => setShowCurrent((v) => !v)}
                        />
                      }
                    />
                    <FormInput
                      control={control}
                      name="newPassword"
                      label="Nueva contraseña"
                      type={showNew ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Mínimo 8 caracteres"
                      endAdornment={
                        <PasswordVisibilityToggle
                          visible={showNew}
                          onToggle={() => setShowNew((v) => !v)}
                        />
                      }
                    />
                    <FormInput
                      control={control}
                      name="confirmPassword"
                      label="Confirmar contraseña"
                      type={showConfirm ? "text" : "password"}
                      autoComplete="new-password"
                      placeholder="Repetí la nueva contraseña"
                      disabled={!isNewPasswordValid}
                      description={
                        isNewPasswordValid
                          ? undefined
                          : "Disponible cuando la nueva contraseña tenga al menos 8 caracteres"
                      }
                      endAdornment={
                        <PasswordVisibilityToggle
                          visible={showConfirm}
                          onToggle={() => setShowConfirm((v) => !v)}
                          disabled={!isNewPasswordValid}
                        />
                      }
                    />
                  </div>
                </section>
              ) : (
                <Button type="button" variant="outline" onClick={() => setChangePasswordOpen(true)}>
                  Cambiar contraseña
                </Button>
              )}
            </section>
          </CardContent>

          <CardFooter>
            <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Guardando…" : "Guardar cambios"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
