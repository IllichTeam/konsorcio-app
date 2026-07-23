"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, FileText, Mail, Pencil } from "lucide-react";

import { defaultAuthenticatedPath } from "@/lib/navigation/dashboard-nav";

import { useConsortium, useConsortiumHistory } from "@/hooks/use-consortiums";
import { useRecentExpenseEmailSends } from "@/hooks/use-expense-emails";
import { ConsortiumFormDialog } from "@/components/consortiums/consortium-form-dialog";
import { consortiumHistoryColumns } from "@/components/consortiums/consortium-history-columns";
import { createExpenseEmailSendHistoryColumns } from "@/components/expense-emails/expense-email-send-history-columns";
import { SendMonthlyExpenseDialog } from "@/components/expense-emails/send-monthly-expense-dialog";
import { Button } from "@/components/ui/button";
import { DataTable, DataTableSkeleton } from "@/components/ui/data-table";
import { Skeleton } from "@/components/ui/skeleton";

const HISTORY_PAGE_SIZE = 10;
const EXPENSE_HISTORY_PAGE_SIZE = 5;
const EXPENSE_HISTORY_LIMIT = 20;
const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

type ConsortiumDetailProps = {
  consortiumId: string;
};

export function ConsortiumDetail({ consortiumId }: ConsortiumDetailProps) {
  const { data: consortium, isLoading, isError } = useConsortium(consortiumId);
  const [historyPage, setHistoryPage] = useState(1);
  const [expenseHistoryPage, setExpenseHistoryPage] = useState(0);
  const {
    data: historyPageData,
    isLoading: isHistoryLoading,
    isFetching: isHistoryFetching,
  } = useConsortiumHistory(consortiumId, {
    page: historyPage,
    pageSize: HISTORY_PAGE_SIZE,
  });
  const {
    data: expenseSends = [],
    isLoading: isExpenseHistoryLoading,
    isFetching: isExpenseHistoryFetching,
  } = useRecentExpenseEmailSends(consortiumId, {
    limit: EXPENSE_HISTORY_LIMIT,
    enabled: !isDemoMode,
  });
  const expenseHistoryColumns = createExpenseEmailSendHistoryColumns(consortiumId);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false);

  if (isLoading) {
    return <ConsortiumDetailSkeleton />;
  }

  if (isError || !consortium) {
    return (
      <div className="w-full space-y-4">
        <Button
          variant="ghost"
          size="sm"
          render={<Link href={defaultAuthenticatedPath} />}
          className="-ml-2"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          Volver a consorcios
        </Button>
        <p className="text-sm text-destructive">No se encontró el consorcio solicitado.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full min-h-[calc(100dvh-5rem)] flex-col">
      <Button
        variant="ghost"
        size="sm"
        render={<Link href={defaultAuthenticatedPath} />}
        className="-ml-2 w-fit text-muted-foreground"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a consorcios
      </Button>

      <div className="mt-4">
        <h1 className="text-3xl font-semibold tracking-tight text-balance text-foreground">
          {consortium.name}
        </h1>

        <div className="mt-6">
          <p className="text-base font-medium text-muted-foreground">Acciones</p>
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {!isDemoMode ? (
              <>
                <Button className="w-fit" onClick={() => setExpenseDialogOpen(true)}>
                  <FileText className="size-4" aria-hidden="true" />
                  Enviar expensa mensual
                </Button>
                <Button
                  variant="outline"
                  className="w-fit"
                  render={<Link href={`/resumen/${consortiumId}/emails-inquilinos`} />}
                >
                  <Mail className="size-4" aria-hidden="true" />
                  Emails de inquilinos
                </Button>
              </>
            ) : null}
            <Button variant="outline" className="w-fit" onClick={() => setFormDialogOpen(true)}>
              <Pencil className="size-4" aria-hidden="true" />
              Editar consorcio
            </Button>
          </div>
        </div>
      </div>

      <dl className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="space-y-1">
          <dt className="text-base font-bold text-foreground">Alias de cobro</dt>
          <dd className="text-sm text-foreground">{consortium.paymentAlias ?? "—"}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-base font-bold text-foreground">Email</dt>
          <dd className="text-sm text-foreground">{consortium.billingEmail ?? "—"}</dd>
        </div>
        <div className="space-y-1">
          <dt className="text-base font-bold text-foreground">Link del drive</dt>
          <dd className="text-sm text-foreground">
            {consortium.driveLink ? (
              <a
                href={consortium.driveLink}
                target="_blank"
                rel="noopener noreferrer"
                className="break-all text-primary hover:underline"
              >
                {consortium.driveLink}
              </a>
            ) : (
              "—"
            )}
          </dd>
        </div>
      </dl>

      {!isDemoMode ? (
        <div className="mt-8 flex min-h-0 flex-col overflow-x-clip">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Envíos de expensa reciente</h2>
          {isExpenseHistoryLoading && expenseSends.length === 0 ? (
            <DataTableSkeleton columnCount={4} rowCount={EXPENSE_HISTORY_PAGE_SIZE} />
          ) : (
            <DataTable
              columns={expenseHistoryColumns}
              data={expenseSends.slice(
                expenseHistoryPage * EXPENSE_HISTORY_PAGE_SIZE,
                expenseHistoryPage * EXPENSE_HISTORY_PAGE_SIZE + EXPENSE_HISTORY_PAGE_SIZE,
              )}
              pageIndex={expenseHistoryPage}
              pageSize={EXPENSE_HISTORY_PAGE_SIZE}
              totalCount={expenseSends.length}
              onPageChange={setExpenseHistoryPage}
              getRowId={(row) => row.id}
              emptyMessage="Todavía no hay envíos de expensa"
              className={isExpenseHistoryFetching ? "opacity-70 transition-opacity" : undefined}
            />
          )}
        </div>
      ) : null}

      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Historial de acciones</h2>
        {isHistoryLoading && !historyPageData ? (
          <DataTableSkeleton columnCount={2} rowCount={HISTORY_PAGE_SIZE} />
        ) : (
          <DataTable
            columns={consortiumHistoryColumns}
            data={historyPageData?.items ?? []}
            pageIndex={historyPage - 1}
            pageSize={HISTORY_PAGE_SIZE}
            totalCount={historyPageData?.total ?? 0}
            onPageChange={(pageIndex) => setHistoryPage(pageIndex + 1)}
            getRowId={(row) => String(row.id)}
            emptyMessage="Todavía no hay acciones registradas"
            className={isHistoryFetching ? "opacity-70 transition-opacity" : undefined}
          />
        )}
      </div>

      <ConsortiumFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        consortiumId={consortiumId}
        initialConsortium={consortium}
      />
      <SendMonthlyExpenseDialog
        open={expenseDialogOpen}
        onOpenChange={setExpenseDialogOpen}
        consortiumId={consortiumId}
        consortiumName={consortium.name}
        defaultDriveLink={consortium.driveLink}
      />
    </div>
  );
}

function ConsortiumDetailSkeleton() {
  return (
    <div className="flex w-full min-h-[calc(100dvh-5rem)] flex-col">
      <Skeleton className="h-8 w-40" />
      <div className="mt-4">
        <Skeleton className="h-7 w-56" />
        <div className="mt-6">
          <Skeleton className="h-4 w-16" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-9 w-36" />
          </div>
        </div>
      </div>
      <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-3">
        <div className="space-y-2">
          <Skeleton className="h-5 w-24" />
          <Skeleton className="h-4 w-32" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="space-y-2">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-4 w-48" />
        </div>
      </div>
      <div className="mt-8 flex min-h-0 flex-1 flex-col">
        <Skeleton className="mb-3 h-4 w-40" />
        <DataTableSkeleton columnCount={2} rowCount={HISTORY_PAGE_SIZE} />
      </div>
    </div>
  );
}
