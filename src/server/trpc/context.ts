import type { FetchCreateContextFnOptions } from "@trpc/server/adapters/fetch";

import { getSession } from "@/lib/auth/session";

/**
 * Per-request tRPC context. Session is resolved once so procedure middleware
 * and handlers can authorize without re-reading cookies.
 */
export async function createTRPCContext(_opts?: FetchCreateContextFnOptions) {
  const session = await getSession();

  return {
    session,
  };
}

export type TRPCContext = Awaited<ReturnType<typeof createTRPCContext>>;
