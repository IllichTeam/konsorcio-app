import type { Metadata } from "next";

import { ConsorcioDetail } from "@/components/consorcios/consorcio-detail";

type ConsorcioPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ConsorcioPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Consorcio ${id.toUpperCase()} — Konsorcio`,
  };
}

export default async function ConsorcioPage({ params }: ConsorcioPageProps) {
  const { id } = await params;

  return <ConsorcioDetail consorcioId={id} />;
}
