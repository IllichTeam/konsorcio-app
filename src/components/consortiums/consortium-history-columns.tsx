"use client";

import Link from "next/link";
import type { ColumnDef } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
import { formatExpensePeriod } from "@/lib/email/build-monthly-expense-message";
import { formatDateTimeAmPm } from "@/lib/format-date";
import type { ConsortiumHistoryEntry } from "@/lib/schemas/consortium";
import type { ExpenseEmailSendStatus } from "@/lib/schemas/expense-email";
import { cn } from "@/lib/utils";

const FIELD_LABELS: Record<string, string> = {
  name: "Nombre",
  location: "Ubicación",
  paymentAlias: "Alias de cobro",
  billingEmail: "Email",
  driveLink: "Link del drive",
};

/** Soft filled outline styles by live expense-send status. */
function expenseSendButtonClassName(status: ExpenseEmailSendStatus | undefined): string {
  if (status === "sent") {
    return "border-emerald-500/25 bg-emerald-500/10 text-emerald-700 hover:bg-emerald-500/15 hover:text-emerald-800 dark:text-emerald-400 dark:hover:text-emerald-300";
  }
  if (status === "failed") {
    return "border-destructive/30 bg-destructive/10 text-destructive hover:bg-destructive/20";
  }
  // queued | sending | partial | unknown → yellow (in progress / incomplete / safe default)
  return "border-amber-500/25 bg-amber-500/10 text-amber-800 hover:bg-amber-500/15 hover:text-amber-900 dark:text-amber-300 dark:hover:text-amber-200";
}

function formatDriveLink(value: string | null | undefined): string {
  if (value == null || value.trim() === "") {
    return "—";
  }
  return value;
}

function formatAmount(value: number | undefined): string {
  if (value == null) {
    return "—";
  }
  return value.toLocaleString("es-AR");
}

function HistoryActionCell({ entry }: { entry: ConsortiumHistoryEntry }) {
  const { type, summary, payload, timestamp } = entry;

  const displaySummary =
    type === "expense_sent"
      ? `Se envió la expensa mensual de ${formatExpensePeriod(new Date(timestamp))}`
      : summary;

  let subtitle: string | null = null;
  if (type === "drive_link_updated") {
    subtitle = `Antes: ${formatDriveLink(payload.previousDriveLink)}`;
  } else if (type === "consortium_updated" && payload.fieldsChanged?.length) {
    const labels = payload.fieldsChanged.map((field) => FIELD_LABELS[field] ?? field);
    subtitle = `Campos: ${labels.join(", ")}`;
    if (payload.fieldsChanged.includes("driveLink")) {
      subtitle += ` · Antes: ${formatDriveLink(payload.previousDriveLink)}`;
    }
  } else if (type === "notification_sent" && payload.messagePreview) {
    subtitle = payload.messagePreview;
  } else if (type === "amount_updated") {
    subtitle = `${formatAmount(payload.previousAmount)} → ${formatAmount(payload.newAmount)}`;
  }

  return (
    <div className="space-y-1">
      <span className="whitespace-normal text-foreground">{displaySummary}</span>
      {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
    </div>
  );
}

function HistorySendActionCell({
  entry,
  consortiumId,
}: {
  entry: ConsortiumHistoryEntry;
  consortiumId: string;
}) {
  if (entry.type !== "expense_sent" || !entry.payload.sendId) {
    return null;
  }

  const sendId = entry.payload.sendId;

  return (
    <Button
      variant="outline"
      size="sm"
      nativeButton={false}
      className={cn(expenseSendButtonClassName(entry.sendStatus))}
      render={<Link href={`/consorcios/${consortiumId}/envios/${sendId}`} />}
    >
      Ver Detalle
    </Button>
  );
}

export function createConsortiumHistoryColumns(
  consortiumId: string,
): ColumnDef<ConsortiumHistoryEntry>[] {
  return [
    {
      accessorKey: "timestamp",
      header: "Fecha",
      cell: ({ getValue }) => (
        <span className="whitespace-nowrap tabular-nums text-muted-foreground">
          {formatDateTimeAmPm(getValue<string>())}
        </span>
      ),
    },
    {
      id: "action",
      header: "Acción",
      cell: ({ row }) => <HistoryActionCell entry={row.original} />,
    },
    {
      id: "sendAction",
      header: " ",
      enableSorting: false,
      cell: ({ row }) => (
        <div className="flex justify-end">
          <HistorySendActionCell entry={row.original} consortiumId={consortiumId} />
        </div>
      ),
    },
  ];
}
