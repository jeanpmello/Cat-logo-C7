import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { getPrivateUserByToken, PRIVATE_SESSION_COOKIE } from "../privateAuth";

export type TrpcContext = { req: CreateExpressContextOptions["req"]; res: CreateExpressContextOptions["res"]; user: User | null };
function readCookie(req: CreateExpressContextOptions["req"], name: string) { const header = req.headers.cookie || ""; const match = header.split(";").map((item) => item.trim()).find((item) => item.startsWith(`${name}=`)); return match ? decodeURIComponent(match.slice(name.length + 1)) : undefined; }
export async function createContext(opts: CreateExpressContextOptions): Promise<TrpcContext> {
  let user: User | null = null;
  try { user = await getPrivateUserByToken(readCookie(opts.req, PRIVATE_SESSION_COOKIE)) ?? null; } catch { user = null; }
  return { req: opts.req, res: opts.res, user };
}
