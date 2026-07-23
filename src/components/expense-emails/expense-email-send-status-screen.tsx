"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw } from "lucide-react";

import { expenseEmailSendRecipientColumns } from "@/components/expense-emails/expense-email-send-recipient-columns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader } from "@/components/ui/card";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";
import { useConsortium } from "@/hooks/use-consortiums";
import { useExpenseEmailSend, useRetryExpenseEmailPending } from "@/hooks/use-expense-emails";

const PAGE_SIZE = 10;

type ExpenseEmailSendStatusScreenProps = {
  consortiumId: string;
  sendId: string;
};

function isNotFoundError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }
  const withData = error as { data?: { code?: string }; message?: string };
  if (withData.data?.code === "NOT_FOUND") {
    return true;
  }
  return typeof withData.message === "string" && /no encontrado/i.test(withData.message);
}

export function ExpenseEmailSendStatusScreen({
  consortiumId,
  sendId,
}: ExpenseEmailSendStatusScreenProps) {
  const { data: consortium, isLoading: isConsortiumLoading } = useConsortium(consortiumId);
  const {
    data: detail,
    isLoading: isSendLoading,
    isError: isSendError,
    error: sendError,
    isFetching: isSendFetching,
  } = useExpenseEmailSend(consortiumId, sendId);
  const retryPending = useRetryExpenseEmailPending();
  const [pageIndex, setPageIndex] = useState(0);

  if (isConsortiumLoading || (isSendLoading && !detail)) {
    return <ExpenseEmailSendStatusSkeleton />;
  }

  if (isSendError && isNotFoundError(sendError)) {
    return (
      <StatusBackLink
        consortiumId={consortiumId}
        consortiumName={consortium?.name}
        message="No se encontró el envío solicitado."
      />
    );
  }

  if (isSendError || !detail) {
    return (
      <StatusBackLink
        consortiumId={consortiumId}
        consortiumName={consortium?.name}
        message="No se pudo cargar el estado del envío."
      />
    );
  }

  if (!consortium) {
    return (
      <StatusBackLink
        consortiumId={consortiumId}
        message="No se encontró el consorcio solicitado."
      />
    );
  }

  const { send, recipients } = detail;
  const pendingCount = Math.max(0, send.recipientCount - send.sentCount - send.failedCount);
  const hasRetryable = pendingCount > 0 || send.failedCount > 0;
  // Enabled whenever there is work left; server rejects fresh in-flight retries (CONFLICT).
  const canRetry = hasRetryable && !retryPending.isPending;
  const pageRows = recipients.slice(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 overflow-x-clip">
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
          Estado del envío nº {send.sendNumber}
        </h1>
      </div>

      <Card className="shadow-card" size="sm">
        <CardHeader>
          <CardDescription>
            {send.status === "queued" || send.status === "sending"
              ? "El envío continúa en segundo plano. Esta pantalla se actualiza sola; si se corta, usá Reintentar pendientes."
              : "Resultado del envío de expensa mensual."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Metric label="Total" value={send.recipientCount} />
            <Metric label="Enviados" value={send.sentCount} />
            <Metric label="Fallidos" value={send.failedCount} />
            <Metric label="Pendientes" value={pendingCount} />
          </dl>
        </CardContent>
      </Card>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">Destinatarios</h2>
        {hasRetryable ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={!canRetry}
            onClick={() => {
              retryPending.mutate({ consortiumId, sendId });
            }}
          >
            <RefreshCw
              className={`size-4 ${retryPending.isPending ? "animate-spin" : ""}`}
              aria-hidden="true"
            />
            Reintentar pendientes
          </Button>
        ) : null}
      </div>

      <DataTable
        columns={expenseEmailSendRecipientColumns}
        data={pageRows}
        pageIndex={pageIndex}
        pageSize={PAGE_SIZE}
        totalCount={recipients.length}
        onPageChange={setPageIndex}
        getRowId={(row) => row.id}
        emptyMessage="Todavía no hay destinatarios en este envío"
        className={isSendFetching ? "opacity-70 transition-opacity" : undefined}
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

function StatusBackLink({
  consortiumId,
  consortiumName,
  message,
}: {
  consortiumId: string;
  consortiumName?: string;
  message: string;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl space-y-4">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={`/consorcios/${consortiumId}`} />}
        className="-ml-2"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        {consortiumName ? `Volver a ${consortiumName}` : "Volver al consorcio"}
      </Button>
      <p className="text-sm text-destructive">{message}</p>
    </div>
  );
}

function ExpenseEmailSendStatusSkeleton() {
  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <Skeleton className="h-8 w-40" />
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-40 w-full rounded-lg" />
      <DataTableSkeleton columnCount={4} rowCount={PAGE_SIZE} />
    </div>
  );
}
