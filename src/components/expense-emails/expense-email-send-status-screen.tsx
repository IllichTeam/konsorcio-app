"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { useConsortium } from "@/hooks/use-consortiums";
import {
  expenseEmailSendRecipientColumns,
  type ExpenseEmailRecipientRow,
} from "@/components/expense-emails/expense-email-send-recipient-columns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DataTable } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

const PAGE_SIZE = 10;

type SendJobStatus = "sending" | "sent" | "partial" | "failed";

type ExpenseEmailSendStatusScreenProps = {
  consortiumId: string;
  sendId: string;
};

const statusCopy: Record<
  SendJobStatus,
  { label: string; variant: "soft" | "success" | "warning" | "destructive" | "outline" }
> = {
  sending: { label: "Enviando", variant: "soft" },
  sent: { label: "Enviado", variant: "success" },
  partial: { label: "Parcial", variant: "warning" },
  failed: { label: "Fallido", variant: "destructive" },
};

/** Placeholder rows until the real send status API exists. */
const MOCK_RECIPIENTS: ExpenseEmailRecipientRow[] = [
  {
    id: "1",
    email: "propietario.1@ejemplo.com",
    status: "sent",
    attemptedAt: "2026-07-21T20:01:12.000Z",
  },
  {
    id: "2",
    email: "inquilino.2@ejemplo.com",
    status: "sent",
    attemptedAt: "2026-07-21T20:01:18.000Z",
  },
  {
    id: "3",
    email: "propietario.3@ejemplo.com",
    status: "pending",
    attemptedAt: null,
  },
  {
    id: "4",
    email: "inquilino.4@ejemplo.com",
    status: "failed",
    error: "Rechazado por el proveedor (maqueta)",
    attemptedAt: "2026-07-21T20:01:24.000Z",
  },
  {
    id: "5",
    email: "propietario.5@ejemplo.com",
    status: "pending",
    attemptedAt: null,
  },
];

export function ExpenseEmailSendStatusScreen({
  consortiumId,
  sendId: _sendId,
}: ExpenseEmailSendStatusScreenProps) {
  const { data: consortium, isLoading, isError } = useConsortium(consortiumId);
  const [pageIndex, setPageIndex] = useState(0);

  const jobStatus: SendJobStatus = "sending";
  const sentCount = MOCK_RECIPIENTS.filter((row) => row.status === "sent").length;
  const failedCount = MOCK_RECIPIENTS.filter((row) => row.status === "failed").length;
  const pendingCount = MOCK_RECIPIENTS.filter((row) => row.status === "pending").length;
  const totalCount = MOCK_RECIPIENTS.length;
  const pageRows = MOCK_RECIPIENTS.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);

  if (isLoading) {
    return <ExpenseEmailSendStatusSkeleton />;
  }

  if (isError || !consortium) {
    return (
      <div className="w-full space-y-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/consorcios/${consortiumId}`} />}
          className="-ml-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver al consorcio
        </Button>
        <p className="text-sm text-destructive">No se encontró el consorcio solicitado.</p>
      </div>
    );
  }

  const statusMeta = statusCopy[jobStatus];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={`/consorcios/${consortiumId}`} />}
          className="-ml-2 w-fit text-muted-foreground"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a {consortium.name}
        </Button>

        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-balance text-foreground">
          Estado del envío
        </h1>
      </div>

      <Card className="shadow-card" size="sm">
        <CardHeader className="border-b">
          <CardTitle>Resumen</CardTitle>
          <CardDescription>
            Maqueta de seguimiento. El envío real y el polling se conectan en una pasada posterior.
          </CardDescription>
          <CardAction>
            <Badge variant={statusMeta.variant}>{statusMeta.label}</Badge>
          </CardAction>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Total" value={totalCount} />
            <Metric label="Enviados" value={sentCount} />
            <Metric label="Fallidos" value={failedCount} />
            <Metric label="Pendientes" value={pendingCount} />
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Destinatarios</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => toast.message("Reintentar pendientes estará disponible con el backend")}
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Reintentar pendientes
        </Button>
      </div>

      <DataTable
        columns={expenseEmailSendRecipientColumns}
        data={pageRows}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        totalCount={totalCount}
        onPageChange={setPageIndex}
        getRowId={(row) => row.id}
        emptyMessage="Todavía no hay destinatarios en este envío"
      />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="space-y-1.5">
      <dt className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="text-2xl font-semibold tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function ExpenseEmailSendStatusSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <Skeleton className="h-64 w-full rounded-lg" />
    </div>
  );
}
