import { describe, expect, it } from "vitest";
import type { Product } from "../drizzle/schema";
import { previewProductImport } from "./productImport";

const existingProduct: Product = {
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
  imageUrl: "https://example.test/dell.jpg",
  imageKey: null,
  status: "available",
  badge: null,
  sortOrder: 1,
  createdAt: new Date("2026-01-01T00:00:00Z"),
  updatedAt: new Date("2026-01-01T00:00:00Z"),
};

describe("prévia de importação de produtos", () => {
  it("separa inclusões e atualizações e só envia os campos preenchidos na atualização", () => {
    const preview = previewProductImport([
      { id: 42, modelo: "Latitude 5450" },
      { marca: "HP", modelo: "ProBook 440", processador: "Intel Core i5", ram: "16", armazenamento: "SSD 512", preco: "3500" },
    ], [existingProduct]);

    expect(preview.errors).toEqual([]);
    expect(preview.creates).toHaveLength(1);
    expect(preview.updates).toHaveLength(1);
    expect(preview.updates[0]).toMatchObject({ line: 2, id: 42, data: { model: "Latitude 5450" } });
    expect(Object.keys(preview.updates[0].data)).toEqual(["model"]);
    expect(preview.items.map((item) => item.action)).toEqual(["update", "create"]);
    expect(preview.creates[0].data.brand).toBe("HP");
  });

  it("coleta erros em todas as linhas e impede o envio de qualquer item", () => {
    const preview = previewProductImport([
      { marca: "Dell", modelo: "Sem processador", ram: "16 GB", armazenamento: "SSD 512 GB" },
      { marca: "HP", modelo: "Memória sem capacidade", processador: "i5", ram: "sem unidade", armazenamento: "SSD" },
    ], []);

    expect(preview.errors).toHaveLength(2);
    expect(preview.errors[0]).toMatchObject({ line: 2 });
    expect(preview.errors[0].messages.join(" ")).toContain("processador");
    expect(preview.errors[1]).toMatchObject({ line: 3 });
    expect(preview.errors[1].messages.join(" ")).toContain("capacidade");
    expect(preview.items).toEqual([]);
  });

  it("rejeita IDs inexistentes e números de série repetidos antes de gravar", () => {
    const preview = previewProductImport([
      { id: 999, modelo: "ID inexistente" },
      { marca: "Dell", modelo: "Novo A", processador: "i5", ram: "8", armazenamento: "SSD 256", nserie: "DUPLICADO" },
      { marca: "HP", modelo: "Novo B", processador: "i5", ram: "8", armazenamento: "SSD 256", nserie: "DUPLICADO" },
    ], [existingProduct]);

    expect(preview.errors.map((error) => error.line)).toEqual([2, 4]);
    expect(preview.errors[0].messages[0]).toContain("ID 999 não existe");
    expect(preview.errors[1].messages.join(" ")).toContain("DUPLICADO");
    expect(preview.items).toEqual([]);
  });

  it("preserva células vazias em atualizações e exige ao menos um campo com valor", () => {
    const preview = previewProductImport([{ id: 42, marca: "", modelo: "  " }], [existingProduct]);

    expect(preview.errors).toEqual([{ line: 2, messages: ["Nenhum campo com valor foi informado para atualização; células vazias preservam os dados atuais."] }]);
    expect(preview.items).toEqual([]);
  });
});
