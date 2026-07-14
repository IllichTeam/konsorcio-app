"use client";

import * as React from "react";
import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { getCurrentProfile, updateProfile } from "@/lib/api/profile";
import type { UserProfile } from "@/types/user";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";

type ProfileFormProps = {
  userName: string;
};

export function ProfileForm({ userName }: ProfileFormProps) {
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isSaving, setIsSaving] = React.useState(false);
  const [showCurrent, setShowCurrent] = useState(false);

  React.useEffect(() => {
    let cancelled = false;

    async function loadProfile() {
      try {
        const data = await getCurrentProfile();
        if (!cancelled) {
          setProfile(data);
        }
      } catch {
        if (!cancelled) {
          toast.error("No se pudo cargar el perfil");
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadProfile();

    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!profile) {
      return;
    }

    setIsSaving(true);

    try {
      const updated = await updateProfile(profile);
      setProfile(updated);
      toast.success("Perfil actualizado");
    } catch {
      toast.error("No se pudo guardar el perfil");
    } finally {
      setIsSaving(false);
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

  if (!profile) {
    return <p className="text-sm text-destructive">No se pudo cargar el perfil.</p>;
  }

  return (
    <div className="w-full max-w-xl">
      <h1 className="mb-4 text-lg font-bold tracking-wide text-foreground">
        CONFIGURACIÓN DE USUARIO{" "}
        <span className="text-muted-foreground">| {userName.toUpperCase()}</span>
      </h1>

      <Card>
        <form onSubmit={(event) => void handleSubmit(event)}>
          <CardContent className="space-y-6">
            <section className="space-y-4">
              <h2 className="text-sm font-bold tracking-wide text-foreground">
                INFORMACIÓN PERSONAL
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="nombre">Nombre</Label>
                  <Input
                    id="nombre"
                    value={profile.name}
                    onChange={(event) =>
                      setProfile((current) =>
                        current ? { ...current, name: event.target.value } : current,
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Name</Label>
                  <Input id="name" placeholder="Name" />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={profile.email}
                  onChange={(event) =>
                    setProfile((current) =>
                      current ? { ...current, email: event.target.value } : current,
                    )
                  }
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="telefono">Teléfono</Label>
                  <Input
                    id="telefono"
                    value={profile.phone}
                    onChange={(event) =>
                      setProfile((current) =>
                        current ? { ...current, phone: event.target.value } : current,
                      )
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="direccion">Dirección</Label>
                  <Input
                    id="direccion"
                    value={profile.address}
                    onChange={(event) =>
                      setProfile((current) =>
                        current ? { ...current, address: event.target.value } : current,
                      )
                    }
                  />
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <h2 className="text-sm font-bold tracking-wide text-foreground">
                CAMBIAR CONTRASEÑA
              </h2>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="current-password">Contraseña Actual</Label>
                  <div className="relative">
                    <Input
                      id="current-password"
                      type={showCurrent ? "text" : "password"}
                      placeholder="Contraseña"
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((value) => !value)}
                      aria-label={showCurrent ? "Ocultar contraseña" : "Mostrar contraseña"}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {showCurrent ? (
                        <EyeOff className="size-4" aria-hidden="true" />
                      ) : (
                        <Eye className="size-4" aria-hidden="true" />
                      )}
                    </button>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="new-password">Nueva</Label>
                  <Input id="new-password" type="password" placeholder="Confirmar" />
                </div>
              </div>
            </section>
          </CardContent>

          <CardFooter className="border-t border-border">
            <Button
              type="submit"
              className="w-full font-semibold tracking-wide"
              disabled={isSaving}
            >
              {isSaving ? "Guardando…" : "GUARDAR CAMBIOS"}
            </Button>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
