import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  createConsorcioComment,
  getConsorcioById,
  getConsorcioHistory,
  getConsorcios,
  updateConsorcioAmount,
} from "@/lib/api/consorcios";
import { queryKeys } from "@/lib/api/query-keys";

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
