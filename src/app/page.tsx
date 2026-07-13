import type { Metadata } from "next";

import { LoginForm } from "@/components/auth/login-form";
import { RotatingCube } from "@/components/decorative/rotating-cube";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Iniciar sesión — Konsorcio",
};

export default function LoginPage() {
  return (
    <main className="grid min-h-svh flex-1 lg:grid-cols-[3fr_2fr] lg:bg-primary">
      <section className="flex items-center justify-center bg-background p-6 lg:rounded-r-4xl">
        <div className="w-full max-w-sm">
          <p className="font-heading text-lg font-semibold text-primary">Konsorcio</p>
          <h1 className="mt-6 font-heading text-3xl font-semibold tracking-tight">
            Bienvenido de nuevo
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Ingresa tus credenciales para acceder a tu cuenta.
          </p>
          <Card className="mt-8">
            <CardContent>
              <LoginForm />
            </CardContent>
          </Card>
        </div>
      </section>
      <aside className="relative hidden items-center justify-center overflow-hidden lg:flex">
        <RotatingCube />
      </aside>
    </main>
  );
}
