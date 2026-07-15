import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { useTRPC } from "@/lib/trpc/client";

export function useEmailRecipients() {
  const trpc = useTRPC();

  return useQuery(trpc.emails.recipients.queryOptions());
}

export function useSendEmail() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  return useMutation(
    trpc.emails.send.mutationOptions({
      onSuccess: (result) => {
        if (result.failed > 0) {
          toast.warning(`Enviados ${result.sent}, fallaron ${result.failed}`);
        } else {
          toast.success("Correo enviado");
        }

        void queryClient.invalidateQueries(trpc.emails.history.queryFilter());
      },
      onError: (error) => {
        toast.error(error.message || "No se pudo enviar el correo");
      },
    }),
  );
}

export function useEmailHistory() {
  const trpc = useTRPC();

  return useQuery(trpc.emails.history.queryOptions());
}
