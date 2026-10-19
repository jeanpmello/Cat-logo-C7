import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

const admin = readFileSync(new URL("../client/src/pages/Admin.tsx", import.meta.url), "utf8");
const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
const layout = readFileSync(new URL("../client/src/components/DashboardLayout.tsx", import.meta.url), "utf8");

describe("admin mobile workflow", () => {
  it("provides a single reset action for the inventory filters", () => {
    expect(admin).toContain("function clearInventoryFilters()");
    expect(admin).toContain('className="admin-quiet-button inventory-clear-button"');
    expect(admin).toContain("disabled={!inventoryFiltersActive}");
  });

  it("associates the mobile filter toggle with its filter controls", () => {
    expect(admin).toContain('aria-controls="inventory-filter-controls"');
    expect(admin).toContain('id="inventory-filter-controls" className={`inventory-tools');
  });

  it("uses an explicit admin main class instead of browser-dependent selectors", () => {
    expect(layout).toContain("dashboard-main-admin");
    expect(css).toContain(".dashboard-main-admin { padding: 0; }");
  });

  it("keeps the primary edit action full width while preserving two-column secondary actions", () => {
    expect(css).toContain(".admin-shell .inventory-actions .inventory-edit-button { grid-column: 1 / -1 !important; }");
    expect(css).toContain(".admin-shell .inventory-actions { grid-template-columns: repeat(2, minmax(0, 1fr) !important;");
  });

  it("offers quick access below the primary products and public catalog links", () => {
    expect(layout).toContain("Acesso rápido");
    expect(layout).toContain("Novo produto");
    expect(layout).toContain("Campanhas");
    expect(layout).toContain("c7-admin-jump");
    expect(admin).toContain('id="warranty-control-panel"');
    expect(admin).toContain('id="reports-panel"');
  });

  it("keeps the operational shortcuts and shared inventory search at the top", () => {
    expect(admin).toContain('role="region" aria-label="Ações rápidas do painel"');
    expect(admin).toContain("Registrar venda");
    expect(admin).toContain("Nova locação");
    expect(admin).toContain("Importar planilha");
    expect(admin).toContain('className="admin-quick-search"');
    expect(css).toContain(".admin-operational-top");
    expect(css).toContain("@media (max-width: 700px)");
  });

  it("documents keyboard shortcuts and ignores typing fields", () => {
    expect(admin).toContain("handleOperationalShortcut");
    expect(admin).toContain('event.altKey');
    expect(admin).toContain('isTypingTarget(event.target)');
    expect(admin).toContain('aria-keyshortcuts="Alt+N"');
    expect(admin).toContain('aria-keyshortcuts="Alt+V"');
    expect(admin).toContain('aria-keyshortcuts="Alt+L"');
    expect(admin).toContain('aria-keyshortcuts="Alt+G"');
    expect(admin).toContain('aria-keyshortcuts="Alt+I"');
    expect(admin).toContain('aria-keyshortcuts="Alt+/"');
  });

  it("keeps motion performant and accessible", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("transform 160ms cubic-bezier(.23, 1, .32, 1)");
    expect(css).not.toContain("operational-action { transition: all");
  });
});
