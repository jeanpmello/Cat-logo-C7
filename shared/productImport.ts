import type { Product } from "../drizzle/schema";
import { normalizeProductData, normalizeSerial, validateProductData } from "./productData";

export type ProductImportValues = Pick<Product, "brand" | "model" | "processor" | "generation" | "ram" | "ramType" | "storage" | "gpu" | "os" | "serial" | "screen" | "category" | "condition" | "price" | "status" | "sortOrder"> &
  Partial<Pick<Product, "cosmeticCondition" | "battery" | "accessories" | "notes" | "originalPrice" | "promoPrice" | "imageUrl" | "imageKey" | "badge">>;
export type ProductImportItem =
  | { action: "create"; data: ProductImportValues }
  | { action: "update"; id: number; data: Partial<ProductImportValues> };

export type ProductImportPreview = {
  creates: Array<{ line: number; data: ProductImportValues }>;
  updates: Array<{ line: number; id: number; data: Partial<ProductImportValues> }>;
  items: ProductImportItem[];
  errors: Array<{ line: number; messages: string[] }>;
};

type SpreadsheetRow = Record<string, unknown>;

const COLUMN_NAMES = {
  id: ["id", "codigo", "codigo produto"],
  brand: ["marca", "brand"],
  model: ["modelo", "model"],
  processor: ["processador", "cpu", "processor"],
  generation: ["geracao", "generation"],
  ram: ["ramgb", "ram", "memoria"],
  ramType: ["tiporam", "ramtype"],
  storage: ["armazgb", "armazenamento", "storage", "hd", "ssd"],
  gpu: ["placadevideo", "video", "gpu"],
  os: ["windows", "sistema", "os"],
  serial: ["nserie", "serie", "serial"],
  screen: ["tela", "screen"],
  category: ["categoria", "tipo", "category"],
  condition: ["condicao", "condition"],
  cosmeticCondition: ["estado", "conservacao", "cosmeticcondition"],
  battery: ["bateria", "battery"],
  accessories: ["acessorios", "accessories"],
  notes: ["observacoes", "notas", "notes"],
  price: ["preco", "valor", "price"],
  originalPrice: ["precooriginal", "originalprice"],
  promoPrice: ["precooferta", "promoprice"],
  imageUrl: ["imagem", "foto", "imageurl"],
  status: ["status"],
  badge: ["destaque", "badge"],
  sortOrder: ["ordem", "sortorder"],
} as const;

type ImportField = Exclude<keyof typeof COLUMN_NAMES, "id">;

function normalizeColumn(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getCell(row: SpreadsheetRow, aliases: readonly string[]) {
  const key = Object.keys(row).find((candidate) => aliases.includes(normalizeColumn(candidate)));
  if (!key) return undefined;
  const value = row[key];
  if (value === null || value === undefined) return undefined;
  const text = String(value).trim();
  return text ? text : undefined;
}

function withUnit(value: string | undefined, unit: string) {
  if (!value) return undefined;
  return /[a-z]/i.test(value) ? value : `${value} ${unit}`;
}

function parseCategory(value: string | undefined) {
  if (!value) return undefined;
  const normalized = normalizeColumn(value);
  if (normalized.includes("desktop")) return "Desktop" as const;
  if (normalized.includes("notebook") || normalized.includes("laptop")) return "Notebook" as const;
  return null;
}

function parseCondition(value: string | undefined) {
  if (!value) return undefined;
  const normalized = normalizeColumn(value);
  if (normalized === "novo" || normalized === "nova") return "Novo" as const;
  if (normalized.includes("seminovo") || normalized.includes("revisado")) return "Seminovo revisado" as const;
  return null;
}

function parseStatus(value: string | undefined) {
  if (!value) return undefined;
  const normalized = normalizeColumn(value);
  if (["available", "disponivel", "ativo"].includes(normalized)) return "available" as const;
  if (["sold", "vendido"].includes(normalized)) return "sold" as const;
  if (["hidden", "oculto", "arquivado", "arquivada"].includes(normalized)) return "hidden" as const;
  return null;
}

function getMappedValues(row: SpreadsheetRow, line: number, addError: (line: number, message: string) => void) {
  const values: Partial<ProductImportValues> = {};
  const stringFields: Array<Exclude<ImportField, "category" | "condition" | "status" | "sortOrder">> = [
    "brand", "model", "processor", "generation", "ram", "ramType", "storage", "gpu", "os", "serial", "screen", "cosmeticCondition", "battery", "accessories", "notes", "price", "originalPrice", "promoPrice", "imageUrl", "badge",
  ];

  for (const field of stringFields) {
    const raw = getCell(row, COLUMN_NAMES[field]);
    if (raw === undefined) continue;
    if (field === "ram") values.ram = withUnit(raw, "GB");
    else if (field === "storage") values.storage = withUnit(raw, "GB");
    else if (field === "screen") values.screen = withUnit(raw, '"');
    else values[field] = raw;
  }

  const category = parseCategory(getCell(row, COLUMN_NAMES.category));
  if (category === null) addError(line, "Categoria inválida; use Notebook ou Desktop.");
  else if (category) values.category = category;

  const condition = parseCondition(getCell(row, COLUMN_NAMES.condition));
  if (condition === null) addError(line, "Condição inválida; use Novo ou Seminovo revisado.");
  else if (condition) values.condition = condition;

  const status = parseStatus(getCell(row, COLUMN_NAMES.status));
  if (status === null) addError(line, "Status inválido; use Disponível, Vendido ou Oculto.");
  else if (status) values.status = status;

  const sortOrder = getCell(row, COLUMN_NAMES.sortOrder);
  if (sortOrder !== undefined) {
    const parsedOrder = Number(sortOrder);
    if (!Number.isSafeInteger(parsedOrder) || parsedOrder < 0) addError(line, "Ordem inválida; informe um número inteiro igual ou maior que zero.");
    else values.sortOrder = parsedOrder;
  }

  return values;
}

function isNonEmptyRow(row: SpreadsheetRow) {
  return Object.values(row).some((value) => value !== null && value !== undefined && String(value).trim() !== "");
}

function validationMessages(product: ProductImportValues | Product) {
  return validateProductData(product).filter((issue) => issue.level === "error").map((issue) => issue.message);
}

export function previewProductImport(rows: SpreadsheetRow[], existingProducts: readonly Product[]): ProductImportPreview {
  const errorsByLine = new Map<number, string[]>();
  const addError = (line: number, message: string) => {
    const messages = errorsByLine.get(line) ?? [];
    if (!messages.includes(message)) messages.push(message);
    errorsByLine.set(line, messages);
  };
  const existingById = new Map(existingProducts.map((product) => [product.id, product]));
  const candidates: Array<
    | { action: "create"; line: number; data: ProductImportValues }
    | { action: "update"; line: number; id: number; data: Partial<ProductImportValues> }
  > = [];

  rows.forEach((row, index) => {
    const line = index + 2;
    if (!isNonEmptyRow(row)) return;

    const rawId = getCell(row, COLUMN_NAMES.id);
    let id: number | undefined;
    if (rawId !== undefined) {
      const parsedId = Number(rawId);
      if (!Number.isSafeInteger(parsedId) || parsedId <= 0) {
        addError(line, "Código inválido; informe um ID inteiro positivo ou deixe a célula vazia para criar um produto.");
        return;
      }
      id = parsedId;
      if (!existingById.has(id)) {
        addError(line, `O produto de ID ${id} não existe no inventário; nenhum item será criado com esse ID.`);
        return;
      }
    }

    const mapped = getMappedValues(row, line, addError);
    if (id !== undefined) {
      const current = existingById.get(id)!;
      if (Object.keys(mapped).length === 0) {
        addError(line, "Nenhum campo com valor foi informado para atualização; células vazias preservam os dados atuais.");
        return;
      }
      const normalizedCurrent = normalizeProductData({ ...current, ...mapped } as Product);
      for (const message of validationMessages(normalizedCurrent)) addError(line, message);
      const normalizedChanges: Partial<ProductImportValues> = {};
      for (const field of Object.keys(mapped) as ImportField[]) {
        (normalizedChanges as Record<string, unknown>)[field] = normalizedCurrent[field];
      }
      candidates.push({ action: "update", line, id, data: normalizedChanges });
      return;
    }

    const newProduct: ProductImportValues = {
      brand: mapped.brand ?? "C7",
      model: mapped.model ?? "",
      processor: mapped.processor ?? "",
      generation: mapped.generation ?? "Não informada",
      ram: mapped.ram ?? "",
      ramType: mapped.ramType ?? "DDR4",
      storage: mapped.storage ?? "",
      gpu: mapped.gpu ?? "Integrada",
      os: mapped.os ?? "Windows 10",
      serial: mapped.serial ?? "—",
      screen: mapped.screen ?? "—",
      category: mapped.category ?? "Notebook",
      condition: mapped.condition ?? "Seminovo revisado",
      cosmeticCondition: mapped.cosmeticCondition ?? "Bom estado",
      battery: mapped.battery ?? "Não informado",
      accessories: mapped.accessories ?? null,
      notes: mapped.notes ?? null,
      price: mapped.price ?? "Sob consulta",
      originalPrice: mapped.originalPrice ?? null,
      promoPrice: mapped.promoPrice ?? null,
      imageUrl: mapped.imageUrl ?? null,
      imageKey: null,
      status: mapped.status ?? "available",
      badge: mapped.badge ?? null,
      sortOrder: mapped.sortOrder ?? index + 1,
    };
    const normalized = normalizeProductData(newProduct);
    for (const message of validationMessages(normalized)) addError(line, message);
    candidates.push({ action: "create", line, data: normalized });
  });

  if (candidates.length === 0 && errorsByLine.size === 0) addError(1, "A planilha não contém linhas de produtos.");

  const seenIds = new Map<number, number>();
  const seenSerials = new Map<string, { line: number; id?: number }>();
  for (const candidate of candidates) {
    if (candidate.action === "update") {
      const firstLine = seenIds.get(candidate.id);
      if (firstLine !== undefined) addError(candidate.line, `O ID ${candidate.id} já aparece na linha ${firstLine}.`);
      else seenIds.set(candidate.id, candidate.line);
    }

    const serialValue = candidate.data.serial;
    const serial = serialValue ? normalizeSerial(serialValue) : "";
    if (!serial) continue;
    const previous = seenSerials.get(serial);
    if (previous && !(candidate.action === "update" && previous.id === candidate.id)) {
      addError(candidate.line, `O número de série ${serial} também aparece na linha ${previous.line}.`);
    } else if (!previous) {
      seenSerials.set(serial, { line: candidate.line, id: candidate.action === "update" ? candidate.id : undefined });
    }

    const conflictingProduct = existingProducts.find((product) => normalizeSerial(product.serial) === serial && !(candidate.action === "update" && product.id === candidate.id));
    if (conflictingProduct) addError(candidate.line, `O número de série ${serial} já pertence a ${conflictingProduct.brand} ${conflictingProduct.model} (ID ${conflictingProduct.id}).`);
  }

  const creates = candidates.filter((candidate): candidate is Extract<typeof candidate, { action: "create" }> => candidate.action === "create");
  const updates = candidates.filter((candidate): candidate is Extract<typeof candidate, { action: "update" }> => candidate.action === "update");
  const items: ProductImportItem[] = errorsByLine.size > 0 ? [] : candidates.map((candidate): ProductImportItem => candidate.action === "create"
    ? { action: "create", data: candidate.data }
    : { action: "update", id: candidate.id, data: candidate.data });

  return {
    creates: creates.map(({ line, data }) => ({ line, data })),
    updates: updates.map(({ line, id, data }) => ({ line, id, data })),
    items,
    errors: Array.from(errorsByLine.entries()).sort(([left], [right]) => left - right).map(([line, messages]) => ({ line, messages })),
  };
}
