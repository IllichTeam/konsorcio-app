import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createConsorcio,
  createConsorcioComment,
  deleteConsorcio,
  getConsorcioById,
  getConsorcioHistory,
  getConsorcios,
  updateConsorcio,
  updateConsorcioAmount,
} from "@/lib/api/consorcios";
import { queryKeys } from "@/lib/api/query-keys";
import type { Consorcio } from "@/types/consorcio";

export function useConsorcios() {
  return useQuery({
    queryKey: queryKeys.consorcios.all,
    queryFn: getConsorcios,
  });
}

export function useConsorcio(id: string) {
  return useQuery({
    queryKey: queryKeys.consorcios.detail(id),
    queryFn: () => getConsorcioById(id),
    enabled: Boolean(id),
  });
}

export function useConsorcioHistory(id: string) {
  return useQuery({
    queryKey: queryKeys.consorcios.history(id),
    queryFn: () => getConsorcioHistory(id),
    enabled: Boolean(id),
  });
}

export function useCreateConsorcioComment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createConsorcioComment,
    onSuccess: (_data, variables) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.consorcios.history(variables.consorcioId),
      });
    },
  });
}

export function useCreateConsorcio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: createConsorcio,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.consorcios.detail(data.id), data);
      queryClient.setQueryData(queryKeys.consorcios.all, (current: Consorcio[] | undefined) => [
        ...(current ?? []),
        { id: data.id, name: data.name, location: data.location },
      ]);
    },
  });
}

export function useUpdateConsorcio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateConsorcio,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.consorcios.detail(data.id), data);
      queryClient.setQueryData(queryKeys.consorcios.all, (current: Consorcio[] | undefined) =>
        (current ?? []).map((item) =>
          item.id === data.id ? { id: data.id, name: data.name, location: data.location } : item,
        ),
      );
    },
  });
}

export function useUpdateConsorcioAmount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateConsorcioAmount,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.consorcios.detail(data.id), data);
      void queryClient.invalidateQueries({ queryKey: queryKeys.consorcios.all });
    },
  });
}

export function useDeleteConsorcio() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: deleteConsorcio,
    onSuccess: (_data, id) => {
      queryClient.setQueryData(queryKeys.consorcios.all, (current: Consorcio[] | undefined) =>
        (current ?? []).filter((item) => item.id !== id),
      );
      queryClient.removeQueries({ queryKey: queryKeys.consorcios.detail(id) });
      queryClient.removeQueries({ queryKey: queryKeys.consorcios.history(id) });
    },
  });
}
