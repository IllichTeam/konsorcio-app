import type { Metadata } from "next";

import { getSession } from "@/lib/auth/session";
import { ConsorciosScreen } from "@/components/consorcios/consorcios-screen";

export const metadata: Metadata = {
  title: "Consorcios — Konsorcio",
};

export default async function DashboardPage() {
  const session = await getSession();

  return <ConsorciosScreen userName={session?.user.name ?? "Administrador"} />;
}
