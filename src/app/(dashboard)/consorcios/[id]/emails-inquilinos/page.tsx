import type { Metadata } from "next";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";

import { TenantEmailsScreen } from "@/components/tenant-emails/tenant-emails-screen";
import { getQueryClient, trpc } from "@/server/trpc/server-caller";

type TenantEmailsPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: TenantEmailsPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Emails de inquilinos — Consorcio ${id.toUpperCase()} — Konsorcio`,
  };
}

export default async function TenantEmailsPage({ params }: TenantEmailsPageProps) {
  const { id } = await params;
  const queryClient = getQueryClient();

  await Promise.all([
    queryClient.prefetchQuery(trpc.consortiums.byId.queryOptions({ id })),
    queryClient.prefetchQuery(
      trpc.tenantEmails.listByConsortium.queryOptions({ consortiumId: id }),
    ),
  ]);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <TenantEmailsScreen consortiumId={id} />
    </HydrationBoundary>
  );
}
