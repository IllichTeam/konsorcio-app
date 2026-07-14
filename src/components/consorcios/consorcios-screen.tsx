"use client";

import Link from "next/link";
import { useState } from "react";
import { Building2, MapPin, MessageSquareText, Pencil, Plus, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { useConsorcios, useCreateConsorcioComment } from "@/hooks/use-consorcios";
import type { Consorcio } from "@/types/consorcio";
import { ConsorcioFormDialog } from "@/components/consorcios/consorcio-form-dialog";
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
import { Textarea } from "@/components/ui/textarea";

type ConsorciosScreenProps = {
  userName: string;
};

export function ConsorciosScreen({ userName }: ConsorciosScreenProps) {
  const { data: consorcios = [], isLoading, isError } = useConsorcios();
  const createComment = useCreateConsorcioComment();
  const [openConsorcio, setOpenConsorcio] = useState<Consorcio | null>(null);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingConsorcioId, setEditingConsorcioId] = useState<string | null>(null);
  const [comment, setComment] = useState("");

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

  async function handleSendComment(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!openConsorcio || comment.trim().length === 0) {
      return;
    }

    try {
      await createComment.mutateAsync({
        consorcioId: openConsorcio.id,
        message: comment.trim(),
      });
      toast.success("Comentario enviado");
      setComment("");
      setOpenConsorcio(null);
    } catch {
      toast.error("No se pudo enviar el comentario");
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
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-lg font-bold tracking-wide text-foreground">
            SELECCIÓN DE CONSORCIOS
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

      <ul className="grid flex-1 grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {consorcios.map((consorcio) => (
          <li key={consorcio.id} className="min-h-64">
            <Link
              href={`/consorcios/${consorcio.id}`}
              className="relative flex h-full min-h-64 flex-col items-center justify-center gap-4 rounded-lg border border-border bg-card p-6 text-center transition-colors hover:border-primary/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="absolute top-3 right-3 text-muted-foreground"
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
                  <DropdownMenuItem variant="destructive">
                    <Trash2 className="size-4" aria-hidden="true" />
                    Eliminar consorcio
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>

              <Building2 className="size-24 text-primary" aria-hidden="true" />
              <span className="text-lg font-bold tracking-wide text-foreground">
                {consorcio.name.toUpperCase()}
              </span>
              <span className="flex items-center gap-1 text-sm text-muted-foreground">
                <MapPin className="size-4" aria-hidden="true" />
                {consorcio.location}
              </span>

              <Button
                type="button"
                variant="outline"
                size="sm"
                className="absolute right-3 bottom-3 bg-transparent font-semibold"
                onClick={(event) => {
                  event.preventDefault();
                  event.stopPropagation();
                  setComment("");
                  setOpenConsorcio(consorcio);
                }}
              >
                <MessageSquareText className="size-4" aria-hidden="true" />
                Enviar comentario
              </Button>
            </Link>
          </li>
        ))}
      </ul>

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
            <DialogTitle className="text-base font-bold tracking-wide">
              {openConsorcio?.name.toUpperCase()}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={(event) => void handleSendComment(event)} className="space-y-4">
            <Textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              placeholder="Escribe tu comentario..."
              rows={5}
            />
            <DialogFooter>
              <Button
                type="submit"
                disabled={comment.trim().length === 0 || createComment.isPending}
              >
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
    <div className="grid w-full max-w-7xl grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {["a", "b", "c", "d", "e", "f"].map((key) => (
        <Skeleton key={key} className="min-h-64 rounded-lg" />
      ))}
    </div>
  );
}
