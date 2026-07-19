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

const profileSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    email: z.string(),
    phone: z.string(),
    address: z.string(),
    currentPassword: z.string(),
    newPassword: z.string(),
    confirmPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword.length > 0 || values.confirmPassword.length > 0) {
      if (values.newPassword.length < 8) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["newPassword"],
          message: "Mínimo 8 caracteres",
        });
      }
      if (values.currentPassword.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["currentPassword"],
          message: "Ingresa tu contraseña actual",
        });
      }
      if (values.confirmPassword.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmPassword"],
          message: "Repite la nueva contraseña",
        });
      } else if (values.newPassword !== values.confirmPassword) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["confirmPassword"],
          message: "Las contraseñas no coinciden",
        });
      }
    }
  });

type ProfileValues = z.infer<typeof profileSchema>;

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

  const { control, handleSubmit, formState, reset, watch } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user.name,
      email: user.email,
      phone: optionalField(user.phone),
      address: optionalField(user.address),
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const displayName = watch("name") || user.name;

  React.useEffect(() => {
    reset({
      name: user.name,
      email: user.email,
      phone: optionalField(user.phone),
      address: optionalField(user.address),
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
  }, [user, reset]);

  async function onSubmit(values: ProfileValues) {
    const phone = values.phone.trim();
    const address = values.address.trim();

    const { error: updateError } = await authClient.updateUser({
      name: values.name.trim(),
      phone,
      address,
    });

    if (updateError) {
      toast.error(updateError.message ?? "No se pudo guardar el perfil");
      return;
    }

    if (changePasswordOpen && values.newPassword.length > 0) {
      const { error: passwordError } = await authClient.changePassword({
        currentPassword: values.currentPassword,
        newPassword: values.newPassword,
      });

      if (passwordError) {
        toast.error(passwordError.message ?? "No se pudo cambiar la contraseña");
        return;
      }
    }

    patchUser({
      name: values.name.trim(),
      phone,
      address,
    });

    toast.success("Perfil actualizado");
    reset({
      name: values.name.trim(),
      email: user.email,
      phone,
      address,
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
      <h1 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
        Configuración de usuario <span className="text-muted-foreground">· {displayName}</span>
      </h1>

      <Card>
        <form onSubmit={handleSubmit(onSubmit)} noValidate>
          <CardContent className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Información personal</h2>

              <FormInput control={control} name="name" label="Nombre" autoComplete="name" />

              <FormInput
                control={control}
                name="email"
                label="Email"
                type="email"
                readOnly
                disabled
                autoComplete="email"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  control={control}
                  name="phone"
                  label="Teléfono"
                  autoComplete="tel"
                  placeholder="+54911-12345678"
                />
                <FormInput
                  control={control}
                  name="address"
                  label="Dirección Fiscal"
                  autoComplete="street-address"
                  placeholder="CABA"
                />
              </div>
            </section>

            <section className="space-y-4 pb-4">
              {!changePasswordOpen ? (
                <div className="flex justify-center">
                  <Button
                    type="button"
                    className="w-[90%] bg-primary/70 text-primary-foreground hover:bg-primary/60"
                    onClick={() => setChangePasswordOpen(true)}
                  >
                    Cambiar contraseña
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between gap-2">
                    <h2 className="text-sm font-semibold text-foreground">Cambiar contraseña</h2>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-muted-foreground"
                      onClick={() => {
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
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormInput
                      control={control}
                      name="currentPassword"
                      label="Contraseña actual"
                      type={showCurrent ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
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
                      placeholder="••••••••"
                      endAdornment={
                        <PasswordVisibilityToggle
                          visible={showNew}
                          onToggle={() => setShowNew((v) => !v)}
                        />
                      }
                    />
                  </div>

                  <FormInput
                    control={control}
                    name="confirmPassword"
                    label="Confirmar nueva contraseña"
                    type={showConfirm ? "text" : "password"}
                    autoComplete="new-password"
                    placeholder="••••••••"
                    endAdornment={
                      <PasswordVisibilityToggle
                        visible={showConfirm}
                        onToggle={() => setShowConfirm((v) => !v)}
                      />
                    }
                  />
                </>
              )}
            </section>
          </CardContent>

          <CardFooter className="border-t border-border">
            <Button type="submit" className="w-full" disabled={formState.isSubmitting}>
              {formState.isSubmitting ? "Guardando…" : "Guardar cambios"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
