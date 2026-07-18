import "server-only";

import { cache } from "react";
import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";

import { makeQueryClient } from "@/lib/trpc/query-client";
import { createTRPCContext } from "@/server/trpc/context";
import { createCallerFactory } from "@/server/trpc/init";
import { appRouter } from "@/server/trpc/routers/_app";

/** One QueryClient per RSC request (not the browser singleton). */
export const getQueryClient = cache(makeQueryClient);

const createCaller = createCallerFactory(appRouter);

export async function createServerCaller() {
  return createCaller(await createTRPCContext());
}

/** Server-side options proxy — same query keys as `useTRPC()` on the client. */
export const trpc = createTRPCOptionsProxy({
  ctx: createTRPCContext,
  router: appRouter,
  queryClient: getQueryClient,
});
