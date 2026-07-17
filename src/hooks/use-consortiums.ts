import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getConsortiumHistory } from "@/lib/api/consortiums";
import { queryKeys } from "@/lib/api/query-keys";
import { useTRPC } from "@/lib/trpc/client";

export function useConsortiums() {
  const trpc = useTRPC();

  return useQuery(trpc.consortiums.list.queryOptions());
}

export function useConsortium(id: string) {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.consortiums.byId.queryOptions({ id }),
    enabled: Boolean(id),
  });
}

export function useConsortiumHistory(id: string) {
  return useQuery({
    queryKey: queryKeys.consortiums.history(id),
    queryFn: () => getConsortiumHistory(id),
    enabled: Boolean(id),
  });
}

export function useCreateConsortiumComment() {
  const trpc = useTRPC();

  return useMutation(trpc.consortiums.sendComment.mutationOptions());
}

export function useCreateConsortium() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.consortiums.create.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(trpc.consortiums.list.queryFilter());
      },
    }),
  );
}

export function useUpdateConsortium() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.consortiums.update.mutationOptions({
      onSuccess: (data) => {
        void queryClient.invalidateQueries(trpc.consortiums.list.queryFilter());
        void queryClient.invalidateQueries(trpc.consortiums.byId.queryFilter({ id: data.id }));
      },
    }),
  );
}

export function useUpdateConsortiumAmount() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.consortiums.updateAmount.mutationOptions({
      onSuccess: (data) => {
        void queryClient.invalidateQueries(trpc.consortiums.list.queryFilter());
        void queryClient.invalidateQueries(trpc.consortiums.byId.queryFilter({ id: data.id }));
      },
    }),
  );
}

export function useDeleteConsortium() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.consortiums.delete.mutationOptions({
      onSuccess: (_data, variables) => {
        void queryClient.invalidateQueries(trpc.consortiums.list.queryFilter());
        void queryClient.invalidateQueries(trpc.consortiums.byId.queryFilter({ id: variables.id }));
        queryClient.removeQueries({ queryKey: queryKeys.consortiums.history(variables.id) });
      },
    }),
  );
}
