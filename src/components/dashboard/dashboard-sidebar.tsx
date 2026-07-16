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
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

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
  const { isMobile, setOpenMobile } = useSidebar();

  function handleNavigate() {
    if (isMobile) {
      setOpenMobile(false);
    }
  }

  return (
    <SidebarGroup className="p-0">
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton
            type="button"
            onClick={() => setOpen((value) => !value)}
            aria-expanded={open}
            className="font-medium"
          >
            <Icon />
            <span>{group.label}</span>
            <ChevronRight
              className={cn("ml-auto size-4 transition-transform", open && "rotate-90")}
            />
          </SidebarMenuButton>

          {open ? (
            <SidebarMenuSub>
              {group.children.map((child) => {
                const active = isNavPathActive(pathname, child.href);

                return (
                  <SidebarMenuSubItem key={child.href}>
                    <SidebarMenuSubButton
                      render={<Link href={child.href} onClick={handleNavigate} />}
                      isActive={active}
                      aria-current={active ? "page" : undefined}
                      className={
                        active
                          ? "bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground data-active:bg-primary data-active:text-primary-foreground"
                          : "text-muted-foreground"
                      }
                    >
                      {child.label}
                    </SidebarMenuSubButton>
                  </SidebarMenuSubItem>
                );
              })}
            </SidebarMenuSub>
          ) : null}
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
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
    <Sidebar collapsible="none" side="left" variant="sidebar" aria-label="Navegación principal">
      <SidebarContent className="gap-1 p-3 pt-4">
        {dashboardNavGroups.map((group) => (
          <NavGroup key={group.label} group={group} pathname={pathname} />
        ))}
      </SidebarContent>

      <SidebarFooter className="border-t border-sidebar-border p-3">
        <div className="mb-1 flex items-center gap-3 rounded-md px-2 py-2">
          <div className="flex size-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
            {getInitials(user.name)}
          </div>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-sm font-medium">{user.name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              type="button"
              onClick={() => void handleSignOut()}
              className="text-muted-foreground"
            >
              <LogOut />
              <span>Cerrar sesión</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
