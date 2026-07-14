import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { AUTH_SESSION_COOKIE } from "@/lib/auth/constants";
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
  const hasSession = Boolean(request.cookies.get(AUTH_SESSION_COOKIE)?.value);

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

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/consorcios/:path*",
    "/resumen",
    "/reportes",
    "/perfil-de-usuario",
    "/preferencias",
    "/seguridad",
  ],
};
