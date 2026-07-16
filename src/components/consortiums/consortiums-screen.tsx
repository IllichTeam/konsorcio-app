"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  MapPin,
  MessageSquareText,
  Pencil,
  Plus,
  Settings,
  Trash2,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "@/lib/zod";

import {
  useConsortiums,
  useCreateConsortiumComment,
  useDeleteConsortium,
} from "@/hooks/use-consortiums";
import type { Consortium } from "@/types/consortium";
import { ConsortiumFormDialog } from "@/components/consortiums/consortium-form-dialog";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";

const commentSchema = z.object({
  message: z.string().trim().min(1, "Escribe un comentario"),
});

type CommentValues = z.infer<typeof commentSchema>;

const CONSORTIUMS_PER_PAGE = 6;

type ConsortiumsScreenProps = {
  userName: string;
};

export function ConsortiumsScreen({ userName }: ConsortiumsScreenProps) {
  const { data: consortiums = [], isLoading, isError } = useConsortiums();
  const createComment = useCreateConsortiumComment();
  const deleteConsortium = useDeleteConsortium();
  const [currentPage, setCurrentPage] = useState(1);
  const [openConsortium, setOpenConsortium] = useState<Consortium | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingConsortiumId, setEditingConsortiumId] = useState<string | null>(null);
  const [consortiumPendingDelete, setConsortiumPendingDelete] = useState<Consortium | null>(null);

  const totalPages = Math.max(1, Math.ceil(consortiums.length / CONSORTIUMS_PER_PAGE));
  const paginatedConsortiums = consortiums.slice(
    (currentPage - 1) * CONSORTIUMS_PER_PAGE,
    currentPage * CONSORTIUMS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const { control, handleSubmit, formState, reset } = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { message: "" },
  });

  function openCreateDialog() {
    setEditingConsortiumId(null);
    setFormDialogOpen(true);
  }

  function openEditDialog(consortiumId: string) {
    setEditingConsortiumId(consortiumId);
    setFormDialogOpen(true);
  }

  function handleFormDialogChange(open: boolean) {
    setFormDialogOpen(open);

    if (!open) {
      setEditingConsortiumId(null);
    }
  }

  async function onSubmitComment(values: CommentValues) {
    if (!openConsortium) {
      return;
    }

    try {
      await createComment.mutateAsync({
        consortiumId: openConsortium.id,
        message: values.message,
      });
      toast.success("Comentario enviado");
      reset();
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

  return (
    <div className="flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col">
      <div className="mb-8 flex shrink-0 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-foreground">
            Selección de consorcios
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">Bienvenido, {userName}</p>
        </div>

        <Button
          type="button"
          variant="outline"
          className="bg-transparent font-semibold tracking-wide"
          onClick={openCreateDialog}
        >
          <Plus className="size-4" aria-hidden="true" />
          Agregar nuevo consorcio
        </Button>
      </div>

      <ul className="grid min-h-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2 sm:grid-rows-3 lg:grid-cols-3 lg:grid-rows-2">
        {Array.from({ length: CONSORTIUMS_PER_PAGE }, (_, index) => {
          const consortium = paginatedConsortiums[index];

          if (!consortium) {
            return (
              <li
                key={`empty-slot-${index}`}
                className="hidden min-h-0 sm:block"
                aria-hidden="true"
              />
            );
          }

          return (
            <li key={consortium.id} className="min-h-0">
              <Link
                href={`/consorcios/${consortium.id}`}
                className="@container/consortium-card grid h-full min-h-48 w-full grid-rows-[auto_1fr_auto] rounded-lg border border-border bg-card p-4 text-center transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0 sm:p-6"
              >
                <div className="relative h-8 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="absolute top-0 right-0 text-muted-foreground"
                          aria-label={`Configurar ${consortium.name}`}
                          onClick={(event) => event.preventDefault()}
                        >
                          <Settings className="size-5" aria-hidden="true" />
                        </Button>
                      }
                    />
                    <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
                      <DropdownMenuItem
                        onClick={(event) => {
                          event.preventDefault();
                          openEditDialog(consortium.id);
                        }}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Editar consorcio
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(event) => {
                          event.preventDefault();
                          setConsortiumPendingDelete(consortium);
                        }}
                      >
                        <Trash2 className="size-4" aria-hidden="true" />
                        Eliminar consorcio
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>

                <div className="flex min-h-0 flex-col items-center justify-center gap-3 px-2">
                  <div className="flex w-full flex-1 items-center justify-center">
                    <Building2
                      className="aspect-square size-[clamp(4rem,min(38cqw,42cqh),9rem)] text-primary"
                      aria-hidden="true"
                    />
                  </div>
                  <span className="shrink-0 text-lg font-semibold tracking-tight text-foreground">
                    {consortium.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-4" aria-hidden="true" />
                    {consortium.location}
                  </span>
                </div>

                <div className="flex shrink-0 justify-end pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="bg-transparent font-semibold"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      reset();
                      setOpenConsortium(consortium);
                    }}
                  >
                    <MessageSquareText className="size-4" aria-hidden="true" />
                    Enviar comentario
                  </Button>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {totalPages > 1 ? (
        <nav
          aria-label="Paginación de consorcios"
          className="mt-6 shrink-0 flex items-center justify-center gap-2"
        >
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Página anterior"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
          >
            <ChevronLeft className="size-4" aria-hidden="true" />
          </Button>

          {Array.from({ length: totalPages }, (_, index) => {
            const page = index + 1;

            return (
              <Button
                key={page}
                type="button"
                variant={page === currentPage ? "default" : "ghost"}
                size="icon-sm"
                className={page === currentPage ? "" : "text-muted-foreground"}
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
            variant="ghost"
            size="icon-sm"
            className="text-muted-foreground"
            aria-label="Página siguiente"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
          >
            <ChevronRight className="size-4" aria-hidden="true" />
          </Button>
        </nav>
      ) : null}

      <ConsortiumFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormDialogChange}
        consortiumId={editingConsortiumId}
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
        onOpenChange={(open) => !open && setOpenConsortium(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{openConsortium?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmitComment)} noValidate className="space-y-4">
            <FormTextarea
              control={control}
              name="message"
              label="Comentario"
              placeholder="Escribe tu comentario..."
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
    <div className="flex min-h-[calc(100vh-5rem)] w-full max-w-7xl flex-col">
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <Skeleton className="h-12 w-56" />
        <Skeleton className="h-9 w-48" />
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-6 sm:grid-cols-2 sm:grid-rows-3 lg:grid-cols-3 lg:grid-rows-2">
        {["a", "b", "c", "d", "e", "f"].map((key) => (
          <Skeleton key={key} className="min-h-48 rounded-lg sm:min-h-0" />
        ))}
      </div>
    </div>
  );
}
