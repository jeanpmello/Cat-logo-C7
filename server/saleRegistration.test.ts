import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Product } from "../drizzle/schema";
import { archiveProductState, buildSaleAuditRecord, registerSaleState, restoreProductState } from "../shared/productLifecycle";
import type { TrpcContext } from "./_core/context";

const dbStubs = vi.hoisted(() => ({
  listEligibleSellers: vi.fn(),
  getEligibleSellerById: vi.fn(),
  registerProductSale: vi.fn(),
  updateProduct: vi.fn(),
}));

vi.mock("./db", async (importOriginal) => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listEligibleSellers: dbStubs.listEligibleSellers,
    getEligibleSellerById: dbStubs.getEligibleSellerById,
    registerProductSale: dbStubs.registerProductSale,
    updateProduct: dbStubs.updateProduct,
  };
});

import { appRouter } from "./routers";

const product: Product = {
  id: 42,
  brand: "Dell",
  model: "Latitude 5420",
  processor: "Intel Core i5",
  generation: "11ª Geração",
  ram: "16 GB",
  ramType: "DDR4",
  storage: "SSD 512 GB",
  gpu: "Integrada",
  os: "Windows 11",
  serial: "C7-TEST-42",
  screen: '14"',
  category: "Notebook",
  condition: "Seminovo revisado",
  cosmeticCondition: "Bom estado",
  battery: "Boa",
  accessories: "Carregador",
  notes: null,
  price: "R$ 2.500,00",
  originalPrice: null,
  promoPrice: null,
  imageUrl: null,
  imageKey: null,
  status: "available",
  statusBeforeArchive: null,
  soldByUserId: null,
  soldByName: null,
  badge: null,
  sortOrder: 1,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

function createContext(role: "seller" | "admin" | "viewer" = "seller"): TrpcContext {
  return {
    user: {
      id: 104,
      openId: "private:actor",
      name: "Pessoa operadora",
      email: null,
      loginMethod: "private",
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      username: "operadora",
      passwordHash: null,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

beforeEach(() => vi.clearAllMocks());

describe("API de registro de venda", () => {
  it("expõe somente id e nome dos vendedores elegíveis", async () => {
    dbStubs.listEligibleSellers.mockResolvedValue([{ id: 12, name: "Ana Lima" }]);
    const caller = appRouter.createCaller(createContext());

    expect(await caller.products.eligibleSellers()).toEqual([{ id: 12, name: "Ana Lima" }]);
    expect(dbStubs.listEligibleSellers).toHaveBeenCalledOnce();
  });

  it("rejeita no servidor vendedor inexistente ou não elegível", async () => {
    dbStubs.getEligibleSellerById.mockResolvedValue(undefined);
    const caller = appRouter.createCaller(createContext());

    await expect(caller.products.registerSale({ id: 42, sellerId: 999 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbStubs.registerProductSale).not.toHaveBeenCalled();
  });

  it("grava estado vendido e repassa o operador separadamente do vendedor escolhido", async () => {
    dbStubs.getEligibleSellerById.mockResolvedValue({ id: 12, name: "Ana Lima" });
    dbStubs.registerProductSale.mockResolvedValue({ ...product, status: "sold", soldByUserId: 12, soldByName: "Ana Lima" });
    const caller = appRouter.createCaller(createContext());

    const result = await caller.products.registerSale({ id: 42, sellerId: 12 });
    expect(result).toMatchObject({ status: "sold", soldByUserId: 12, soldByName: "Ana Lima" });
    expect(dbStubs.registerProductSale).toHaveBeenCalledWith(42, 12, 104);
  });

  it("não permite marcar vendido pelo endpoint genérico de edição", async () => {
    const caller = appRouter.createCaller(createContext());

    await expect(caller.products.update({ id: 42, data: { status: "sold" } as never })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbStubs.updateProduct).not.toHaveBeenCalled();
  });

  it("não disponibiliza a seleção de vendedor para papel somente de consulta", async () => {
    const caller = appRouter.createCaller(createContext("viewer"));
    await expect(caller.products.eligibleSellers()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("transições de status de produto", () => {
  it("registra vendedor e nome-snapshot somente a partir de disponível", () => {
    expect(registerSaleState("available", { id: 12, name: "Ana Lima" })).toEqual({
      status: "sold",
      statusBeforeArchive: null,
      soldByUserId: 12,
      soldByName: "Ana Lima",
    });
    expect(() => registerSaleState("hidden", { id: 12, name: "Ana Lima" })).toThrow("Somente produtos disponíveis");
    expect(() => registerSaleState("sold", { id: 12, name: "Ana Lima" })).toThrow("Somente produtos disponíveis");
  });

  it("preserva no histórico o executor separado do vendedor e o nome-snapshot", () => {
    const audit = buildSaleAuditRecord(104, product, { id: 12, name: "Ana Lima" });

    expect(audit).toMatchObject({ userId: 104, action: "sell", entityId: 42 });
    expect(audit.summary).toContain("vendedor Ana Lima (#12)");
    expect(audit.userId).not.toBe(12);
  });

  it("arquivar e restaurar é independente e reversível para disponível e vendido", () => {
    expect(archiveProductState("available")).toEqual({ status: "hidden", statusBeforeArchive: "available" });
    expect(restoreProductState("available")).toEqual({ status: "available", statusBeforeArchive: null });
    expect(archiveProductState("sold")).toEqual({ status: "hidden", statusBeforeArchive: "sold" });
    expect(restoreProductState("sold")).toEqual({ status: "sold", statusBeforeArchive: null });
    expect(restoreProductState(null)).toEqual({ status: "available", statusBeforeArchive: null });
  });
});
