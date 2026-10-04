import { AlertCircle, Loader2, Search } from "lucide-react";

export function CatalogLoadingState() {
  return (
    <div className="catalog-loading" role="status" aria-live="polite">
      <Loader2 className="spin" size={26} /> Carregando catálogo...
    </div>
  );
}

export function CatalogErrorState({
  onRetry,
  isRetrying,
}: {
  onRetry: () => void;
  isRetrying: boolean;
}) {
  return (
    <div className="catalog-error-state" role="alert">
      <AlertCircle size={30} aria-hidden="true" />
      <h3>Não foi possível carregar o catálogo</h3>
      <p>
        O catálogo está temporariamente indisponível. Tente novamente em
        instantes.
      </p>
      <button
        type="button"
        className="secondary-button"
        onClick={onRetry}
        disabled={isRetrying}
      >
        {isRetrying ? "Tentando novamente…" : "Tentar novamente"}
      </button>
    </div>
  );
}

export function CatalogEmptyState() {
  return (
    <div className="empty-state">
      <Search size={28} aria-hidden="true" />
      <h3>Nenhum equipamento encontrado</h3>
      <p>Tente buscar por outra marca, modelo ou configuração.</p>
    </div>
  );
}
