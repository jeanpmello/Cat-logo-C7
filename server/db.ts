import { and, asc, desc, eq, lt, ne } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { AuthorizedUser, AuditLog, Campaign, CampaignProduct, CatalogEvent, InsertProduct, InsertUser, Product, ProductImage, Rental, WarrantyRecord, auditLogs, authorizedUsers, campaignProducts, campaigns, catalogEvents, productImages, products, rentals, users, warrantyRecords } from "../drizzle/schema";
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

export async function listSellerUsers() { const db = await getDb(); if (!db) return []; return db.select({ id: users.id, name: users.name, username: users.username, role: users.role }).from(users).where(and(ne(users.role, "user"), ne(users.role, "viewer"))).orderBy(asc(users.name), asc(users.username)); }
export async function getSellerUserById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select({ id: users.id, name: users.name, username: users.username, role: users.role }).from(users).where(and(eq(users.id, id), ne(users.role, "user"), ne(users.role, "viewer"))).limit(1); return rows[0]; }

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

export type PublicProduct = Omit<Product, "serial">;

function withoutSerial(product: Product): PublicProduct {
  const { serial: _serial, ...publicProduct } = product;
  return publicProduct;
}

export async function listPublicProducts(): Promise<PublicProduct[]> { const db = await getDb(); if (!db) return []; const rows = await db.select().from(products).where(eq(products.status, "available")).orderBy(asc(products.sortOrder), desc(products.updatedAt)); return rows.map(withoutSerial); }
export async function listAdminProducts(includeRemoved = true): Promise<Product[]> { const db = await getDb(); if (!db) return []; const query = db.select().from(products); return (includeRemoved ? query : query.where(eq(products.status, "available"))).orderBy(asc(products.sortOrder), desc(products.updatedAt)); }
export async function listRentals(): Promise<Rental[]> { const db = await getDb(); if (!db) return []; return db.select().from(rentals).orderBy(desc(rentals.createdAt)); }
export async function listRentalSummaries(): Promise<Array<Omit<Rental, "customerName" | "paymentMethod"> & { customerName: string; paymentMethod: string }>> { const db = await getDb(); if (!db) return []; const rows = await db.select().from(rentals).orderBy(desc(rentals.createdAt)); return rows.map((row) => ({ ...row, customerName: "Restrito", paymentMethod: "Restrito" })); }
export async function createRental(input: { productId: number; customerName: string; startDate: string; returnDate: string; paymentMethod: string; userId?: number }) { const db = await getDb(); if (!db) throw new Error("Database not available"); const result = await db.transaction(async (tx) => { const current = await tx.select().from(products).where(eq(products.id, input.productId)).limit(1); const product = current[0]; if (!product) throw new Error("Equipamento não encontrado."); if (product.status !== "available") throw new Error("Este equipamento não está disponível para locação."); const rental = await tx.insert(rentals).values({ productId: input.productId, customerName: input.customerName.trim(), startDate: input.startDate, returnDate: input.returnDate, paymentMethod: input.paymentMethod.trim(), createdBy: input.userId ?? null }); const changed = await tx.update(products).set({ status: "rented" }).where(and(eq(products.id, input.productId), eq(products.status, "available"))); if (Number(changed[0].affectedRows ?? 0) !== 1) throw new Error("O equipamento acabou de ser alterado. Atualize a lista e tente novamente."); return { id: Number(rental[0].insertId), product }; }); await recordAudit(input.userId ?? null, "rent", "product", input.productId, `Locação registrada: ${result.product.brand} ${result.product.model} para ${input.customerName.trim()}`); return { id: result.id, success: true } as const; }
export async function returnRental(id: number, userId?: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); const result = await db.transaction(async (tx) => { const currentRows = await tx.select().from(rentals).where(eq(rentals.id, id)).limit(1); const current = currentRows[0]; if (!current) throw new Error("Locação não encontrada."); if (current.status !== "active") throw new Error("Esta locação já foi encerrada."); const rentalChanged = await tx.update(rentals).set({ status: "returned", returnedAt: new Date() }).where(and(eq(rentals.id, id), eq(rentals.status, "active"))); if (Number(rentalChanged[0].affectedRows ?? 0) !== 1) throw new Error("Esta locação já foi encerrada."); const productChanged = await tx.update(products).set({ status: "available" }).where(and(eq(products.id, current.productId), eq(products.status, "rented"))); if (Number(productChanged[0].affectedRows ?? 0) !== 1) throw new Error("O estado do equipamento mudou. Verifique o inventário antes de concluir."); return current; }); await recordAudit(userId ?? null, "return", "rental", id, `Locação encerrada para ${result.customerName}`); return { success: true } as const; }

export async function getProductById(id: number) { const db = await getDb(); if (!db) return undefined; const result = await db.select().from(products).where(eq(products.id, id)).limit(1); return result[0]; }
export async function getProductBySerial(serial: string, exceptId?: number) { const db = await getDb(); if (!db) return undefined; const normalized = normalizeSerial(serial); if (!normalized) return undefined; const where = exceptId ? and(eq(products.serial, normalized), ne(products.id, exceptId)) : eq(products.serial, normalized); const result = await db.select().from(products).where(where).limit(1); return result[0]; }
export async function getProductImages(productId: number): Promise<ProductImage[]> { const db = await getDb(); if (!db) return []; return db.select().from(productImages).where(eq(productImages.productId, productId)).orderBy(asc(productImages.sortOrder), asc(productImages.id)); }
export async function getProductImagesMap(productIds: number[]) { const result: Record<number, ProductImage[]> = {}; for (const id of productIds) result[id] = await getProductImages(id); return result; }
export async function addProductImage(input: { productId: number; url: string; storageKey?: string | null; mediaType?: "image" | "video"; caption?: string | null; isPrimary?: boolean }) { const db = await getDb(); if (!db) throw new Error("Database not available"); if (input.mediaType === "video" && input.isPrimary) throw new Error("Vídeos não podem ser definidos como capa principal."); const current = await getProductImages(input.productId); const isPrimary = input.mediaType !== "video" && (Boolean(input.isPrimary) || current.filter((item) => item.mediaType === "image").length === 0); if (isPrimary) await db.update(productImages).set({ isPrimary: 0 }).where(eq(productImages.productId, input.productId)); await db.insert(productImages).values({ productId: input.productId, url: input.url, storageKey: input.storageKey ?? null, mediaType: input.mediaType ?? "image", caption: input.caption ?? null, isPrimary: isPrimary ? 1 : 0, sortOrder: current.length }); if (isPrimary) await db.update(products).set({ imageUrl: input.url, imageKey: input.storageKey ?? null }).where(eq(products.id, input.productId)); return getProductImages(input.productId); }
export async function setPrimaryProductImage(productId: number, imageId: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); const selected = await db.select().from(productImages).where(and(eq(productImages.id, imageId), eq(productImages.productId, productId))).limit(1); if (!selected[0]) throw new Error("Foto não encontrada."); await db.update(productImages).set({ isPrimary: 0 }).where(eq(productImages.productId, productId)); await db.update(productImages).set({ isPrimary: 1 }).where(eq(productImages.id, imageId)); await db.update(products).set({ imageUrl: selected[0].url, imageKey: selected[0].storageKey }).where(eq(products.id, productId)); return getProductImages(productId); }

export async function updateProductImage(id: number, input: { caption?: string | null; sortOrder?: number }) { const db = await getDb(); if (!db) throw new Error("Database not available"); const existing = await db.select().from(productImages).where(eq(productImages.id, id)).limit(1); if (!existing[0]) throw new Error("Mídia não encontrada."); await db.update(productImages).set({ ...(input.caption !== undefined ? { caption: input.caption?.trim() || null } : {}), ...(input.sortOrder !== undefined ? { sortOrder: input.sortOrder } : {}) }).where(eq(productImages.id, id)); return getProductImages(existing[0].productId); }

export async function removeProductImage(id: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); const existing = await db.select().from(productImages).where(eq(productImages.id, id)).limit(1); if (!existing[0]) return { success: true } as const; await db.delete(productImages).where(eq(productImages.id, id)); if (existing[0].isPrimary) { const next = await db.select().from(productImages).where(eq(productImages.productId, existing[0].productId)).orderBy(asc(productImages.sortOrder), asc(productImages.id)).limit(1); if (next[0]) { await db.update(productImages).set({ isPrimary: 1 }).where(eq(productImages.id, next[0].id)); await db.update(products).set({ imageUrl: next[0].url, imageKey: next[0].storageKey }).where(eq(products.id, existing[0].productId)); } else { await db.update(products).set({ imageUrl: null, imageKey: null }).where(eq(products.id, existing[0].productId)); } } return { success: true } as const; }
export async function createWarrantyRecord(input: { productId: number; customerName: string; saleDate: string; serial: string; origin?: "printed" | "manual"; userId?: number }) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const customerName = input.customerName.trim();
  const existing = await db.select().from(warrantyRecords).where(and(eq(warrantyRecords.productId, input.productId), eq(warrantyRecords.customerName, customerName), eq(warrantyRecords.saleDate, input.saleDate))).limit(1);
  if (existing[0]) return { id: existing[0].id, expiresAt: existing[0].expiresAt, success: true, alreadyExists: true } as const;
  const [year, month, day] = input.saleDate.split("-").map(Number);
  const expires = new Date(Date.UTC(year + 1, month - 1, day));
  const expiresAt = expires.toISOString().slice(0, 10);
  const origin = input.origin ?? "printed";
  const result = await db.insert(warrantyRecords).values({ productId: input.productId, customerName, saleDate: input.saleDate, expiresAt, serial: input.serial.trim() || "—", status: expiresAt < new Date().toISOString().slice(0, 10) ? "expired" : "active", origin, printedAt: new Date(), createdBy: input.userId ?? null });
  await recordAudit(input.userId ?? null, "warranty", "product", input.productId, `${origin === "manual" ? "Garantia cadastrada manualmente" : "Termo de garantia emitido"} para ${customerName}`);
  return { id: Number(result[0].insertId), expiresAt, success: true, alreadyExists: false } as const;
}

export async function listWarrantyRecords(includeDocuments = true): Promise<WarrantyRecord[]> {
  const db = await getDb(); if (!db) return [];
  const today = new Date().toISOString().slice(0, 10);
  await db.update(warrantyRecords).set({ status: "expired" }).where(and(eq(warrantyRecords.status, "active"), lt(warrantyRecords.expiresAt, today)));
  const records = await db.select().from(warrantyRecords).orderBy(desc(warrantyRecords.createdAt));
  if (includeDocuments) return records;
  return records.map(({ signedDocumentUrl: _url, signedDocumentKey: _key, signedDocumentName: _name, signedDocumentMime: _mime, signedDocumentAt: _at, signedDocument2Url: _url2, signedDocument2Key: _key2, signedDocument2Name: _name2, signedDocument2Mime: _mime2, signedDocument2At: _at2, ...record }) => record as WarrantyRecord);
}

export async function attachWarrantyDocument(input: { id: number; slot?: 1 | 2; url: string; key: string; name: string; mime: string; userId?: number }) {
  const db = await getDb(); if (!db) throw new Error("Database not available");
  const existing = await db.select({ id: warrantyRecords.id, productId: warrantyRecords.productId }).from(warrantyRecords).where(eq(warrantyRecords.id, input.id)).limit(1);
  if (!existing[0]) throw new Error("Registro de garantia não encontrado.");
  const slot = input.slot ?? 1;
  const values = slot === 2 ? { signedDocument2Url: input.url, signedDocument2Key: input.key, signedDocument2Name: input.name, signedDocument2Mime: input.mime, signedDocument2At: new Date() } : { signedDocumentUrl: input.url, signedDocumentKey: input.key, signedDocumentName: input.name, signedDocumentMime: input.mime, signedDocumentAt: new Date() };
  await db.update(warrantyRecords).set(values).where(eq(warrantyRecords.id, input.id));
  await recordAudit(input.userId ?? null, "warranty_document", "product", existing[0].productId, `Termo assinado ${slot === 2 ? "2 " : ""}anexado: ${input.name}`);
  return { success: true, url: input.url, name: input.name, slot } as const;
}

export async function recordAudit(userId: number | null, action: string, entity: string, entityId: number | null, summary: string) { const db = await getDb(); if (!db) return; await db.insert(auditLogs).values({ userId, action, entity, entityId, summary }); }
export async function listAuditLogs(productId?: number) { const db = await getDb(); if (!db) return []; const query = db.select({ id: auditLogs.id, userId: auditLogs.userId, userName: users.name, username: users.username, action: auditLogs.action, entity: auditLogs.entity, entityId: auditLogs.entityId, summary: auditLogs.summary, createdAt: auditLogs.createdAt }).from(auditLogs).leftJoin(users, eq(auditLogs.userId, users.id)); return (productId ? query.where(and(eq(auditLogs.entity, "product"), eq(auditLogs.entityId, productId))) : query).orderBy(desc(auditLogs.createdAt)).limit(100); }

export async function insertProduct(input: InsertProduct, userId?: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); const normalized = normalizeProductData(input as InsertProduct & Parameters<typeof normalizeProductData>[0]); if (normalized.serial !== "—" && await getProductBySerial(normalized.serial)) throw new Error(`O número de série ${normalized.serial} já está cadastrado.`); const result = await db.insert(products).values(normalized); const saved = await getProductById(Number(result[0].insertId)); await recordAudit(userId ?? null, "create", "product", saved?.id ?? null, `Produto criado: ${normalized.brand} ${normalized.model}`); return saved; }
export async function updateProduct(id: number, input: Partial<InsertProduct>, userId?: number) { const db = await getDb(); if (!db) throw new Error("Database not available"); const current = await getProductById(id); if (!current) throw new Error("Produto não encontrado"); const normalized = normalizeProductData({ ...current, ...input }); if (normalized.serial !== "—" && await getProductBySerial(normalized.serial, id)) throw new Error(`O número de série ${normalized.serial} já está cadastrado.`); const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...changes } = normalized; await db.update(products).set(changes).where(eq(products.id, id)); const saved = await getProductById(id); await recordAudit(userId ?? null, "update", "product", id, `Produto atualizado: ${saved?.brand ?? ""} ${saved?.model ?? ""}`); return saved; }
export async function deleteProduct(id: number, userId?: number, sold = false, soldPrice?: string | null, salePaymentMethod?: string | null, soldByName?: string | null, soldById?: number | null) { const db = await getDb(); if (!db) throw new Error("Database not available"); const existing = await getProductById(id); if (!existing) throw new Error("Produto não encontrado"); const status = sold ? "sold" : "hidden"; await db.update(products).set({ status, soldAt: sold ? new Date() : null, soldPrice: sold ? (soldPrice?.trim() || existing.price) : null, salePaymentMethod: sold ? (salePaymentMethod?.trim() || null) : null, soldById: sold ? (soldById ?? userId ?? null) : null, soldByName: sold ? (soldByName?.trim() || null) : null }).where(eq(products.id, id)); await recordAudit(userId ?? null, sold ? "sold" : "archive", "product", id, `${sold ? "Venda registrada" : "Produto ocultado"}: ${existing.brand} ${existing.model}`); return { success: true, status } as const; }
export async function restoreProduct(id: number, userId?: number, undoReason?: string) { const db = await getDb(); if (!db) throw new Error("Database not available"); const existing = await getProductById(id); if (!existing) throw new Error("Produto não encontrado"); const reason = undoReason?.trim(); if (existing.status === "sold" && (!reason || reason.length < 3)) throw new Error("Informe o motivo para desfazer a venda."); await db.update(products).set({ status: "available", soldAt: null, soldPrice: null, salePaymentMethod: null, soldById: null, soldByName: null }).where(eq(products.id, id)); await recordAudit(userId ?? null, existing.status === "sold" ? "undo_sale" : "restore", "product", id, `${existing.status === "sold" ? `Venda desfeita — motivo: ${reason}` : "Produto restaurado"}: ${existing.brand} ${existing.model}`); return { success: true } as const; }
export async function duplicateProduct(id: number, userId?: number) { const existing = await getProductById(id); if (!existing) throw new Error("Produto não encontrado"); const { id: _id, createdAt: _createdAt, updatedAt: _updatedAt, ...copy } = existing; const saved = await insertProduct({ ...copy, model: `${copy.model} (cópia)`, serial: "—", status: "hidden", imageUrl: copy.imageUrl, imageKey: copy.imageKey }, userId); const images = await getProductImages(id); for (const image of images) await addProductImage({ productId: saved!.id, url: image.url, storageKey: image.storageKey, mediaType: image.mediaType, caption: image.caption, isPrimary: Boolean(image.isPrimary) }); return saved; }
export async function bulkUpsertProducts(inputs: Array<InsertProduct & { id?: number }>, userId?: number) { const saved: Product[] = []; for (const input of inputs) { if (input.id && await getProductById(input.id)) { const { id, ...changes } = input; const updated = await updateProduct(id, changes, userId); if (updated) saved.push(updated); } else { const inserted = await insertProduct(input, userId); if (inserted) saved.push(inserted); } } return saved; }
export async function hideSoldProducts() { const db = await getDb(); if (!db) throw new Error("Database not available"); await db.update(products).set({ status: "sold" }).where(and(eq(products.status, "available"), ne(products.id, 0))); }


export type PublicCampaign = Omit<Campaign, "createdBy"> & { products: PublicProduct[] };

async function campaignWithProducts(campaign: Campaign): Promise<PublicCampaign> {
  const db = await getDb();
  if (!db) return { ...campaign, products: [] };
  const links = await db.select().from(campaignProducts).where(eq(campaignProducts.campaignId, campaign.id)).orderBy(asc(campaignProducts.sortOrder), asc(campaignProducts.id));
  const campaignItems: PublicProduct[] = [];
  for (const link of links) {
    const product = await getProductById(link.productId);
    if (product?.status === "available") campaignItems.push(withoutSerial(product));
  }
  const { createdBy: _createdBy, ...publicCampaign } = campaign;
  return { ...publicCampaign, products: campaignItems };
}

export async function listActiveCampaigns(): Promise<PublicCampaign[]> {
  const db = await getDb();
  if (!db) return [];
  const now = Date.now();
  const rows = await db.select().from(campaigns).where(eq(campaigns.status, "active")).orderBy(desc(campaigns.updatedAt));
  const valid = rows.filter((campaign) => (!campaign.startsAt || new Date(campaign.startsAt).getTime() <= now) && (!campaign.endsAt || new Date(campaign.endsAt).getTime() >= now));
  const result: PublicCampaign[] = [];
  for (const campaign of valid) {
    const enriched = await campaignWithProducts(campaign);
    if (enriched.products.length > 0) result.push(enriched);
  }
  return result;
}

export async function listCampaigns(): Promise<Array<Campaign & { productIds: number[] }>> {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(campaigns).orderBy(desc(campaigns.updatedAt));
  const result: Array<Campaign & { productIds: number[] }> = [];
  for (const campaign of rows) {
    const links = await db.select().from(campaignProducts).where(eq(campaignProducts.campaignId, campaign.id)).orderBy(asc(campaignProducts.sortOrder));
    result.push({ ...campaign, productIds: links.map((link) => link.productId) });
  }
  return result;
}

export type CampaignInput = { internalName: string; slug: string; title: string; description?: string | null; bannerUrl?: string | null; accentColor: string; ctaLabel: string; status: "draft" | "active" | "paused"; startsAt?: Date | null; endsAt?: Date | null; productIds: number[]; userId?: number };

export async function saveCampaign(input: CampaignInput, id?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const values = { internalName: input.internalName.trim(), slug: input.slug.trim().toLowerCase(), title: input.title.trim(), description: input.description?.trim() || null, bannerUrl: input.bannerUrl?.trim() || null, accentColor: input.accentColor, ctaLabel: input.ctaLabel.trim() || "Ver ofertas", status: input.status, startsAt: input.startsAt ?? null, endsAt: input.endsAt ?? null, createdBy: input.userId ?? null };
  if (values.endsAt && values.startsAt && values.endsAt < values.startsAt) throw new Error("O encerramento não pode ser anterior ao início.");
  const savedId = await db.transaction(async (tx) => {
    let campaignId = id;
    if (campaignId) {
      await tx.update(campaigns).set({ ...values, createdBy: undefined }).where(eq(campaigns.id, campaignId));
      await tx.delete(campaignProducts).where(eq(campaignProducts.campaignId, campaignId));
    } else {
      const result = await tx.insert(campaigns).values(values);
      campaignId = Number(result[0].insertId);
    }
    const ids = Array.from(new Set(input.productIds));
    if (ids.length) await tx.insert(campaignProducts).values(ids.map((productId, index) => ({ campaignId: campaignId!, productId, sortOrder: index })));
    return campaignId!;
  });
  await recordAudit(input.userId ?? null, id ? "update" : "create", "campaign", savedId, `${id ? "Campanha atualizada" : "Campanha criada"}: ${values.title}`);
  return { id: savedId, success: true } as const;
}

export async function setCampaignStatus(id: number, status: "draft" | "active" | "paused", userId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(campaigns).where(eq(campaigns.id, id)).limit(1);
  if (!existing[0]) throw new Error("Campanha não encontrada.");
  await db.update(campaigns).set({ status }).where(eq(campaigns.id, id));
  await recordAudit(userId ?? null, "status", "campaign", id, `Campanha ${status}: ${existing[0].title}`);
  return { success: true } as const;
}

export async function trackCatalogEvent(input: { eventType: string; productId?: number | null; source?: string | null; path?: string | null }) { const db = await getDb(); if (!db) return { success: false } as const; await db.insert(catalogEvents).values({ eventType: input.eventType, productId: input.productId ?? null, source: input.source?.slice(0, 80) || null, path: input.path?.slice(0, 255) || null }); return { success: true } as const; }
export async function listCatalogEvents(): Promise<CatalogEvent[]> { const db = await getDb(); if (!db) return []; return db.select().from(catalogEvents).orderBy(desc(catalogEvents.createdAt)).limit(1000); }
