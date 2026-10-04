// @vitest-environment jsdom
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { Product } from "@shared/types";
import Admin from "./Admin";

const state = vi.hoisted(() => {
  const callNames = ["create", "update", "remove", "restore", "registerSale", "duplicate", "bulk", "upload", "addImage", "createPrivate", "removePrivate", "myPassword", "addAuthorized", "removeAuthorized"];
  const calls: Record<string, any[]> = Object.fromEntries(callNames.map((name) => [name, []]));
  const failNext: Record<string, string | undefined> = {};
  const successToast = vi.fn();
  const utils = {
    products: { adminList: { invalidate: vi.fn() }, list: { invalidate: vi.fn() } },
    authorizedUsers: { list: { invalidate: vi.fn() } },
    privateAccounts: { list: { invalidate: vi.fn() } },
  };
  const runMutation = (key: string, input: any, options: any) => {
    calls[key].push(input);
    const errorMessage = failNext[key];
    if (errorMessage) {
      delete failNext[key];
      const error = new Error(errorMessage);
      options?.onError?.(error);
      throw error;
    }
    if (key === "create") {
      const now = new Date();
      state.products = [...state.products, { ...input, id: 100 + state.products.length, createdAt: now, updatedAt: now }];
    } else if (key === "update") {
      state.products = state.products.map((product: any) => product.id === input.id ? { ...product, ...input.data, updatedAt: new Date() } : product);
    } else if (key === "remove") {
      state.products = state.products.map((product: any) => product.id === input.id ? { ...product, statusBeforeArchive: product.status, status: "hidden" } : product);
    } else if (key === "restore") {
      state.products = state.products.map((product: any) => product.id === input.id ? { ...product, status: product.statusBeforeArchive ?? "available", statusBeforeArchive: null } : product);
    } else if (key === "registerSale") {
      state.products = state.products.map((product: any) => product.id === input.id ? { ...product, status: "sold", soldByUserId: input.sellerId, soldByName: state.sellers.find((seller: any) => seller.id === input.sellerId)?.name } : product);
    }
    const result = key === "bulk" ? input.items.map((_: unknown, index: number) => ({ id: index + 1 })) : key === "registerSale" ? state.products.find((product: any) => product.id === input.id) : { success: true };
    options?.onSuccess?.(result);
    return result;
  };
  const mutation = (key: string) => (options: any) => ({
    mutate: (input: any) => { try { runMutation(key, input, options); } catch { /* mutate reports failures through onError */ } },
    mutateAsync: async (input: any) => runMutation(key, input, options),
    isPending: false,
  });
  return {
    calls,
    failNext,
    successToast,
    utils,
    mutation,
    role: "seller",
    products: [] as any[],
    sellers: [{ id: 9, name: "Ana Lima" }, { id: 15, name: "Caio Souza" }] as any[],
    xlsxRows: [] as any[],
  };
});

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => state.utils,
    products: {
      adminList: { useQuery: () => ({ data: state.products, isLoading: false }) },
      eligibleSellers: { useQuery: () => ({ data: state.sellers, isLoading: false }) },
      registerSale: { useMutation: state.mutation("registerSale") },
      create: { useMutation: state.mutation("create") },
      update: { useMutation: state.mutation("update") },
      remove: { useMutation: state.mutation("remove") },
      restore: { useMutation: state.mutation("restore") },
      duplicate: { useMutation: state.mutation("duplicate") },
      bulkUpsert: { useMutation: state.mutation("bulk") },
      uploadImage: { useMutation: state.mutation("upload") },
      addImage: { useMutation: state.mutation("addImage") },
    },
    authorizedUsers: {
      list: { useQuery: () => ({ data: [] }) },
      add: { useMutation: state.mutation("addAuthorized") },
      remove: { useMutation: state.mutation("removeAuthorized") },
    },
    privateAccounts: {
      list: { useQuery: () => ({ data: [] }) },
      create: { useMutation: state.mutation("createPrivate") },
      remove: { useMutation: state.mutation("removePrivate") },
      myPassword: { useMutation: state.mutation("myPassword") },
    },
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: { id: 7, name: "Pessoa de teste", role: state.role } }) }));
vi.mock("@/components/DashboardLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/components/admin/PhotoEditor", () => ({ default: () => null }));
vi.mock("@/components/admin/CardDesigner", () => ({ default: () => null }));
vi.mock("sonner", () => ({ toast: { success: state.successToast, error: vi.fn(), info: vi.fn() } }));
vi.mock("xlsx", () => ({
  read: vi.fn(() => ({ SheetNames: ["Produtos"], Sheets: { Produtos: {} } })),
  utils: {
    sheet_to_json: vi.fn(() => state.xlsxRows),
    book_new: vi.fn(() => ({})),
    aoa_to_sheet: vi.fn(() => ({})),
    json_to_sheet: vi.fn(() => ({})),
    book_append_sheet: vi.fn(),
  },
  writeFile: vi.fn(),
}));

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

function resetState() {
  state.role = "seller";
  state.products = [{ ...product }];
  state.sellers = [{ id: 9, name: "Ana Lima" }, { id: 15, name: "Caio Souza" }];
  state.xlsxRows = [];
  for (const key of Object.keys(state.calls)) state.calls[key] = [];
  for (const key of Object.keys(state.failNext)) delete state.failNext[key];
}

afterEach(cleanup);
beforeEach(() => {
  resetState();
  window.history.replaceState({}, "", "/admin");
  vi.spyOn(window, "scrollTo").mockImplementation(() => {});
});

describe("painel administrativo", () => {
  it("cria e edita produtos, mantém os dados após erro, arquiva com Escape e restaura", async () => {
    render(<Admin />);
    fireEvent.click(screen.getByRole("button", { name: "Novo produto" }));

    fireEvent.change(screen.getByLabelText("Marca *"), { target: { value: "HP" } });
    fireEvent.change(screen.getByLabelText("Modelo *"), { target: { value: "ProBook 440" } });
    fireEvent.change(screen.getByLabelText("Processador *"), { target: { value: "Intel Core i5" } });
    fireEvent.change(screen.getByLabelText("RAM *"), { target: { value: "16 GB" } });
    fireEvent.change(screen.getByLabelText("Armazenamento *"), { target: { value: "SSD 512 GB" } });

    state.failNext.create = "Banco indisponível";
    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao catálogo" }));
    expect(await screen.findByText("Banco indisponível")).toBeTruthy();
    expect(screen.getByLabelText("Modelo *")).toHaveProperty("value", "ProBook 440");
    expect(state.calls.create).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Adicionar ao catálogo" }));
    await waitFor(() => expect(state.calls.create).toHaveLength(2));
    expect(screen.queryByRole("heading", { name: "Adicionar produto" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Editar Dell Latitude 5420" }));
    fireEvent.change(screen.getByLabelText("Modelo *"), { target: { value: "Latitude 5430" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar alterações" }));
    await waitFor(() => expect(state.calls.update).toHaveLength(1));
    expect(state.calls.update[0]).toMatchObject({ id: 42, data: { model: "Latitude 5430" } });

    const archiveTrigger = screen.getByRole("button", { name: "Arquivar Dell Latitude 5430" });
    fireEvent.click(archiveTrigger);
    const dialog = await screen.findByRole("dialog", { name: "Arquivar produto?" });
    fireEvent.keyDown(dialog, { key: "Escape", code: "Escape" });
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(document.activeElement).toBe(archiveTrigger);

    fireEvent.click(archiveTrigger);
    fireEvent.click(await screen.findByRole("button", { name: "Arquivar produto" }));
    await waitFor(() => expect(state.calls.remove).toHaveLength(1));
    expect(state.products.find((item: Product) => item.id === 42)?.status).toBe("hidden");
    const successCall = state.successToast.mock.calls[state.successToast.mock.calls.length - 1];
    expect(successCall[1].action.label).toBe("Desfazer");
    successCall[1].action.onClick();
    await waitFor(() => expect(state.calls.restore).toEqual([{ id: 42 }]));
    expect(state.calls.restore).toEqual([{ id: 42 }]);
    expect(state.products.find((item: Product) => item.id === 42)?.status).toBe("available");
  });

  it("registra a venda com vendedor escolhido e restaura o status vendido após arquivamento", async () => {
    render(<Admin />);
    fireEvent.click(screen.getByRole("button", { name: "Registrar venda de Dell Latitude 5420" }));

    const selector = await screen.findByRole("combobox", { name: "Quem vendeu" });
    const confirmButton = screen.getByRole("button", { name: "Confirmar venda" });
    expect(confirmButton.hasAttribute("disabled")).toBe(true);
    fireEvent.change(selector, { target: { value: "9" } });
    fireEvent.click(confirmButton);

    await waitFor(() => expect(state.calls.registerSale).toEqual([{ id: 42, sellerId: 9 }]));
    expect(state.products[0]).toMatchObject({ status: "sold", soldByUserId: 9, soldByName: "Ana Lima" });
    expect(screen.getByText("Vendido por Ana Lima (#9)")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Arquivar Dell Latitude 5420" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Arquivar Dell Latitude 5420" }));
    fireEvent.click(await screen.findByRole("button", { name: "Arquivar produto" }));
    await waitFor(() => expect(state.products[0]).toMatchObject({ status: "hidden", statusBeforeArchive: "sold" }));
    const archiveToast = state.successToast.mock.calls[state.successToast.mock.calls.length - 1];
    archiveToast[1].action.onClick();
    await waitFor(() => expect(state.products[0]).toMatchObject({ status: "sold", soldByUserId: 9, soldByName: "Ana Lima", statusBeforeArchive: null }));
  });

  it("mostra inclusões e atualizações na prévia, não grava antes de confirmar e preserva a prévia após falha", async () => {
    render(<Admin />);
    fireEvent.click(screen.getByRole("button", { name: "Novo produto" }));
    state.xlsxRows = [
      { id: 42, modelo: "Latitude 5450" },
      { marca: "Lenovo", modelo: "ThinkPad T14", processador: "Intel Core i5", ram: "16", armazenamento: "SSD 512", preco: "3500" },
    ];
    const file = new File(["dados"], "catalogo.xlsx", { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    Object.defineProperty(file, "arrayBuffer", { value: vi.fn().mockResolvedValue(new ArrayBuffer(0)) });
    fireEvent.change(screen.getByLabelText("Selecionar arquivo de planilha"), { target: { files: [file] } });

    expect(await screen.findByRole("heading", { name: "Prévia: catalogo.xlsx" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Novos produtos" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Atualizações de produtos existentes" })).toBeTruthy();
    expect(state.calls.bulk).toHaveLength(0);

    state.failNext.bulk = "Banco indisponível";
    fireEvent.click(screen.getByRole("button", { name: "Gravar 2 alterações" }));
    expect(await screen.findByText("Banco indisponível")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Prévia: catalogo.xlsx" })).toBeTruthy();
    expect(state.calls.bulk).toHaveLength(1);
    expect(state.calls.bulk[0].items[0]).toMatchObject({ action: "update", id: 42, data: { model: "Latitude 5450" } });
    expect(Object.keys(state.calls.bulk[0].items[0].data)).toEqual(["model"]);

    fireEvent.click(screen.getByRole("button", { name: "Gravar 2 alterações" }));
    await waitFor(() => expect(state.calls.bulk).toHaveLength(2));
    expect(screen.queryByRole("heading", { name: "Prévia: catalogo.xlsx" })).toBeNull();
    expect(state.calls.bulk[1].items.map((item: any) => item.action)).toEqual(["update", "create"]);
  });

  it("mantém consulta somente leitura no papel viewer", () => {
    state.role = "viewer";
    render(<Admin />);

    expect(screen.getByText("Modo consulta")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Novo produto" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Editar Dell Latitude 5420" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Arquivar Dell Latitude 5420" })).toBeNull();
  });
});
