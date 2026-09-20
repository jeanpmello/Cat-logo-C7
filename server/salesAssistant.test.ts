import { describe, expect, it } from "vitest";
import { rankProducts } from "./salesAssistant";
import type { Product } from "../drizzle/schema";

function product(overrides: Partial<Product> = {}): Product {
  return { id: 1, brand: "C7", model: "Notebook Pro", processor: "Intel Core i5", generation: "10ª geração", ram: "16 GB", ramType: "DDR4", storage: "512 GB SSD", gpu: "Integrada", os: "Windows 11", serial: "—", screen: "15,6\"", category: "Notebook", condition: "Seminovo revisado", cosmeticCondition: "Bom estado", battery: "Boa", accessories: "Carregador", notes: null, price: "R$ 3.000,00", originalPrice: null, promoPrice: null, imageUrl: null, imageKey: null, status: "available", badge: null, sortOrder: 1, createdAt: new Date(), updatedAt: new Date(), ...overrides };
}

describe("sales assistant ranking", () => {
  it("prioritizes products inside the customer's budget", () => { const ranked = rankProducts([product({ id: 1, model: "Premium", price: "R$ 5.000,00" }), product({ id: 2, model: "Essencial", price: "R$ 2.900,00" })], { useCase: "trabalho e estudo", budget: "R$ 3.500" }); expect(ranked[0]?.product.id).toBe(2); });
  it("never ranks sold or hidden products", () => { const ranked = rankProducts([product({ id: 1, status: "sold" }), product({ id: 2, status: "hidden" }), product({ id: 3, model: "Disponível", status: "available" })], { useCase: "uso geral" }); expect(ranked.map(({ product: item }) => item.id)).toEqual([3]); });
  it("favors a stronger GPU for gaming profiles", () => { const ranked = rankProducts([product({ id: 1, model: "Integrado", gpu: "Intel UHD" }), product({ id: 2, model: "Dedicado", gpu: "NVIDIA GTX 1650" })], { useCase: "jogar Valorant" }); expect(ranked[0]?.product.id).toBe(2); });
});
