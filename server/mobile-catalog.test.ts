import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";

describe("mobile catalog filters", () => {
  it("provides a collapsible filter control with accessible state", () => {
    const source = readFileSync(new URL("../client/src/pages/Home.tsx", import.meta.url), "utf8");
    expect(source).toContain("showMobileFilters");
    expect(source).toContain('aria-expanded={showMobileFilters}');
    expect(source).toContain('aria-controls="catalog-filters"');
    expect(source).toContain('className={`filter-group ${showMobileFilters ? "is-open" : ""}`}');
    expect(source).toContain("Refinar resultados");
  });

  it("keeps the mobile controls hidden outside the mobile breakpoint", () => {
    const css = readFileSync(new URL("../client/src/index.css", import.meta.url), "utf8");
    expect(css).toContain(".mobile-filter-actions, .mobile-filter-heading { display: none; }");
    expect(css).toContain(".filter-group.is-open { display: grid;");
    expect(css).toContain("min-height: 44px");
  });
});
