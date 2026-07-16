"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Mail, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useConsortium } from "@/hooks/use-consortiums";
import { useDeleteTenantEmail, useTenantEmails } from "@/hooks/use-tenant-emails";
import { formatFunctionalUnit } from "@/lib/tenant-email/format-unit";
import { ContactTypeBadge, UnitBadge } from "@/components/tenant-emails/tenant-email-badges";
import { TenantEmailFormDialog } from "@/components/tenant-emails/tenant-email-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { TenantEmail } from "@/types/tenant-email";

type TenantEmailsScreenProps = {
  consortiumId: string;
};

export function TenantEmailsScreen({ consortiumId }: TenantEmailsScreenProps) {
  const {
    data: consortium,
    isLoading: isConsortiumLoading,
    isError: isConsortiumError,
  } = useConsortium(consortiumId);
  const {
    data: tenantEmails = [],
    isLoading: isEmailsLoading,
    isError: isEmailsError,
  } = useTenantEmails(consortiumId);
  const deleteTenantEmail = useDeleteTenantEmail(consortiumId);

  const [searchQuery, setSearchQuery] = useState("");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<TenantEmail | null>(null);
  const [deletingEntry, setDeletingEntry] = useState<TenantEmail | null>(null);

  const filteredEmails = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return tenantEmails;
    }

    return tenantEmails.filter((entry) => {
      const unitLabel = formatFunctionalUnit(entry).toLowerCase();
      return entry.email.toLowerCase().includes(query) || unitLabel.includes(query);
    });
  }, [searchQuery, tenantEmails]);

  function openCreateDialog() {
    setEditingEntry(null);
    setFormDialogOpen(true);
  }

  function openEditDialog(entry: TenantEmail) {
    setEditingEntry(entry);
    setFormDialogOpen(true);
  }

  function handleFormDialogChange(open: boolean) {
    setFormDialogOpen(open);
    if (!open) {
      setEditingEntry(null);
    }
  }

  async function handleDelete() {
    if (!deletingEntry) {
      return;
    }

    try {
      await deleteTenantEmail.mutateAsync(deletingEntry.id);
      toast.success("Email eliminado");
      setDeletingEntry(null);
    } catch {
      toast.error("No se pudo eliminar el email");
    }
  }

  if (isConsortiumLoading || isEmailsLoading) {
    return <TenantEmailsSkeleton />;
  }

  if (isConsortiumError || isEmailsError || !consortium) {
    return (
      <div className="w-full space-y-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/consorcios/${consortiumId}`} />}
          className="-ml-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al consorcio
        </Button>
        <p className="text-sm text-destructive">No se pudieron cargar los emails de inquilinos.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-[calc(100dvh-5rem)] flex-col">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={`/consorcios/${consortiumId}`} />}
        className="-ml-2 w-fit text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver al consorcio
      </Button>

      <div className="mt-4 space-y-1">
        <h1 className="text-xl font-semibold tracking-tight text-balance text-foreground">
          Emails de inquilinos · {consortium.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Cada email pertenece a una unidad funcional (piso, departamento y letra).
        </p>
      </div>

      <Card className="mt-6">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:max-w-sm">
              <Search
                className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Buscar por email o unidad"
                className="pl-8"
                aria-label="Buscar por email o unidad"
              />
            </div>
            <Button type="button" className="w-full sm:w-fit" onClick={openCreateDialog}>
              <Plus className="size-4" aria-hidden="true" />
              Agregar email
            </Button>
          </div>

          <div className="overflow-hidden rounded-lg border border-border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="px-4">Unidad funcional</TableHead>
                  <TableHead className="px-4">Email</TableHead>
                  <TableHead className="px-4 text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEmails.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                      {searchQuery.trim()
                        ? "No hay resultados para tu búsqueda."
                        : "No hay emails registrados para este consorcio."}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredEmails.map((entry) => (
                    <TableRow key={entry.id}>
                      <TableCell className="px-4">
                        <UnitBadge entry={entry} />
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-1.5 text-foreground">
                            <Mail className="size-4 text-muted-foreground" aria-hidden="true" />
                            {entry.email}
                          </span>
                          <ContactTypeBadge contactType={entry.contactType} />
                        </div>
                      </TableCell>
                      <TableCell className="px-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar email ${entry.email}`}
                            onClick={() => openEditDialog(entry)}
                          >
                            <Pencil className="size-4" aria-hidden="true" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            aria-label={`Eliminar email ${entry.email}`}
                            onClick={() => setDeletingEntry(entry)}
                          >
                            <Trash2 className="size-4" aria-hidden="true" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="text-sm text-muted-foreground">
          {filteredEmails.length === 1
            ? "1 email mostrado"
            : `${filteredEmails.length} emails mostrados`}
        </CardFooter>
      </Card>

      <TenantEmailFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormDialogChange}
        consortiumId={consortiumId}
        editingEntry={editingEntry}
      />

      <Dialog
        open={deletingEntry !== null}
        onOpenChange={(open) => !open && setDeletingEntry(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eliminar email</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar el email{" "}
              <span className="font-medium text-foreground">{deletingEntry?.email}</span>? Esta
              acción no se puede deshacer.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setDeletingEntry(null)}>
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={deleteTenantEmail.isPending}
              onClick={() => void handleDelete()}
            >
              {deleteTenantEmail.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TenantEmailsSkeleton() {
  return (
    <div className="w-full space-y-4">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-8 w-72" />
      <Skeleton className="h-4 w-96" />
      <Skeleton className="min-h-80 w-full rounded-lg" />
    </div>
  );
}
