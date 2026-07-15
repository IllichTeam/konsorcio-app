"use client";

import Link from "next/link";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowLeft, FileText, Pencil } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { defaultAuthenticatedPath } from "@/lib/navigation/dashboard-nav";

import {
  useConsorcio,
  useConsorcioHistory,
  useUpdateConsorcioAmount,
} from "@/hooks/use-consorcios";
import { FormInput } from "@/components/form/form-input";
import { ConsorcioFormDialog } from "@/components/consorcios/consorcio-form-dialog";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

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
  const [formDialogOpen, setFormDialogOpen] = useState(false);

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
      <div className="w-full space-y-4">
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
    <div className="flex w-full min-h-[calc(100dvh-5rem)] flex-col">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={defaultAuthenticatedPath} />}
        className="-ml-2 w-fit text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a consorcios
      </Button>

      <div className="mt-4 space-y-2">
        <h1 className="text-xl font-semibold tracking-tight text-balance text-foreground">
          {consorcio.name}
        </h1>
        <p className="text-3xl font-bold tracking-tight text-foreground">
          {currencyFormatter.format(consorcio.amount)}
        </p>
        <Button
          variant="outline"
          size="sm"
          className="mt-2 w-fit"
          onClick={() => {
            reset({ amount: String(consorcio.amount) });
            setEditOpen(true);
          }}
        >
          Cambiar monto de caja
        </Button>
        <div className="flex flex-wrap gap-3 pt-2">
          <Button className="w-fit">
            <FileText className="size-4" aria-hidden="true" />
            Enviar expensa mensual
          </Button>
          <Button variant="outline" className="w-fit" onClick={() => setFormDialogOpen(true)}>
            <Pencil className="size-4" aria-hidden="true" />
            Editar consorcio
          </Button>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="space-y-1">
          <dt className="text-base font-bold text-foreground">Alias de cobro</dt>
          <dd className="text-sm text-foreground">{consorcio.paymentAlias}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-base font-bold text-foreground">Email</dt>
          <dd className="text-sm text-foreground">{consorcio.billingEmail}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-base font-bold text-foreground">Link del drive</dt>
          <dd className="text-sm text-foreground">
            <a
              href={consorcio.driveLink}
              target="_blank"
              rel="noopener noreferrer"
              className="break-all text-primary hover:underline"
            >
              {consorcio.driveLink}
            </a>
          </dd>
        </div>
      </dl>

      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Historial de acciones</h2>
        {isHistoryLoading ? (
          <Skeleton className="min-h-48 w-full flex-1 rounded-lg" />
        ) : (
          <div className="min-h-0 flex-1 overflow-y-auto rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-44 px-4">Fecha</TableHead>
                  <TableHead className="px-4">Acción</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="px-4 text-muted-foreground">{entry.timestamp}</TableCell>
                    <TableCell className="px-4 whitespace-normal text-foreground">
                      {entry.description}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>

      <ConsorcioFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        consorcioId={consorcioId}
      />

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
    <div className="w-full space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-36" />
      <Skeleton className="h-9 w-28" />
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <Skeleton className="min-h-64 w-full flex-1 rounded-lg" />
    </div>
  );
}
