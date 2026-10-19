import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  username: varchar("username", { length: 80 }).unique(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  role: mysqlEnum("role", ["user", "viewer", "seller", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const privateSessions = mysqlTable("privateSessions", {
  id: int("id").autoincrement().primaryKey(),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  userId: int("userId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const privateLoginAttempts = mysqlTable("privateLoginAttempts", {
  id: int("id").autoincrement().primaryKey(),
  identifier: varchar("identifier", { length: 180 }).notNull().unique(),
  failures: int("failures").default(0).notNull(),
  lockedUntil: timestamp("lockedUntil"),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const authorizedUsers = mysqlTable("authorizedUsers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  label: varchar("label", { length: 120 }),
  accessLevel: mysqlEnum("accessLevel", ["viewer", "seller", "admin"]).default("seller").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  brand: varchar("brand", { length: 80 }).notNull(), model: varchar("model", { length: 140 }).notNull(), processor: varchar("processor", { length: 140 }).notNull(), generation: varchar("generation", { length: 40 }).notNull(), ram: varchar("ram", { length: 20 }).notNull(), ramType: varchar("ramType", { length: 20 }).notNull(), storage: varchar("storage", { length: 40 }).notNull(), gpu: varchar("gpu", { length: 120 }).notNull(), os: varchar("os", { length: 60 }).notNull(), serial: varchar("serial", { length: 140 }).notNull(), screen: varchar("screen", { length: 30 }).notNull(), category: mysqlEnum("category", ["Notebook", "Desktop"]).default("Notebook").notNull(), condition: mysqlEnum("condition", ["Seminovo revisado", "Novo"]).default("Seminovo revisado").notNull(), cosmeticCondition: varchar("cosmeticCondition", { length: 160 }), battery: varchar("battery", { length: 120 }), accessories: varchar("accessories", { length: 255 }), notes: text("notes"), modificationNotes: text("modificationNotes"), price: varchar("price", { length: 60 }).default("Sob consulta").notNull(), originalPrice: varchar("originalPrice", { length: 60 }), promoPrice: varchar("promoPrice", { length: 60 }), imageUrl: text("imageUrl"), imageKey: varchar("imageKey", { length: 255 }), status: mysqlEnum("status", ["available", "sold", "hidden", "rented"]).default("available").notNull(), soldAt: timestamp("soldAt"), soldPrice: varchar("soldPrice", { length: 60 }), salePaymentMethod: varchar("salePaymentMethod", { length: 80 }), soldById: int("soldById"), soldByName: varchar("soldByName", { length: 120 }), badge: varchar("badge", { length: 80 }), sortOrder: int("sortOrder").default(0).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const rentals = mysqlTable("rentals", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  startDate: varchar("startDate", { length: 10 }).notNull(),
  returnDate: varchar("returnDate", { length: 10 }).notNull(),
  paymentMethod: varchar("paymentMethod", { length: 80 }).notNull(),
  status: mysqlEnum("status", ["active", "returned"]).default("active").notNull(),
  returnedAt: timestamp("returnedAt"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const productImages = mysqlTable("productImages", { id: int("id").autoincrement().primaryKey(), productId: int("productId").notNull(), url: text("url").notNull(), storageKey: varchar("storageKey", { length: 255 }), mediaType: mysqlEnum("mediaType", ["image", "video"]).default("image").notNull(), caption: varchar("caption", { length: 160 }), isPrimary: int("isPrimary").default(0).notNull(), sortOrder: int("sortOrder").default(0).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const auditLogs = mysqlTable("auditLogs", { id: int("id").autoincrement().primaryKey(), userId: int("userId"), action: varchar("action", { length: 40 }).notNull(), entity: varchar("entity", { length: 40 }).notNull(), entityId: int("entityId"), summary: varchar("summary", { length: 255 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const catalogEvents = mysqlTable("catalogEvents", { id: int("id").autoincrement().primaryKey(), eventType: varchar("eventType", { length: 40 }).notNull(), productId: int("productId"), source: varchar("source", { length: 80 }), path: varchar("path", { length: 255 }), createdAt: timestamp("createdAt").defaultNow().notNull() });

export const warrantyRecords = mysqlTable("warrantyRecords", {
  id: int("id").autoincrement().primaryKey(),
  productId: int("productId").notNull(),
  customerName: varchar("customerName", { length: 160 }).notNull(),
  saleDate: varchar("saleDate", { length: 10 }).notNull(),
  expiresAt: varchar("expiresAt", { length: 10 }).notNull(),
  serial: varchar("serial", { length: 140 }).notNull(),
  status: mysqlEnum("status", ["active", "expired", "cancelled"]).default("active").notNull(),
  origin: mysqlEnum("origin", ["printed", "manual"]).default("printed").notNull(),
  printedAt: timestamp("printedAt").defaultNow().notNull(),
  signedDocumentUrl: text("signedDocumentUrl"),
  signedDocumentKey: varchar("signedDocumentKey", { length: 255 }),
  signedDocumentName: varchar("signedDocumentName", { length: 180 }),
  signedDocumentMime: varchar("signedDocumentMime", { length: 80 }),
  signedDocumentAt: timestamp("signedDocumentAt"),
  signedDocument2Url: text("signedDocument2Url"),
  signedDocument2Key: varchar("signedDocument2Key", { length: 255 }),
  signedDocument2Name: varchar("signedDocument2Name", { length: 180 }),
  signedDocument2Mime: varchar("signedDocument2Mime", { length: 80 }),
  signedDocument2At: timestamp("signedDocument2At"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const campaigns = mysqlTable("campaigns", {
  id: int("id").autoincrement().primaryKey(),
  internalName: varchar("internalName", { length: 120 }).notNull(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  title: varchar("title", { length: 160 }).notNull(),
  description: text("description"),
  bannerUrl: text("bannerUrl"),
  accentColor: varchar("accentColor", { length: 20 }).default("#1db8ff").notNull(),
  ctaLabel: varchar("ctaLabel", { length: 60 }).default("Ver ofertas").notNull(),
  status: mysqlEnum("status", ["draft", "active", "paused"]).default("draft").notNull(),
  startsAt: timestamp("startsAt"),
  endsAt: timestamp("endsAt"),
  createdBy: int("createdBy"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const campaignProducts = mysqlTable("campaignProducts", {
  id: int("id").autoincrement().primaryKey(),
  campaignId: int("campaignId").notNull(),
  productId: int("productId").notNull(),
  sortOrder: int("sortOrder").default(0).notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AuthorizedUser = typeof authorizedUsers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type CatalogEvent = typeof catalogEvents.$inferSelect;
export type Campaign = typeof campaigns.$inferSelect;
export type CampaignProduct = typeof campaignProducts.$inferSelect;
export type PrivateSession = typeof privateSessions.$inferSelect;
export type WarrantyRecord = typeof warrantyRecords.$inferSelect;

export type Rental = typeof rentals.$inferSelect;
