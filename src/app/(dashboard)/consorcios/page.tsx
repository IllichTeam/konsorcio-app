import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { ConsortiumsScreen } from "@/components/consortiums/consortiums-screen";
import { getQueryClient, trpc } from "@/server/trpc/server-caller";

export const metadata: Metadata = {
  title: "Consorcios — Konsorcio",
};

export default async function ConsortiumsPage() {
  const queryClient = getQueryClient();
  await queryClient.prefetchQuery(trpc.consortiums.list.queryOptions());

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ConsortiumsScreen />
    </HydrationBoundary>
  );
}
