import { createHash, randomBytes, scrypt as nodeScrypt, timingSafeEqual } from "node:crypto";
import { promisify } from "node:util";
import { and, eq, gt } from "drizzle-orm";
import { privateLoginAttempts, privateSessions, users, type User } from "../drizzle/schema";
import { getDb } from "./db";
const scrypt = promisify(nodeScrypt);
export const PRIVATE_SESSION_COOKIE = "c7_private_session";
const SESSION_DAYS = 14;
function hashToken(token: string) { return createHash("sha256").update(token).digest("hex"); }
export async function hashPassword(password: string) { const salt = randomBytes(16).toString("hex"); const derived = await scrypt(password, salt, 64) as Buffer; return `${salt}:${derived.toString("hex")}`; }
export async function verifyPassword(password: string, encoded: string) { const [salt, stored] = encoded.split(":"); if (!salt || !stored) return false; const derived = await scrypt(password, salt, 64) as Buffer; const expected = Buffer.from(stored, "hex"); return expected.length === derived.length && timingSafeEqual(expected, derived); }
export type LoginGuard = { allowed: boolean; retryAfterSeconds: number };
const MAX_LOGIN_FAILURES = 5;
const LOCK_MINUTES = 15;

export async function checkLoginGuard(identifier: string): Promise<LoginGuard> {
  const db = await getDb(); if (!db) return { allowed: true, retryAfterSeconds: 0 };
  const row = (await db.select().from(privateLoginAttempts).where(eq(privateLoginAttempts.identifier, identifier)).limit(1))[0];
  if (!row?.lockedUntil) return { allowed: true, retryAfterSeconds: 0 };
  const remaining = row.lockedUntil.getTime() - Date.now();
  if (remaining <= 0) { await db.update(privateLoginAttempts).set({ failures: 0, lockedUntil: null }).where(eq(privateLoginAttempts.identifier, identifier)); return { allowed: true, retryAfterSeconds: 0 }; }
  return { allowed: false, retryAfterSeconds: Math.ceil(remaining / 1000) };
}

export async function recordLoginFailure(identifier: string) {
  const db = await getDb(); if (!db) return;
  const current = (await db.select().from(privateLoginAttempts).where(eq(privateLoginAttempts.identifier, identifier)).limit(1))[0];
  const failures = (current?.failures ?? 0) + 1;
  const lockedUntil = failures >= MAX_LOGIN_FAILURES ? new Date(Date.now() + LOCK_MINUTES * 60_000) : null;
  if (current) await db.update(privateLoginAttempts).set({ failures, lockedUntil }).where(eq(privateLoginAttempts.id, current.id));
  else await db.insert(privateLoginAttempts).values({ identifier, failures, lockedUntil });
}

export async function resetLoginFailures(identifier: string) {
  const db = await getDb(); if (!db) return;
  await db.delete(privateLoginAttempts).where(eq(privateLoginAttempts.identifier, identifier));
}

export async function findPrivateUser(username: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(users).where(and(eq(users.username, username.trim().toLowerCase()), gt(users.id, 0))).limit(1); return result[0]; }
export async function createPrivateAccount(input: { username: string; password: string; name: string; role: "viewer" | "seller" | "admin" }) { const db = await getDb(); if (!db) throw new Error("Database indisponível"); const username = input.username.trim().toLowerCase(); const passwordHash = await hashPassword(input.password); const result = await db.insert(users).values({ openId: `private:${username}:${Date.now()}`, username, passwordHash, name: input.name.trim(), loginMethod: "private", role: input.role, email: null }); return db.select().from(users).where(eq(users.id, Number(result[0].insertId))).limit(1).then((rows) => rows[0]); }
export async function createPrivateSession(userId: number) { const db = await getDb(); if (!db) throw new Error("Database indisponível"); const token = randomBytes(32).toString("hex"); const expiresAt = new Date(Date.now() + SESSION_DAYS * 86400000); await db.insert(privateSessions).values({ tokenHash: hashToken(token), userId, expiresAt }); return { token, expiresAt }; }
export async function getPrivateUserByToken(token?: string) { if (!token) return undefined; const db = await getDb(); if (!db) return undefined; const rows = await db.select({ user: users }).from(privateSessions).innerJoin(users, eq(privateSessions.userId, users.id)).where(and(eq(privateSessions.tokenHash, hashToken(token)), gt(privateSessions.expiresAt, new Date()))).limit(1); return rows[0]?.user; }
export async function deletePrivateSession(token?: string) { if (!token) return; const db = await getDb(); if (db) await db.delete(privateSessions).where(eq(privateSessions.tokenHash, hashToken(token))); }
export async function listPrivateAccounts() { const db = await getDb(); if (!db) return []; return db.select({ id: users.id, username: users.username, name: users.name, role: users.role, createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.loginMethod, "private")); }
export async function changePrivatePassword(userId: number, password: string) { const db = await getDb(); if (!db) throw new Error("Database indisponível"); await db.update(users).set({ passwordHash: await hashPassword(password) }).where(eq(users.id, userId)); return { success: true } as const; }
export async function deletePrivateAccount(userId: number) { const db = await getDb(); if (!db) throw new Error("Database indisponível"); await db.delete(privateSessions).where(eq(privateSessions.userId, userId)); await db.delete(users).where(and(eq(users.id, userId), eq(users.loginMethod, "private"))); return { success: true } as const; }
export async function markPrivateSignIn(userId: number) { const db = await getDb(); if (db) await db.update(users).set({ lastSignedIn: new Date() }).where(eq(users.id, userId)); }
export function safeUser(user: User | null | undefined) { if (!user) return null; const { passwordHash: _passwordHash, ...publicUser } = user; return publicUser; }
