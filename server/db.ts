import { and, asc, desc, eq, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { AuthorizedUser, AuditLog, InsertProduct, InsertUser, Product, ProductImage, auditLogs, authorizedUsers, productImages, products, users } from "../drizzle/schema";
import { normalizeProductData, normalizeSerial } from "../shared/productData";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); _db = null; }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const authorized = user.email ? await getAuthorizedUserByEmail(user.email) : undefined;
  const textFields = ["name", "email", "loginMethod"] as const;
  for (const field of textFields) if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  if (user.lastSignedIn !== undefined) { values.lastSignedIn = user.lastSignedIn; updateSet.lastSignedIn = user.lastSignedIn; }
  if (user.role !== undefined) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  else if (authorized) { values.role = authorized.accessLevel; updateSet.role = authorized.accessLevel; }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return result[0]; }
export function isConfiguredOwner(openId: string) { return Boolean(ENV.ownerOpenId) && openId === ENV.ownerOpenId; }

export async function listAuthorizedUsers(): Promise<AuthorizedUser[]> { const db = await getDb(); if (!db) return []; return db.select().from(authorizedUsers).orderBy(asc(authorizedUsers.email)); }
export async function getAuthorizedUserByEmail(email: string) { const db = await getDb(); if (!db) return undefined; const normalized = email.trim().toLowerCase(); const result = await db.select().from(authorizedUsers).where(eq(authorizedUsers.email, normalized)).limit(1); return result[0]; }
export async function isAuthorizedEmail(email: string) { return Boolean(await getAuthorizedUserByEmail(email)); }
export async function addAuthorizedUser(email: string, label?: string | null, accessLevel: "viewer" | "seller" | "admin" = "seller") {
  const db = await getDb(); if (!db) throw new Error("Database not available"); const normalized = email.trim().toLowerCase();
  await db.insert(authorizedUsers).values({ email: normalized, label: label?.trim() || null, accessLevel }).onDuplicateKeyUpdate({ set: { label: label?.trim() || null, accessLevel } });
  await db.update(users).set({ role: accessLevel }).where(eq(users.email, normalized));
  return getAuthorizedUserByEmail(normalized);
}
export async function removeAuthorizedUser(id: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); const existing = await db.select().from(authorizedUsers).where(eq(authorizedUsers.id, id)).limit(1); if (existing[0]) { await db.delete(authorizedUsers).where(eq(authorizedUsers.id, id)); await db.update(users).set({ role: "user" }).where(eq(users.email, existing[0].email)); } return { success: true } as const; }

export async function listPublicProducts(): Promise<Product[]> { const db = await getDb(); if (!db) return []; return db.select().from(products).where(eq(products.status, "available")).orderBy(asc(products.sortOrder), desc(products.updatedAt)); }
export async function listAdminProducts(): Promise<Product[]> { const db = await getDb(); if (!db) return []; return db.select().from(products).orderBy(asc(products.sortOrder), desc(products.updatedAt)); }
export async function getProductById(id: number) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(products).where(eq(products.id, id)).limit(1); return result[0]; }
export async function getProductBySerial(serial: string, exceptId?: number) { const db = await getDb(); if (!db) return undefined; const normalized = normalizeSerial(serial); if (!normalized) return undefined; const where = exceptId ? and(eq(products.serial, normalized), ne(products.id, exceptId)) : eq(products.serial, normalized); const result = await db.select().from(products).where(where).limit(1); return result[0]; }
export async function getProductImages(productId: number): Promise<ProductImage[]> { const db = await getDb(); if (!db) return []; return db.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sortOrder), asc(productImages.id)); }
export async function addProductImage(input: { productId: number; url: string; storageKey?: string | null; caption?: string | null }) { const db = await getDb(); if (!db) throw new Error("Database not available"); const current = await getProductImages(input.productId); await db.insert(productImages).values({ ...input, sortOrder: current.length }); return getProductImages(input.productId); }
export async function removeProductImage(id: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.delete(productImages).where(eq(productImages.id, id)); return { success: true } as const; }
export async function recordAudit(userId: number | null, action: string, entity: string, entityId: number | null, summary: string) { const db = await getDb(); if (!db) return; await db.insert(auditLogs).values({ userId, action, entity, entityId, summary }); }
export async function listAuditLogs(): Promise<AuditLog[]> { const db = await getDb(); if (!db) return []; return db.select().from(auditLogs).orderBy(desc(auditLogs.createdAt)).limit(100); }

export async function insertProduct(input: InsertProduct, userId?: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); const normalized = normalizeProductData(input as InsertProduct & Parameters<typeof normalizeProductData>[0]); if (normalized.serial !== "—" && await getProductBySerial(normalized.serial)) throw new Error(`O número de série ${normalized.serial} já está cadastrado.`); const result = await db.insert(products).values(normalized); const saved = await getProductById(Number(result[0].insertId)); await recordAudit(userId ?? null, "create", "product", saved?.id ?? null, `Produto criado: ${normalized.brand} ${normalized.model}`); return saved; }
export async function updateProduct(id: number, input: Partial<InsertProduct>, userId?: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); const current = await getProductById(id); if (!current) throw new Error("Produto não encontrado"); const normalized = normalizeProductData({ ...current, ...input }); if (normalized.serial !== "—" && await getProductBySerial(normalized.serial, id)) throw new Error(`O número de série ${normalized.serial} já está cadastrado.`); const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...changes } = normalized; await db.update(products).set(changes).where(eq(products.id, id)); const saved = await getProductById(id); await recordAudit(userId ?? null, "update", "product", id, `Produto atualizado: ${saved?.brand ?? ""} ${saved?.model ?? ""}`); return saved; }
export async function deleteProduct(id: number, userId?: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); const existing = await getProductById(id); await db.update(products).set({ status: "hidden" }).where(eq(products.id, id)); await recordAudit(userId ?? null, "archive", "product", id, `Produto ocultado: ${existing?.brand ?? ""} ${existing?.model ?? ""}`); return { success: true } as const; }
export async function restoreProduct(id: number, userId?: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); const existing = await getProductById(id); if (!existing) throw new Error("Produto não encontrado"); await db.update(products).set({ status: "available" }).where(eq(products.id, id)); await recordAudit(userId ?? null, "restore", "product", id, `Produto restaurado: ${existing.brand} ${existing.model}`); return { success: true } as const; }
export async function duplicateProduct(id: number, userId?: number) { const existing = await getProductById(id); if (!existing) throw new Error("Produto não encontrado"); const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...copy } = existing; const saved = await insertProduct({ ...copy, model: `${copy.model} (cópia)`, status: "hidden", imageUrl: copy.imageUrl, imageKey: copy.imageKey }, userId); const images = await getProductImages(id); for (const image of images) await addProductImage({ productId: saved!.id, url: image.url, storageKey: image.storageKey, caption: image.caption }); return saved; }
export async function bulkUpsertProducts(inputs: Array<InsertProduct & { id?: number }>, userId?: number) { const saved: Product[] = []; for (const input of inputs) { if (input.id && await getProductById(input.id)) { const { id, ...changes } = input; const updated = await updateProduct(id, changes, userId); if (updated) saved.push(updated); } else { const inserted = await insertProduct(input, userId); if (inserted) saved.push(inserted); } } return saved; }
export async function hideSoldProducts() { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.update(products).set({ status: "sold" }).where(and(eq(products.status, "available"), ne(products.id, 0))); }
