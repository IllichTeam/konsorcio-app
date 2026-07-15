"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "@/lib/zod";

import { authClient } from "@/lib/auth-client";
import { defaultAuthenticatedPath } from "@/lib/navigation/dashboard-nav";
import { FormInput } from "@/components/form/form-input";
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="grid gap-5">
      <FormInput
        control={control}
        name="email"
        label="Correo electrónico"
        type="email"
        autoComplete="email"
        placeholder="tu@correo.com"
      />
      <FormInput
        control={control}
        name="password"
        label="Contraseña"
        labelAction={
          <Link
            href="/recuperar-contrasena"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ¿Olvidaste tu contraseña?
          </Link>
        }
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        placeholder="••••••••"
        endAdornment={
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="absolute top-1/2 right-1 -translate-y-1/2 text-muted-foreground"
            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? <EyeOff /> : <Eye />}
          </Button>
        }
      />
      <Button type="submit" disabled={formState.isSubmitting}>
        {formState.isSubmitting ? "Iniciando sesión…" : "Iniciar sesión"}
      </Button>
    </form>
  );
}
