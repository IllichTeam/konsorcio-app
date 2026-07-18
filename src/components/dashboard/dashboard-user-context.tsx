"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { SessionUser } from "@/lib/auth/session";

const DashboardUserContext = createContext<SessionUser | null>(null);

export function DashboardUserProvider({
  user,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  return <DashboardUserContext.Provider value={user}>{children}</DashboardUserContext.Provider>;
}

export function useDashboardUser() {
  const user = useContext(DashboardUserContext);
  if (!user) {
    throw new Error("useDashboardUser must be used within a DashboardUserProvider.");
  }
  return user;
}
