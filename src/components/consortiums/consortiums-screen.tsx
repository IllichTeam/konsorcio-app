"use client";

import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Plus, Search } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "@/lib/zod";

import {
  useConsortiums,
  useCreateConsortiumComment,
  useDeleteConsortium,
} from "@/hooks/use-consortiums";
import { useTenantEmails } from "@/hooks/use-tenant-emails";
import { formatFunctionalUnit } from "@/lib/tenant-email/format-unit";
import { tenantEmailsToSelectOptions } from "@/lib/tenant-email/to-select-options";
import type { Consortium } from "@/types/consortium";
import { ConsortiumCard } from "@/components/consortiums/consortium-card";
import { ConsortiumFormDialog } from "@/components/consortiums/consortium-form-dialog";
import { useDashboardUser } from "@/components/dashboard/dashboard-user-context";
import { FormSearchableSelect } from "@/components/form/form-searchable-select";
import { FormTextarea } from "@/components/form/form-textarea";
import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";

const COMMENT_RECIPIENT_MODES = [
  { value: "one", label: "1 Destinatario" },
  { value: "several", label: "Varios" },
  { value: "all", label: "Todos" },
] as const;

const commentSchema = z
  .object({
    recipientMode: z.enum(["one", "several", "all"]),
    recipientEmails: z.array(z.email()),
    message: z.string().trim().min(1, "Escribe un comentario"),
  })
  .superRefine((data, ctx) => {
    if (data.recipientMode === "one" && data.recipientEmails.length !== 1) {
      ctx.addIssue({
        code: "custom",
        message: "Selecciona un destinatario",
        path: ["recipientEmails"],
      });
    }

    if (data.recipientMode === "several" && data.recipientEmails.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "Selecciona al menos un destinatario",
        path: ["recipientEmails"],
      });
    }
  });

type CommentValues = z.infer<typeof commentSchema>;
type CommentRecipientMode = CommentValues["recipientMode"];

const COMMENT_DEFAULT_VALUES: CommentValues = {
  recipientMode: "all",
  recipientEmails: [],
  message: "",
};

const CONSORTIUMS_PER_PAGE = 6;

export function ConsortiumsScreen() {
  const user = useDashboardUser();
  const userName = user.name || "Administrador";
  const { data: consortiums = [], isLoading, isError } = useConsortiums();
  const createComment = useCreateConsortiumComment();
  const deleteConsortium = useDeleteConsortium();
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [openConsortium, setOpenConsortium] = useState<Consortium | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingConsortium, setEditingConsortium] = useState<Consortium | null>(null);
  const [consortiumPendingDelete, setConsortiumPendingDelete] = useState<Consortium | null>(null);

  const { data: tenantEmails = [], isLoading: isTenantEmailsLoading } = useTenantEmails(
    openConsortium?.id ?? "",
  );

  const tenantEmailOptions = useMemo(
    () => tenantEmailsToSelectOptions(tenantEmails),
    [tenantEmails],
  );

  const filteredConsortiums = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return consortiums;
    }

    return consortiums.filter(
      (consortium) =>
        consortium.name.toLowerCase().includes(query) ||
        consortium.location.toLowerCase().includes(query),
    );
  }, [consortiums, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredConsortiums.length / CONSORTIUMS_PER_PAGE));
  const pageStart =
    filteredConsortiums.length === 0 ? 0 : (currentPage - 1) * CONSORTIUMS_PER_PAGE + 1;
  const pageEnd = Math.min(currentPage * CONSORTIUMS_PER_PAGE, filteredConsortiums.length);
  const paginatedConsortiums = filteredConsortiums.slice(
    (currentPage - 1) * CONSORTIUMS_PER_PAGE,
    currentPage * CONSORTIUMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const { control, handleSubmit, formState, reset, watch, setValue, setError, clearErrors } =
    useForm<CommentValues>({
      resolver: zodResolver(commentSchema),
      defaultValues: COMMENT_DEFAULT_VALUES,
    });

  const recipientMode = watch("recipientMode");
  const recipientEmails = watch("recipientEmails");

  function resetCommentDialog() {
    reset(COMMENT_DEFAULT_VALUES);
  }

  function openCreateDialog() {
    setEditingConsortium(null);
    setFormDialogOpen(true);
  }

  function openEditDialog(consortium: Consortium) {
    setEditingConsortium(consortium);
    setFormDialogOpen(true);
  }

  function handleFormDialogChange(open: boolean) {
    setFormDialogOpen(open);

    if (!open) {
      setEditingConsortium(null);
    }
  }

  function handleRecipientModeChange(mode: CommentRecipientMode) {
    setValue("recipientMode", mode, { shouldDirty: true });
    clearErrors("recipientEmails");

    if (mode === "all") {
      setValue("recipientEmails", []);
      return;
    }

    if (mode === "one" && recipientEmails.length > 1) {
      setValue("recipientEmails", recipientEmails.slice(0, 1));
    }
  }

  async function onSubmitComment(values: CommentValues) {
    if (!openConsortium) {
      return;
    }

    const resolvedEmails =
      values.recipientMode === "all"
        ? tenantEmails.map((entry) => entry.email)
        : values.recipientEmails;

    if (resolvedEmails.length === 0) {
      setError("recipientEmails", {
        type: "manual",
        message:
          values.recipientMode === "all"
            ? "Este consorcio no tiene emails de inquilinos registrados"
            : values.recipientMode === "one"
              ? "Selecciona un destinatario"
              : "Selecciona al menos un destinatario",
      });
      return;
    }

    const recipients = resolvedEmails.map((email) => {
      const entry = tenantEmails.find((item) => item.email === email);
      return {
        email,
        name: entry ? formatFunctionalUnit(entry) : undefined,
      };
    });

    try {
      await createComment.mutateAsync({
        id: openConsortium.id,
        message: values.message,
        recipients,
      });
      toast.success("Comentario enviado");
      resetCommentDialog();
      setOpenConsortium(null);
    } catch {
      toast.error("No se pudo enviar el comentario");
    }
  }

  async function handleConfirmDelete() {
    if (!consortiumPendingDelete) {
      return;
    }

    try {
      await deleteConsortium.mutateAsync({ id: consortiumPendingDelete.id });
      toast.success("Consorcio eliminado", {
        toasterId: "center",
        className: "!border-destructive !bg-destructive !text-white [&_[data-icon]]:!text-white",
      });
      setConsortiumPendingDelete(null);
    } catch {
      toast.error("No se pudo eliminar el consorcio", { toasterId: "center" });
    }
  }

  if (isLoading) {
    return <ConsortiumsSkeleton />;
  }

  if (isError) {
    return <p className="text-sm text-destructive">No se pudieron cargar los consorcios.</p>;
  }

  const totalUnits = consortiums.reduce((acc, consortium) => acc + consortium.unitCount, 0);

  return (
    /*
      Break out of shell padding so layout matches the mock main column:
      full-width inset → centered max-w-[1120px] content. Grid-noise lives
      in DashboardShell; overflow-x-clip keeps any breakout contained.
    */
    <div className="relative -m-6 w-[calc(100%+3rem)] overflow-x-clip md:-m-10 md:w-[calc(100%+5rem)]">
      <div className="relative mx-auto w-full max-w-[1120px] px-4 pb-24 sm:px-6">
        <section className="relative pb-10 pt-10 sm:pt-12" aria-labelledby="page-title">
          <div className="relative flex flex-col gap-8 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              <h1
                id="page-title"
                className="text-balance text-[2rem] font-semibold leading-[1.1] tracking-[-0.04em] text-foreground sm:text-[2.375rem]"
              >
                Selección de consorcios
              </h1>
              <p className="mt-3 text-[16px] leading-snug text-[oklch(0.38_0.02_250)]">
                Bienvenido, {userName}
              </p>
            </div>

            <fieldset
              className="flex shrink-0 gap-px overflow-hidden rounded-lg border border-border bg-card shadow-hair"
              aria-label="Métricas globales"
            >
              <div className="min-w-[8rem] px-5 py-4">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                  Consorcios
                </p>
                <p className="mt-1.5 text-[1.75rem] font-semibold tracking-tight tabular-nums">
                  {consortiums.length}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">activos</p>
              </div>
              <div className="w-px bg-border" aria-hidden="true" />
              <div className="min-w-[8rem] px-5 py-4">
                <p className="font-mono text-[10.5px] uppercase tracking-[0.08em] text-muted-foreground">
                  Unidades
                </p>
                <p className="mt-1.5 text-[1.75rem] font-semibold tracking-tight tabular-nums">
                  {totalUnits}
                </p>
                <p className="mt-0.5 text-[12px] text-muted-foreground">administradas</p>
              </div>
            </fieldset>
          </div>
        </section>

        <div className="relative flex flex-col gap-3 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <label htmlFor="consortium-search" className="relative block w-full sm:w-auto">
            <span className="sr-only">Buscar consorcio</span>
            <Search
              className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
            <Input
              id="consortium-search"
              type="search"
              name="q"
              autoComplete="off"
              spellCheck={false}
              placeholder="Buscar…"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="h-8 w-full bg-card pl-8 text-[13px] shadow-none transition-[width] duration-200 sm:w-44 sm:focus-visible:w-56 md:text-[13px]"
            />
          </label>

          <Button
            type="button"
            variant="default"
            className="group h-9 shrink-0 px-2.5"
            onClick={openCreateDialog}
          >
            <Plus
              className="size-4 transition-transform duration-200 group-hover:rotate-90 motion-reduce:transition-none motion-reduce:group-hover:rotate-0"
              aria-hidden="true"
            />
            <span className="hidden sm:inline">Agregar nuevo consorcio</span>
            <span className="sm:hidden">Agregar</span>
          </Button>
        </div>

        <section className="pt-8" aria-label="Lista de consorcios">
          {filteredConsortiums.length === 0 ? (
            <p className="rounded-lg border border-border bg-card px-5 py-10 text-center text-sm text-muted-foreground shadow-card">
              {searchQuery.trim()
                ? "No hay consorcios que coincidan con la búsqueda."
                : "Todavía no hay consorcios. Agregá el primero para empezar."}
            </p>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {paginatedConsortiums.map((consortium, index) => (
                <li
                  key={consortium.id}
                  className="animate-rise-in"
                  style={{ animationDelay: `${Math.min(index, 5) * 0.06}s` }}
                >
                  <ConsortiumCard
                    consortium={consortium}
                    className="h-full"
                    onComment={(item) => {
                      resetCommentDialog();
                      setOpenConsortium(item);
                    }}
                    onEdit={openEditDialog}
                    onDelete={setConsortiumPendingDelete}
                  />
                </li>
              ))}
            </ul>
          )}

          {filteredConsortiums.length > 0 ? (
            <nav
              aria-label="Paginación de consorcios"
              className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between"
            >
              <p className="text-[13px] text-muted-foreground">
                Mostrando{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {pageStart}–{pageEnd}
                </span>{" "}
                de{" "}
                <span className="font-medium tabular-nums text-foreground">
                  {filteredConsortiums.length}
                </span>
              </p>

              {totalPages > 1 ? (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  >
                    Anterior
                  </Button>

                  {Array.from({ length: totalPages }, (_, index) => {
                    const page = index + 1;

                    return (
                      <Button
                        key={page}
                        type="button"
                        variant={page === currentPage ? "default" : "secondary"}
                        size="icon"
                        className="size-9"
                        aria-label={`Página ${page}`}
                        aria-current={page === currentPage ? "page" : undefined}
                        onClick={() => setCurrentPage(page)}
                      >
                        {page}
                      </Button>
                    );
                  })}

                  <Button
                    type="button"
                    variant="secondary"
                    className="h-9"
                    disabled={currentPage === totalPages}
                    onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  >
                    Siguiente
                  </Button>
                </div>
              ) : null}
            </nav>
          ) : null}
        </section>
      </div>

      <ConsortiumFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormDialogChange}
        consortiumId={editingConsortium?.id ?? null}
        initialConsortium={editingConsortium}
      />

      <Dialog
        open={consortiumPendingDelete !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConsortiumPendingDelete(null);
          }
        }}
      >
        <DialogContent showCloseButton={false}>
          <DialogHeader>
            <DialogTitle>Eliminar consorcio</DialogTitle>
            <DialogDescription>
              ¿Seguro que querés eliminar{" "}
              <span className="font-medium text-foreground">{consortiumPendingDelete?.name}</span>?
              El consorcio dejará de mostrarse en la lista.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConsortiumPendingDelete(null)}
              disabled={deleteConsortium.isPending}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={() => void handleConfirmDelete()}
              disabled={deleteConsortium.isPending}
            >
              {deleteConsortium.isPending ? "Eliminando…" : "Eliminar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={openConsortium !== null}
        onOpenChange={(open) => {
          if (!open) {
            setOpenConsortium(null);
            resetCommentDialog();
          }
        }}
      >
        <DialogContent className="overflow-visible">
          <DialogHeader>
            <DialogTitle>{openConsortium?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitComment)} noValidate className="space-y-4">
            <fieldset className="min-w-0 border-0 p-0">
              <legend className="sr-only">Destinatarios del comentario</legend>
              <div className="flex flex-wrap gap-2">
                {COMMENT_RECIPIENT_MODES.map((mode) => {
                  const selected = recipientMode === mode.value;

                  return (
                    <label
                      key={mode.value}
                      className={cn(
                        "cursor-pointer rounded-md border px-3 py-1.5 text-sm font-medium transition-colors",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-transparent text-foreground hover:bg-muted",
                      )}
                    >
                      <input
                        type="radio"
                        name="comment-recipient-mode"
                        value={mode.value}
                        checked={selected}
                        className="sr-only"
                        onChange={() => handleRecipientModeChange(mode.value)}
                      />
                      {mode.label}
                    </label>
                  );
                })}
              </div>
            </fieldset>
            {recipientMode !== "all" ? (
              <FormSearchableSelect
                control={control}
                name="recipientEmails"
                label="Destinatarios"
                options={tenantEmailOptions}
                multiple={recipientMode === "several"}
                loading={isTenantEmailsLoading}
                placeholder="Buscar por email o unidad"
                emptyMessage="No hay emails registrados para este consorcio."
                loadingMessage="Cargando emails…"
                selectedEmptyMessage="Ningún email seleccionado"
                listLabel="Emails del consorcio"
              />
            ) : formState.errors.recipientEmails ? (
              <p role="alert" className="text-sm text-destructive">
                {formState.errors.recipientEmails.message}
              </p>
            ) : null}
            <FormTextarea
              control={control}
              name="message"
              label="Comentario"
              placeholder="Escribe tu comentario…"
              rows={5}
            />
            <DialogFooter>
              <Button type="submit" disabled={formState.isSubmitting || createComment.isPending}>
                {createComment.isPending ? "Enviando…" : "Enviar"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ConsortiumsSkeleton() {
  return (
    <div className="relative -m-6 w-[calc(100%+3rem)] overflow-x-clip md:-m-10 md:w-[calc(100%+5rem)]">
      <div className="relative mx-auto w-full max-w-[1120px] px-4 pb-24 sm:px-6">
        <div className="flex flex-col gap-8 border-b border-border pb-10 pt-10 sm:flex-row sm:items-end sm:justify-between sm:pt-12">
          <div className="space-y-3">
            <Skeleton className="h-10 w-72" />
            <Skeleton className="h-5 w-48" />
          </div>
          <Skeleton className="h-[5.5rem] w-72 rounded-lg" />
        </div>
        <div className="flex flex-col gap-3 pt-8 sm:flex-row sm:justify-between">
          <Skeleton className="h-8 w-full sm:w-44" />
          <Skeleton className="h-9 w-48" />
        </div>
        <div className="grid grid-cols-1 gap-4 pt-8 sm:grid-cols-2 xl:grid-cols-3">
          {["a", "b", "c", "d", "e", "f"].map((key) => (
            <Skeleton key={key} className="h-56 rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  );
}
