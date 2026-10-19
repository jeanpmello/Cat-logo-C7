import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const projectRoot = resolve(import.meta.dirname, "..");

describe("manutenção de performance e acessibilidade", () => {
  it("mantém o zoom do navegador liberado", () => {
    const html = readFileSync(resolve(projectRoot, "client/index.html"), "utf8");
    expect(html).toContain('content="width=device-width, initial-scale=1.0"');
    expect(html).not.toContain("maximum-scale=1");
    expect(html).not.toContain("user-scalable=no");
  });

  it("carrega ferramentas pesadas e planilhas sob demanda", () => {
    const admin = readFileSync(resolve(projectRoot, "client/src/pages/Admin.tsx"), "utf8");
    expect(admin).toContain('lazy(() => import("@/components/admin/PhotoEditor"))');
    expect(admin).toContain('lazy(() => import("@/components/admin/CardDesigner"))');
    expect(admin).toContain('lazy(() => import("@/components/admin/CatalogCardDesigner"))');
    expect(admin).toContain('lazy(() => import("@/components/admin/WarrantyContract"))');
    expect(admin).toContain('import("@e965/xlsx")');
    expect(admin).not.toContain('import * as XLSX from "xlsx"');
  });
});
