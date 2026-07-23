import type { Metadata } from "next";

import { ConsortiumDetail } from "@/components/consortiums/consortium-detail";
import { consortiumDetailTitle, getConsortiumTitleName } from "@/lib/metadata/page-titles";

type ConsortiumPageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ConsortiumPageProps): Promise<Metadata> {
  const { id } = await params;
  const name = await getConsortiumTitleName(id);

  return {
    title: consortiumDetailTitle(name),
  };
}

export default async function ConsortiumPage({ params }: ConsortiumPageProps) {
  const { id } = await params;

  return <ConsortiumDetail consortiumId={id} />;
}
