"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowLeft, Plus, Search } from "lucide-react";
import { toast } from "sonner";

import { useConsortium } from "@/hooks/use-consortiums";
import { useDeleteTenantEmail, useTenantEmails } from "@/hooks/use-tenant-emails";
import { formatFunctionalUnit } from "@/lib/tenant-email/format-unit";
import { createTenantEmailColumns } from "@/components/tenant-emails/tenant-email-columns";
import { TenantEmailFormDialog } from "@/components/tenant-emails/tenant-email-form-dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
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
import type { TenantEmail } from "@/types/tenant-email";

const PAGE_SIZE = 10;

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
  const [pageIndex, setPageIndex] = useState(0);
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

  const pageCount = filteredEmails.length === 0 ? 0 : Math.ceil(filteredEmails.length / PAGE_SIZE);
  const safePageIndex = pageCount === 0 ? 0 : Math.min(pageIndex, Math.max(0, pageCount - 1));

  const pageRows = useMemo(() => {
    const start = safePageIndex * PAGE_SIZE;
    return filteredEmails.slice(start, start + PAGE_SIZE);
  }, [filteredEmails, safePageIndex]);

  const columns = useMemo(
    () =>
      createTenantEmailColumns({
        onEdit: (entry) => {
          setEditingEntry(entry);
          setFormDialogOpen(true);
        },
        onDelete: setDeletingEntry,
      }),
    [],
  );

  function openCreateDialog() {
    setEditingEntry(null);
    setFormDialogOpen(true);
  }

  function handleFormDialogChange(open: boolean) {
    setFormDialogOpen(open);
    if (!open) {
      setEditingEntry(null);
    }
  }

  function handleSearchChange(value: string) {
    setSearchQuery(value);
    setPageIndex(0);
  }

  async function handleDelete() {
    if (!deletingEntry) {
      return;
    }

    try {
      await deleteTenantEmail.mutateAsync({
        id: deletingEntry.id,
        consortiumId,
      });
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

      <div className="mt-4 space-y-2">
        <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground">
          Emails de inquilinos · {consortium.name}
        </h1>
        <p className="text-base text-muted-foreground">
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
                onChange={(event) => handleSearchChange(event.target.value)}
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

          <DataTable
            columns={columns}
            data={pageRows}
            pageIndex={safePageIndex}
            pageSize={PAGE_SIZE}
            totalCount={filteredEmails.length}
            onPageChange={setPageIndex}
            getRowId={(row) => row.id}
            emptyMessage={
              searchQuery.trim()
                ? "No hay resultados para tu búsqueda."
                : "No hay emails registrados para este consorcio."
            }
          />
        </CardContent>
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
    <div className="flex w-full min-h-[calc(100dvh-5rem)] flex-col">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="mt-4 h-8 w-72" />
      <Skeleton className="mt-2 h-4 w-96" />
      <Card className="mt-6">
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Skeleton className="h-9 w-full sm:max-w-sm" />
            <Skeleton className="h-9 w-36" />
          </div>
          <DataTableSkeleton columnCount={3} rowCount={PAGE_SIZE} />
        </CardContent>
      </Card>
    </div>
  );
}
