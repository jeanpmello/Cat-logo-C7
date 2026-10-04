import { useEffect, useState } from "react";
import { BadgeCheck, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";

type SaleDialogProduct = { id: number; brand: string; model: string };
type SellerOption = { id: number; name: string };

type SaleRegistrationDialogProps = {
  product: SaleDialogProduct | null;
  sellers: SellerOption[];
  isLoadingSellers: boolean;
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (sellerId: number) => void;
};

export default function SaleRegistrationDialog({
  product,
  sellers,
  isLoadingSellers,
  isSubmitting,
  onClose,
  onSubmit,
}: SaleRegistrationDialogProps) {
  const [sellerId, setSellerId] = useState("");

  useEffect(() => setSellerId(""), [product?.id]);
  if (!product) return null;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const selectedId = Number(sellerId);
    if (!Number.isSafeInteger(selectedId) || selectedId <= 0) return;
    onSubmit(selectedId);
  }

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
      <DialogContent className="confirm-modal sale-confirm-modal" showCloseButton={false}>
        <div className="confirm-modal-icon"><BadgeCheck size={22} /></div>
        <span className="admin-kicker">/ atribuição de venda</span>
        <DialogTitle>Registrar venda</DialogTitle>
        <DialogDescription>
          Selecione quem vendeu <strong>{product.brand} {product.model}</strong>. Essa ação marcará o produto como vendido.
        </DialogDescription>
        <form aria-label="Confirmar venda" onSubmit={submit}>
          <label className="admin-field">
            <span>Quem vendeu? *</span>
            <select
              aria-label="Quem vendeu"
              required
              value={sellerId}
              onChange={(event) => setSellerId(event.target.value)}
              disabled={isLoadingSellers || sellers.length === 0 || isSubmitting}
            >
              <option value="">Selecione uma pessoa</option>
              {sellers.map((seller) => <option key={seller.id} value={seller.id}>{seller.name} (#{seller.id})</option>)}
            </select>
          </label>
          {isLoadingSellers && <p role="status">Carregando vendedores elegíveis…</p>}
          {!isLoadingSellers && sellers.length === 0 && <p role="alert">Não há vendedores elegíveis disponíveis.</p>}
          <div className="confirm-modal-actions">
            <button type="button" className="admin-secondary" onClick={onClose} disabled={isSubmitting}>Cancelar</button>
            <button type="submit" className="admin-primary" disabled={!sellerId || isLoadingSellers || sellers.length === 0 || isSubmitting}>
              {isSubmitting ? <Loader2 className="spin" size={15} /> : <BadgeCheck size={15} />}
              {isSubmitting ? "Registrando…" : "Confirmar venda"}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
