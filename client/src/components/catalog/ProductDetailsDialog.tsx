import type { RefObject } from "react";
import { MessageCircle } from "lucide-react";
import type { Product } from "@shared/types";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";

const WHATSAPP = "https://wa.me/555130553090";

function visible(value: unknown) {
  const text = String(value ?? "").trim();
  return (
    Boolean(text) &&
    ![
      "—",
      "-",
      "não informado",
      "não informada",
      "a confirmar",
      "não especificado",
    ].includes(text.toLowerCase())
  );
}

type ProductDetailsDialogProps = {
  product: Product | null;
  onOpenChange: (open: boolean) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  fallbackFocusRef: RefObject<HTMLElement | null>;
};

export default function ProductDetailsDialog({
  product,
  onOpenChange,
  returnFocusRef,
  fallbackFocusRef,
}: ProductDetailsDialogProps) {
  const open = Boolean(product);
  const { data } = trpc.products.detail.useQuery(
    { id: product?.id ?? 0 },
    { enabled: open && Boolean(product) }
  );
  const gallery = data?.images ?? [];
  const images = [
    product?.imageUrl
      ? { url: product.imageUrl, caption: "Foto principal" }
      : null,
    ...gallery,
  ].filter(Boolean) as Array<{ url: string; caption?: string | null }>;
  const details = product
    ? [
        ["Condição", product.condition],
        ["Estado físico", product.cosmeticCondition],
        ["Processador", product.processor],
        ["Geração", product.generation],
        ["Memória", [product.ram, product.ramType].filter(visible).join(" · ")],
        ["Armazenamento", product.storage],
        ["Placa de vídeo", product.gpu],
        ["Sistema", product.os],
        ["Tela", product.screen],
        ["Bateria", product.battery],
        ["Acessórios", product.accessories],
      ].filter(([, value]) => visible(value))
    : [];
  const productName = product
    ? `${product.brand} ${product.model}`
    : "Detalhes do produto";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="details-modal"
        showCloseButton={false}
        onCloseAutoFocus={event => {
          event.preventDefault();
          const target = returnFocusRef.current?.isConnected
            ? returnFocusRef.current
            : fallbackFocusRef.current;
          target?.focus();
        }}
      >
        {product && (
          <>
            <DialogClose
              className="close-button"
              aria-label="Fechar detalhes"
              type="button"
            >
              <span aria-hidden="true">×</span>
            </DialogClose>
            <DialogHeader className="details-dialog-header">
              <div className="modal-kicker">
                Ficha técnica C7 Store · seminovo revisado
              </div>
              <DialogTitle>{productName}</DialogTitle>
            </DialogHeader>
            <DialogDescription className="modal-intro">
              Equipamento seminovo revisado e pronto para encontrar um novo
              dono. Confira fotos, estado e configuração antes de chamar a
              equipe.
            </DialogDescription>
            {images.length > 0 && (
              <div className="modal-gallery">
                {images.map((image, index) => (
                  <img
                    key={`${image.url}-${index}`}
                    src={image.url}
                    alt={image.caption || `${product.model} foto ${index + 1}`}
                    loading="lazy"
                    decoding="async"
                  />
                ))}
              </div>
            )}
            <div className="modal-price">
              {product.promoPrice || product.price}
              {product.originalPrice && product.promoPrice && (
                <del>{product.originalPrice}</del>
              )}
            </div>
            <div className="details-grid">
              {details.map(([label, value]) => (
                <div className="detail-item" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </div>
            {product.notes && (
              <div className="modal-notes">
                <strong>Observações</strong>
                <p>{product.notes}</p>
              </div>
            )}
            <div className="modal-actions">
              <a
                className="primary-button"
                href={`${WHATSAPP}?text=${encodeURIComponent(`Olá! Tenho interesse no ${product.brand} ${product.model} do catálogo C7 Store.`)}`}
                target="_blank"
                rel="noreferrer"
              >
                <MessageCircle size={17} /> Consultar no WhatsApp
              </a>
              <DialogClose className="secondary-button" type="button">
                Continuar navegando
              </DialogClose>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
