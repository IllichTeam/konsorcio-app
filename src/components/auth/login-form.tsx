"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "@/lib/zod";

import { authClient } from "@/lib/auth-client";
import { defaultAuthenticatedPath } from "@/lib/navigation/dashboard-nav";
import { FormInput } from "@/components/form/form-input";
import { PasswordVisibilityToggle } from "@/components/form/password-visibility-toggle";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z.email("Correo inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});

type LoginValues = z.infer<typeof loginSchema>;

export function LoginForm() {
  const router = useRouter();
  const [showPassword, setShowPassword] = React.useState(false);
  const { control, handleSubmit, formState } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginValues) {
    const { error } = await authClient.signIn.email({
      email: values.email,
      password: values.password,
    });

    if (error) {
      toast.error(error.message ?? "Credenciales inválidas");
      return;
    }

    toast.success("Sesión iniciada");
    router.push(defaultAuthenticatedPath);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate autoComplete="on" className="grid gap-5">
      <FormInput
        control={control}
        name="email"
        label="Correo electrónico"
        type="email"
        autoComplete="username"
        placeholder="tu@correo.com"
      />
      <FormInput
        control={control}
        name="password"
        label="Contraseña"
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        placeholder="••••••••"
        endAdornment={
          <PasswordVisibilityToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
        }
      />
      <Button
        type="submit"
        disabled={formState.isSubmitting}
        aria-busy={formState.isSubmitting || undefined}
      >
        {formState.isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
      </Button>
      <p className="text-right">
        <Link
          href="/recuperar-contrasena"
          className="text-sm text-muted-foreground hover:text-foreground"
        >
          ¿Olvidaste tu contraseña?
        </Link>
      </p>
    </form>
  );
}
