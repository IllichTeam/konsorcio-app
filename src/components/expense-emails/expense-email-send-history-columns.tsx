"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { expenseEmailSendStatusLabel } from "@/hooks/use-expense-emails";
import type { ExpenseEmailSendDto, ExpenseEmailSendStatus } from "@/lib/schemas/expense-email";

const statusVariant: Record<
  ExpenseEmailSendStatus,
  "soft" | "success" | "warning" | "destructive" | "outline"
> = {
  queued: "outline",
  sending: "soft",
  sent: "success",
  partial: "warning",
  failed: "destructive",
};

function formatCreatedAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export function createExpenseEmailSendHistoryColumns(
  consortiumId: string,
): ColumnDef<ExpenseEmailSendDto>[] {
  return [
    {
      accessorKey: "sendNumber",
      header: "Nº",
      cell: ({ getValue }) => (
        <span className="tabular-nums text-foreground">{getValue<number>()}</span>
      ),
    },
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap tabular-nums text-foreground">
          {formatCreatedAt(getValue<string>())}
        </span>
      ),
    },
    {
      accessorKey: "status",
      header: "Estado",
      cell: ({ getValue }) => {
        const status = getValue<ExpenseEmailSendStatus>();
        return <Badge variant={statusVariant[status]}>{expenseEmailSendStatusLabel(status)}</Badge>;
      },
    },
    {
      id: "counts",
      header: "Resultado",
      cell: ({ row }) => {
        const { sentCount, failedCount, recipientCount } = row.original;
        const pendingCount = Math.max(0, recipientCount - sentCount - failedCount);
        return (
          <span className="text-muted-foreground tabular-nums">
            {sentCount} env. · {failedCount} fall. · {pendingCount} pend. / {recipientCount}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "Acciones",
      enableSorting: false,
      cell: ({ row }) => (
        <Button
          variant="outline"
          size="sm"
          render={<Link href={`/consorcios/${consortiumId}/envios/${row.original.id}`} />}
        >
          Ver detalle
        </Button>
      ),
    },
  ];
}
