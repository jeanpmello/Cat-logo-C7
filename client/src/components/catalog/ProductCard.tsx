import {
  ArrowUpRight,
  Cpu,
  GitCompareArrows,
  HardDrive,
  Laptop,
  MemoryStick,
  Monitor,
  Share2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type { Product } from "@shared/types";

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

function directProductUrl(product: Product) {
  return typeof window === "undefined"
    ? ""
    : `${window.location.origin}${window.location.pathname}?produto=${product.id}`;
}

async function shareProduct(product: Product) {
  const url = directProductUrl(product);
  const text = `Olha este ${product.category.toLowerCase()} seminovo da C7 Store: ${product.brand} ${product.model}.`;

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share({
        title: `${product.brand} ${product.model} · C7 Store`,
        text,
        url,
      });
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
    }
  }

  window.open(
    `${WHATSAPP}?text=${encodeURIComponent(`${text}\n${url}`)}`,
    "_blank",
    "noopener,noreferrer"
  );
}

type ProductCardProps = {
  product: Product;
  comparing: boolean;
  onCompare: (product: Product) => void;
  onSelect: (product: Product, trigger: HTMLButtonElement) => void;
};

export default function ProductCard({
  product,
  comparing,
  onSelect,
  onCompare,
}: ProductCardProps) {
  return (
    <article className="product-card">
      <div
        className={`product-visual ${product.imageUrl ? "has-product-image" : ""}`}
      >
        {product.imageUrl ? (
          <img
            className="product-image"
            src={product.imageUrl}
            alt={`${product.brand} ${product.model}`}
            loading="lazy"
            decoding="async"
          />
        ) : (
          <>
            <div className="visual-grid" />
            <div className="device-glow" />
            {product.category === "Notebook" ? (
              <Laptop size={66} strokeWidth={1.1} />
            ) : (
              <Monitor size={66} strokeWidth={1.1} />
            )}
          </>
        )}
        <span className="category-pill">{product.category}</span>
        <span className="condition-pill">
          <ShieldCheck size={11} /> {product.condition}
        </span>
        {product.badge && (
          <span className="product-badge">
            <Sparkles size={12} />
            {product.badge}
          </span>
        )}
      </div>

      <div className="product-body">
        <div className="eyebrow">
          {product.brand} <span>/</span> {product.generation}
        </div>
        <h3>{product.model}</h3>
        {visible(product.processor) && (
          <p className="processor-line">
            <Cpu size={15} /> {product.processor}
          </p>
        )}
        <div className="spec-row">
          {visible(product.ram) && (
            <span>
              <MemoryStick size={14} /> {product.ram}
            </span>
          )}
          {visible(product.storage) && (
            <span>
              <HardDrive size={14} /> {product.storage}
            </span>
          )}
          {visible(product.screen) && (
            <span>
              <Monitor size={14} /> {product.screen}
            </span>
          )}
        </div>
        <div className="product-footer">
          <div>
            <small>{product.promoPrice ? "Oferta" : "Valor"}</small>
            {product.originalPrice && product.promoPrice && (
              <del>{product.originalPrice}</del>
            )}
            <strong>{product.promoPrice || product.price}</strong>
          </div>
          <div className="product-actions">
            <button
              type="button"
              className={`share-button ${comparing ? "is-active" : ""}`}
              onClick={() => onCompare(product)}
              aria-label={`Comparar ${product.brand} ${product.model}`}
              aria-pressed={comparing}
              title="Comparar produto"
            >
              <GitCompareArrows size={15} />
            </button>
            <button
              type="button"
              className="share-button"
              onClick={() => void shareProduct(product)}
              aria-label={`Compartilhar ${product.brand} ${product.model}`}
              title="Compartilhar produto"
            >
              <Share2 size={15} />
            </button>
            <button
              type="button"
              className="text-button"
              aria-haspopup="dialog"
              onClick={event => onSelect(product, event.currentTarget)}
            >
              Ver detalhes <ArrowUpRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}
