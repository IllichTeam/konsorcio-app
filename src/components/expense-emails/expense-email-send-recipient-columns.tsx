"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";
import { formatDate } from "@/lib/format-date";
import type { ExpenseEmailRecipientDto } from "@/lib/schemas/expense-email";

const statusLabel: Record<ExpenseEmailRecipientDto["status"], string> = {
  pending: "Pendiente",
  sent: "Enviado",
  failed: "Fallido",
};

const statusVariant: Record<
  ExpenseEmailRecipientDto["status"],
  "warning" | "success" | "destructive"
> = {
  pending: "warning",
  sent: "success",
  failed: "destructive",
};

export const expenseEmailSendRecipientColumns: ColumnDef<ExpenseEmailRecipientDto>[] = [
  {
    accessorKey: "lastAttemptAt",
    header: "Fecha",
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-muted-foreground tabular-nums">
        {formatDate(getValue<string | null | undefined>())}
      </span>
    ),
  },
  {
    accessorKey: "email",
    header: "Email",
    cell: ({ getValue }) => <span className="break-all text-foreground">{getValue<string>()}</span>,
  },
  {
    accessorKey: "status",
    header: "Estado",
    cell: ({ getValue }) => {
      const status = getValue<ExpenseEmailRecipientDto["status"]>();
      return <Badge variant={statusVariant[status]}>{statusLabel[status]}</Badge>;
    },
  },
  {
    accessorKey: "error",
    header: "Error",
    cell: ({ getValue }) => {
      const error = getValue<string | null | undefined>();
      return (
        <span className="whitespace-normal text-muted-foreground">
          {error?.trim() ? error : "—"}
        </span>
      );
    },
  },
];
