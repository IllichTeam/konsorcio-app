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
        <DashboardSidebar />
        <SidebarInset className="min-w-0 overflow-x-clip">
          <header className="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4 md:hidden">
            <SidebarTrigger />
            <span className="font-heading text-sm font-semibold text-primary">Konsorcio</span>
          </header>
          {/*
            Stretch children to the full main-column width so pages can center
            with mx-auto (items-start was pinning content to the left).
            overflow-x-clip kills any full-bleed decorative layers (grid-noise).
          */}
          <div className="flex min-w-0 flex-1 flex-col overflow-x-clip p-6 md:p-10">{children}</div>
        </SidebarInset>
      </SidebarProvider>
    </DashboardUserProvider>
  );
}
