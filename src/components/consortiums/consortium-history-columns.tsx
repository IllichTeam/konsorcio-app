"use client";

import type { ColumnDef } from "@tanstack/react-table";

import type { ConsortiumHistoryEntry } from "@/lib/schemas/consortium";

export const consortiumHistoryColumns: ColumnDef<ConsortiumHistoryEntry>[] = [
  {
    accessorKey: "timestamp",
    header: "Fecha",
    cell: ({ getValue }) => <span className="text-muted-foreground">{getValue<string>()}</span>,
  },
  {
    accessorKey: "description",
    header: "Acción",
    cell: ({ getValue }) => (
      <span className="whitespace-normal text-foreground">{getValue<string>()}</span>
    ),
  },
];
