export type ProductDataInput = {
  brand: string;
  model: string;
  processor: string;
  generation: string;
  ram: string;
  ramType: string;
  storage: string;
  gpu: string;
  os: string;
  serial: string;
  screen: string;
  price: string;
  originalPrice?: string | null;
  promoPrice?: string | null;
  cosmeticCondition?: string | null;
  battery?: string | null;
  accessories?: string | null;
  notes?: string | null;
  badge?: string | null;
};

export type ProductValidation = {
  field: keyof ProductDataInput | "general";
  level: "error" | "warning";
  message: string;
};

const PLACEHOLDERS = new Set(["", "-", "—", "na", "n/a", "não informado", "não informada", "a confirmar"]);

function cleanSpaces(value: unknown) {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function titleWords(value: unknown) {
  return cleanSpaces(value).split(" ").map((word) => {
    if (/^(c7|hp|ibm|lg|msi)$/i.test(word)) return word.toUpperCase();
    if (/^[A-Z0-9][A-Z0-9.+/-]*$/.test(word)) return word;
    return word.length <= 2 ? word : word.charAt(0).toUpperCase() + word.slice(1);
  }).join(" ");
}

function formatCapacity(value: unknown, fallbackUnit = "GB") {
  const text = cleanSpaces(value).replace(/\s*(gb|tb)\b/ig, " $1").trim();
  if (!text || PLACEHOLDERS.has(text.toLowerCase())) return "";
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*(gb|tb)?/i);
  if (!match) return text;
  const unit = (match[2] || fallbackUnit).toUpperCase();
  const amount = match[1].replace(".", ",");
  const prefix = text.slice(0, match.index).trim();
  return `${prefix ? `${prefix.toUpperCase()} ` : ""}${amount} ${unit}`;
}

export function formatRam(value: unknown) {
  const capacity = formatCapacity(value, "GB");
  return capacity.replace(/^(RAM|MEMÓRIA)\s+/i, "");
}

export function formatStorage(value: unknown) {
  const text = cleanSpaces(value);
  if (!text) return "";
  const type = /\bssd\b/i.test(text) ? "SSD" : /\b(hd|hdd)\b/i.test(text) ? "HD" : "";
  const capacity = formatCapacity(text.replace(/\b(ssd|hdd|hd)\b/ig, "").trim(), "GB");
  return [type, capacity].filter(Boolean).join(" ");
}

export function formatScreen(value: unknown) {
  const text = cleanSpaces(value).replace(/polegadas?/ig, "").replace(/[”″]/g, '"');
  if (!text || PLACEHOLDERS.has(text.toLowerCase())) return "";
  const match = text.match(/\d+(?:[.,]\d+)?/);
  return match ? `${match[0].replace(".", ",")}"` : text;
}

export function formatGeneration(value: unknown) {
  const text = cleanSpaces(value);
  if (!text || PLACEHOLDERS.has(text.toLowerCase())) return "";
  const match = text.match(/\d{1,2}/);
  return match ? `${match[0]}ª Geração` : text;
}

export function formatPrice(value: unknown) {
  const text = cleanSpaces(value);
  if (!text || PLACEHOLDERS.has(text.toLowerCase())) return "";
  if (/sob consulta/i.test(text)) return "Sob consulta";
  const digits = text.replace(/[^\d,.-]/g, "");
  if (!digits) return text;
  let amount: number;
  if (digits.includes(",")) amount = Number(digits.replace(/\./g, "").replace(",", "."));
  else if (/\.\d{1,2}$/.test(digits)) amount = Number(digits);
  else amount = Number(digits.replace(/\./g, ""));
  if (!Number.isFinite(amount) || amount < 0) return text;
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(amount);
}

export function normalizeSerial(value: unknown) {
  const text = cleanSpaces(value).toUpperCase();
  return PLACEHOLDERS.has(text.toLowerCase()) ? "" : text;
}

export function normalizeProductData<T extends ProductDataInput>(input: T): T {
  return {
    ...input,
    brand: titleWords(input.brand),
    model: cleanSpaces(input.model),
    processor: cleanSpaces(input.processor).replace(/\bintel\s+core\s*/i, "Intel Core ").replace(/\bamd\s+ryzen\s*/i, "AMD Ryzen "),
    generation: formatGeneration(input.generation),
    ram: formatRam(input.ram),
    ramType: cleanSpaces(input.ramType).toUpperCase(),
    storage: formatStorage(input.storage),
    gpu: cleanSpaces(input.gpu),
    os: cleanSpaces(input.os).replace(/^windows\s*/i, "Windows "),
    serial: normalizeSerial(input.serial) || "—",
    screen: formatScreen(input.screen) || "—",
    price: formatPrice(input.price) || "Sob consulta",
    originalPrice: formatPrice(input.originalPrice) || null,
    promoPrice: formatPrice(input.promoPrice) || null,
    cosmeticCondition: cleanSpaces(input.cosmeticCondition) || null,
    battery: cleanSpaces(input.battery) || null,
    accessories: cleanSpaces(input.accessories) || null,
    notes: cleanSpaces(input.notes) || null,
    badge: cleanSpaces(input.badge) || null,
  };
}

function priceNumber(value: string | null | undefined) {
  const text = formatPrice(value);
  if (!text || text === "Sob consulta") return null;
  const parsed = Number(text.replace(/[^\d,]/g, "").replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}

export function validateProductData(input: ProductDataInput): ProductValidation[] {
  const issues: ProductValidation[] = [];
  const required: Array<[keyof ProductDataInput, string]> = [["brand", "marca"], ["model", "modelo"], ["processor", "processador"], ["ram", "RAM"], ["storage", "armazenamento"]];
  for (const [field, label] of required) if (!cleanSpaces(input[field])) issues.push({ field, level: "error", message: `Preencha ${label}.` });
  if (input.ram && !/\d/.test(input.ram)) issues.push({ field: "ram", level: "error", message: "A RAM precisa ter uma capacidade, por exemplo 8 GB." });
  if (input.storage && !/\d/.test(input.storage)) issues.push({ field: "storage", level: "error", message: "O armazenamento precisa ter uma capacidade, por exemplo SSD 256 GB." });
  if (input.screen && !PLACEHOLDERS.has(cleanSpaces(input.screen).toLowerCase()) && !/\d/.test(input.screen)) issues.push({ field: "screen", level: "warning", message: "Confira o tamanho da tela." });
  const current = priceNumber(input.price);
  const original = priceNumber(input.originalPrice);
  const promo = priceNumber(input.promoPrice);
  if (current === null && !/sob consulta/i.test(input.price)) issues.push({ field: "price", level: "error", message: "Informe um preço válido ou use “Sob consulta”." });
  if (promo !== null && original !== null && promo >= original) issues.push({ field: "promoPrice", level: "warning", message: "O preço promocional deveria ser menor que o preço original." });
  if (cleanSpaces(input.serial) && normalizeSerial(input.serial).length < 4) issues.push({ field: "serial", level: "warning", message: "Confira o número de série; ele parece muito curto." });
  return issues;
}
