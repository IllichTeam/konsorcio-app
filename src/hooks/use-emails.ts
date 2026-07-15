import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { getEmailHistory, getEmailRecipients, sendEmail } from "@/lib/api/emails";
import { queryKeys } from "@/lib/api/query-keys";

export function useEmailRecipients() {
  return useQuery({
    queryKey: queryKeys.emails.recipients,
    queryFn: getEmailRecipients,
  });
}

export function useSendEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: sendEmail,
    onSuccess: (result) => {
      if (result.failed > 0) {
        toast.warning(`Enviados ${result.sent}, fallaron ${result.failed}`);
      } else {
        toast.success("Correo enviado");
      }

      void queryClient.invalidateQueries({ queryKey: queryKeys.emails.history });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });
}

export function useEmailHistory() {
  return useQuery({
    queryKey: queryKeys.emails.history,
    queryFn: getEmailHistory,
  });
}
