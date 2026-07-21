"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Pencil, Trash2 } from "lucide-react";

import { ContactTypeBadge, UnitBadge } from "@/components/tenant-emails/tenant-email-badges";
import { Button } from "@/components/ui/button";
import { formatFunctionalUnit } from "@/lib/tenant-email/format-unit";
import type { TenantEmail } from "@/types/tenant-email";

type TenantEmailColumnsOptions = {
  onEdit: (entry: TenantEmail) => void;
  onDelete: (entry: TenantEmail) => void;
};

export function createTenantEmailColumns({
  onEdit,
  onDelete,
}: TenantEmailColumnsOptions): ColumnDef<TenantEmail>[] {
  return [
    {
      id: "unit",
      accessorFn: (row) => formatFunctionalUnit(row),
      header: "Unidad funcional",
      cell: ({ row }) => <UnitBadge entry={row.original} />,
    },
    {
      accessorKey: "email",
      header: "Email",
      cell: ({ row }) => (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-foreground">{row.original.email}</span>
          <ContactTypeBadge contactType={row.original.contactType} />
        </div>
      ),
    },
    {
      id: "actions",
      header: () => <span className="block w-full text-right">Acciones</span>,
      enableSorting: false,
      cell: ({ row }) => {
        const entry = row.original;

        return (
          <div className="flex items-center justify-end gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`Editar email ${entry.email}`}
              onClick={() => onEdit(entry)}
            >
              <Pencil className="size-4" aria-hidden="true" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive"
              aria-label={`Eliminar email ${entry.email}`}
              onClick={() => onDelete(entry)}
            >
              <Trash2 className="size-4" aria-hidden="true" />
            </Button>
          </div>
        );
      },
    },
  ];
}
