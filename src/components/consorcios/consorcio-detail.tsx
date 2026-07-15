"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FileText } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "@/lib/zod";

import { defaultAuthenticatedPath } from "@/lib/navigation/dashboard-nav";

import {
  useConsorcio,
  useConsorcioHistory,
  useUpdateConsorcioAmount,
} from "@/hooks/use-consorcios";
import { FormInput } from "@/components/form/form-input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";

const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

const amountSchema = z.object({
  amount: z
    .string()
    .min(1, "Ingresa un monto")
    .refine((value) => !Number.isNaN(Number(value)), "Ingresa un monto válido")
    .refine((value) => Number(value) > 0, "El monto debe ser mayor a cero"),
});

type AmountValues = z.infer<typeof amountSchema>;

type ConsorcioDetailProps = {
  consorcioId: string;
};

export function ConsorcioDetail({ consorcioId }: ConsorcioDetailProps) {
  const { data: consorcio, isLoading, isError } = useConsorcio(consorcioId);
  const { data: history = [], isLoading: isHistoryLoading } = useConsorcioHistory(consorcioId);
  const updateAmount = useUpdateConsorcioAmount();
  const [editOpen, setEditOpen] = useState(false);

  const { control, handleSubmit, formState, reset } = useForm<AmountValues>({
    resolver: zodResolver(amountSchema),
    defaultValues: { amount: "" },
  });

  async function onSubmitAmount(values: AmountValues) {
    try {
      await updateAmount.mutateAsync({ consorcioId, amount: Number(values.amount) });
      toast.success("Monto actualizado");
      setEditOpen(false);
    } catch {
      toast.error("No se pudo actualizar el monto");
    }
  }

  if (isLoading) {
    return <ConsorcioDetailSkeleton />;
  }

  if (isError || !consorcio) {
    return (
      <div className="w-full max-w-3xl space-y-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={defaultAuthenticatedPath} />}
          className="-ml-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a consorcios
        </Button>
        <p className="text-sm text-destructive">No se encontró el consorcio solicitado.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={defaultAuthenticatedPath} />}
        className="-ml-2 text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a consorcios
      </Button>

      <Card className="mt-4">
        <CardContent>
          <div className="flex flex-col items-center text-center">
            <h1 className="text-xl font-semibold tracking-tight text-balance text-foreground">
              {consorcio.name}
            </h1>
            <p className="mt-2 text-3xl font-bold tracking-tight text-foreground">
              {currencyFormatter.format(consorcio.amount)}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => {
                reset({ amount: String(consorcio.amount) });
                setEditOpen(true);
              }}
            >
              Cambiar monto
            </Button>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label htmlFor="alias">Alias de cobro</Label>
              <Input id="alias" defaultValue={consorcio.paymentAlias} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email-cobro">Email</Label>
              <Input id="email-cobro" type="email" defaultValue={consorcio.billingEmail} readOnly />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="drive">Link del drive</Label>
              <Input id="drive" defaultValue={consorcio.driveLink} readOnly />
            </div>
          </div>

          <div className="mt-8 rounded-lg border border-border bg-secondary/40 p-4">
            <h2 className="mb-3 text-sm font-semibold text-foreground">Historial de acciones</h2>
            {isHistoryLoading ? (
              <Skeleton className="h-56 w-full rounded-lg" />
            ) : (
              <ScrollArea className="h-56 pr-3">
                <ul className="space-y-3">
                  {history.map((entry) => (
                    <li
                      key={entry.id}
                      className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm text-foreground"
                    >
                      <span className="text-muted-foreground">{entry.timestamp}</span> -{" "}
                      {entry.description}
                    </li>
                  ))}
                </ul>
              </ScrollArea>
            )}
          </div>

          <Button className="mt-6 w-full">
            <FileText className="size-4" aria-hidden="true" />
            Enviar expensa mensual
          </Button>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Cambiar monto de la caja</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitAmount)} noValidate className="space-y-4">
            <FormInput
              control={control}
              name="amount"
              label="Nuevo monto (ARS)"
              type="number"
              step="0.01"
              inputMode="decimal"
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={formState.isSubmitting || updateAmount.isPending}>
                {updateAmount.isPending ? "Guardando…" : "Guardar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConsorcioDetailSkeleton() {
  return (
    <div className="w-full max-w-3xl space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-96 w-full rounded-lg" />
    </div>
  );
}
