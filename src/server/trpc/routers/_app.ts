import { createTRPCRouter } from "@/server/trpc/init";

import { emailsRouter } from "./emails";

export const appRouter = createTRPCRouter({
  emails: emailsRouter,
});

export type AppRouter = typeof appRouter;
