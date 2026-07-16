import { initTRPC, TRPCError } from "@trpc/server";

import { isSuperadmin } from "@/lib/auth/roles";

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

/** Platform-only gate (`superadmin`). Used by Resend test routes, not consortium CRUD. */
const enforceSuperadmin = t.middleware(({ ctx, next }) => {
  if (!ctx.session) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "No autorizado" });
  }

  if (!isSuperadmin(ctx.session.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Prohibido" });
  }

  return next({
    ctx: {
      session: ctx.session,
    },
  });
});

export const adminProcedure = publicProcedure.use(enforceSuperadmin);
