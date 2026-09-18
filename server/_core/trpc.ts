import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { ENV } from "./env";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;

  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }

  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

const requireInventoryAccess = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user || !["viewer", "seller", "admin"].includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta não tem acesso ao painel." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

const requireEditorAccess = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user || !["seller", "admin"].includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Sua conta pode consultar, mas não editar produtos." });
  }
  return next({ ctx: { ...ctx, user: ctx.user } });
});

export const inventoryProcedure = t.procedure.use(requireInventoryAccess);
export const sellerProcedure = t.procedure.use(requireEditorAccess);

export const ownerProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    if (!ctx.user || !((ctx.user.loginMethod === "private" && ctx.user.role === "admin") || (ENV.ownerOpenId && ctx.user.openId === ENV.ownerOpenId))) {
      throw new TRPCError({ code: "FORBIDDEN", message: "Apenas o proprietário pode gerenciar usuários." });
    }

    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);
