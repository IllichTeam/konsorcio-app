"use client";

import { useState } from "react";
import {
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type SortingState,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

const DEFAULT_PAGE_SIZE = 10;

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  /** 0-based, controlled — matches TanStack */
  pageIndex: number;
  pageSize?: number;
  totalCount: number;
  onPageChange: (pageIndex: number) => void;
  emptyMessage?: string;
  getRowId?: (row: TData) => string;
  className?: string;
};

type DataTableSkeletonProps = {
  columnCount?: number;
  rowCount?: number;
  className?: string;
};

/** Table-shaped loading placeholder matching DataTable chrome. */
export function DataTableSkeleton({
  columnCount = 2,
  rowCount = 8,
  className,
}: DataTableSkeletonProps) {
  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
      aria-busy="true"
      aria-label="Cargando tabla"
    >
      <div className="min-h-0 flex-1 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {Array.from({ length: columnCount }, (_, index) => (
                <TableHead key={index} className="px-4">
                  <Skeleton className={cn("h-4", index === 0 ? "w-16" : "w-20")} />
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: rowCount }, (_, rowIndex) => (
              <TableRow key={rowIndex} className="hover:bg-transparent">
                {Array.from({ length: columnCount }, (_, colIndex) => (
                  <TableCell key={colIndex} className="px-4">
                    <Skeleton
                      className={cn("h-4", colIndex === 0 ? "w-28" : "w-[min(100%,18rem)]")}
                    />
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div className="flex shrink-0 flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <Skeleton className="h-4 w-40" />
        <div className="flex items-center gap-1.5">
          <Skeleton className="h-9 w-20" />
          <Skeleton className="size-9" />
          <Skeleton className="size-9" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </div>
  );
}

function SortIcon({ sorted }: { sorted: false | "asc" | "desc" }) {
  if (sorted === "asc") {
    return <ArrowUp className="size-3.5 opacity-70" aria-hidden="true" />;
  }

  if (sorted === "desc") {
    return <ArrowDown className="size-3.5 opacity-70" aria-hidden="true" />;
  }

  return <ArrowUpDown className="size-3.5 opacity-40" aria-hidden="true" />;
}

export function DataTable<TData, TValue>({
  columns,
  data,
  pageIndex,
  pageSize = DEFAULT_PAGE_SIZE,
  totalCount,
  onPageChange,
  emptyMessage = "No hay resultados",
  getRowId,
  className,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = useState<SortingState>([]);

  const pageCount = totalCount === 0 ? 0 : Math.ceil(totalCount / pageSize);
  const pageStart = totalCount === 0 ? 0 : pageIndex * pageSize + 1;
  const pageEnd = Math.min((pageIndex + 1) * pageSize, totalCount);

  const table = useReactTable({
    data,
    columns,
    pageCount,
    manualPagination: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    onSortingChange: setSorting,
    onPaginationChange: (updater) => {
      const next = typeof updater === "function" ? updater({ pageIndex, pageSize }) : updater;

      if (next.pageIndex !== pageIndex) {
        onPageChange(next.pageIndex);
      }
    },
    getRowId: getRowId ? (row) => getRowId(row) : undefined,
    state: {
      sorting,
      pagination: { pageIndex, pageSize },
    },
  });

  return (
    <div
      className={cn(
        "flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border border-border bg-card",
        className,
      )}
    >
      <div className="min-h-0 flex-1 overflow-y-auto">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort();

                  return (
                    <TableHead key={header.id} className="px-4">
                      {header.isPlaceholder ? null : canSort ? (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="-ml-2 h-8 gap-1.5 px-2 font-medium text-foreground"
                          onClick={header.column.getToggleSortingHandler()}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          <SortIcon sorted={header.column.getIsSorted()} />
                        </Button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <TableRow key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id} className="px-4">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {emptyMessage}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {totalCount > 0 ? (
        <nav
          aria-label="Paginación"
          className="flex shrink-0 flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
        >
          <p className="text-[13px] text-muted-foreground">
            Mostrando{" "}
            <span className="font-medium tabular-nums text-foreground">
              {pageStart}–{pageEnd}
            </span>{" "}
            de <span className="font-medium tabular-nums text-foreground">{totalCount}</span>
          </p>

          {pageCount > 1 ? (
            <div className="flex items-center gap-1.5">
              <Button
                type="button"
                variant="secondary"
                className="h-9"
                disabled={!table.getCanPreviousPage()}
                onClick={() => table.previousPage()}
              >
                Anterior
              </Button>

              {Array.from({ length: pageCount }, (_, index) => {
                const page = index;

                return (
                  <Button
                    key={page}
                    type="button"
                    variant={page === pageIndex ? "default" : "secondary"}
                    size="icon"
                    className="size-9"
                    aria-label={`Página ${page + 1}`}
                    aria-current={page === pageIndex ? "page" : undefined}
                    onClick={() => table.setPageIndex(page)}
                  >
                    {page + 1}
                  </Button>
                );
              })}

              <Button
                type="button"
                variant="secondary"
                className="h-9"
                disabled={!table.getCanNextPage()}
                onClick={() => table.nextPage()}
              >
                Siguiente
              </Button>
            </div>
          ) : null}
        </nav>
      ) : null}
    </div>
  );
}
