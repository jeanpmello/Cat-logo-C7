import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Check, Download, ImageDown, Instagram, Loader2, Maximize2, Move, RotateCcw, Share2, X } from "lucide-react";
import { formatInstallment10x } from "@shared/productData";

export type CardProduct = { id: number; brand: string; model: string; category: string; processor: string; ram: string; storage: string; screen: string; condition: string; cosmeticCondition?: string | null; price: string; promoPrice?: string | null; imageUrl?: string | null; gallery?: string[]; status?: string };
type Format = "whatsapp" | "square" | "story";
type Theme = "classic" | "light" | "offer";
type Options = { format: Format; theme: Theme; headline: string; showProcessor: boolean; showSpecs: boolean; showCondition: boolean; showPrice: boolean; showContact: boolean; imageMode: "primary" | "gallery"; gallerySelections: Record<number, string[]>; imageFit: "contain" | "cover"; imageZoom: number; imageOffsetX: number; imageOffsetY: number };
const FORMATS = { whatsapp: { width: 1080, height: 1350, label: "WhatsApp 4:5" }, square: { width: 1080, height: 1080, label: "Instagram 1:1" }, story: { width: 1080, height: 1920, label: "Stories 9:16" } } as const;
const THEMES = { classic: { top: "#061b31", bottom: "#087fb2", accent: "#26baff", paper: "#ffffff", text: "#08233b", soft: "#567083" }, light: { top: "#dff5ff", bottom: "#80d9ff", accent: "#0879ad", paper: "#ffffff", text: "#08233b", soft: "#567083" }, offer: { top: "#3b0b20", bottom: "#d63b67", accent: "#ffcc58", paper: "#fff9f2", text: "#30101c", soft: "#775460" } } as const;
type ThemeColors = { top: string; bottom: string; accent: string; paper: string; text: string; soft: string };
function loadUrl(url: string) { return new Promise<HTMLImageElement>((resolve, reject) => { const image = new Image(); image.crossOrigin = "anonymous"; image.onload = () => resolve(image); image.onerror = reject; image.src = url; }); }
function getPhotoUrls(product: CardProduct) { return [product.imageUrl, ...(product.gallery ?? [])].filter((url, index, all) => Boolean(url) && all.indexOf(url) === index).filter((url): url is string => Boolean(url)).slice(0, 6); }
const WATERMARK_LOGO = "/manus-storage/c7-logo_ae3d1307.png";
async function drawWatermark(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number) { try { const logo = await loadUrl(WATERMARK_LOGO); const markHeight = Math.min(34, height * .16); const markWidth = markHeight * (logo.width / logo.height); const pad = Math.max(10, Math.min(width, height) * .055); ctx.save(); ctx.globalAlpha = .58; ctx.fillStyle = "rgba(3, 24, 39, .62)"; roundedRect(ctx, x + width - markWidth - pad * 2, y + height - markHeight - pad, markWidth + pad * 2, markHeight + pad / 2, 8); ctx.fill(); ctx.globalAlpha = .86; ctx.drawImage(logo, x + width - markWidth - pad, y + height - markHeight - pad / 2, markWidth, markHeight); ctx.restore(); } catch { ctx.save(); ctx.globalAlpha = .58; ctx.fillStyle = "rgba(3, 24, 39, .7)"; ctx.font = "700 12px Arial"; ctx.fillText("C7 STORE", x + width - 82, y + height - 14); ctx.restore(); } }
function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) { ctx.beginPath(); ctx.roundRect(x, y, width, height, radius); ctx.closePath(); }
function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, initial: number, min = 18) { let size = initial; while (size > min) { ctx.font = `800 ${size}px Arial`; if (ctx.measureText(text).width <= maxWidth) break; size -= 2; } return size; }
function wrapText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number) { const words = text.trim().split(/\s+/).filter(Boolean); const lines: string[] = []; let line = ""; for (const word of words) { const candidate = line ? `${line} ${word}` : word; if (line && ctx.measureText(candidate).width > maxWidth) { lines.push(line); line = word; } else line = candidate; } if (line) lines.push(line); return lines; }
function drawWrappedText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number, maxLines = 3) { const lines = wrapText(ctx, text, maxWidth); lines.slice(0, maxLines).forEach((line, index) => ctx.fillText(line, x, y + index * lineHeight)); return y + Math.min(lines.length, maxLines) * lineHeight; }

async function drawImage(ctx: CanvasRenderingContext2D, product: CardProduct, x: number, y: number, width: number, height: number, options: Options, colors: ThemeColors, sourceUrl?: string | null) {
  roundedRect(ctx, x, y, width, height, 18); ctx.fillStyle = "#eaf3f7"; ctx.fill();
  const url = sourceUrl ?? product.imageUrl;
  if (!url) { ctx.fillStyle = colors.accent; ctx.font = "800 64px Arial"; ctx.textAlign = "center"; ctx.fillText("C7", x + width / 2, y + height / 2 + 22); ctx.textAlign = "left"; return; }
  try { const image = await loadUrl(url); ctx.save(); roundedRect(ctx, x, y, width, height, 18); ctx.clip(); const scale = (options.imageFit === "cover" ? Math.max(width / image.width, height / image.height) : Math.min(width / image.width, height / image.height)) * options.imageZoom; const drawWidth = image.width * scale; const drawHeight = image.height * scale; const centerX = x + width / 2 + options.imageOffsetX * width / 100; const centerY = y + height / 2 + options.imageOffsetY * height / 100; ctx.drawImage(image, centerX - drawWidth / 2, centerY - drawHeight / 2, drawWidth, drawHeight); ctx.restore(); } catch { /* placeholder remains */ }
}
async function drawGallery(ctx: CanvasRenderingContext2D, product: CardProduct, x: number, y: number, width: number, height: number, options: Options, colors: ThemeColors) {
  const allUrls = getPhotoUrls(product); const selectedUrls = options.gallerySelections[product.id]; const urls = (selectedUrls?.length ? allUrls.filter((url) => selectedUrls.includes(url)) : allUrls);
  if (urls.length <= 1) { await drawImage(ctx, product, x, y, width, height, options, colors); return; }
  const columns = urls.length === 2 ? 2 : 3; const rows = Math.ceil(urls.length / columns); const gap = Math.max(5, Math.round(width * .012)); const tileWidth = (width - gap * (columns - 1)) / columns; const tileHeight = (height - gap * (rows - 1)) / rows;
  for (let index = 0; index < urls.length; index += 1) { const col = index % columns; const row = Math.floor(index / columns); await drawImage(ctx, product, x + col * (tileWidth + gap), y + row * (tileHeight + gap), tileWidth, tileHeight, options, colors, urls[index]); }
}
async function drawProductVisual(ctx: CanvasRenderingContext2D, product: CardProduct, x: number, y: number, width: number, height: number, options: Options, colors: ThemeColors) {
  if (options.imageMode === "gallery") await drawGallery(ctx, product, x, y, width, height, options, colors);
  else await drawImage(ctx, product, x, y, width, height, options, colors);
}

async function renderCard(canvas: HTMLCanvasElement, products: CardProduct[], options: Options) {
  const { width, height } = FORMATS[options.format]; canvas.width = width; canvas.height = height; const ctx = canvas.getContext("2d"); if (!ctx) return;
  const colors = THEMES[options.theme]; const margin = 54; const headerHeight = options.format === "story" ? 245 : 190; const multi = products.length > 1;
  const gradient = ctx.createLinearGradient(0, 0, width, height); gradient.addColorStop(0, colors.top); gradient.addColorStop(1, colors.bottom); ctx.fillStyle = gradient; ctx.fillRect(0, 0, width, height);
  roundedRect(ctx, margin, margin, width - margin * 2, height - margin * 2, 28); ctx.fillStyle = colors.paper; ctx.fill();
  ctx.save(); roundedRect(ctx, margin, margin, width - margin * 2, headerHeight, 28); ctx.clip(); ctx.fillStyle = colors.top; ctx.fillRect(margin, margin, width - margin * 2, headerHeight); ctx.restore();
  ctx.fillStyle = colors.accent; ctx.font = "800 42px Arial"; ctx.fillText("C7 STORE", margin + 42, margin + 82); ctx.font = "700 20px Arial"; ctx.fillText((multi ? "COMPARE NOSSAS OPCOES" : options.headline).toUpperCase().slice(0, 52), margin + 42, margin + 132); ctx.fillStyle = colors.paper; ctx.font = "800 18px Arial"; ctx.fillText("1 ANO DE GARANTIA", margin + 42, margin + 170);
  const contentX = margin + 42; const contentWidth = width - (margin + 42) * 2; const imageTop = margin + headerHeight + 34;
  if (multi) {
    const threeWide = products.length >= 2 && options.format === "whatsapp";
    const squareGrid = products.length >= 2 && options.format === "square";
    const gap = 16;
    const columns = options.format === "story" || threeWide ? 1 : squareGrid ? Math.min(2, products.length) : products.length;
    const tileWidth = threeWide ? contentWidth : (contentWidth - gap * (columns - 1)) / columns;
    const tileHeight = options.format === "story" ? 270 : threeWide ? (products.length === 3 ? 300 : 330) : squareGrid ? (products.length === 3 ? 305 : 330) : 390;
    for (let index = 0; index < products.length; index += 1) {
      const product = products[index]!;
      const column = options.format === "story" || threeWide ? 0 : squareGrid ? index % columns : index;
      const row = options.format === "story" || threeWide ? index : squareGrid ? Math.floor(index / columns) : 0;
      const x = contentX + column * (tileWidth + gap);
      const y = imageTop + row * (tileHeight + gap);
      const imageWidth = threeWide ? 380 : squareGrid ? tileWidth : 285;
      const squareImageHeight = squareGrid && options.imageMode === "gallery" ? Math.round(tileHeight * .52) : tileHeight;
      if (threeWide || squareGrid) { roundedRect(ctx, x, y, tileWidth, tileHeight, 16); ctx.fillStyle = index % 2 === 0 ? "#f5fbfd" : "#edf7fa"; ctx.fill(); await drawProductVisual(ctx, product, x, y, imageWidth, squareGrid ? squareImageHeight : tileHeight, options, colors); await drawWatermark(ctx, x, y, imageWidth, squareGrid ? squareImageHeight : tileHeight); }
      if (!threeWide && !squareGrid) { await drawProductVisual(ctx, product, x, y, tileWidth, tileHeight, options, colors); await drawWatermark(ctx, x, y, tileWidth, tileHeight); }
      const textX = threeWide ? x + imageWidth + 28 : squareGrid ? x + 24 : x;
      const textWidth = threeWide ? tileWidth - imageWidth - 42 : squareGrid ? tileWidth - 48 : tileWidth;
      const textY = threeWide ? y + 42 : squareGrid ? (options.imageMode === "gallery" ? y + squareImageHeight + 18 : y + tileHeight - 82) : y + tileHeight + 34;
      ctx.fillStyle = colors.accent; ctx.font = "800 " + (threeWide ? 20 : options.format === "story" ? 18 : 15) + "px Arial"; ctx.fillText((index + 1) + ". " + product.brand, textX, textY);
      ctx.fillStyle = colors.text; ctx.font = "800 " + fitText(ctx, product.model, textWidth, threeWide ? 27 : options.format === "story" ? 30 : 24) + "px Arial"; ctx.fillText(product.model.slice(0, threeWide ? 20 : 26), textX, textY + (squareGrid && options.imageMode === "gallery" ? 26 : 32));
      if (options.showProcessor) { ctx.fillStyle = colors.soft; ctx.font = threeWide ? "17px Arial" : "16px Arial"; ctx.fillText(product.processor.slice(0, threeWide ? 30 : squareGrid ? 18 : 28), textX, textY + (squareGrid ? (options.imageMode === "gallery" ? 48 : 24) : 62)); }
      if (options.showSpecs) { ctx.fillStyle = colors.soft; ctx.font = threeWide ? "17px Arial" : "16px Arial"; ctx.fillText([product.ram, product.storage].filter(Boolean).join(" · ").slice(0, threeWide ? 30 : squareGrid ? 18 : 28), textX, textY + (squareGrid ? (options.imageMode === "gallery" ? 68 : 45) : 88)); }
      if (options.showCondition && (threeWide || squareGrid)) { ctx.fillStyle = colors.soft; ctx.font = "14px Arial"; ctx.fillText((product.cosmeticCondition || product.condition).slice(0, squareGrid ? 18 : 24), textX, textY + (squareGrid ? (options.imageMode === "gallery" ? 88 : 66) : 114)); }
      if (options.showPrice) { const totalPrice = product.promoPrice || product.price; const installment = formatInstallment10x(totalPrice) || totalPrice; const priceY = textY + (threeWide ? 164 : squareGrid ? (options.imageMode === "gallery" ? 110 : 90) : 91); ctx.fillStyle = colors.accent; ctx.font = threeWide ? `800 ${fitText(ctx, installment, textWidth, 27, 15)}px Arial` : squareGrid ? `800 ${fitText(ctx, installment, textWidth, 18, 11)}px Arial` : `800 ${fitText(ctx, installment, textWidth, 24, 14)}px Arial`; ctx.fillText(installment, textX, priceY); }
    }
    const footerY = height - margin - (options.showContact ? 38 : 12);
    ctx.fillStyle = colors.text; ctx.font = "800 20px Arial"; ctx.fillText("Escolha o seu próximo computador", contentX, footerY);
    if (options.showContact) { ctx.font = "700 17px Arial"; ctx.fillText("WhatsApp (51) 3055-3090  ·  @c7tec_store", contentX, Math.min(height - margin - 24, footerY + 33)); }
  } else {
    const product = products[0]!;
    // Keep the photo in a calmer 4:3 frame and reserve enough vertical space for every commercial line.
    const imageHeight = options.format === "story" ? 690 : options.format === "square" ? 410 : 520;
    await drawProductVisual(ctx, product, contentX, imageTop, contentWidth, imageHeight, options, colors);
    await drawWatermark(ctx, contentX, imageTop, contentWidth, imageHeight);
    let y = imageTop + imageHeight + 42;
    ctx.fillStyle = colors.accent;
    ctx.font = "700 22px Arial";
    ctx.fillText(`${product.category.toUpperCase()} · ${product.brand.toUpperCase()}`.slice(0, 55), contentX, y);
    y += 52;
    ctx.fillStyle = colors.text;
    ctx.font = `800 ${fitText(ctx, product.model, contentWidth, options.format === "story" ? 58 : 52, 24)}px Arial`;
    y = drawWrappedText(ctx, product.model, contentX, y, contentWidth, options.format === "story" ? 62 : 56, 2);
    y += 12;
    ctx.fillStyle = colors.soft;
    ctx.font = "24px Arial";
    if (options.showProcessor && product.processor) { y = drawWrappedText(ctx, product.processor, contentX, y, contentWidth, 32, 2); y += 5; }
    if (options.showSpecs) { const specs = [product.ram, product.storage, product.screen].filter(Boolean).join(" · "); if (specs) { y = drawWrappedText(ctx, specs, contentX, y, contentWidth, 32, 2); y += 5; } }
    if (options.showCondition && (product.cosmeticCondition || product.condition)) { y = drawWrappedText(ctx, product.cosmeticCondition || product.condition, contentX, y, contentWidth, 32, 2); y += 5; }
    if (options.showPrice) {
      const totalPrice = product.promoPrice || product.price;
      const installment = formatInstallment10x(totalPrice);
      if (installment) {
        ctx.fillStyle = colors.accent;
        ctx.font = `800 ${fitText(ctx, installment, contentWidth, options.format === "story" ? 46 : 38, 18)}px Arial`;
        y = drawWrappedText(ctx, installment, contentX, y + 12, contentWidth, 44, 2);
        ctx.fillStyle = colors.soft;
        ctx.font = "18px Arial";
        ctx.fillText(`À vista: ${totalPrice}`, contentX, y + 2);
        y += 32;
      } else {
        ctx.fillStyle = colors.accent;
        ctx.font = `800 ${fitText(ctx, totalPrice, contentWidth, options.format === "story" ? 46 : 38, 18)}px Arial`;
        y = drawWrappedText(ctx, totalPrice, contentX, y + 12, contentWidth, 44, 2);
        y += 18;
      }
    }
    if (options.showContact) {
      const contactY = Math.min(height - margin - 28, Math.max(y + 15, height - margin - 72));
      ctx.fillStyle = colors.text;
      ctx.font = "700 21px Arial";
      drawWrappedText(ctx, "WhatsApp (51) 3055-3090  ·  @c7tec_store", contentX, contactY, contentWidth, 27, 2);
    }
  }
}
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

export default function CardDesigner({ product, availableProducts, onClose }: { product: CardProduct; availableProducts: CardProduct[]; onClose: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null); const dragRef = useRef<{ pointerId: number; x: number; y: number; offsetX: number; offsetY: number } | null>(null);
  const [selectedIds, setSelectedIds] = useState<number[]>([product.id]); const [activeTemplate, setActiveTemplate] = useState<"single" | "gallery" | "comparison" | "story">("single"); const [options, setOptions] = useState<Options>({ format: "whatsapp", theme: "classic", headline: "Seminovo revisado", showProcessor: true, showSpecs: true, showCondition: true, showPrice: true, showContact: true, imageMode: "primary", gallerySelections: { [product.id]: getPhotoUrls(product) }, imageFit: "contain", imageZoom: 1, imageOffsetX: 0, imageOffsetY: 0 }); const [rendering, setRendering] = useState(false);
  const selectedProducts = selectedIds.map((id) => availableProducts.find((item) => item.id === id)).filter(Boolean) as CardProduct[]; const dimensions = FORMATS[options.format]; const update = <K extends keyof Options>(key: K, value: Options[K]) => setOptions((current) => ({ ...current, [key]: value })); const renderKey = useMemo(() => JSON.stringify({ options, selectedIds }), [options, selectedIds]);
  useEffect(() => { if (!canvasRef.current || selectedProducts.length === 0) return; setRendering(true); renderCard(canvasRef.current, selectedProducts, options).finally(() => setRendering(false)); }, [renderKey, availableProducts]);
  function toggleProduct(id: number) { setSelectedIds((current) => current.includes(id) ? (current.length > 1 ? current.filter((item) => item !== id) : current) : current.length < 3 ? [...current, id] : current); }
  function applyTemplate(template: "single" | "gallery" | "comparison" | "story") {
    setActiveTemplate(template);
    setOptions((current) => ({ ...current, format: template === "comparison" ? "square" : template === "story" ? "story" : "whatsapp", theme: template === "comparison" ? "light" : template === "story" ? "classic" : template === "gallery" ? "classic" : "classic", headline: template === "comparison" ? "Compare e escolha melhor" : template === "story" ? "Oferta C7 Store" : template === "gallery" ? "Veja todos os detalhes" : "Seminovo revisado", imageMode: template === "gallery" ? "gallery" : "primary", showPrice: true, showSpecs: true, showProcessor: template !== "comparison", showCondition: true, showContact: true }));
  }
  function toggleGalleryPhoto(productId: number, url: string) { setOptions((current) => { const product = availableProducts.find((item) => item.id === productId); const allUrls = [product?.imageUrl, ...(product?.gallery ?? [])].filter((item, index, all): item is string => Boolean(item) && all.indexOf(item) === index).slice(0, 6); const selected = current.gallerySelections[productId] ?? allUrls; if (selected.length <= 1 && selected.includes(url)) return current; const next = selected.includes(url) ? selected.filter((item) => item !== url) : [...selected, url]; return { ...current, gallerySelections: { ...current.gallerySelections, [productId]: next } }; }); }
  async function createBlob() { const canvas = canvasRef.current; if (!canvas) return null; await renderCard(canvas, selectedProducts, options); return new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png")); }
  async function download() { const blob = await createBlob(); if (!blob) return; const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = `c7-${options.format}-${selectedProducts.length}-computadores.png`; link.click(); URL.revokeObjectURL(link.href); }
  async function share() { const blob = await createBlob(); if (!blob) return; const file = new File([blob], `c7-${selectedProducts.length}-computadores.png`, { type: "image/png" }); if (navigator.canShare?.({ files: [file] })) await navigator.share({ files: [file], title: `Opções C7 Store · ${selectedProducts.length} computadores` }); else await download(); }
  function renderPhotoPicker() {
    if (options.imageMode !== "gallery") return <small className="card-selection-help">Escolha “Todas as fotos” acima para selecionar as imagens individualmente.</small>;
    return selectedProducts.map((item) => {
      const urls = getPhotoUrls(item);
      const selected = options.gallerySelections[item.id] ?? urls;
      return (
        <div className="card-product-photo-picker" key={item.id}>
          <strong>{item.brand} {item.model}</strong>
          <div className="card-photo-picker-grid">
            {urls.map((url, index) => (
              <label key={url} className={selected.includes(url) ? "selected" : ""}>
                <img src={url} alt={`Foto ${index + 1} de ${item.brand} ${item.model}`} />
                <input type="checkbox" checked={selected.includes(url)} onChange={() => toggleGalleryPhoto(item.id, url)} />
                <span>{index === 0 ? "Capa" : `Foto ${index + 1}`}</span>
              </label>
            ))}
          </div>
        </div>
      );
    });
  }
  function resetPhoto() { setOptions((current) => ({ ...current, imageFit: "contain", imageZoom: 1, imageOffsetX: 0, imageOffsetY: 0 })); }
  function startDrag(event: ReactPointerEvent<HTMLCanvasElement>) { event.currentTarget.setPointerCapture(event.pointerId); dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, offsetX: options.imageOffsetX, offsetY: options.imageOffsetY }; }
  function moveDrag(event: ReactPointerEvent<HTMLCanvasElement>) { const drag = dragRef.current; if (!drag || drag.pointerId !== event.pointerId) return; const rect = event.currentTarget.getBoundingClientRect(); update("imageOffsetX", clamp(drag.offsetX + ((event.clientX - drag.x) / rect.width) * 100, -100, 100)); update("imageOffsetY", clamp(drag.offsetY + ((event.clientY - drag.y) / rect.height) * 100, -100, 100)); }
  function stopDrag(event: ReactPointerEvent<HTMLCanvasElement>) { if (dragRef.current?.pointerId === event.pointerId) dragRef.current = null; }
  return <div className="confirm-modal-backdrop card-designer-backdrop" role="presentation"><div className="card-designer-modal" role="dialog" aria-modal="true" aria-labelledby="card-designer-title"><button className="close-button" onClick={onClose} aria-label="Fechar criador de card"><X size={18} /></button><div className="card-designer-heading"><div><span className="admin-kicker">/ divulgação personalizada</span><h2 id="card-designer-title">Crie um card com até 3 computadores.</h2><p>Selecione os equipamentos, escolha o formato e baixe uma arte pronta para WhatsApp, Instagram ou Stories.</p></div><span>{dimensions.width} × {dimensions.height}px</span></div><div className="card-designer-layout"><div className="card-preview-stage"><div className="card-preview-help"><Move size={13} /> Ajuste opcional: arraste para enquadrar as fotos</div>{rendering && <div className="card-rendering"><Loader2 className="spin" size={24} /></div>}<canvas ref={canvasRef} onPointerDown={startDrag} onPointerMove={moveDrag} onPointerUp={stopDrag} onPointerCancel={stopDrag} aria-label="Prévia do card com produtos selecionados" /></div><div className="card-options"><fieldset><legend>Computadores no card ({selectedProducts.length}/3)</legend><div className="multi-product-list">{availableProducts.filter((item) => item.status === "available").map((item) => <label key={item.id} className={selectedIds.includes(item.id) ? "selected" : ""}><input type="checkbox" checked={selectedIds.includes(item.id)} onChange={() => toggleProduct(item.id)} disabled={!selectedIds.includes(item.id) && selectedIds.length >= 3} /><span><strong>{item.brand} {item.model}</strong><small>{item.ram} · {item.storage} · {item.promoPrice || item.price}</small></span><Check size={14} /></label>)}</div><small className="card-selection-help">Escolha de 1 a 3 itens. O primeiro selecionado fica em destaque.</small></fieldset><fieldset><legend>Comece por um modelo pronto</legend><p className="card-selection-help">Escolha um objetivo. O formato, a chamada e as informações principais serão ajustados automaticamente.</p><div className="card-option-grid card-template-grid"><button type="button" className={`card-template-button ${activeTemplate === "single" ? "active" : ""}`} onClick={() => applyTemplate("single")}><strong>Venda rápida</strong><small>1 foto · WhatsApp</small></button><button type="button" className={`card-template-button ${activeTemplate === "gallery" ? "active" : ""}`} onClick={() => applyTemplate("gallery")}><strong>Produto completo</strong><small>Galeria · WhatsApp</small></button><button type="button" className={`card-template-button ${activeTemplate === "comparison" ? "active" : ""}`} onClick={() => applyTemplate("comparison")}><strong>Comparativo</strong><small>Até 3 produtos</small></button><button type="button" className={`card-template-button ${activeTemplate === "story" ? "active" : ""}`} onClick={() => applyTemplate("story")}><strong>Story</strong><small>Instagram · 9:16</small></button></div></fieldset><fieldset><legend>Formato</legend><div className="card-option-grid format-grid">{(Object.keys(FORMATS) as Format[]).map((format) => <button type="button" key={format} className={options.format === format ? "active" : ""} onClick={() => update("format", format)}>{format === "story" ? <Instagram size={15} /> : <ImageDown size={15} />}{FORMATS[format].label}</button>)}</div></fieldset><fieldset><legend>Tema</legend><div className="theme-options">{(["classic", "light", "offer"] as Theme[]).map((theme) => <button type="button" key={theme} className={`${theme} ${options.theme === theme ? "active" : ""}`} onClick={() => update("theme", theme)}><span />{theme === "classic" ? "C7 Azul" : theme === "light" ? "Claro" : "Oferta"}</button>)}</div></fieldset><label className="card-headline"><span>Chamada do card</span><input value={options.headline} maxLength={52} onChange={(event) => update("headline", event.target.value)} /></label><fieldset><legend>Fotos no card</legend><div className="card-option-grid photo-mode-grid"><button type="button" className={options.imageMode === "primary" ? "active" : ""} onClick={() => update("imageMode", "primary")}>Somente foto principal</button><button type="button" className={options.imageMode === "gallery" ? "active" : ""} onClick={() => update("imageMode", "gallery")}>Todas as fotos</button></div><small className="card-selection-help">A opção “Todas as fotos” usa até 6 imagens da galeria de cada equipamento.</small></fieldset><fieldset className="card-gallery-selection"><legend>Fotos específicas do card</legend>{renderPhotoPicker()}</fieldset><fieldset><legend>Informações visíveis</legend><small className="card-selection-help">O preço aparece automaticamente em 10x sem juros quando houver valor cadastrado.</small><div className="card-checks">{([["showProcessor", "Processador"], ["showSpecs", "RAM, armazenamento e tela"], ["showCondition", "Estado de conservação"], ["showPrice", "Preço"], ["showContact", "Contato C7"]] as Array<[keyof Options, string]>).map(([key, label]) => <label key={key}><input type="checkbox" checked={Boolean(options[key])} onChange={(event) => update(key, event.target.checked as never)} /><Check size={13} /> {label}</label>)}</div></fieldset><fieldset><legend>Ajuste das fotos</legend><div className="card-option-grid"><button type="button" className={options.imageFit === "contain" ? "active" : ""} onClick={() => update("imageFit", "contain")}>Mostrar inteira</button><button type="button" className={options.imageFit === "cover" ? "active" : ""} onClick={() => update("imageFit", "cover")}>Preencher área</button></div><label className="card-range"><span>Zoom <b>{Math.round(options.imageZoom * 100)}%</b></span><input type="range" min="1" max="2" step="0.05" value={options.imageZoom} onChange={(event) => update("imageZoom", Number(event.target.value))} /></label><div className="card-photo-actions"><button type="button" className="admin-secondary" onClick={resetPhoto}><RotateCcw size={14} /> Ajuste automático</button><button type="button" className="admin-secondary" onClick={() => update("imageFit", options.imageFit === "contain" ? "cover" : "contain")}><Maximize2 size={14} /> Alternar quadro</button></div></fieldset></div></div><div className="card-designer-actions"><button type="button" className="admin-secondary" onClick={onClose}>Cancelar</button><button type="button" className="admin-secondary" onClick={() => void share()}><Share2 size={15} /> Compartilhar</button><button type="button" className="admin-primary" onClick={() => void download()}><Download size={15} /> Baixar PNG</button></div></div></div>;
}
