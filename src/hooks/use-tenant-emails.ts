import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTenantEmail,
  deleteTenantEmail,
  getTenantEmails,
  updateTenantEmail,
} from "@/lib/api/tenant-emails";
import { queryKeys } from "@/lib/api/query-keys";
import type { TenantEmail } from "@/types/tenant-email";

export function useTenantEmails(consorcioId: string) {
  return useQuery({
    queryKey: queryKeys.tenantEmails.byConsorcio(consorcioId),
    queryFn: () => getTenantEmails(consorcioId),
    enabled: Boolean(consorcioId),
  });
}

export function useCreateTenantEmail(consorcioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTenantEmail,
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.tenantEmails.byConsorcio(consorcioId),
        (current: TenantEmail[] | undefined) => [...(current ?? []), data],
      );
    },
  });
}

export function useUpdateTenantEmail(consorcioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTenantEmail,
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.tenantEmails.byConsorcio(consorcioId),
        (current: TenantEmail[] | undefined) =>
          (current ?? []).map((item) => (item.id === data.id ? data : item)),
      );
    },
  });
}

export function useDeleteTenantEmail(consorcioId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTenantEmail(consorcioId, id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData(
        queryKeys.tenantEmails.byConsorcio(consorcioId),
        (current: TenantEmail[] | undefined) => (current ?? []).filter((item) => item.id !== id),
      );
    },
  });
}
