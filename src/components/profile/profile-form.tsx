"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { useProfile, useUpdateProfile } from "@/hooks/use-profile";
import { FormInput } from "@/components/form/form-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

const profileSchema = z
  .object({
    name: z.string().min(1, "El nombre es obligatorio"),
    email: z.string().email("Email inválido"),
    phone: z.string().min(1, "El teléfono es obligatorio"),
    address: z.string().min(1, "La dirección es obligatoria"),
    currentPassword: z.string(),
    newPassword: z.string(),
  })
  .superRefine((values, ctx) => {
    if (values.newPassword.length > 0) {
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
    }
  });

type ProfileValues = z.infer<typeof profileSchema>;

type ProfileFormProps = {
  userName: string;
};

export function ProfileForm({ userName }: ProfileFormProps) {
  const { data: profile, isLoading, isError } = useProfile();
  const updateProfileMutation = useUpdateProfile();
  const [showCurrent, setShowCurrent] = React.useState(false);

  const { control, handleSubmit, formState, reset } = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      currentPassword: "",
      newPassword: "",
    },
    values: profile
      ? {
          name: profile.name,
          email: profile.email,
          phone: profile.phone,
          address: profile.address,
          currentPassword: "",
          newPassword: "",
        }
      : undefined,
  });

  async function onSubmit(values: ProfileValues) {
    if (!profile) {
      return;
    }

    try {
      await updateProfileMutation.mutateAsync({
        id: profile.id,
        name: values.name,
        email: values.email,
        phone: values.phone,
        address: values.address,
      });
      toast.success("Perfil actualizado");
      reset({ ...values, currentPassword: "", newPassword: "" });
    } catch {
      toast.error("No se pudo guardar el perfil");
    }
  }

  if (isLoading) {
    return (
      <div className="w-full max-w-xl space-y-4">
        <Skeleton className="h-6 w-72" />
        <Skeleton className="h-96 w-full rounded-lg" />
      </div>
    );
  }

  if (isError || !profile) {
    return <p className="text-sm text-destructive">No se pudo cargar el perfil.</p>;
  }

  return (
    <div className="w-full max-w-xl">
      <h1 className="mb-4 text-lg font-semibold tracking-tight text-foreground">
        Configuración de usuario <span className="text-muted-foreground">· {userName}</span>
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
                autoComplete="email"
              />

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput control={control} name="phone" label="Teléfono" autoComplete="tel" />
                <FormInput
                  control={control}
                  name="address"
                  label="Dirección"
                  autoComplete="street-address"
                />
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-semibold text-foreground">Cambiar contraseña</h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormInput
                  control={control}
                  name="currentPassword"
                  label="Contraseña actual"
                  type={showCurrent ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="••••••••"
                  endAdornment={
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
                      aria-label={showCurrent ? "Ocultar contraseña" : "Mostrar contraseña"}
                      onClick={() => setShowCurrent((v) => !v)}
                    >
                      {showCurrent ? <EyeOff /> : <Eye />}
                    </Button>
                  }
                />
                <FormInput
                  control={control}
                  name="newPassword"
                  label="Nueva contraseña"
                  type="password"
                  autoComplete="new-password"
                  placeholder="••••••••"
                />
              </div>
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
