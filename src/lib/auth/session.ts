import { cache } from "react";
import { cookies, headers } from "next/headers";

import { auth } from "@/lib/auth";

/**
 * Reads the current better-auth session from the incoming request's
 * cookies. Returns `null` when there is no active (or valid) session.
 * Wrapped in React.cache for per-request dedupe across layout/pages.
 */
export const getSession = cache(async () => {
  return auth.api.getSession({ headers: await headers() });
});

const SESSION_COOKIE_BASE_NAMES = [
  "better-auth.session_token",
  "better-auth.session_data",
  "better-auth.dont_remember",
] as const;

/**
 * Expires better-auth session cookies so the proxy's optimistic
 * `getSessionCookie` check no longer treats the request as authenticated.
 * Needed when `getSession()` returns null but a stale cookie remains —
 * otherwise `/` ↔ `/consorcios` redirect-loops.
 */
export async function clearSessionCookies() {
  const cookieStore = await cookies();
  const knownNames = new Set<string>([
    ...SESSION_COOKIE_BASE_NAMES,
    ...SESSION_COOKIE_BASE_NAMES.map((name) => `__Secure-${name}`),
  ]);

  for (const name of knownNames) {
    cookieStore.delete(name);
  }

  // Chunked session_data cookies use suffixes like `.0`, `.1`, …
  for (const { name } of cookieStore.getAll()) {
    if (
      name.includes("better-auth.session_token") ||
      name.includes("better-auth.session_data") ||
      name.includes("better-auth.dont_remember")
    ) {
      cookieStore.delete(name);
    }
  }
}

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;
export type SessionUser = Session["user"];
