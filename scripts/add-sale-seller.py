from pathlib import Path

p=Path('server/db.ts'); s=p.read_text()
s=s.replace('export async function getUserByOpenId(openId: string) {', 'export async function listSellerUsers() { const db = await getDb(); if (!db) return []; return db.select({ id: users.id, name: users.name, username: users.username, role: users.role }).from(users).where(and(ne(users.role, "user"), ne(users.role, "viewer"))).orderBy(asc(users.name), asc(users.username)); }\nexport async function getSellerUserById(id: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select({ id: users.id, name: users.name, username: users.username, role: users.role }).from(users).where(and(eq(users.id, id), ne(users.role, "user"), ne(users.role, "viewer"))).limit(1); return rows[0]; }\n\nexport async function getUserByOpenId(openId: string) {')
s=s.replace('export async function deleteProduct(id: number, userId?: number, sold = false, soldPrice?: string | null, salePaymentMethod?: string | null, soldByName?: string | null) {', 'export async function deleteProduct(id: number, userId?: number, sold = false, soldPrice?: string | null, salePaymentMethod?: string | null, soldByName?: string | null, soldById?: number | null) {')
s=s.replace('soldById: sold ? (userId ?? null) : null, soldByName: sold ? (soldByName?.trim() || null) : null', 'soldById: sold ? (soldById ?? userId ?? null) : null, soldByName: sold ? (soldByName?.trim() || null) : null')
p.write_text(s)

p=Path('server/routers.ts'); s=p.read_text()
s=s.replace('addAuthorizedUser, addProductImage,', 'addAuthorizedUser, addProductImage, listSellerUsers, getSellerUserById,')
s=s.replace('authorizedUsers: router({ list:', 'users: router({ sellers: sellerProcedure.query(() => listSellerUsers()) }),\n  authorizedUsers: router({ list:')
old='remove: sellerProcedure.input(z.object({ id: z.number().int().positive(), sold: z.boolean().default(false), soldPrice: z.string().trim().max(60).optional().nullable(), salePaymentMethod: z.string().trim().max(80).optional().nullable() })).mutation(({ ctx, input }) => { if (input.sold && !input.salePaymentMethod?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a forma de pagamento da venda." }); return deleteProduct(input.id, ctx.user.id, input.sold, input.soldPrice, input.salePaymentMethod, ctx.user.name || ctx.user.username || null); })'
new='remove: sellerProcedure.input(z.object({ id: z.number().int().positive(), sold: z.boolean().default(false), soldPrice: z.string().trim().max(60).optional().nullable(), salePaymentMethod: z.string().trim().max(80).optional().nullable(), sellerId: z.number().int().positive().optional().nullable() })).mutation(async ({ ctx, input }) => { if (input.sold && !input.salePaymentMethod?.trim()) throw new TRPCError({ code: "BAD_REQUEST", message: "Informe a forma de pagamento da venda." }); const selectedSeller = input.sold && input.sellerId ? await getSellerUserById(input.sellerId) : null; if (input.sold && input.sellerId && !selectedSeller) throw new TRPCError({ code: "BAD_REQUEST", message: "O vendedor selecionado não está disponível." }); return deleteProduct(input.id, ctx.user.id, input.sold, input.soldPrice, input.salePaymentMethod, selectedSeller?.name || selectedSeller?.username || ctx.user.name || ctx.user.username || null, selectedSeller?.id || ctx.user.id); })'
if old not in s: raise SystemExit('router remove block not found')
s=s.replace(old,new)
p.write_text(s)

p=Path('client/src/pages/Admin.tsx'); s=p.read_text()
s=s.replace('const [salePriceInput, setSalePriceInput] = useState(""); const [salePaymentMethod', 'const [salePriceInput, setSalePriceInput] = useState(""); const [saleSellerId, setSaleSellerId] = useState(""); const [salePaymentMethod')
s=s.replace('const privateAccountsQuery = trpc.privateAccounts.list.useQuery(undefined, { enabled: isOwner, retry: false });', 'const privateAccountsQuery = trpc.privateAccounts.list.useQuery(undefined, { enabled: isOwner, retry: false }); const sellerUsersQuery = trpc.users.sellers.useQuery(undefined, { enabled: canEdit, retry: false });')
s=s.replace('function openRemoveModal(product: AdminProduct) { setProductToRemove(product);', 'function openRemoveModal(product: AdminProduct) { setProductToRemove(product); setSaleSellerId(String(user?.id ?? ""));')
s=s.replace('removeMutation.mutate({ id: productToRemove.id, sold, soldPrice: sold ? salePriceInput : null, salePaymentMethod: sold ? payment : null });', 'removeMutation.mutate({ id: productToRemove.id, sold, soldPrice: sold ? salePriceInput : null, salePaymentMethod: sold ? payment : null, sellerId: sold && saleSellerId ? Number(saleSellerId) : null });')
s=s.replace('soldByName: user?.name || user?.username || "Usuário do painel"', 'soldById: saleSellerId ? Number(saleSellerId) : user?.id, soldByName: (sellerUsersQuery.data ?? []).find((seller) => String(seller.id) === saleSellerId)?.name || (sellerUsersQuery.data ?? []).find((seller) => String(seller.id) === saleSellerId)?.username || user?.name || user?.username || "Usuário do painel"')
needle='<label className="admin-field sale-price-field"><span>Forma de pagamento <b>* somente se vendido</b></span>'
replacement='<label className="admin-field sale-price-field"><span>Vendedor responsável *</span><select value={saleSellerId} onChange={(event) => setSaleSellerId(event.target.value)} required aria-label="Selecionar vendedor responsável pela venda"><option value="">Selecione o vendedor</option>{(sellerUsersQuery.data ?? []).map((seller) => <option key={seller.id} value={seller.id}>{seller.name || seller.username || `Usuário #${seller.id}`}{seller.id === user?.id ? " (você)" : ""}</option>)}</select></label>'+needle
if needle not in s: raise SystemExit('sale payment field not found')
s=s.replace(needle,replacement)
p.write_text(s)

p=Path('client/src/index.css'); s=p.read_text(); s += '\n.sale-price-field select { width: 100%; min-height: 44px; }\n@media (max-width: 640px) { .sale-choice-actions { flex-direction: column; } .sale-choice-actions button { width: 100%; min-height: 44px; } }\n'; p.write_text(s)

p=Path('server/sell-workflow.test.ts'); s=p.read_text();
if 'sellerId' not in s: s=s.replace('expect(router).toContain("soldByName");', 'expect(router).toContain("soldByName");\n    expect(router).toContain("sellerId");\n    expect(admin).toContain("Vendedor responsável");')
p.write_text(s)
