// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { Product } from "@shared/types";
import Home from "./Home";

const { listQuery, detailQuery } = vi.hoisted(() => ({
  listQuery: vi.fn(),
  detailQuery: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    products: {
      list: { useQuery: listQuery },
      detail: { useQuery: detailQuery },
    },
  },
}));

const product: Product = {
  id: 42,
  brand: "Dell",
  model: "Latitude 5420",
  processor: "Intel Core i5",
  generation: "11ª geração",
  ram: "16 GB",
  ramType: "DDR4",
  storage: "512 GB SSD",
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
  price: "R$ 2.500",
  originalPrice: null,
  promoPrice: null,
  imageUrl: "https://example.test/dell.jpg",
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

function setCatalogQuery(result: Record<string, unknown>) {
  listQuery.mockReturnValue({
    data: undefined,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
    ...result,
  });
  detailQuery.mockReturnValue({ data: undefined, isLoading: false });
}

afterEach(cleanup);
beforeEach(() => {
  listQuery.mockReset();
  detailQuery.mockReset();
  document.title = "C7 Store";
  window.history.replaceState({}, "", "/");
});

describe("catálogo", () => {
  it("separa erro de consulta de um catálogo sem resultados e oferece nova tentativa", () => {
    const refetch = vi.fn();
    setCatalogQuery({
      isError: true,
      error: new Error("API indisponível"),
      refetch,
    });
    render(<Home />);

    expect(screen.getByRole("alert").textContent).toContain(
      "Não foi possível carregar o catálogo"
    );
    expect(screen.queryByText("Nenhum equipamento encontrado")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Tentar novamente" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("mostra o estado vazio quando a consulta termina com uma lista válida vazia", () => {
    setCatalogQuery({ data: [], isLoading: false, isError: false });
    render(<Home />);

    expect(screen.getByText("Nenhum equipamento encontrado")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("abre diálogo com título acessível, fecha com Escape e devolve o foco ao acionador", async () => {
    setCatalogQuery({ data: [product], isLoading: false, isError: false });
    render(<Home />);

    const trigger = screen.getByRole("button", { name: "Ver detalhes" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", {
      name: "Dell Latitude 5420",
    });
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    );
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("apresenta um título acessível no diálogo de comparação e restaura o foco ao fechá-lo", async () => {
    setCatalogQuery({ data: [product], isLoading: false, isError: false });
    render(<Home />);

    fireEvent.click(
      screen.getByRole("button", { name: "Comparar Dell Latitude 5420" })
    );
    const trigger = screen.getByRole("button", { name: "Comparar (1)" });
    fireEvent.click(trigger);
    const dialog = await screen.findByRole("dialog", {
      name: "Compare os produtos selecionados",
    });
    await waitFor(() =>
      expect(dialog.contains(document.activeElement)).toBe(true)
    );
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(trigger);
  });

  it("carrega imagens dos cartões apenas quando necessário", () => {
    setCatalogQuery({ data: [product], isLoading: false, isError: false });
    render(<Home />);

    expect(
      screen.getByAltText("Dell Latitude 5420").getAttribute("loading")
    ).toBe("lazy");
  });
});
