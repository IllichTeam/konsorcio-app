import type { ReactNode } from "react";

import type { SessionUser } from "@/lib/auth/session";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";

type DashboardShellProps = {
  user: SessionUser;
  children: ReactNode;
};

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background md:flex-row">
      <DashboardSidebar user={user} />
      <main className="flex w-full flex-1 items-start justify-start p-6 md:p-10">{children}</main>
    </div>
  );
}
