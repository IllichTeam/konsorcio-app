import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { ConsortiumDetailDto, ConsortiumListItem } from "@/lib/schemas/consortium";
import { useTRPC } from "@/lib/trpc/client";

function toListItem(
  detail: ConsortiumDetailDto,
  counts: { unitCount: number; contactCount: number } = {
    unitCount: 0,
    contactCount: 0,
  },
): ConsortiumListItem {
  return {
    id: detail.id,
    name: detail.name,
    location: detail.location,
    paymentAlias: detail.paymentAlias,
    billingEmail: detail.billingEmail,
    driveLink: detail.driveLink,
    unitCount: counts.unitCount,
    contactCount: counts.contactCount,
  };
}

function upsertListItem(
  queryClient: ReturnType<typeof useQueryClient>,
  listQueryKey: readonly unknown[],
  item: ConsortiumListItem,
) {
  queryClient.setQueryData<ConsortiumListItem[]>(listQueryKey, (current) => {
    if (!current) {
      return [item];
    }

    const index = current.findIndex((row) => row.id === item.id);

    if (index === -1) {
      return [...current, item];
    }

    const next = [...current];
    next[index] = item;
    return next;
  });
}

function preserveListCounts(
  queryClient: ReturnType<typeof useQueryClient>,
  listQueryKey: readonly unknown[],
  detail: ConsortiumDetailDto,
): ConsortiumListItem {
  const current = queryClient.getQueryData<ConsortiumListItem[]>(listQueryKey);
  const existing = current?.find((row) => row.id === detail.id);

  return toListItem(detail, {
    unitCount: existing?.unitCount ?? 0,
    contactCount: existing?.contactCount ?? 0,
  });
}

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

export function useConsortiumHistory(id: string, options: { page: number; pageSize?: number }) {
  const trpc = useTRPC();
  const pageSize = options.pageSize ?? 10;

  return useQuery({
    ...trpc.consortiums.history.queryOptions({
      id,
      page: options.page,
      pageSize,
    }),
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
      onSuccess: (data) => {
        const listItem = toListItem(data);
        upsertListItem(queryClient, trpc.consortiums.list.queryKey(), listItem);
        queryClient.setQueryData(trpc.consortiums.byId.queryKey({ id: data.id }), data);
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
        const listItem = preserveListCounts(queryClient, trpc.consortiums.list.queryKey(), data);
        upsertListItem(queryClient, trpc.consortiums.list.queryKey(), listItem);
        queryClient.setQueryData(trpc.consortiums.byId.queryKey({ id: data.id }), data);
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
        const listItem = preserveListCounts(queryClient, trpc.consortiums.list.queryKey(), data);
        upsertListItem(queryClient, trpc.consortiums.list.queryKey(), listItem);
        queryClient.setQueryData(trpc.consortiums.byId.queryKey({ id: data.id }), data);
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
        queryClient.setQueryData<ConsortiumListItem[]>(
          trpc.consortiums.list.queryKey(),
          (current) => (current ?? []).filter((row) => row.id !== variables.id),
        );
        queryClient.removeQueries(trpc.consortiums.byId.queryFilter({ id: variables.id }));
        queryClient.removeQueries(trpc.consortiums.history.queryFilter({ id: variables.id }));
      },
    }),
  );
}
