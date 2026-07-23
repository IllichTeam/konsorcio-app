import { redirect } from "next/navigation";

import { getSession } from "@/lib/auth/session";
import { DashboardShell } from "@/components/dashboard/dashboard-shell";

/** Prefer São Paulo (near Supabase). Project default also set in vercel.json. */
export const preferredRegion = "gru1";

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  if (!session) {
    // Cookie mutation is not allowed in layouts — clear via Route Handler
    // so the proxy stops treating a stale cookie as authenticated.
    redirect("/api/session/clear");
  }

  return <DashboardShell user={session.user}>{children}</DashboardShell>;
}
