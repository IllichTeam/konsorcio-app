import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { TenantEmail } from "@/lib/schemas/tenant-email";
import { useTRPC } from "@/lib/trpc/client";

export function useTenantEmails(consortiumId: string) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.tenantEmails.listByConsortium.queryOptions({ consortiumId }),
    enabled: Boolean(consortiumId),
  });
}

export function useCreateTenantEmail(consortiumId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.tenantEmails.create.mutationOptions({
      onSuccess: (data) => {
        queryClient.setQueryData(
          trpc.tenantEmails.listByConsortium.queryKey({ consortiumId }),
          (current: TenantEmail[] | undefined) => [...(current ?? []), data],
        );
        void queryClient.invalidateQueries(trpc.consortiums.list.queryFilter());
      },
    }),
  );
}

export function useUpdateTenantEmail(consortiumId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.tenantEmails.update.mutationOptions({
      onSuccess: (data) => {
        queryClient.setQueryData(
          trpc.tenantEmails.listByConsortium.queryKey({ consortiumId }),
          (current: TenantEmail[] | undefined) =>
            (current ?? []).map((item) => (item.id === data.id ? data : item)),
        );
        void queryClient.invalidateQueries(trpc.consortiums.list.queryFilter());
      },
    }),
  );
}

export function useDeleteTenantEmail(consortiumId: string) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.tenantEmails.delete.mutationOptions({
      onSuccess: (_data, variables) => {
        queryClient.setQueryData(
          trpc.tenantEmails.listByConsortium.queryKey({ consortiumId }),
          (current: TenantEmail[] | undefined) =>
            (current ?? []).filter((item) => item.id !== variables.id),
        );
        void queryClient.invalidateQueries(trpc.consortiums.list.queryFilter());
      },
    }),
  );
}
