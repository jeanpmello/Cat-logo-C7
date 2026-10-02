import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowUpRight,
  Check,
  GitCompareArrows,
  Instagram,
  Laptop,
  MessageCircle,
  Monitor,
  PackageCheck,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  X,
} from "lucide-react";
import type { Product } from "@shared/types";
import { trpc } from "@/lib/trpc";
import ProductCard from "@/components/catalog/ProductCard";
import ProductCompareDialog from "@/components/catalog/ProductCompareDialog";
import ProductDetailsDialog from "@/components/catalog/ProductDetailsDialog";
import {
  CatalogEmptyState,
  CatalogErrorState,
  CatalogLoadingState,
} from "@/components/catalog/CatalogStates";

const WHATSAPP = "https://wa.me/555130553090";
const INSTAGRAM = "https://instagram.com/c7tec_store";
const LOGO = "/manus-storage/c7-logo_ae3d1307.png";
const EMPTY_PRODUCTS: Product[] = [];

export default function Home() {
  const { data, isLoading, isError, isFetching, refetch } =
    trpc.products.list.useQuery();
  const products = data ?? EMPTY_PRODUCTS;
  const [search, setSearch] = useState("");
  const [brand, setBrand] = useState("Todas");
  const [ram, setRam] = useState("Todas");
  const [category, setCategory] = useState("Todos");
  const [offersOnly, setOffersOnly] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);
  const [showCompare, setShowCompare] = useState(false);
  const detailsTriggerRef = useRef<HTMLElement | null>(null);
  const compareTriggerRef = useRef<HTMLElement | null>(null);
  const catalogHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const brands = [
    "Todas",
    ...Array.from(new Set(products.map(product => product.brand))),
  ];
  const ramOptions = [
    "Todas",
    ...Array.from(new Set(products.map(product => product.ram))),
  ];
  const filteredProducts = useMemo(
    () =>
      products.filter(product => {
        const query = search.toLowerCase();
        return (
          [product.brand, product.model, product.processor, product.storage]
            .join(" ")
            .toLowerCase()
            .includes(query) &&
          (brand === "Todas" || product.brand === brand) &&
          (ram === "Todas" || product.ram === ram) &&
          (category === "Todos" || product.category === category) &&
          (!offersOnly || Boolean(product.promoPrice))
        );
      }),
    [products, search, brand, ram, category, offersOnly]
  );
  const comparingProducts = compareIds
    .map(id => products.find(product => product.id === id))
    .filter((product): product is Product => Boolean(product));

  const clearFilters = () => {
    setSearch("");
    setBrand("Todas");
    setRam("Todas");
    setCategory("Todos");
    setOffersOnly(false);
  };

  function toggleCompare(product: Product) {
    setCompareIds(current =>
      current.includes(product.id)
        ? current.filter(id => id !== product.id)
        : current.length >= 3
          ? [...current.slice(1), product.id]
          : [...current, product.id]
    );
  }

  function openDetails(product: Product, trigger?: HTMLElement) {
    if (trigger) detailsTriggerRef.current = trigger;
    setSelectedProduct(product);
  }

  function closeDetails() {
    setSelectedProduct(null);
    if (window.location.search)
      window.history.replaceState({}, "", window.location.pathname);
  }

  useEffect(() => {
    const productId = Number(
      new URLSearchParams(window.location.search).get("produto")
    );
    const product = productId
      ? products.find(item => item.id === productId)
      : undefined;
    if (product) setSelectedProduct(product);
    document.title = product
      ? `${product.brand} ${product.model} · C7 Store`
      : "C7 Store · Catálogo de Tecnologia Seminova";
  }, [products]);

  return (
    <main>
      <header className="site-header">
        <div className="container nav-inner">
          <a href="#inicio" className="brand-lockup">
            <img src={LOGO} alt="C7 Store" />
            <span>
              C7 <b>STORE</b>
            </span>
          </a>
          <nav aria-label="Navegação principal">
            <a href="#catalogo">Catálogo</a>
            <a href="#diferenciais">Por que a C7</a>
            <a href={INSTAGRAM} target="_blank" rel="noreferrer">
              Instagram <ArrowUpRight size={13} />
            </a>
          </nav>
          <a
            className="nav-contact"
            href={WHATSAPP}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={16} /> Falar com a C7
          </a>
        </div>
      </header>

      <section className="hero" id="inicio">
        <div className="hero-orbit orbit-one" />
        <div className="hero-orbit orbit-two" />
        <div className="container hero-grid">
          <div className="hero-copy">
            <div className="hero-label">
              <span /> Tecnologia seminova, revisada e pronta
            </div>
            <h1>
              Seu próximo
              <br />
              <em>computador</em> está aqui.
            </h1>
            <p>
              Notebooks e desktops seminovos revisados, com configuração
              transparente e atendimento de verdade. Escolha seu próximo
              equipamento com a C7 Store.
            </p>
            <div className="hero-actions">
              <a href="#catalogo" className="primary-button">
                Explorar catálogo <ArrowUpRight size={17} />
              </a>
              <a
                href={WHATSAPP}
                target="_blank"
                rel="noreferrer"
                className="ghost-button"
              >
                <MessageCircle size={17} /> Atendimento
              </a>
            </div>
            <div className="hero-proof">
              <div className="proof-avatars">
                <span>c7</span>
                <span>+</span>
              </div>
              <div>
                <strong>Atendimento próximo</strong>
                <small>Fale com quem entende de tecnologia</small>
              </div>
            </div>
          </div>
          <div className="hero-showcase">
            <div className="showcase-card back-card">
              <div className="showcase-topline">
                <span>ESTAÇÃO C7</span>
                <span>01 / 03</span>
              </div>
              <div className="showcase-device device-back">
                <Monitor size={138} strokeWidth={0.65} />
              </div>
            </div>
            <div className="showcase-card front-card">
              <div className="showcase-topline">
                <span>CURADORIA C7</span>
                <span className="live-dot">● SEMINOVO REVISADO</span>
              </div>
              <div className="showcase-device">
                <Laptop size={198} strokeWidth={0.65} />
                <div className="screen-shine" />
              </div>
              <div className="showcase-caption">
                <span>Equipamentos selecionados</span>
                <strong>prontos para você</strong>
              </div>
            </div>
            <div className="floating-note">
              <ShieldCheck size={18} />
              <span>
                <b>Compra segura</b>
                <small>Configuração conferida</small>
              </span>
            </div>
          </div>
        </div>
      </section>

      <section
        className="catalog-section"
        id="catalogo"
        aria-labelledby="catalog-title"
      >
        <div className="container">
          <div className="section-heading">
            <div>
              <div className="section-kicker">/ catálogo atualizado</div>
              <h2 id="catalog-title" ref={catalogHeadingRef} tabIndex={-1}>
                Escolha seu <em>próximo upgrade.</em>
              </h2>
            </div>
            <p>
              {isError ? (
                "Catálogo temporariamente indisponível."
              ) : (
                <>
                  {products.length} equipamentos
                  <br />
                  revisados e selecionados.
                </>
              )}
            </p>
          </div>
          <div className="catalog-toolbar">
            <div className="search-box">
              <Search size={18} aria-hidden="true" />
              <input
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Buscar por marca, modelo ou processador..."
                aria-label="Buscar produtos"
              />
            </div>
            <div className="filter-group">
              <SlidersHorizontal size={17} aria-hidden="true" />
              <select
                value={brand}
                onChange={event => setBrand(event.target.value)}
                aria-label="Filtrar por marca"
              >
                {brands.map(item => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
              <select
                value={ram}
                onChange={event => setRam(event.target.value)}
                aria-label="Filtrar por memória"
              >
                {ramOptions.map(item => (
                  <option key={item} value={item}>
                    {item === "Todas" ? "Toda RAM" : item}
                  </option>
                ))}
              </select>
              <select
                value={category}
                onChange={event => setCategory(event.target.value)}
                aria-label="Filtrar por categoria"
              >
                <option>Todos</option>
                <option>Notebook</option>
                <option>Desktop</option>
              </select>
              <button
                type="button"
                className={`offer-filter ${offersOnly ? "active" : ""}`}
                aria-pressed={offersOnly}
                onClick={() => setOffersOnly(value => !value)}
              >
                <Sparkles size={14} /> Ofertas
              </button>
            </div>
          </div>
          <div className="results-line" aria-live="polite" aria-atomic="true">
            <span>
              {isError ? (
                "Não foi possível atualizar a contagem de resultados."
              ) : (
                <>
                  <b>{filteredProducts.length}</b> resultados encontrados
                </>
              )}
            </span>
            <div>
              {!isError && compareIds.length > 0 && (
                <button
                  type="button"
                  onClick={event => {
                    compareTriggerRef.current = event.currentTarget;
                    setShowCompare(true);
                  }}
                >
                  <GitCompareArrows size={14} /> Comparar ({compareIds.length})
                </button>
              )}
              {(search ||
                brand !== "Todas" ||
                ram !== "Todas" ||
                category !== "Todos" ||
                offersOnly) && (
                <button type="button" onClick={clearFilters}>
                  Limpar filtros <X size={14} />
                </button>
              )}
            </div>
          </div>
          {isLoading ? (
            <CatalogLoadingState />
          ) : isError ? (
            <CatalogErrorState
              onRetry={() => {
                void refetch();
              }}
              isRetrying={isFetching}
            />
          ) : filteredProducts.length > 0 ? (
            <div className="product-grid">
              {filteredProducts.map(product => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onSelect={(item, trigger) => openDetails(item, trigger)}
                  comparing={compareIds.includes(product.id)}
                  onCompare={toggleCompare}
                />
              ))}
            </div>
          ) : (
            <CatalogEmptyState />
          )}
        </div>
      </section>

      <section className="trust-section" id="diferenciais">
        <div className="container trust-grid">
          <div className="trust-intro">
            <div className="section-kicker">/ do nosso jeito</div>
            <h2>
              Comprar tecnologia pode ser <em>simples.</em>
            </h2>
            <p>
              Você recebe informação clara, curadoria cuidadosa e suporte para
              escolher o equipamento seminovo que realmente faz sentido para sua
              rotina.
            </p>
          </div>
          <div className="trust-items">
            <div className="trust-item">
              <span className="trust-icon">
                <Check size={18} />
              </span>
              <div>
                <strong>Condição informada com clareza</strong>
                <p>
                  Fotos, estado físico e configuração apresentados de forma
                  transparente.
                </p>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">
                <PackageCheck size={18} />
              </span>
              <div>
                <strong>Equipamentos revisados</strong>
                <p>Seleção feita com cuidado antes de chegar até o catálogo.</p>
              </div>
            </div>
            <div className="trust-item">
              <span className="trust-icon">
                <MessageCircle size={18} />
              </span>
              <div>
                <strong>Atendimento humano</strong>
                <p>
                  Converse com nossa equipe e tire dúvidas antes de decidir.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="container footer-main">
          <div className="footer-brand">
            <a href="#inicio" className="brand-lockup">
              <img src={LOGO} alt="C7 Store" />
              <span>
                C7 <b>STORE</b>
              </span>
            </a>
            <p>
              Seu próximo equipamento,
              <br />
              do seu jeito.
            </p>
          </div>
          <div className="footer-contact">
            <span>Fale com a gente</span>
            <a href={WHATSAPP} target="_blank" rel="noreferrer">
              (51) 3055-3090 <ArrowUpRight size={15} />
            </a>
            <a href={INSTAGRAM} target="_blank" rel="noreferrer">
              @c7tec_store <Instagram size={15} />
            </a>
          </div>
          <div className="footer-cta">
            <span>Encontrou o seu?</span>
            <a
              href={WHATSAPP}
              target="_blank"
              rel="noreferrer"
              className="primary-button"
            >
              Chamar no WhatsApp <MessageCircle size={16} />
            </a>
          </div>
        </div>
        <div className="container footer-bottom">
          <span>© 2026 C7 Store. Catálogo sujeito à disponibilidade.</span>
          <span>Feito para escolher melhor.</span>
        </div>
      </footer>

      <ProductDetailsDialog
        product={selectedProduct}
        onOpenChange={open => {
          if (!open) closeDetails();
        }}
        returnFocusRef={detailsTriggerRef}
        fallbackFocusRef={catalogHeadingRef}
      />
      <ProductCompareDialog
        open={showCompare}
        products={comparingProducts}
        onOpenChange={setShowCompare}
        onSelect={(product, trigger) => openDetails(product, trigger)}
        returnFocusRef={compareTriggerRef}
        fallbackFocusRef={catalogHeadingRef}
      />
    </main>
  );
}
