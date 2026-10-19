import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const root = process.cwd();

describe("signed warranty documents", () => {
  it("stores document metadata on warranty records", () => {
    const schema = readFileSync(`${root}/drizzle/schema.ts`, "utf8");
    expect(schema).toContain('signedDocumentUrl: text("signedDocumentUrl")');
    expect(schema).toContain('signedDocumentMime: varchar("signedDocumentMime"');
    expect(schema).toContain('signedDocumentAt: timestamp("signedDocumentAt")');
  });

  it("offers camera capture and PDF/image formats in the admin", () => {
    const admin = readFileSync(`${root}/client/src/pages/Admin.tsx`, "utf8");
    expect(admin).toContain('capture="environment"');
    expect(admin).toContain("application/pdf,image/jpeg,image/png,image/webp");
    expect(admin).toContain("Fotografar página 1");
    expect(admin).toContain("Fotografar página 2");
    expect(admin).toContain("documentSlot");
    expect(admin).toContain("warranty-thumbnail");
    expect(admin).toContain("warranty-pdf-preview");
  });

  it("keeps upload protected and limits the payload", () => {
    const router = readFileSync(`${root}/server/routers.ts`, "utf8");
    expect(router).toContain("attachDocument: sellerProcedure");
    expect(router).toContain("12 * 1024 * 1024");
    expect(router).toContain('ctx.user.role !== "viewer"');
  });

  it("starts the warranty at print time and avoids duplicate controls", () => {
    const db = readFileSync(`${root}/server/db.ts`, "utf8");
    const contract = readFileSync(`${root}/client/src/components/admin/WarrantyContract.tsx`, "utf8");
    expect(db).toContain("alreadyExists: true");
    expect(db).toContain("eq(warrantyRecords.customerName, customerName)");
    expect(contract.indexOf("onPrinted?.")).toBeGreaterThan(contract.indexOf("window.open"));
  });

  it("supports legacy manual warranty records with visible start dates", () => {
    const schema = readFileSync(`${root}/drizzle/schema.ts`, "utf8");
    const router = readFileSync(`${root}/server/routers.ts`, "utf8");
    const admin = readFileSync(`${root}/client/src/pages/Admin.tsx`, "utf8");
    expect(schema).toContain('origin: mysqlEnum("origin", ["printed", "manual"])');
    expect(router).toContain("manual: sellerProcedure");
    expect(router).toContain('origin: "manual"');
    expect(admin).toContain("Adicionar garantia antiga");
    expect(admin).toContain("Início: {new Date(`${record.saleDate}");
  });
});
