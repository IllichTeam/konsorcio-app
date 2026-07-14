import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { getCurrentProfile, updateProfile } from "@/lib/api/profile";
import { queryKeys } from "@/lib/api/query-keys";

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.current,
    queryFn: getCurrentProfile,
  });
}

export function useUpdateProfile() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.profile.current, data);
    },
  });
}
