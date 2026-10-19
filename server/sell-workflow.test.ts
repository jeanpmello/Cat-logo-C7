import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("integrated sale workflow", () => {
  it("offers a dedicated sale action and keeps the existing confirmation flow", () => {
    const admin = readFileSync(new URL("../client/src/pages/Admin.tsx", import.meta.url), "utf8");
    expect(admin).toContain("sell-product-button");
    expect(admin).toContain("Marcar vendido");
    expect(admin).toContain("setContractProduct");
    expect(admin).toContain("warranty-control-panel");
    expect(admin).toContain("Desfazer venda");
    expect(admin).toContain("confirmUndoSale");
    expect(admin).toContain("undo-sale-title");
    expect(admin).toContain("sale-complete-title");
    expect(admin).toContain("Gerar termo de garantia");
    expect(admin).toContain("Anexar termo assinado");
    expect(admin).toContain("Valor registrado");
    expect(admin).toContain("Forma de pagamento");
    expect(admin).toContain("Vendas desfeitas");
    expect(admin).toContain("exportUndoneSales");
    expect(admin).toContain("undoSaleReason");
    expect(admin).toContain("undoReportFrom");
    expect(admin).toContain("undoReportTo");
    expect(admin).toContain("Vendido por:");
    expect(admin).toContain("Desfeito por:");
    expect(admin).toContain("historySellerFilter");
    expect(admin).toContain("productHistorySellerFilter");
    expect(admin).toContain("salesReportFrom");
    expect(admin).toContain("salesReportSeller");
    expect(admin).toContain("salesReportPayment");
    expect(admin).toContain("exportSalesReport");
    expect(admin).toContain("Relatório geral de vendas");
    expect(admin).toContain("sale-flow-summary");
    expect(admin).toContain("sale-confirm-action");
  });

  it("does not expose sold products in the public list", () => {
    const db = readFileSync(new URL("./db.ts", import.meta.url), "utf8");
    expect(db).toContain('eq(products.status, "available")');
    expect(db).toContain("undoReason");
    expect(db).toContain("Venda desfeita — motivo:");
  });
});
