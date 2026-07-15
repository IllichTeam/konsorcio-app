import { initTRPC, TRPCError } from "@trpc/server";

import type { TRPCContext } from "./context";

const t = initTRPC.context<TRPCContext>().create({
  errorFormatter({ shape }) {
    return shape;
  },
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

const enforceAuthenticated = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No autorizado" });
  }

  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

export const protectedProcedure = publicProcedure.use(enforceAuthenticated);

const enforceAdmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No autorizado" });
  }

  if (ctx.session.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Prohibido" });
  }

  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

export const adminProcedure = publicProcedure.use(enforceAdmin);
