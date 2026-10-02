import { useRef, useState } from "react";
import { toast } from "sonner";
import { AlertCircle, Download, FileSpreadsheet, Loader2, ShieldCheck, Upload } from "lucide-react";
import type { Product } from "@shared/types";
import { previewProductImport, type ProductImportItem, type ProductImportPreview } from "@shared/productImport";

type Props = {
  products: Product[];
  isSaving: boolean;
  onImport: (items: ProductImportItem[]) => Promise<unknown>;
};

const TEMPLATE_COLUMNS = ["id", "marca", "modelo", "processador", "geracao", "ram", "tiporam", "armazenamento", "placadevideo", "sistema", "nserie", "tela", "categoria", "condicao", "estado", "bateria", "acessorios", "observacoes", "preco", "precooriginal", "precooferta", "status", "destaque"];
const FIELD_LABELS: Record<string, string> = {
  brand: "Marca", model: "Modelo", processor: "Processador", generation: "Geração", ram: "RAM", ramType: "Tipo de RAM", storage: "Armazenamento", gpu: "Vídeo", os: "Sistema", serial: "Série", screen: "Tela", category: "Categoria", condition: "Condição", cosmeticCondition: "Estado", battery: "Bateria", accessories: "Acessórios", notes: "Observações", price: "Preço", originalPrice: "Preço original", promoPrice: "Preço promocional", imageUrl: "Imagem", status: "Status", badge: "Destaque", sortOrder: "Ordem",
};

function describeChanges(data: Record<string, unknown>) {
  return Object.entries(data).map(([field, value]) => `${FIELD_LABELS[field] ?? field}: ${value ?? "—"}`).join(" · ");
}

export default function SpreadsheetImportPanel({ products, isSaving, onImport }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<ProductImportPreview | null>(null);
  const [fileName, setFileName] = useState("");
  const [isReading, setIsReading] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function readSpreadsheet(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsReading(true);
    setPreview(null);
    setFileName("");
    setMessage("");
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) throw new Error("O arquivo não contém uma aba para importar.");
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(workbook.Sheets[firstSheet], { defval: "", blankrows: true });
      setPreview(previewProductImport(rows, products));
      setFileName(file.name);
      setMessage("");
      setIsError(false);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível ler a planilha.");
      setIsError(true);
    } finally {
      setIsReading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  }

  async function confirmImport() {
    if (!preview || preview.errors.length > 0 || preview.items.length === 0) return;
    setMessage("");
    setIsError(false);
    try {
      await onImport(preview.items);
      setPreview(null);
      setFileName("");
      setMessage("Importação concluída. O inventário foi atualizado.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Não foi possível gravar a importação. Revise e tente novamente.");
      setIsError(true);
    }
  }

  async function downloadTemplate() {
    try {
      const XLSX = await import("xlsx");
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([TEMPLATE_COLUMNS]), "Produtos");
      XLSX.writeFile(workbook, "modelo-catalogo-c7.xlsx");
      toast.success("Modelo de planilha baixado.");
    } catch {
      toast.error("Não foi possível gerar o modelo de planilha.");
    }
  }

  async function exportProducts() {
    try {
      const XLSX = await import("xlsx");
      const rows = products.map(({ id, brand, model, processor, generation, ram, ramType, storage, gpu, os, serial, screen, category, condition, cosmeticCondition, battery, accessories, notes, price, originalPrice, promoPrice, status, badge, sortOrder }) => ({ id, marca: brand, modelo: model, processador: processor, geracao: generation, ram, tiporam: ramType, armazenamento: storage, placadevideo: gpu, sistema: os, nserie: serial, tela: screen, categoria: category, condicao: condition, estado: cosmeticCondition, bateria: battery, acessorios: accessories, observacoes: notes, preco: price, precooriginal: originalPrice, precooferta: promoPrice, status, destaque: badge, ordem: sortOrder }));
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows), "Produtos");
      XLSX.writeFile(workbook, `catalogo-c7-backup-${new Date().toISOString().slice(0, 10)}.xlsx`);
      toast.success("Backup baixado em Excel.");
    } catch {
      toast.error("Não foi possível exportar o backup.");
    }
  }

  const total = preview ? preview.creates.length + preview.updates.length : 0;

  return (
    <section className="admin-panel import-panel" aria-labelledby="spreadsheet-import-title">
      <div className="panel-heading">
        <div><span className="admin-kicker">/ atualização em lote</span><h2 id="spreadsheet-import-title">Planilha e backup</h2></div>
        <FileSpreadsheet size={25} className="panel-icon" aria-hidden="true" />
      </div>
      <p>Escolha uma planilha para revisar as linhas e os campos que serão incluídos ou alterados antes de gravar.</p>
      <button type="button" className="admin-import-button" onClick={() => fileInput.current?.click()} disabled={isReading || isSaving}>
        {isReading ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <Upload size={15} aria-hidden="true" />}
        {isReading ? "Lendo planilha..." : "Selecionar XLSX ou CSV"}
      </button>
      <input ref={fileInput} type="file" accept=".xlsx,.xls,.csv" hidden onChange={readSpreadsheet} aria-label="Selecionar arquivo de planilha" />
      <button type="button" className="admin-secondary wide-action" onClick={() => void downloadTemplate()}><FileSpreadsheet size={15} aria-hidden="true" /> Baixar modelo de planilha</button>
      <button type="button" className="admin-secondary wide-action" onClick={() => void exportProducts()}><Download size={15} aria-hidden="true" /> Exportar backup atual</button>
      <div className="column-help"><strong>Campos aceitos</strong><code>id, marca, modelo, processador, ram, armazenamento, preco, precooferta, estado, bateria, acessorios, observacoes, status</code></div>
      <div className="import-note"><ShieldCheck size={15} aria-hidden="true" /><span><b>Importação segura:</b> nenhuma linha é gravada até a confirmação. Em atualizações, colunas ausentes e células vazias preservam os dados atuais; todos os campos alterados são validados em conjunto.</span></div>

      {message && <div className={`import-feedback ${isError ? "error" : "success"}`} role={isError ? "alert" : "status"}>{isError && <AlertCircle size={16} aria-hidden="true" />}{message}</div>}

      {preview && <div className="import-preview" aria-labelledby="import-preview-title">
        <div className="import-preview-heading"><div><span className="admin-kicker">/ conferência obrigatória</span><h3 id="import-preview-title">Prévia: {fileName}</h3></div><span className="import-preview-count">{total} {total === 1 ? "linha preparada" : "linhas preparadas"}</span></div>
        {preview.errors.length > 0 && <div className="import-errors" role="alert"><strong>{preview.errors.length} {preview.errors.length === 1 ? "linha precisa" : "linhas precisam"} de correção. Nada foi gravado.</strong><ul>{preview.errors.map(({ line, messages }) => <li key={line}><b>Linha {line}:</b> {messages.join(" ")}</li>)}</ul></div>}
        <div className="import-preview-summary">
          <div><span>Novos produtos</span><strong>{preview.creates.length}</strong></div>
          <div><span>Atualizações</span><strong>{preview.updates.length}</strong></div>
          <div><span>Erros</span><strong>{preview.errors.length}</strong></div>
        </div>
        {preview.creates.length > 0 && <section className="import-preview-group" aria-labelledby="import-new-title"><h4 id="import-new-title">Novos produtos</h4><ul>{preview.creates.map(({ line, data }) => <li key={line}><b>Linha {line}</b><span>{data.brand} {data.model}</span></li>)}</ul></section>}
        {preview.updates.length > 0 && <section className="import-preview-group" aria-labelledby="import-updates-title"><h4 id="import-updates-title">Atualizações de produtos existentes</h4><ul>{preview.updates.map(({ line, id, data }) => { const current = products.find((product) => product.id === id); return <li key={line}><b>Linha {line} · ID {id}</b><span>{current ? `${current.brand} ${current.model}` : "Produto existente"}</span><small>{describeChanges(data as Record<string, unknown>)}</small></li>; })}</ul></section>}
        <p className="import-preview-hint">Confira as linhas acima. Se houver qualquer erro, corrija a planilha e selecione-a novamente; o lote inteiro será validado antes de uma gravação atômica.</p>
        <div className="import-preview-actions"><button type="button" className="admin-secondary" onClick={() => { setPreview(null); setFileName(""); setMessage(""); }} disabled={isSaving}>Cancelar prévia</button><button type="button" className="admin-primary" onClick={() => void confirmImport()} disabled={isReading || isSaving || preview.errors.length > 0 || preview.items.length === 0}>{isSaving ? <Loader2 className="spin" size={15} aria-hidden="true" /> : <ShieldCheck size={15} aria-hidden="true" />}{isSaving ? "Gravando lote..." : `Gravar ${total} ${total === 1 ? "alteração" : "alterações"}`}</button></div>
      </div>}
    </section>
  );
}
