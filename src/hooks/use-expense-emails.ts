"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import type { inferRouterInputs } from "@trpc/server";

import type {
  ExpenseEmailSendDetailDto,
  ExpenseEmailSendStatus,
} from "@/lib/schemas/expense-email";
import { EXPENSE_EMAIL_STALE_SENDING_MS } from "@/lib/schemas/expense-email";
import { useTRPC } from "@/lib/trpc/client";
import type { AppRouter } from "@/server/trpc/routers/_app";

type PreviewExpenseEmailInput = inferRouterInputs<AppRouter>["expenseEmails"]["preview"];

const SEND_POLL_MS = 2000;

/** Poll while the background runner may still be updating recipients. */
function shouldPollExpenseEmailSend(detail: ExpenseEmailSendDetailDto | undefined): boolean {
  if (!detail) {
    return false;
  }

  const { send, recipients } = detail;
  if (send.status !== "queued" && send.status !== "sending") {
    return false;
  }

  // Stop polling a stale `sending` job — CTA "Reintentar pendientes" can reclaim it.
  if (send.status === "sending") {
    const latestAttemptMs = recipients.reduce<number | null>((max, row) => {
      if (!row.lastAttemptAt) {
        return max;
      }
      const ts = new Date(row.lastAttemptAt).getTime();
      if (Number.isNaN(ts)) {
        return max;
      }
      return max == null ? ts : Math.max(max, ts);
    }, null);

    const createdMs = new Date(send.createdAt).getTime();
    const anchorMs = latestAttemptMs ?? (Number.isNaN(createdMs) ? Date.now() : createdMs);
    if (Date.now() - anchorMs >= EXPENSE_EMAIL_STALE_SENDING_MS) {
      return false;
    }
  }

  return true;
}

export function useExpenseEmailPreview(
  input: PreviewExpenseEmailInput,
  options?: { enabled?: boolean },
) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.expenseEmails.preview.queryOptions(input),
    enabled: Boolean(options?.enabled !== false && input.consortiumId && input.message.trim()),
  });
}

export function useExpenseEmailSend(consortiumId: string, sendId: string) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.expenseEmails.getSend.queryOptions({ consortiumId, sendId }),
    enabled: Boolean(consortiumId && sendId),
    refetchInterval: (query) =>
      shouldPollExpenseEmailSend(query.state.data) ? SEND_POLL_MS : false,
  });
}

export function useRecentExpenseEmailSends(
  consortiumId: string,
  options?: { limit?: number; enabled?: boolean },
) {
  const trpc = useTRPC();
  const limit = options?.limit ?? 20;

  return useQuery({
    ...trpc.expenseEmails.listRecentByConsortium.queryOptions({
      consortiumId,
      limit,
    }),
    enabled: Boolean(options?.enabled !== false && consortiumId),
  });
}

export function useCreateExpenseEmailSend() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.expenseEmails.create.mutationOptions({
      onSuccess: (_data, variables) => {
        void queryClient.invalidateQueries(
          trpc.expenseEmails.listRecentByConsortium.queryFilter({
            consortiumId: variables.consortiumId,
          }),
        );
        void queryClient.invalidateQueries(
          trpc.expenseEmails.getSend.queryFilter({
            consortiumId: variables.consortiumId,
            sendId: variables.sendId,
          }),
        );
      },
    }),
  );
}

export function useRetryExpenseEmailPending() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.expenseEmails.retryPending.mutationOptions({
      onSuccess: (_data, variables) => {
        toast.success("Reintento iniciado");
        void queryClient.invalidateQueries(
          trpc.expenseEmails.getSend.queryFilter({
            consortiumId: variables.consortiumId,
            sendId: variables.sendId,
          }),
        );
        void queryClient.invalidateQueries(
          trpc.expenseEmails.listRecentByConsortium.queryFilter({
            consortiumId: variables.consortiumId,
          }),
        );
      },
      onError: (error) => {
        toast.error(error.message || "No se pudieron reintentar los pendientes");
      },
    }),
  );
}

export function expenseEmailSendStatusLabel(status: ExpenseEmailSendStatus): string {
  switch (status) {
    case "queued":
      return "En cola";
    case "sending":
      return "Enviando";
    case "sent":
      return "Enviado";
    case "partial":
      return "Parcial";
    case "failed":
      return "Fallido";
  }
}
