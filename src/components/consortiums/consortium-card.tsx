"use client";

import Link from "next/link";
import { Building2, Pencil, Settings, Trash2 } from "lucide-react";

import type { Consortium } from "@/types/consortium";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

const TILE_TONES = [
  { bg: "bg-tile-blue", fg: "text-tile-blue-fg" },
  { bg: "bg-tile-amber", fg: "text-tile-amber-fg" },
  { bg: "bg-tile-violet", fg: "text-tile-violet-fg" },
  { bg: "bg-tile-teal", fg: "text-tile-teal-fg" },
  { bg: "bg-tile-rose", fg: "text-tile-rose-fg" },
  { bg: "bg-tile-green", fg: "text-tile-green-fg" },
] as const;

function tileToneForId(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) {
    hash = (hash + id.charCodeAt(i) * (i + 1)) % TILE_TONES.length;
  }
  return TILE_TONES[hash] ?? TILE_TONES[0];
}

type ConsortiumCardProps = {
  consortium: Consortium;
  className?: string;
  onComment: (consortium: Consortium) => void;
  onEdit: (consortium: Consortium) => void;
  onDelete: (consortium: Consortium) => void;
};

export function ConsortiumCard({
  consortium,
  className,
  onComment,
  onEdit,
  onDelete,
}: ConsortiumCardProps) {
  const tile = tileToneForId(consortium.id);

  return (
    <article
      className={cn(
        "group relative flex flex-col rounded-lg bg-card shadow-card transition-[transform,box-shadow] duration-200 ease-[cubic-bezier(0.23,1,0.32,1)] hover:-translate-y-px hover:shadow-card-hover motion-reduce:transition-none motion-reduce:hover:translate-y-0",
        className,
      )}
    >
      <Link
        href={`/consorcios/${consortium.id}`}
        className="absolute inset-0 z-0 rounded-lg focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
        aria-label={`Abrir ${consortium.name}`}
      />

      <div className="relative z-10 flex flex-1 flex-col p-5">
        <div className="absolute top-3 right-3">
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  aria-label={`Configurar ${consortium.name}`}
                  onClick={(event) => event.preventDefault()}
                >
                  <Settings className="size-4" aria-hidden="true" />
                </Button>
              }
            />
            <DropdownMenuContent align="end" onClick={(event) => event.stopPropagation()}>
              <DropdownMenuItem
                onClick={(event) => {
                  event.preventDefault();
                  onEdit(consortium);
                }}
              >
                <Pencil className="size-4" aria-hidden="true" />
                Editar consorcio
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={(event) => {
                  event.preventDefault();
                  onDelete(consortium);
                }}
              >
                <Trash2 className="size-4" aria-hidden="true" />
                Eliminar consorcio
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex min-w-0 items-center gap-3 pr-10">
          <span
            className={cn(
              "flex size-12 shrink-0 items-center justify-center rounded-lg",
              tile.bg,
              tile.fg,
            )}
            aria-hidden="true"
          >
            <Building2 className="size-6" strokeWidth={1.75} />
          </span>
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-semibold tracking-tight text-foreground">
              {consortium.name}
            </h3>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">
              {consortium.location}
            </p>
          </div>
        </div>

        <dl className="mt-5 grid grid-cols-2 gap-x-4 border-t border-border pt-4">
          <div className="flex flex-col gap-1.5">
            <dt className="text-[12px] text-muted-foreground">Unidades</dt>
            <dd className="text-[15px] font-semibold tracking-tight tabular-nums text-foreground">
              —
            </dd>
          </div>
          <div className="flex flex-col gap-1.5">
            <dt className="text-[12px] text-muted-foreground">Inquilinos</dt>
            <dd className="text-[15px] font-semibold tracking-tight tabular-nums text-foreground">
              —
            </dd>
          </div>
        </dl>

        <div className="mt-auto pt-5">
          <button
            type="button"
            className="relative z-20 flex h-9 w-full items-center justify-center rounded-md border border-border bg-card px-3 text-[13px] font-medium text-foreground transition-colors duration-200 hover:border-[oklch(0.82_0.01_255)] hover:bg-[oklch(0.94_0.005_255)] active:scale-[0.99] motion-reduce:active:scale-100"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onComment(consortium);
            }}
          >
            Enviar comentario
          </button>
        </div>
      </div>
    </article>
  );
}
