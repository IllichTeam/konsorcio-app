"use client";

import { useState } from "react";
import type React from "react";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ChevronRight, LayoutDashboard, LogOut, Settings } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import type { SessionUser } from "@/lib/auth/session";
import {
  dashboardNavGroups,
  isNavPathActive,
  type DashboardNavGroup,
} from "@/lib/navigation/dashboard-nav";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const navIcons: Record<DashboardNavGroup["label"], React.ComponentType<{ className?: string }>> = {
  Dashboard: LayoutDashboard,
  Configuración: Settings,
};

function getInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function NavGroup({ group, pathname }: { group: DashboardNavGroup; pathname: string }) {
  const Icon = navIcons[group.label];
  const hasActiveChild = group.children.some((child) => isNavPathActive(pathname, child.href));
  const [open, setOpen] = useState(hasActiveChild);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      >
        <Icon className="size-4" />
        <span className="flex-1 text-left">{group.label}</span>
        <ChevronRight className={cn("size-4 transition-transform", open && "rotate-90")} />
      </button>

      {open ? (
        <ul className="mt-1 ml-4 space-y-1 border-l border-sidebar-border pl-3">
          {group.children.map((child) => {
            const active = isNavPathActive(pathname, child.href);

            return (
              <li key={child.href}>
                <Link
                  href={child.href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "flex w-full items-center rounded-md px-3 py-2 text-left text-sm transition-colors",
                    active
                      ? "bg-primary font-medium text-primary-foreground"
                      : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  )}
                >
                  {child.label}
                </Link>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}

type DashboardSidebarProps = {
  user: SessionUser;
};

export function DashboardSidebar({ user }: DashboardSidebarProps) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleSignOut() {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  }

  return (
    <aside className="flex w-full shrink-0 flex-col border-b border-border bg-sidebar text-sidebar-foreground md:h-screen md:w-64 md:border-b-0 md:border-r">
      <nav className="flex flex-1 flex-col gap-1 p-3 pt-4" aria-label="Navegación principal">
        {dashboardNavGroups.map((group) => (
          <NavGroup key={group.label} group={group} pathname={pathname} />
        ))}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <div className="mb-2 flex items-center gap-3 rounded-md px-3 py-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {getInitials(user.name)}
          </div>
          <div className="leading-tight">
            <p className="text-sm font-medium">{user.name}</p>
            <p className="text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <Button
          type="button"
          variant="ghost"
          className="w-full justify-start gap-3 px-3 text-muted-foreground"
          onClick={() => void handleSignOut()}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Cerrar sesión
        </Button>
      </div>
    </aside>
  );
}
