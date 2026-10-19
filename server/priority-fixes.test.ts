import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { appRouter } from "./routers";
import { buildCatalogMeta } from "./_core/vite";
import type { TrpcContext } from "./_core/context";

type Role = NonNullable<TrpcContext["user"]>["role"];

function contextFor(role: Role): TrpcContext {
  const now = new Date();
  return {
    user: {
      id: 999,
      openId: `test-${role}`,
      email: `${role}@example.com`,
      name: `Test ${role}`,
      loginMethod: "private",
      username: `test-${role}`,
      passwordHash: null,
      role,
      createdAt: now,
      updatedAt: now,
      lastSignedIn: now,
    },
    req: { protocol: "https", headers: {}, get: () => "catalogo.c7tecnologia.com" } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("priority fixes", () => {
  it("generates product-specific escaped Open Graph and canonical metadata", () => {
    const html = buildCatalogMeta(
      '<html><head><meta name="description" content="generic" /><title>Generic</title></head><body></body></html>',
      "/?produto=42&galeria=principal",
      "https://catalogo.c7tecnologia.com",
      { brand: "Dell & Cia", model: 'Vostro "Pro"', processor: "Intel Core i5", ram: "16 GB", storage: "SSD 512 GB", price: "R$ 2.500,00", promoPrice: null, imageUrl: "/foto.jpg", status: "available" },
    );
    expect(html).toContain("Dell &amp; Cia Vostro &quot;Pro&quot; · C7 Store");
    expect(html).toContain('property="og:image" content="https://catalogo.c7tecnologia.com/foto.jpg"');
    expect(html).toContain('property="og:url" content="https://catalogo.c7tecnologia.com/?produto=42&amp;galeria=principal"');
    expect(html).toContain('rel="canonical"');
    expect(html).not.toContain('content="generic"');
  });

  it("does not expose analytics reports to sellers or viewers", async () => {
    const seller = appRouter.createCaller(contextFor("seller"));
    const viewer = appRouter.createCaller(contextFor("viewer"));
    await expect(seller.analytics.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(viewer.analytics.list()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("does not allow viewers to create or return rentals", async () => {
    const viewer = appRouter.createCaller(contextFor("viewer"));
    await expect(viewer.rentals.create({ productId: 1, customerName: "Cliente Teste", startDate: "2026-09-29", returnDate: "2026-10-01", paymentMethod: "Pix" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(viewer.rentals.return({ id: 1 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("rejects an oversized image before storage upload", async () => {
    const seller = appRouter.createCaller(contextFor("seller"));
    const oversized = Buffer.alloc(8 * 1024 * 1024 + 1).toString("base64");
    await expect(seller.products.uploadImage({ filename: "large.jpg", mimeType: "image/jpeg", base64: oversized })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("keeps both rental transitions transactional and conditionally guarded", () => {
    const source = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(source).toContain("db.transaction(async (tx)");
    expect(source).toContain('eq(products.status, "available")');
    expect(source).toContain('eq(rentals.status, "active")');
    expect(source).toContain('eq(products.status, "rented")');
    expect(source).toContain("affectedRows");
  });

  it("keeps the warranty print action present", () => {
    const source = readFileSync(new URL("../client/src/components/admin/WarrantyContract.tsx", import.meta.url), "utf8");
    expect(source).toContain("printWindow.print()");
  });

  it("protects private warranty storage paths while keeping public media paths available", () => {
    const source = readFileSync(new URL("./_core/storageProxy.ts", import.meta.url), "utf8");
    expect(source).toContain('key.startsWith("warranty-documents/")');
    expect(source).toContain("getPrivateUserByToken");
    expect(source).toContain('!["seller", "admin"].includes(user.role)');
    expect(source).toContain('res.status(401)');
  });

  it("uses the shared serial normalizer in the actionable inventory warning", () => {
    const admin = readFileSync(new URL("../client/src/pages/Admin.tsx", import.meta.url), "utf8");
    expect(admin).toContain('import { normalizeSerial } from "@shared/productData"');
    expect(admin).toContain("Boolean(normalizeSerial(product.serial))");
    expect(admin).toContain("Confira o motivo exibido em cada produto");
  });

  it("keeps admin-only code out of the initial public route", () => {
    const app = readFileSync(new URL("../client/src/App.tsx", import.meta.url), "utf8");
    expect(app).toContain('lazy(() => import("./pages/Admin"))');
    expect(app).toContain("Suspense");
  });
});
