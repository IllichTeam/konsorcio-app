"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
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

/**
 * Prefer `sentByUserName` (joined from `user.name`); fall back to a short id.
 */
function formatSentBy(userId: string | null, userName: string | null): string {
  const name = userName?.trim();
  if (name) {
    return name;
  }
  if (!userId) {
    return "—";
  }
  return userId.slice(0, 8);
}

export function createExpenseEmailSendHistoryColumns(
  consortiumId: string,
): ColumnDef<ExpenseEmailSendDto>[] {
  return [
    {
      accessorKey: "createdAt",
      header: "Fecha",
      cell: ({ row, getValue }) => (
        <Link
          href={`/consorcios/${consortiumId}/envios/${row.original.id}`}
          className="whitespace-nowrap text-primary tabular-nums hover:underline"
        >
          {formatCreatedAt(getValue<string>())}
        </Link>
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
      id: "sentBy",
      header: "Enviado por",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatSentBy(row.original.sentByUserId, row.original.sentByUserName)}
        </span>
      ),
    },
  ];
}
