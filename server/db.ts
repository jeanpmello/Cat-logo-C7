import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { AuthorizedUser, AuditLog, InsertProduct, InsertUser, Product, ProductImage, auditLogs, authorizedUsers, productImages, products, users } from "../drizzle/schema";
import { normalizeProductData, normalizeSerial, validateProductData } from "../shared/productData";
import { archiveProductState, buildSaleAuditRecord, registerSaleState, restoreProductState } from "../shared/productLifecycle";
import type { ProductImportItem, ProductImportValues } from "../shared/productImport";
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
export type EligibleSeller = { id: number; name: string };

function displaySellerName(user: { id: number; name: string | null }): string {
  return user.name?.trim().slice(0, 120) || `Vendedor #${user.id}`;
}

export async function listEligibleSellers(): Promise<EligibleSeller[]> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ id: users.id, name: users.name })
    .from(users)
    .where(inArray(users.role, ["seller", "admin"]))
    .orderBy(asc(users.name), asc(users.id));
  return rows.map((user) => ({ id: user.id, name: displaySellerName(user) }));
}

export async function getEligibleSellerById(id: number): Promise<EligibleSeller | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const rows = await db.select({ id: users.id, name: users.name })
    .from(users)
    .where(and(eq(users.id, id), inArray(users.role, ["seller", "admin"])))
    .limit(1);
  const user = rows[0];
  return user ? { id: user.id, name: displaySellerName(user) } : undefined;
}
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
export async function deleteProduct(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(products).where(eq(products.id, id)).limit(1).for("update");
    const existing = rows[0];
    if (!existing) throw new Error("Produto não encontrado");
    const archivedState = archiveProductState(existing.status);
    await tx.update(products).set(archivedState).where(eq(products.id, id));
    await tx.insert(auditLogs).values({ userId: userId ?? null, action: "archive", entity: "product", entityId: id, summary: `Produto arquivado: ${existing.brand} ${existing.model}` });
    return { success: true } as const;
  });
}

export async function restoreProduct(id: number, userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.transaction(async (tx) => {
    const rows = await tx.select().from(products).where(eq(products.id, id)).limit(1).for("update");
    const existing = rows[0];
    if (!existing) throw new Error("Produto não encontrado");
    if (existing.status !== "hidden") throw new Error("O produto não está arquivado.");
    await tx.update(products).set(restoreProductState(existing.statusBeforeArchive)).where(eq(products.id, id));
    await tx.insert(auditLogs).values({ userId: userId ?? null, action: "restore", entity: "product", entityId: id, summary: `Produto restaurado: ${existing.brand} ${existing.model}` });
    return { success: true } as const;
  });
}

export async function registerProductSale(productId: number, sellerId: number, actorUserId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  return db.transaction(async (tx) => {
    const sellers = await tx.select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.id, sellerId), inArray(users.role, ["seller", "admin"])))
      .limit(1)
      .for("update");
    const seller = sellers[0];
    if (!seller) throw new Error("O vendedor selecionado não existe ou não está elegível.");

    const productRows = await tx.select().from(products).where(eq(products.id, productId)).limit(1).for("update");
    const product = productRows[0];
    if (!product) throw new Error("Produto não encontrado.");

    const sellerName = displaySellerName(seller);
    const saleState = registerSaleState(product.status, { id: seller.id, name: sellerName });
    await tx.update(products).set(saleState).where(eq(products.id, productId));
    await tx.insert(auditLogs).values(buildSaleAuditRecord(actorUserId, product, { id: seller.id, name: sellerName }));
    const updated = await tx.select().from(products).where(eq(products.id, productId)).limit(1);
    if (!updated[0]) throw new Error("Não foi possível confirmar a venda do produto.");
    return updated[0];
  });
}

export async function duplicateProduct(id: number, userId?: number) {
  const existing = await getProductById(id);
  if (!existing) throw new Error("Produto não encontrado");
  const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, statusBeforeArchive: _statusBeforeArchive, soldByUserId: _soldByUserId, soldByName: _soldByName, ...copy } = existing;
  const saved = await insertProduct({ ...copy, model: `${copy.model} (cópia)`, status: "hidden", imageUrl: copy.imageUrl, imageKey: copy.imageKey }, userId);
  const images = await getProductImages(id);
  for (const image of images) await addProductImage({ productId: saved!.id, url: image.url, storageKey: image.storageKey, caption: image.caption });
  return saved;
}
export async function bulkUpsertProducts(items: ProductImportItem[], userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");

  const seenIds = new Set<number>();
  for (const item of items) {
    if (item.action !== "update") continue;
    if (seenIds.has(item.id)) throw new Error(`O ID ${item.id} aparece mais de uma vez na importação.`);
    seenIds.add(item.id);
    if (Object.keys(item.data).length === 0) throw new Error(`A atualização do produto ${item.id} não contém campos preenchidos.`);
  }

  return db.transaction(async (tx) => {
    const prepared: Array<
      | { action: "create"; data: ProductImportValues }
      | { action: "update"; id: number; data: Product }
    > = [];

    // Preflight every row while holding the same transaction; no row is written until all pass.
    for (const item of items) {
      if (item.action === "create") {
        const normalized = normalizeProductData(item.data);
        const errors = validateProductData(normalized).filter((issue) => issue.level === "error");
        if (errors.length) throw new Error(`Importação inválida para ${normalized.brand} ${normalized.model}: ${errors.map((issue) => issue.message).join(" ")}`);
        prepared.push({ action: "create", data: normalized });
        continue;
      }

      const currentRows = await tx.select().from(products).where(eq(products.id, item.id)).limit(1);
      const current = currentRows[0];
      if (!current) throw new Error(`O produto de ID ${item.id} não existe mais; nenhuma alteração foi gravada.`);
      const normalized = normalizeProductData({ ...current, ...item.data } as Product);
      const errors = validateProductData(normalized).filter((issue) => issue.level === "error");
      if (errors.length) throw new Error(`Importação inválida para o produto ${item.id}: ${errors.map((issue) => issue.message).join(" ")}`);
      prepared.push({ action: "update", id: item.id, data: normalized });
    }

    const seenSerials = new Set<string>();
    for (const item of prepared) {
      const serial = normalizeSerial(item.data.serial);
      if (!serial) continue;
      if (seenSerials.has(serial)) throw new Error(`O número de série ${serial} aparece mais de uma vez na importação.`);
      seenSerials.add(serial);
      const conflict = item.action === "update"
        ? await tx.select().from(products).where(and(eq(products.serial, serial), ne(products.id, item.id))).limit(1)
        : await tx.select().from(products).where(eq(products.serial, serial)).limit(1);
      if (conflict[0]) throw new Error(`O número de série ${serial} já está cadastrado em outro produto.`);
    }

    const saved: Product[] = [];
    for (const item of prepared) {
      if (item.action === "create") {
        const result = await tx.insert(products).values(item.data);
        const rows = await tx.select().from(products).where(eq(products.id, Number(result[0].insertId))).limit(1);
        const product = rows[0];
        if (!product) throw new Error(`Não foi possível confirmar o produto ${item.data.brand} ${item.data.model}.`);
        saved.push(product);
        await tx.insert(auditLogs).values({ userId: userId ?? null, action: "create", entity: "product", entityId: product.id, summary: `Produto criado por importação: ${product.brand} ${product.model}` });
        continue;
      }

      const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...changes } = item.data;
      await tx.update(products).set(changes).where(eq(products.id, item.id));
      const updatedRows = await tx.select().from(products).where(eq(products.id, item.id)).limit(1);
      const updated = updatedRows[0];
      if (!updated) throw new Error(`Não foi possível confirmar a atualização do produto ${item.id}.`);
      saved.push(updated);
      await tx.insert(auditLogs).values({ userId: userId ?? null, action: "update", entity: "product", entityId: item.id, summary: `Produto atualizado por importação: ${updated.brand} ${updated.model}` });
    }
    return saved;
  });
}
