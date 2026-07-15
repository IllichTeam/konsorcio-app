import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

import { defaultAuthenticatedPath, isProtectedDashboardPath } from "@/lib/navigation/dashboard-nav";

function getLegacyDashboardRedirect(pathname: string): string | null {
  if (pathname === "/dashboard") {
    return defaultAuthenticatedPath;
  }

  if (pathname === "/dashboard/profile") {
    return "/perfil-de-usuario";
  }

  const consorcioDetailMatch = pathname.match(/^\/dashboard\/consorcios\/([^/]+)$/);
  if (consorcioDetailMatch) {
    return `/consorcios/${consorcioDetailMatch[1]}`;
  }

  return null;
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Optimistic check only: reads the session cookie without hitting the DB
  // (middleware runs on the edge runtime). Actual validation happens in
  // `getSession()` via `auth.api.getSession`.
  const hasSession = Boolean(getSessionCookie(request));

  const legacyRedirect = getLegacyDashboardRedirect(pathname);
  if (legacyRedirect) {
    return NextResponse.redirect(new URL(legacyRedirect, request.url));
  }

  if (isProtectedDashboardPath(pathname) && !hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/dashboard") && !hasSession) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname === "/" && hasSession) {
    return NextResponse.redirect(new URL(defaultAuthenticatedPath, request.url));
  }

  if (pathname === "/recuperar-contrasena" && hasSession) {
    return NextResponse.redirect(new URL(defaultAuthenticatedPath, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/recuperar-contrasena",
    "/dashboard/:path*",
    "/consorcios/:path*",
    "/resumen",
    "/reportes",
    "/perfil-de-usuario",
    "/preferencias",
    "/seguridad",
  ],
};
