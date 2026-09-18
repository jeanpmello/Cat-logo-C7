import { describe, expect, it } from "vitest";
import { formatGeneration, formatPrice, formatRam, formatScreen, formatStorage, normalizeProductData, validateProductData } from "./productData";

const baseProduct = {
  brand: "lenovo",
  model: " IdeaPad   3 ",
  processor: "intel core i5-10210u",
  generation: "10 geração",
  ram: "8gb",
  ramType: "ddr4",
  storage: "ssd256gb",
  gpu: "Integrada",
  os: "windows 11",
  serial: " ab-1234 ",
  screen: "15.6 polegadas",
  price: "1499",
  originalPrice: "1999,90",
  promoPrice: "1399,90",
  cosmeticCondition: " Bom estado ",
  battery: "3 horas",
  accessories: "Fonte",
  notes: "Revisado",
  badge: "Oferta",
};

describe("product data normalization", () => {
  it("standardizes capacities, screen, generation and prices", () => {
    expect(formatRam("8gb")).toBe("8 GB");
    expect(formatStorage("ssd256gb")).toBe("SSD 256 GB");
    expect(formatScreen("15.6 polegadas")).toBe('15,6"');
    expect(formatGeneration("10° geração")).toBe("10ª Geração");
    expect(formatPrice("1499")).toMatch(/R\$\s?1\.499,00/);
  });

  it("normalizes a complete product consistently", () => {
    const result = normalizeProductData(baseProduct);
    expect(result).toMatchObject({ brand: "Lenovo", model: "IdeaPad 3", ram: "8 GB", storage: "SSD 256 GB", ramType: "DDR4", serial: "AB-1234", screen: '15,6"', generation: "10ª Geração" });
  });

  it("reports invalid required capacities and inconsistent promotions", () => {
    const issues = validateProductData({ ...baseProduct, ram: "não informado", storage: "SSD", originalPrice: "R$ 1.000,00", promoPrice: "R$ 1.200,00" });
    expect(issues.some((issue) => issue.field === "ram" && issue.level === "error")).toBe(true);
    expect(issues.some((issue) => issue.field === "storage" && issue.level === "error")).toBe(true);
    expect(issues.some((issue) => issue.field === "promoPrice" && issue.level === "warning")).toBe(true);
  });
});
