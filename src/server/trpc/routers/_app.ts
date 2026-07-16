import { createTRPCRouter } from "@/server/trpc/init";

import { consortiumsRouter } from "./consortiums";
import { emailsRouter } from "./emails";

export const appRouter = createTRPCRouter({
  consortiums: consortiumsRouter,
  emails: emailsRouter,
});

export type AppRouter = typeof appRouter;
