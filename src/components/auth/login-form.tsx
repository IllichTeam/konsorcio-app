"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Eye, EyeOff } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { signIn } from "@/lib/auth/actions";
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
    const result = await signIn(values);

    if (!result.success) {
      toast.error(result.error);
      return;
    }

    toast.success("Sesión iniciada");
    router.push("/dashboard");
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
        type={showPassword ? "text" : "password"}
        autoComplete="current-password"
        placeholder="••••••••"
        labelAction={
          <Link
            href="/forgot-password"
            className="text-sm text-muted-foreground underline-offset-4 hover:underline"
          >
            Olvidé mi contraseña
          </Link>
        }
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
