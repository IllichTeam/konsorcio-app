import type { Metadata } from "next";

import { TenantEmailsScreen } from "@/components/tenant-emails/tenant-emails-screen";

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

  return <TenantEmailsScreen consortiumId={id} />;
}
