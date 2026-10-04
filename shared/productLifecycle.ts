export type ProductLifecycleStatus = "available" | "sold" | "hidden";

type SellerSnapshot = { id: number; name: string };

export function archiveProductState(status: ProductLifecycleStatus) {
  if (status === "hidden") throw new Error("O produto já está arquivado.");
  return { status: "hidden" as const, statusBeforeArchive: status };
}

export function restoreProductState(statusBeforeArchive: "available" | "sold" | null) {
  return { status: statusBeforeArchive ?? "available", statusBeforeArchive: null } as const;
}

export function registerSaleState(status: ProductLifecycleStatus, seller: SellerSnapshot) {
  if (status !== "available") throw new Error("Somente produtos disponíveis podem ter venda registrada.");
  return {
    status: "sold" as const,
    statusBeforeArchive: null,
    soldByUserId: seller.id,
    soldByName: seller.name,
  };
}

export function buildSaleAuditRecord(
  actorUserId: number,
  product: { id: number; brand: string; model: string },
  seller: SellerSnapshot,
) {
  const attribution = `vendedor ${seller.name} (#${seller.id})`;
  const summaryPrefix = `Venda registrada: ${attribution}; produto `;
  return {
    userId: actorUserId,
    action: "sell",
    entity: "product",
    entityId: product.id,
    summary: `${summaryPrefix}${product.brand} ${product.model}`.slice(0, 255),
  };
}
