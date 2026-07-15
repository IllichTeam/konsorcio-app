import { headers } from "next/headers";

import { auth } from "@/lib/auth";

/**
 * Reads the current better-auth session from the incoming request's
 * cookies. Returns `null` when there is no active (or valid) session.
 */
export async function getSession() {
  return auth.api.getSession({ headers: await headers() });
}

export type Session = NonNullable<Awaited<ReturnType<typeof getSession>>>;
export type SessionUser = Session["user"];
