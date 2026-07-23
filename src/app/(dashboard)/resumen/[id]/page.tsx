import type { Metadata } from "next";

import { ConsortiumDetail } from "@/components/consortiums/consortium-detail";

type ConsortiumPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ConsortiumPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Consorcio ${id.toUpperCase()} — Konsorcio`,
  };
}

export default async function ConsortiumPage({ params }: ConsortiumPageProps) {
  const { id } = await params;

  return <ConsortiumDetail consortiumId={id} />;
}
