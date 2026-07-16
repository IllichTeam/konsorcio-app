import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createTenantEmail,
  deleteTenantEmail,
  getTenantEmails,
  updateTenantEmail,
} from "@/lib/api/tenant-emails";
import { queryKeys } from "@/lib/api/query-keys";
import type { TenantEmail } from "@/types/tenant-email";

export function useTenantEmails(consortiumId: string) {
  return useQuery({
    queryKey: queryKeys.tenantEmails.byConsortium(consortiumId),
    queryFn: () => getTenantEmails(consortiumId),
    enabled: Boolean(consortiumId),
  });
}

export function useCreateTenantEmail(consortiumId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createTenantEmail,
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.tenantEmails.byConsortium(consortiumId),
        (current: TenantEmail[] | undefined) => [...(current ?? []), data],
      );
    },
  });
}

export function useUpdateTenantEmail(consortiumId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateTenantEmail,
    onSuccess: (data) => {
      queryClient.setQueryData(
        queryKeys.tenantEmails.byConsortium(consortiumId),
        (current: TenantEmail[] | undefined) =>
          (current ?? []).map((item) => (item.id === data.id ? data : item)),
      );
    },
  });
}

export function useDeleteTenantEmail(consortiumId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => deleteTenantEmail(consortiumId, id),
    onSuccess: (_data, id) => {
      queryClient.setQueryData(
        queryKeys.tenantEmails.byConsortium(consortiumId),
        (current: TenantEmail[] | undefined) => (current ?? []).filter((item) => item.id !== id),
      );
    },
  });
}
