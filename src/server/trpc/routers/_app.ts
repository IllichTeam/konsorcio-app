import { createTRPCRouter } from "@/server/trpc/init";

import { consortiumsRouter } from "./consortiums";
import { emailsRouter } from "./emails";
import { expenseEmailsRouter } from "./expense-emails";
import { tenantEmailsRouter } from "./tenant-emails";

export const appRouter = createTRPCRouter({
  consortiums: consortiumsRouter,
  emails: emailsRouter,
  expenseEmails: expenseEmailsRouter,
  tenantEmails: tenantEmailsRouter,
});

export type AppRouter = typeof appRouter;
