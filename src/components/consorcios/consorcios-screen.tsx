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
  useConsorcios,
  useCreateConsorcioComment,
  useDeleteConsorcio,
} from "@/hooks/use-consorcios";
import type { Consorcio } from "@/types/consorcio";
import { ConsorcioFormDialog } from "@/components/consorcios/consorcio-form-dialog";
import { FormTextarea } from "@/components/form/form-textarea";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
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

const CONSORCIOS_PER_PAGE = 6;

type ConsorciosScreenProps = {
  userName: string;
};

export function ConsorciosScreen({ userName }: ConsorciosScreenProps) {
  const { data: consorcios = [], isLoading, isError } = useConsorcios();
  const createComment = useCreateConsorcioComment();
  const deleteConsorcio = useDeleteConsorcio();
  const [currentPage, setCurrentPage] = useState(1);
  const [openConsorcio, setOpenConsorcio] = useState<Consorcio | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingConsorcioId, setEditingConsorcioId] = useState<string | null>(null);

  const totalPages = Math.max(1, Math.ceil(consorcios.length / CONSORCIOS_PER_PAGE));
  const paginatedConsorcios = consorcios.slice(
    (currentPage - 1) * CONSORCIOS_PER_PAGE,
    currentPage * CONSORCIOS_PER_PAGE,
  );

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const { control, handleSubmit, formState, reset } = useForm<CommentValues>({
    resolver: zodResolver(commentSchema),
    defaultValues: { message: "" },
  });

  function openCreateDialog() {
    setEditingConsorcioId(null);
    setFormDialogOpen(true);
  }

  function openEditDialog(consorcioId: string) {
    setEditingConsorcioId(consorcioId);
    setFormDialogOpen(true);
  }

  function handleFormDialogChange(open: boolean) {
    setFormDialogOpen(open);

    if (!open) {
      setEditingConsorcioId(null);
    }
  }

  async function onSubmitComment(values: CommentValues) {
    if (!openConsorcio) {
      return;
    }

    try {
      await createComment.mutateAsync({
        consorcioId: openConsorcio.id,
        message: values.message,
      });
      toast.success("Comentario enviado");
      reset();
      setOpenConsorcio(null);
    } catch {
      toast.error("No se pudo enviar el comentario");
    }
  }

  async function handleDeleteConsorcio(consorcioId: string) {
    try {
      await deleteConsorcio.mutateAsync(consorcioId);
      toast.success("Consorcio eliminado", {
        toasterId: "center",
        className: "!border-destructive !bg-destructive !text-white [&_[data-icon]]:!text-white",
      });
    } catch {
      toast.error("No se pudo eliminar el consorcio", { toasterId: "center" });
    }
  }

  if (isLoading) {
    return <ConsorciosSkeleton />;
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
        {Array.from({ length: CONSORCIOS_PER_PAGE }, (_, index) => {
          const consorcio = paginatedConsorcios[index];

          if (!consorcio) {
            return (
              <li
                key={`empty-slot-${index}`}
                className="hidden min-h-0 sm:block"
                aria-hidden="true"
              />
            );
          }

          return (
            <li key={consorcio.id} className="min-h-0">
              <Link
                href={`/consorcios/${consorcio.id}`}
                className="@container/consorcio-card grid h-full min-h-48 w-full grid-rows-[auto_1fr_auto] rounded-lg border border-border bg-card p-4 text-center transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:min-h-0 sm:p-6"
              >
                <div className="relative h-8 shrink-0">
                  <DropdownMenu>
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          className="absolute top-0 right-0 text-muted-foreground"
                          aria-label={`Configurar ${consorcio.name}`}
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
                          openEditDialog(consorcio.id);
                        }}
                      >
                        <Pencil className="size-4" aria-hidden="true" />
                        Editar consorcio
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        variant="destructive"
                        onClick={(event) => {
                          event.preventDefault();
                          void handleDeleteConsorcio(consorcio.id);
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
                    {consorcio.name}
                  </span>
                  <span className="flex shrink-0 items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="size-4" aria-hidden="true" />
                    {consorcio.location}
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
                      setOpenConsorcio(consorcio);
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

      <ConsorcioFormDialog
        open={formDialogOpen}
        onOpenChange={handleFormDialogChange}
        consorcioId={editingConsorcioId}
      />

      <Dialog
        open={openConsorcio !== null}
        onOpenChange={(open) => !open && setOpenConsorcio(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{openConsorcio?.name}</DialogTitle>
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

function ConsorciosSkeleton() {
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
