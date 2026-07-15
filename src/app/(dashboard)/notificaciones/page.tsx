import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { defaultAuthenticatedPath } from "@/lib/navigation/dashboard-nav";
import { NotificacionesScreen } from "@/components/notificaciones/notificaciones-screen";

export const metadata: Metadata = {
  title: "Notificaciones — Konsorcio",
};

export default async function NotificacionesPage() {
  const session = await getSession();

  if (session?.user.role !== "admin") {
    redirect(defaultAuthenticatedPath);
  }

  return <NotificacionesScreen />;
}
