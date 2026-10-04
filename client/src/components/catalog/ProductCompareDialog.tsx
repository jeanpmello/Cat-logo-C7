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

type ProductCompareDialogProps = {
  open: boolean;
  products: Product[];
  onOpenChange: (open: boolean) => void;
  onSelect: (product: Product, trigger: HTMLButtonElement) => void;
  returnFocusRef: RefObject<HTMLElement | null>;
  fallbackFocusRef: RefObject<HTMLElement | null>;
};

export default function ProductCompareDialog({
  open,
  products,
  onOpenChange,
  onSelect,
  returnFocusRef,
  fallbackFocusRef,
}: ProductCompareDialogProps) {
  const rows: Array<[string, (product: Product) => string | null]> = [
    ["Processador", product => product.processor],
    [
      "Memória",
      product => [product.ram, product.ramType].filter(visible).join(" · "),
    ],
    ["Armazenamento", product => product.storage],
    ["Tela", product => product.screen],
    ["Sistema", product => product.os],
    ["Estado", product => product.cosmeticCondition || product.condition],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="compare-modal"
        showCloseButton={false}
        onCloseAutoFocus={event => {
          event.preventDefault();
          const target = returnFocusRef.current?.isConnected
            ? returnFocusRef.current
            : fallbackFocusRef.current;
          target?.focus();
        }}
      >
        <DialogClose
          className="close-button"
          aria-label="Fechar comparação"
          type="button"
        >
          <span aria-hidden="true">×</span>
        </DialogClose>
        <DialogHeader className="compare-dialog-header">
          <div className="modal-kicker">
            Comparação rápida · até 3 equipamentos
          </div>
          <DialogTitle>Compare os produtos selecionados</DialogTitle>
        </DialogHeader>
        <DialogDescription className="sr-only">
          Compare as especificações dos produtos escolhidos; a tabela pode ser
          rolada horizontalmente em telas pequenas.
        </DialogDescription>
        {products.length > 0 ? (
          <div
            className="compare-table-wrap"
            role="region"
            tabIndex={0}
            aria-label="Tabela de comparação; deslize horizontalmente em telas pequenas"
          >
            <table className="compare-table">
              <thead>
                <tr>
                  <th scope="col">Característica</th>
                  {products.map(product => (
                    <th scope="col" key={product.id}>
                      <button
                        type="button"
                        className="compare-heading"
                        onClick={event => {
                          onSelect(product, event.currentTarget);
                          onOpenChange(false);
                        }}
                      >
                        {product.imageUrl && (
                          <img
                            src={product.imageUrl}
                            alt=""
                            loading="lazy"
                            decoding="async"
                          />
                        )}
                        <strong>
                          {product.brand} {product.model}
                        </strong>
                        <b>{product.promoPrice || product.price}</b>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map(([label, getter]) => {
                  const values = products.map(getter);
                  if (!values.some(visible)) return null;
                  return (
                    <tr key={label}>
                      <th scope="row">{label}</th>
                      {values.map((value, index) => (
                        <td key={products[index]?.id}>
                          {visible(value) ? value : "—"}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="compare-empty">
            Selecione produtos no catálogo para comparar.
          </p>
        )}
        <div className="compare-footer">
          <span>Quer confirmar disponibilidade, acessórios ou condição?</span>
          <a
            className="primary-button"
            href={WHATSAPP}
            target="_blank"
            rel="noreferrer"
          >
            <MessageCircle size={15} /> Falar com a C7
          </a>
        </div>
      </DialogContent>
    </Dialog>
  );
}
