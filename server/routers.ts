import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminProcedure, inventoryProcedure, ownerProcedure, publicProcedure, router, sellerProcedure } from "./_core/trpc";
import { addAuthorizedUser, addProductImage, bulkUpsertProducts, deleteProduct, duplicateProduct, getProductById, getProductImages, listAdminProducts, listAuditLogs, listAuthorizedUsers, listPublicProducts, removeAuthorizedUser, removeProductImage, restoreProduct, insertProduct, updateProduct } from "./db";
import { createPrivateAccount, createPrivateSession, deletePrivateAccount, deletePrivateSession, findPrivateUser, listPrivateAccounts, markPrivateSignIn, PRIVATE_SESSION_COOKIE, safeUser, verifyPassword, changePrivatePassword } from "./privateAuth";
import { storagePut } from "./storage";

const productFields = { brand: z.string().trim().min(1).max(80), model: z.string().trim().min(1).max(140), processor: z.string().trim().min(1).max(140), generation: z.string().trim().min(1).max(40), ram: z.string().trim().min(1).max(20), ramType: z.string().trim().min(1).max(20), storage: z.string().trim().min(1).max(40), gpu: z.string().trim().min(1).max(120), os: z.string().trim().min(1).max(60), serial: z.string().trim().max(140).default("—"), screen: z.string().trim().max(30).default("—"), category: z.enum(["Notebook", "Desktop"]).default("Notebook"), condition: z.enum(["Seminovo revisado", "Novo"]).default("Seminovo revisado"), cosmeticCondition: z.string().trim().max(160).optional().nullable(), battery: z.string().trim().max(120).optional().nullable(), accessories: z.string().trim().max(255).optional().nullable(), notes: z.string().trim().max(5000).optional().nullable(), price: z.string().trim().max(60).default("Sob consulta"), originalPrice: z.string().trim().max(60).optional().nullable(), promoPrice: z.string().trim().max(60).optional().nullable(), imageUrl: z.string().trim().max(1000).optional().nullable(), imageKey: z.string().trim().max(255).optional().nullable(), status: z.enum(["available", "sold", "hidden"]).default("available"), badge: z.string().trim().max(80).optional().nullable(), sortOrder: z.number().int().default(0) };
const createProductSchema = z.object(productFields);
const updateProductSchema = createProductSchema.partial();
const imageSchema = z.object({ productId: z.number().int().positive(), url: z.string().url().max(1000), storageKey: z.string().max(255).optional().nullable(), caption: z.string().trim().max(160).optional().nullable() });
const passwordSchema = z.string().min(8, "A senha deve ter pelo menos 8 caracteres.").max(100);

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => safeUser(opts.ctx.user)),
    privateLogin: publicProcedure.input(z.object({ username: z.string().trim().min(3).max(80), password: z.string().min(1) })).mutation(async ({ ctx, input }) => { const user = await findPrivateUser(input.username); if (!user?.passwordHash || !(await verifyPassword(input.password, user.passwordHash))) throw new TRPCError({ code: "UNAUTHORIZED", message: "Usuário ou senha inválidos." }); const session = await createPrivateSession(user.id); await markPrivateSignIn(user.id); ctx.res.cookie(PRIVATE_SESSION_COOKIE, session.token, { ...getSessionCookieOptions(ctx.req), maxAge: 14 * 86400000 }); return { user: safeUser(user), success: true } as const; }),
    privateLogout: publicProcedure.mutation(async ({ ctx }) => { const header = ctx.req.headers.cookie || ""; const match = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${PRIVATE_SESSION_COOKIE}=`)); await deletePrivateSession(match?.slice(PRIVATE_SESSION_COOKIE.length + 1)); ctx.res.clearCookie(PRIVATE_SESSION_COOKIE, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
    logout: publicProcedure.mutation(async ({ ctx }) => { const cookieOptions = getSessionCookieOptions(ctx.req); ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 }); ctx.res.clearCookie(PRIVATE_SESSION_COOKIE, { ...cookieOptions, maxAge: -1 }); return { success: true } as const; }),
  }),
  privateAccounts: router({
    list: ownerProcedure.query(() => listPrivateAccounts()),
    create: ownerProcedure.input(z.object({ username: z.string().trim().min(3).max(80).regex(/^[a-zA-Z0-9._-]+$/), name: z.string().trim().min(2).max(120), password: passwordSchema, role: z.enum(["viewer", "seller", "admin"]).default("seller") })).mutation(({ input }) => createPrivateAccount(input)),
    remove: ownerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => { if (ctx.user.id === input.id) throw new TRPCError({ code: "BAD_REQUEST", message: "Não remova o usuário conectado." }); return deletePrivateAccount(input.id); }),
    changePassword: ownerProcedure.input(z.object({ id: z.number().int().positive(), password: passwordSchema })).mutation(({ input }) => changePrivatePassword(input.id, input.password)),
    myPassword: sellerProcedure.input(z.object({ password: passwordSchema })).mutation(({ ctx, input }) => changePrivatePassword(ctx.user.id, input.password)),
  }),
  authorizedUsers: router({ list: ownerProcedure.query(() => listAuthorizedUsers()), add: ownerProcedure.input(z.object({ email: z.string().trim().email(), label: z.string().trim().max(120).optional().nullable(), accessLevel: z.enum(["viewer", "seller", "admin"]).default("seller") })).mutation(({ input }) => addAuthorizedUser(input.email, input.label, input.accessLevel)), remove: ownerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => removeAuthorizedUser(input.id)) }),
  audit: router({ list: adminProcedure.query(() => listAuditLogs()) }),
  products: router({
    list: publicProcedure.query(() => listPublicProducts()),
    detail: publicProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => { const product = await getProductById(input.id); if (!product || product.status !== "available") return null; return { product, images: await getProductImages(input.id) }; }),
    adminList: inventoryProcedure.query(() => listAdminProducts()), export: inventoryProcedure.query(() => listAdminProducts()),
    create: sellerProcedure.input(createProductSchema).mutation(({ ctx, input }) => insertProduct(input, ctx.user.id)), update: sellerProcedure.input(z.object({ id: z.number().int().positive(), data: updateProductSchema })).mutation(({ ctx, input }) => updateProduct(input.id, input.data, ctx.user.id)), remove: sellerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => deleteProduct(input.id, ctx.user.id)), restore: sellerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => restoreProduct(input.id, ctx.user.id)), duplicate: sellerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ ctx, input }) => duplicateProduct(input.id, ctx.user.id)), bulkUpsert: sellerProcedure.input(z.object({ products: z.array(createProductSchema.extend({ id: z.number().int().positive().optional() })).min(1).max(200) })).mutation(({ ctx, input }) => bulkUpsertProducts(input.products, ctx.user.id)),
    images: inventoryProcedure.input(z.object({ productId: z.number().int().positive() })).query(({ input }) => getProductImages(input.productId)), addImage: sellerProcedure.input(imageSchema).mutation(({ input }) => addProductImage(input)), removeImage: sellerProcedure.input(z.object({ id: z.number().int().positive() })).mutation(({ input }) => removeProductImage(input.id)),
    uploadImage: sellerProcedure.input(z.object({ filename: z.string().trim().min(1).max(180), mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]), base64: z.string().min(1) })).mutation(async ({ ctx, input }) => { const raw = input.base64.includes(",") ? input.base64.split(",")[1] : input.base64; const buffer = Buffer.from(raw, "base64"); if (buffer.byteLength > 8 * 1024 * 1024) throw new TRPCError({ code: "BAD_REQUEST", message: "A imagem deve ter no máximo 8 MB." }); const safeFilename = input.filename.replace(/[^a-zA-Z0-9._-]/g, "-"); return storagePut(`products/${ctx.user.id}-${Date.now()}-${safeFilename}`, buffer, input.mimeType); }),
  }),
});
export type AppRouter = typeof appRouter;
