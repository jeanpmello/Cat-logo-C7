import { useEffect, useMemo, useRef, useState } from "react";
import { Crop, Loader2, RotateCw, Scan, X } from "lucide-react";

type PreparedImage = { filename: string; mimeType: "image/jpeg"; base64: string };
type FitMode = "contain" | "cover";

function loadImage(file: File) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => { URL.revokeObjectURL(url); resolve(image); };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Não foi possível abrir esta foto.")); };
    image.src = url;
  });
}

function drawFramedImage(canvas: HTMLCanvasElement, image: HTMLImageElement, options: { fit: FitMode; zoom: number; offsetX: number; offsetY: number; rotation: number }) {
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Não foi possível preparar a foto.");
  const { width, height } = canvas;
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#eef5f8";
  context.fillRect(0, 0, width, height);
  const rotated = options.rotation % 180 !== 0;
  const sourceWidth = rotated ? image.height : image.width;
  const sourceHeight = rotated ? image.width : image.height;
  const baseScale = options.fit === "cover" ? Math.max(width / sourceWidth, height / sourceHeight) : Math.min(width / sourceWidth, height / sourceHeight);
  const scale = baseScale * options.zoom;
  context.save();
  context.translate(width / 2 + options.offsetX * width / 200, height / 2 + options.offsetY * height / 200);
  context.rotate(options.rotation * Math.PI / 180);
  context.drawImage(image, -image.width * scale / 2, -image.height * scale / 2, image.width * scale, image.height * scale);
  context.restore();
}

export default function PhotoEditor({ file, queueLabel, onCancel, onConfirm }: { file: File; queueLabel?: string; onCancel: () => void; onConfirm: (image: PreparedImage) => Promise<void> }) {
  const previewRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [fit, setFit] = useState<FitMode>("contain");
  const [zoom, setZoom] = useState(1);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  const [rotation, setRotation] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => { let active = true; loadImage(file).then((loaded) => active && setImage(loaded)).catch((reason) => active && setError(reason.message)); return () => { active = false; }; }, [file]);
  const options = useMemo(() => ({ fit, zoom, offsetX, offsetY, rotation }), [fit, zoom, offsetX, offsetY, rotation]);
  useEffect(() => { if (image && previewRef.current) drawFramedImage(previewRef.current, image, options); }, [image, options]);

  function reset() { setZoom(1); setOffsetX(0); setOffsetY(0); setRotation(0); }
  async function confirm() {
    if (!image) return;
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      canvas.width = 1600; canvas.height = 1200;
      drawFramedImage(canvas, image, options);
      const base64 = canvas.toDataURL("image/jpeg", 0.88);
      await onConfirm({ filename: file.name.replace(/\.[^.]+$/, "") + "-c7.jpg", mimeType: "image/jpeg", base64 });
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível preparar a foto."); }
    finally { setSaving(false); }
  }

  return <div className="confirm-modal-backdrop photo-editor-backdrop" role="presentation"><div className="photo-editor-modal" role="dialog" aria-modal="true" aria-labelledby="photo-editor-title"><button className="close-button" onClick={onCancel} aria-label="Fechar editor"><X size={18} /></button><div><span className="admin-kicker">/ enquadramento da foto {queueLabel ? `· ${queueLabel}` : ""}</span><h2 id="photo-editor-title">Deixe o computador bem enquadrado.</h2><p>A área clara representa exatamente como a foto será salva e exibida no catálogo.</p></div><div className="photo-editor-layout"><div className="photo-editor-preview">{!image && !error && <Loader2 className="spin" size={28} />}<canvas ref={previewRef} width={800} height={600} aria-label="Prévia da foto enquadrada" /></div><div className="photo-editor-controls"><div className="photo-fit-tabs"><button className={fit === "contain" ? "active" : ""} onClick={() => setFit("contain")}><Scan size={15} /> Mostrar inteiro</button><button className={fit === "cover" ? "active" : ""} onClick={() => setFit("cover")}><Crop size={15} /> Preencher quadro</button></div><label><span>Zoom <b>{Math.round(zoom * 100)}%</b></span><input type="range" min="1" max="2.2" step="0.05" value={zoom} onChange={(event) => setZoom(Number(event.target.value))} /></label><label><span>Posição horizontal</span><input type="range" min="-100" max="100" value={offsetX} onChange={(event) => setOffsetX(Number(event.target.value))} /></label><label><span>Posição vertical</span><input type="range" min="-100" max="100" value={offsetY} onChange={(event) => setOffsetY(Number(event.target.value))} /></label><div className="photo-editor-buttons"><button className="admin-secondary" onClick={() => setRotation((value) => (value + 90) % 360)}><RotateCw size={15} /> Girar</button><button className="admin-secondary" onClick={reset}><Scan size={15} /> Centralizar</button></div><div className="photo-editor-tip"><strong>Melhor resultado</strong><span>Use “Mostrar inteiro” para notebooks. Ajuste o zoom até sobrar uma margem uniforme ao redor do equipamento.</span></div></div></div>{error && <div className="validation-banner error">{error}</div>}<div className="photo-editor-actions"><button className="admin-secondary" onClick={onCancel}>Cancelar</button><button className="admin-primary" disabled={!image || saving} onClick={() => void confirm()}>{saving ? <Loader2 className="spin" size={15} /> : <Crop size={15} />} {saving ? "Salvando foto..." : "Usar este enquadramento"}</button></div></div></div>;
}
