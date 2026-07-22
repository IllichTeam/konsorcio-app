import { fetchRequestHandler } from "@trpc/server/adapters/fetch";

import { createTRPCContext } from "@/server/trpc/context";
import { appRouter } from "@/server/trpc/routers/_app";

/** Prefer São Paulo (near Supabase). Project default also set in vercel.json. */
export const preferredRegion = "gru1";

/**
 * Ceiling for tRPC handlers that schedule background work via `after()`
 * (expense email fan-out). Short procedures are unaffected in practice;
 * upload/auth routes keep their own segment config.
 */
export const maxDuration = 120;

const handler = (req: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req,
    router: appRouter,
    createContext: createTRPCContext,
  });

export { handler as GET, handler as POST };
