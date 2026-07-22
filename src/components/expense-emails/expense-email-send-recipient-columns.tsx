"use client";

import type { ColumnDef } from "@tanstack/react-table";

import { Badge } from "@/components/ui/badge";

export type ExpenseEmailRecipientRow = {
  id: string;
  email: string;
  status: "pending" | "sent" | "failed";
  error?: string | null;
  /** ISO timestamp of last attempt; null while still pending without attempt. */
  attemptedAt?: string | null;
};

const statusLabel: Record<ExpenseEmailRecipientRow["status"], string> = {
  pending: "Pendiente",
  sent: "Enviado",
  failed: "Fallido",
};

const statusVariant: Record<
  ExpenseEmailRecipientRow["status"],
  "warning" | "success" | "destructive"
> = {
  pending: "warning",
  sent: "success",
  failed: "destructive",
};

function formatAttemptedAt(value: string | null | undefined): string {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleString("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

export const expenseEmailSendRecipientColumns: ColumnDef<ExpenseEmailRecipientRow>[] = [
  {
    accessorKey: "attemptedAt",
    header: "Fecha y hora",
    cell: ({ getValue }) => (
      <span className="whitespace-nowrap text-muted-foreground tabular-nums">
        {formatAttemptedAt(getValue<string | null | undefined>())}
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
      const status = getValue<ExpenseEmailRecipientRow["status"]>();
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
