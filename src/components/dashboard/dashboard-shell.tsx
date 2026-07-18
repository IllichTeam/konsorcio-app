"use client";

import type { ReactNode } from "react";

import type { SessionUser } from "@/lib/auth/session";

import { DashboardSidebar } from "@/components/dashboard/dashboard-sidebar";
import { DashboardUserProvider } from "@/components/dashboard/dashboard-user-context";
import { SidebarInset, SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";

type DashboardShellProps = {
  user: SessionUser;
  children: ReactNode;
};

export function DashboardShell({ user, children }: DashboardShellProps) {
  return (
    <DashboardUserProvider user={user}>
      <SidebarProvider className="bg-background">
        <DashboardSidebar user={user} />
        <SidebarInset>
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 md:hidden">
            <SidebarTrigger />
            <span className="font-heading text-sm font-semibold text-primary">Konsorcio</span>
          </header>
          <div className="flex flex-1 flex-col items-start justify-start p-6 md:p-10">
            {children}
          </div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardUserProvider>
  );
}
