import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { isSuperadmin } from "@/lib/auth/roles";
import { getSession } from "@/lib/auth/session";
import { defaultAuthenticatedPath } from "@/lib/navigation/dashboard-nav";
import { NotificacionesScreen } from "@/components/notificaciones/notificaciones-screen";

export const metadata: Metadata = {
  title: "Notificaciones — Konsorcio",
};

export default async function NotificacionesPage() {
  const session = await getSession();

  if (!isSuperadmin(session?.user.role)) {
    redirect(defaultAuthenticatedPath);
  }

  return <NotificacionesScreen />;
}
