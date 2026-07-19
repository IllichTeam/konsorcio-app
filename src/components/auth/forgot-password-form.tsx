"use client";

import * as React from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "@/lib/zod";

import { authClient } from "@/lib/auth-client";
import { FormInput } from "@/components/form/form-input";
import { FormInputOTP } from "@/components/form/form-input-otp";
import { PasswordVisibilityToggle } from "@/components/form/password-visibility-toggle";
import { Button } from "@/components/ui/button";

const emailSchema = z.object({
  email: z.email("Correo inválido"),
});

const otpSchema = z.object({
  otp: z.string().length(6, "Ingresa el código de 6 dígitos"),
});

const passwordSchema = z
  .object({
    password: z.string().min(8, "Mínimo 8 caracteres"),
    confirmPassword: z.string().min(8, "Mínimo 8 caracteres"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Las contraseñas no coinciden",
    path: ["confirmPassword"],
  });

type EmailValues = z.infer<typeof emailSchema>;
type OtpValues = z.infer<typeof otpSchema>;
type PasswordValues = z.infer<typeof passwordSchema>;

const RESEND_SECONDS = 60;

export function ForgotPasswordForm() {
  const router = useRouter();
  const [step, setStep] = React.useState<1 | 2 | 3>(1);
  const [email, setEmail] = React.useState("");
  const [otp, setOtp] = React.useState("");
  const [countdown, setCountdown] = React.useState(0);
  const [showPassword, setShowPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);

  const emailForm = useForm<EmailValues>({
    resolver: zodResolver(emailSchema),
    defaultValues: { email: "" },
  });

  const otpForm = useForm<OtpValues>({
    resolver: zodResolver(otpSchema),
    defaultValues: { otp: "" },
  });

  const passwordForm = useForm<PasswordValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: { password: "", confirmPassword: "" },
  });

  React.useEffect(() => {
    if (countdown <= 0) return;

    const timer = window.setInterval(() => {
      setCountdown((current) => (current <= 1 ? 0 : current - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [countdown]);

  function startCountdown() {
    setCountdown(RESEND_SECONDS);
  }

  async function onEmailSubmit(values: EmailValues) {
    const { error } = await authClient.emailOtp.requestPasswordReset({
      email: values.email,
    });

    if (error) {
      toast.error(error.message ?? "No se pudo enviar el código. Intenta de nuevo.");
      return;
    }

    setEmail(values.email);
    toast.success("Si el correo existe, te enviamos un código");
    setStep(2);
    otpForm.reset({ otp: "" });
    startCountdown();
  }

  async function onOtpSubmit(values: OtpValues) {
    const { error } = await authClient.emailOtp.checkVerificationOtp({
      email,
      type: "forget-password",
      otp: values.otp,
    });

    if (error) {
      toast.error(error.message ?? "Código inválido o expirado");
      return;
    }

    setOtp(values.otp);
    setStep(3);
    passwordForm.reset({ password: "", confirmPassword: "" });
  }

  async function onPasswordSubmit(values: PasswordValues) {
    const { error } = await authClient.emailOtp.resetPassword({
      email,
      otp,
      password: values.password,
    });

    if (error) {
      toast.error(error.message ?? "No se pudo actualizar la contraseña");
      return;
    }

    toast.success("Contraseña actualizada");
    router.push("/");
    router.refresh();
  }

  async function handleResend() {
    if (countdown > 0) return;

    const { error } = await authClient.emailOtp.requestPasswordReset({ email });

    if (error) {
      toast.error(error.message ?? "No se pudo reenviar el código. Intenta de nuevo.");
      return;
    }

    toast.success("Si el correo existe, te enviamos un código");
    otpForm.reset({ otp: "" });
    startCountdown();
  }

  if (step === 1) {
    return (
      <form onSubmit={emailForm.handleSubmit(onEmailSubmit)} noValidate className="grid gap-5">
        <FormInput
          control={emailForm.control}
          name="email"
          label="Correo electrónico"
          type="email"
          autoComplete="email"
          placeholder="tu@correo.com"
        />
        <Button type="submit" disabled={emailForm.formState.isSubmitting}>
          {emailForm.formState.isSubmitting ? "Enviando…" : "Enviar código"}
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          <Link href="/" className="hover:text-foreground">
            Volver al inicio de sesión
          </Link>
        </p>
      </form>
    );
  }

  if (step === 2) {
    return (
      <form onSubmit={otpForm.handleSubmit(onOtpSubmit)} noValidate className="grid gap-5">
        <p className="text-sm text-muted-foreground">
          Enviamos un código a <span className="font-medium text-foreground">{email}</span>
        </p>
        <FormInputOTP control={otpForm.control} name="otp" label="Código de verificación" />
        <Button type="submit" disabled={otpForm.formState.isSubmitting}>
          {otpForm.formState.isSubmitting ? "Verificando…" : "Verificar código"}
        </Button>
        <div className="flex flex-col items-center gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={countdown > 0 || otpForm.formState.isSubmitting}
            onClick={handleResend}
          >
            {countdown > 0 ? `Reenviar en ${countdown}s` : "Reenviar código"}
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} noValidate className="grid gap-5">
      <FormInput
        control={passwordForm.control}
        name="password"
        label="Nueva contraseña"
        type={showPassword ? "text" : "password"}
        autoComplete="new-password"
        placeholder="••••••••"
        endAdornment={
          <PasswordVisibilityToggle
            visible={showPassword}
            onToggle={() => setShowPassword((v) => !v)}
          />
        }
      />
      <FormInput
        control={passwordForm.control}
        name="confirmPassword"
        label="Confirmar contraseña"
        type={showConfirmPassword ? "text" : "password"}
        autoComplete="new-password"
        placeholder="••••••••"
        endAdornment={
          <PasswordVisibilityToggle
            visible={showConfirmPassword}
            onToggle={() => setShowConfirmPassword((v) => !v)}
          />
        }
      />
      <Button type="submit" disabled={passwordForm.formState.isSubmitting}>
        {passwordForm.formState.isSubmitting ? "Actualizando…" : "Actualizar contraseña"}
      </Button>
    </form>
  );
}
