import type { Metadata } from "next";

import { getSession } from "@/lib/auth/session";
import { ConsortiumsScreen } from "@/components/consortiums/consortiums-screen";

export const metadata: Metadata = {
  title: "Consorcios — Konsorcio",
};

export default async function ConsortiumsPage() {
  const session = await getSession();

  return <ConsortiumsScreen userName={session?.user.name ?? "Administrador"} />;
}
