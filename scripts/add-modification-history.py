from pathlib import Path

p=Path('drizzle/schema.ts'); s=p.read_text(); s=s.replace('notes: text("notes"), price:', 'notes: text("notes"), modificationNotes: text("modificationNotes"), price:'); p.write_text(s)

p=Path('server/routers.ts'); s=p.read_text(); s=s.replace('notes: z.string().trim().max(5000).optional().nullable(), price:', 'notes: z.string().trim().max(5000).optional().nullable(), modificationNotes: z.string().trim().max(5000).optional().nullable(), price:'); p.write_text(s)

p=Path('client/src/pages/Admin.tsx'); s=p.read_text()
s=s.replace('accessories: string; notes: string; price:', 'accessories: string; notes: string; modificationNotes: string; price:')
s=s.replace('accessories: "", notes: "", price:', 'accessories: "", notes: "", modificationNotes: "", price:')
s=s.replace('notes: String(readColumn(row, ["observacoes", "notas", "notes"])).trim(), price:', 'notes: String(readColumn(row, ["observacoes", "notas", "notes"])).trim(), modificationNotes: String(readColumn(row, ["modificacoes", "modificações", "modificationnotes"])).trim(), price:')
s=s.replace('const [form, setForm] = useState<ProductForm>(emptyForm); const [editingId, setEditingId] = useState<number | null>(null); const [showEditor, setShowEditor] = useState(false); const [showAdvanced, setShowAdvanced] = useState(false);', 'const [form, setForm] = useState<ProductForm>(emptyForm); const [editingId, setEditingId] = useState<number | null>(null); const [showEditor, setShowEditor] = useState(false); const [showAdvanced, setShowAdvanced] = useState(false); const [showModificationHistory, setShowModificationHistory] = useState(false);')
s=s.replace('function editProduct(product: AdminProduct) { setShowAdvanced(false);', 'function editProduct(product: AdminProduct) { setShowAdvanced(false); setShowModificationHistory(false);')
s=s.replace('accessories: product.accessories ?? "", notes: product.notes ?? "", price:', 'accessories: product.accessories ?? "", notes: product.notes ?? "", modificationNotes: product.modificationNotes ?? "", price:')
s=s.replace('function openNewProduct() { setEditingId(null); setForm(emptyForm); setShowEditor(true);', 'function openNewProduct() { setEditingId(null); setForm(emptyForm); setShowModificationHistory(false); setShowEditor(true);')
s=s.replace('accessories: normalized.accessories || null, notes: normalized.notes || null, originalPrice:', 'accessories: normalized.accessories || null, notes: normalized.notes || null, modificationNotes: normalized.modificationNotes || null, originalPrice:')
s=s.replace('const columns = ["id", "marca", "modelo", "processador", "geracao", "ram", "tiporam", "armazenamento", "placadevideo", "sistema", "nserie", "tela", "categoria", "estado", "bateria", "acessorios", "observacoes", "preco",', 'const columns = ["id", "marca", "modelo", "processador", "geracao", "ram", "tiporam", "armazenamento", "placadevideo", "sistema", "nserie", "tela", "categoria", "estado", "bateria", "acessorios", "observacoes", "modificacoes", "preco",')
s=s.replace('accessories, notes, price, originalPrice', 'accessories, notes, modificationNotes, price, originalPrice')
s=s.replace('acessorios: accessories, observacoes: notes, preco:', 'acessorios: accessories, observacoes: notes, modificacoes: modificationNotes, preco:')
# Add optional tab and field immediately after existing advanced toggle.
needle='<button type="button" className="advanced-toggle" onClick={() => setShowAdvanced((value) => !value)}>{showAdvanced ? "Ocultar informações adicionais" : "Mostrar informações adicionais"}</button>'
replacement=needle+'<button type="button" className={`advanced-toggle modification-history-toggle ${showModificationHistory ? "is-active" : ""}`} onClick={() => setShowModificationHistory((value) => !value)} aria-expanded={showModificationHistory}>{showModificationHistory ? "Ocultar histórico" : "Abrir histórico de modificações"}</button>{showModificationHistory && <div className="modification-history-tab"><span className="admin-kicker">/ histórico opcional</span><p>Registre o que foi revisado, substituído ou atualizado neste equipamento. Este campo não é obrigatório e fica disponível apenas no painel.</p><Field label="Modificações realizadas" value={form.modificationNotes} onChange={(v) => updateField("modificationNotes", v)} placeholder="Ex.: SSD trocado, bateria revisada, limpeza interna e sistema reinstalado..." multiline /></div>}'
if needle not in s: raise SystemExit('advanced toggle not found')
s=s.replace(needle,replacement)
# Correct same-warranty page labels and previews.
s=s.replace('Fotografar termo 1', 'Fotografar página 1')
s=s.replace('Fotografar termo 2', 'Fotografar página 2')
s=s.replace('Trocar termo 1', 'Trocar página 1')
s=s.replace('Trocar termo 2', 'Trocar página 2')
s=s.replace('Ver termo 1', 'Ver página 1')
s=s.replace('Ver termo 2', 'Ver página 2')
s=s.replace('label="Ver termo 1"', 'label="Ver página 1 do termo"')
s=s.replace('label="Ver termo 2"', 'label="Ver página 2 do termo"')
p.write_text(s)

p=Path('client/src/index.css'); s=p.read_text(); s += '''\n.modification-history-tab { grid-column: 1 / -1; margin: 4px 0 16px; padding: 18px; border: 1px solid rgba(29,184,255,.2); border-radius: 12px; background: linear-gradient(135deg, rgba(29,184,255,.08), rgba(7,27,47,.32)); }\n.modification-history-tab p { max-width: 720px; margin: 6px 0 14px; color: var(--muted-foreground); font-size: 12px; line-height: 1.6; }\n.modification-history-toggle.is-active { color: var(--blue); border-color: rgba(29,184,255,.45); }\n'''; p.write_text(s)

p=Path('server/signed-warranty.test.ts'); s=p.read_text(); s=s.replace('expect(admin).toContain("Fotografar termo 1");', 'expect(admin).toContain("Fotografar página 1");').replace('expect(admin).toContain("Fotografar termo 2");', 'expect(admin).toContain("Fotografar página 2");'); p.write_text(s)
