import { useMemo, useState } from "react";
import { FileText, Printer, X } from "lucide-react";

type WarrantyProduct = {
  brand: string;
  model: string;
  category: string;
  serial: string;
  soldAt?: Date | string | null;
};

type ContractProps = { product: WarrantyProduct; onClose: () => void; onPrinted?: (data: { customerName: string; saleDate: string; serial: string }) => void };

const HEADER_ART = "/manus-storage/image2_1eba8e72.png";
const FOOTER_ART = "/manus-storage/image3_188ef640.png";

function today() {
  return new Date().toISOString().slice(0, 10);
}

function inputDateFromSale(value?: Date | string | null) {
  const date = value ? new Date(value) : new Date();
  return Number.isNaN(date.getTime()) ? today() : date.toISOString().slice(0, 10);
}

function formatDate(value: string) {
  if (!value) return "____/____/________";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function escapeHtml(value: string) {
  return value.replace(/[&<>\"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;" })[character] ?? character);
}

const WARRANTY_CONDITIONS = [
  "Notebook: Garantia de 12 (doze) meses para defeitos de hardware decorrentes do uso normal.",
  "Carregador e bateria: Garantia de 90 (noventa) dias.",
];
const INVALIDATION_ITEMS = [
  "Rompimento, remoção ou violação do lacre de garantia;",
  "Ausência deste Certificado de Garantia e recibo de compra;",
  "Abertura ou manutenção do equipamento por terceiros não autorizados;",
  "Mau uso, quedas, impactos, líquidos, oxidação, incêndio, surtos elétricos ou qualquer dano causado pelo usuário;",
  "Alterações físicas ou elétricas no equipamento;",
];
const EXCLUDED_ITEMS = [
  "Bateria e carregador após o prazo de 90 dias;",
  "Danos estéticos, riscos, trincas, quebras ou desgaste natural do equipamento;",
  "Perda de arquivos, programas ou configurações;",
  "Problemas causados por vírus, softwares, formatação ou instalação de sistemas;",
  "Limpeza, manutenção preventiva ou atualização de software.",
];
const NOTES = [
  "O lacre de garantia deve permanecer íntegro durante todo o período de cobertura.",
  "Recomenda-se manter cópia de segurança (backup) dos arquivos. A C7 Tecnologia não se responsabiliza por perda de dados durante procedimentos técnicos.",
  "Este certificado é válido somente quando apresentado juntamente com a Nota Fiscal de compra.",
];

function BulletList({ items }: { items: string[] }) {
  return <ul className="official-bullets">{items.map((item) => <li key={item}>{item}</li>)}</ul>;
}

function OfficialPage({ children, pageClass = "" }: { children: React.ReactNode; pageClass?: string }) {
  return <section className={`official-contract-page ${pageClass}`}><img className="official-contract-header" src={HEADER_ART} alt="C7 Chipset Tecnologia" /><div className="official-contract-content">{children}</div><img className="official-contract-footer" src={FOOTER_ART} alt="Informações de contato da C7 Chipset Tecnologia" /></section>;
}

export default function WarrantyContract({ product, onClose, onPrinted }: ContractProps) {
  const [buyerName, setBuyerName] = useState("");
  const [saleDate, setSaleDate] = useState(() => inputDateFromSale(product.soldAt));
  const [serial, setSerial] = useState(product.serial && product.serial !== "—" ? product.serial : "");
  const itemName = `${product.brand} ${product.model}`;
  const date = formatDate(saleDate);
  const contractData = useMemo(() => ({ buyer: buyerName || "____________________________________________", date, serial: serial || "____________________________________________", item: itemName }), [buyerName, date, serial, itemName]);

  function printContract() {
    if (buyerName.trim().length < 3) {
      window.alert("Informe o nome completo do cliente antes de imprimir o termo.");
      return;
    }
    if (!saleDate) {
      window.alert("Informe a data da compra antes de imprimir o termo.");
      return;
    }
    // Keep the print window scriptable: some browsers leave an empty tab when
    // noopener/noreferrer is combined with document.write on an about:blank page.
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      window.alert("Não foi possível abrir a janela de impressão. Permita pop-ups para este painel e tente novamente.");
      return;
    }
    const conditions = WARRANTY_CONDITIONS.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const invalidation = INVALIDATION_ITEMS.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const excluded = EXCLUDED_ITEMS.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const notes = NOTES.map((item) => `<li>${escapeHtml(item)}</li>`).join("");
    const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Certificado de Garantia – Notebook Usado</title><style>
      @page{size:A4;margin:0}*{box-sizing:border-box}html,body{margin:0;padding:0;background:#fff;color:#111;font-family:Arial,Helvetica,sans-serif;font-size:11.5pt;line-height:1.38}.page{position:relative;width:210mm;height:297mm;page-break-after:always;overflow:hidden;padding:37mm 29mm 36mm}.page:last-child{page-break-after:auto}.header{position:absolute;top:0;left:0;width:100%;height:auto}.footer{position:absolute;right:0;bottom:0;width:100%;height:auto}.content{position:relative;z-index:1}.title{text-align:center;margin:1mm 0 14mm;font-size:14pt;font-weight:700}.field{margin:0 0 10px}.section-title{margin:14px 0 8px;font-size:11.5pt;font-weight:400;text-transform:uppercase}.bullet{margin:0 0 8px 20px;padding-left:12px}.bullet li{padding-left:3px;margin:0 0 9px}.body{margin:6px 0 16px}.obs{text-align:center;font-weight:700;margin:20mm 0 17mm;font-size:12pt}.declaration{margin-top:30mm}.signatures{display:grid;grid-template-columns:1fr;gap:27mm;margin-top:17mm}.signature{width:70mm;border-top:1px solid #111;padding-top:4px}.page-two .content{padding-top:0}.page-two .bullet{margin-bottom:12px}@media print{body{-webkit-print-color-adjust:exact;print-color-adjust:exact}}@media screen{body{background:#e8eef1}.page{margin:10mm auto;background:#fff;box-shadow:0 2px 18px #7891a044}}
    </style></head><body>
      <section class="page"><img class="header" src="${HEADER_ART}" alt=""><div class="content"><h1 class="title">CERTIFICADO DE GARANTIA – NOTEBOOK USADO</h1><p class="field">Data da Compra: ${escapeHtml(contractData.date)}</p><p class="field">Cliente: ${escapeHtml(contractData.buyer)}</p><p class="field">Marca/Modelo: ${escapeHtml(contractData.item)}</p><p class="field">Nº de Série: ${escapeHtml(contractData.serial)}</p><h2 class="section-title">CONDIÇÕES DA GARANTIA</h2><ul class="bullet">${conditions}</ul><p class="body">A garantia será prestada mediante análise técnica da C7 Tecnologia, que poderá realizar o reparo ou a substituição da peça defeituosa, conforme viabilidade técnica.</p><h2 class="section-title">A GARANTIA PERDERÁ A VALIDADE EM CASO DE:</h2><ul class="bullet">${invalidation}</ul><h2 class="section-title">A GARANTIA NÃO COBRE:</h2><ul class="bullet">${excluded.slice(0, excluded.lastIndexOf("<li>"))}</ul></div><img class="footer" src="${FOOTER_ART}" alt=""></section>
      <section class="page page-two"><img class="header" src="${HEADER_ART}" alt=""><div class="content"><ul class="bullet">${excluded.slice(excluded.lastIndexOf("<li>"))}</ul><h2 class="obs">OBSERVAÇÕES</h2><ul class="bullet">${notes}</ul><p class="declaration">Declaro ter recebido o equipamento em perfeito estado de funcionamento e estar ciente das condições desta garantia.</p><div class="signatures"><div class="signature">Assinatura do Cliente</div><div class="signature">C7 Tecnologia</div></div></div><img class="footer" src="${FOOTER_ART}" alt=""></section>
    </body></html>`;
    let hasPrinted = false;
    const printWhenReady = () => {
      if (hasPrinted || printWindow.closed) return;
      hasPrinted = true;
      // The warranty countdown is registered only after the valid term has
      // opened successfully for printing. The signed scan remains optional
      // and can be attached later in the warranty control area.
      onPrinted?.({ customerName: buyerName.trim(), saleDate, serial: serial.trim() });
      printWindow.focus();
      window.setTimeout(() => printWindow.print(), 250);
    };
    printWindow.addEventListener("load", printWhenReady, { once: true });
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    // Fallback for browsers that do not dispatch load after document.write.
    window.setTimeout(printWhenReady, 900);
  }

  return <div className="confirm-modal-backdrop warranty-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}><div className="warranty-modal official-warranty-modal" role="dialog" aria-modal="true" aria-labelledby="warranty-title"><button className="close-button" onClick={onClose} aria-label="Fechar gerador de garantia"><X size={18} /></button><div className="warranty-heading"><div><span className="admin-kicker">/ modelo oficial enviado pela C7</span><h2 id="warranty-title">Certificado de garantia</h2><p>O conteúdo abaixo é fixo e reproduz o documento oficial. Apenas os dados da venda são preenchidos pelo painel.</p></div><FileText size={28} className="panel-icon" /></div><div className="official-fields"><label className="admin-field"><span>Nome do cliente</span><input value={buyerName} onChange={(event) => setBuyerName(event.target.value)} placeholder="Nome completo" /></label><div className="warranty-form-grid"><label className="admin-field"><span>Data da compra</span><input type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} /></label><label className="admin-field"><span>Número de série</span><input value={serial} onChange={(event) => setSerial(event.target.value)} placeholder="Preencher se necessário" /></label></div></div><div className="official-document-preview"><OfficialPage><h3>CERTIFICADO DE GARANTIA – NOTEBOOK USADO</h3><p>Data da Compra: {contractData.date}</p><p>Cliente: {contractData.buyer}</p><p>Marca/Modelo: {contractData.item}</p><p>Nº de Série: {contractData.serial}</p><h4>CONDIÇÕES DA GARANTIA</h4><BulletList items={WARRANTY_CONDITIONS} /><p>A garantia será prestada mediante análise técnica da C7 Tecnologia, que poderá realizar o reparo ou a substituição da peça defeituosa, conforme viabilidade técnica.</p><h4>A GARANTIA PERDERÁ A VALIDADE EM CASO DE:</h4><BulletList items={INVALIDATION_ITEMS} /><h4>A GARANTIA NÃO COBRE:</h4><BulletList items={EXCLUDED_ITEMS.slice(0, 3)} /></OfficialPage><OfficialPage pageClass="official-page-two"><BulletList items={EXCLUDED_ITEMS.slice(3)} /><h5>OBSERVAÇÕES</h5><BulletList items={NOTES} /><p className="official-declaration">Declaro ter recebido o equipamento em perfeito estado de funcionamento e estar ciente das condições desta garantia.</p><div className="official-signatures"><span>Assinatura do Cliente</span><span>C7 Tecnologia</span></div></OfficialPage></div><div className="warranty-actions"><button className="admin-secondary" onClick={onClose}>Fechar</button><button className="admin-primary" onClick={printContract}><Printer size={15} /> Imprimir / salvar PDF oficial</button></div></div></div>;
}
