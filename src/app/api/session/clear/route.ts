import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { clearSessionCookies } from "@/lib/auth/session";

/**
 * Clears stale better-auth session cookies and sends the browser to login.
 * Used when the dashboard layout finds no valid session but a cookie still
 * exists — cookie mutation is only allowed in Route Handlers / Server Actions.
 */
export async function GET(request: NextRequest) {
  await clearSessionCookies();
  return NextResponse.redirect(new URL("/", request.url));
}
