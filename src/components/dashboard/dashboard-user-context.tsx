"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { SessionUser } from "@/lib/auth/session";

type DashboardUserContextValue = {
  user: SessionUser;
  setUser: (user: SessionUser | ((prev: SessionUser) => SessionUser)) => void;
  patchUser: (patch: Partial<SessionUser>) => void;
};

const DashboardUserContext = createContext<DashboardUserContextValue | null>(null);

export function DashboardUserProvider({
  user: initialUser,
  children,
}: {
  user: SessionUser;
  children: ReactNode;
}) {
  const [user, setUser] = useState(initialUser);

  useEffect(() => {
    setUser(initialUser);
  }, [initialUser]);

  const patchUser = useCallback((patch: Partial<SessionUser>) => {
    setUser((prev) => ({ ...prev, ...patch }));
  }, []);

  const value = useMemo(
    () => ({
      user,
      setUser,
      patchUser,
    }),
    [user, patchUser],
  );

  return <DashboardUserContext.Provider value={value}>{children}</DashboardUserContext.Provider>;
}

export function useDashboardUser() {
  const context = useContext(DashboardUserContext);
  if (!context) {
    throw new Error("useDashboardUser must be used within a DashboardUserProvider.");
  }
  return context.user;
}

export function useDashboardUserActions() {
  const context = useContext(DashboardUserContext);
  if (!context) {
    throw new Error("useDashboardUserActions must be used within a DashboardUserProvider.");
  }
  return { setUser: context.setUser, patchUser: context.patchUser };
}
