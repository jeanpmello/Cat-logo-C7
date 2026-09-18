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

export const authorizedUsers = mysqlTable("authorizedUsers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  label: varchar("label", { length: 120 }),
  accessLevel: mysqlEnum("accessLevel", ["viewer", "seller", "admin"]).default("seller").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  brand: varchar("brand", { length: 80 }).notNull(), model: varchar("model", { length: 140 }).notNull(), processor: varchar("processor", { length: 140 }).notNull(), generation: varchar("generation", { length: 40 }).notNull(), ram: varchar("ram", { length: 20 }).notNull(), ramType: varchar("ramType", { length: 20 }).notNull(), storage: varchar("storage", { length: 40 }).notNull(), gpu: varchar("gpu", { length: 120 }).notNull(), os: varchar("os", { length: 60 }).notNull(), serial: varchar("serial", { length: 140 }).notNull(), screen: varchar("screen", { length: 30 }).notNull(), category: mysqlEnum("category", ["Notebook", "Desktop"]).default("Notebook").notNull(), condition: mysqlEnum("condition", ["Seminovo revisado", "Novo"]).default("Seminovo revisado").notNull(), cosmeticCondition: varchar("cosmeticCondition", { length: 160 }), battery: varchar("battery", { length: 120 }), accessories: varchar("accessories", { length: 255 }), notes: text("notes"), price: varchar("price", { length: 60 }).default("Sob consulta").notNull(), originalPrice: varchar("originalPrice", { length: 60 }), promoPrice: varchar("promoPrice", { length: 60 }), imageUrl: text("imageUrl"), imageKey: varchar("imageKey", { length: 255 }), status: mysqlEnum("status", ["available", "sold", "hidden"]).default("available").notNull(), badge: varchar("badge", { length: 80 }), sortOrder: int("sortOrder").default(0).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const productImages = mysqlTable("productImages", { id: int("id").autoincrement().primaryKey(), productId: int("productId").notNull(), url: text("url").notNull(), storageKey: varchar("storageKey", { length: 255 }), caption: varchar("caption", { length: 160 }), sortOrder: int("sortOrder").default(0).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });
export const auditLogs = mysqlTable("auditLogs", { id: int("id").autoincrement().primaryKey(), userId: int("userId"), action: varchar("action", { length: 40 }).notNull(), entity: varchar("entity", { length: 40 }).notNull(), entityId: int("entityId"), summary: varchar("summary", { length: 255 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull() });

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type AuthorizedUser = typeof authorizedUsers.$inferSelect;
export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;
export type ProductImage = typeof productImages.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type PrivateSession = typeof privateSessions.$inferSelect;
