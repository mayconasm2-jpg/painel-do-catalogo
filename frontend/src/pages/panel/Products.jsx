import { useEffect, useState, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import api, { apiError, mediaUrl } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components/panel/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  Package, Plus, Search, MoreVertical, Loader2, Star, ChevronLeft, ChevronRight, ImageIcon,
} from "lucide-react";
import { brl, STATUS_LABELS, AVAIL_LABELS } from "@/lib/format";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { ProductEditor } from "@/components/panel/ProductEditor";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const STATUS_COLORS = { published: "bg-emerald-50 text-emerald-600", draft: "bg-slate-100 text-slate-500", hidden: "bg-amber-50 text-amber-600" };

export default function Products() {
  const { store } = useAuth();
  const [params, setParams] = useSearchParams();
  const [data, setData] = useState({ items: [], total: 0 });
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ search: "", category: "", status: "", promo: "", sort: "recent", page: 1 });
  const [selected, setSelected] = useState([]);
  const [editing, setEditing] = useState(null); // product obj | "new" | null
  const [delId, setDelId] = useState(null);

  const load = useCallback(() => {
    setLoading(true);
    const q = new URLSearchParams({ search: filters.search, category: filters.category, status: filters.status, promo: filters.promo, sort: filters.sort, page: filters.page, page_size: 20 });
    api.get(`/products?${q}`).then((r) => { setData(r.data); setLoading(false); });
  }, [filters]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { api.get("/categories").then((r) => setCats(r.data)); }, []);
  useEffect(() => { if (params.get("new")) { setEditing("new"); setParams({}); } }, [params, setParams]);

  const catName = (id) => cats.find((c) => c.id === id)?.name || "—";
  const totalPages = Math.max(1, Math.ceil(data.total / 20));

  const quickUpdate = async (p, patch) => {
    try {
      const { data: full } = await api.get(`/products/${p.id}`);
      await api.put(`/products/${p.id}`, { ...full, ...patch });
      toast.success("Produto atualizado"); load();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  const duplicate = async (p) => { try { await api.post(`/products/${p.id}/duplicate`); toast.success("Produto duplicado"); load(); } catch (e) { toast.error(apiError(e.response?.data?.detail)); } };
  const doDelete = async () => { try { await api.delete(`/products/${delId}`); toast.success("Produto excluído"); setDelId(null); load(); } catch (e) { toast.error(apiError(e.response?.data?.detail)); } };
  const bulk = async (action) => { try { await api.post("/products/bulk", { action, ids: selected }); toast.success("Ação aplicada"); setSelected([]); load(); } catch (e) { toast.error(apiError(e.response?.data?.detail)); } };

  const toggleSel = (id) => setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  return (
    <div>
      <PageHeader title="Produtos" subtitle={`${data.total} produto(s) no catálogo`}>
        <Button onClick={() => setEditing("new")} className="bg-indigo-600 hover:bg-indigo-700" data-testid="product-create-button"><Plus className="w-4 h-4 mr-1" />Adicionar produto</Button>
      </PageHeader>

      <Card className="p-3 mb-4 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar produtos..." className="pl-9" data-testid="product-search-input"
            value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })} />
        </div>
        <Select value={filters.category || "all"} onValueChange={(v) => setFilters({ ...filters, category: v === "all" ? "" : v, page: 1 })}>
          <SelectTrigger className="w-40" data-testid="product-filter-category"><SelectValue placeholder="Categoria" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todas categorias</SelectItem>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
        </Select>
        <Select value={filters.status || "all"} onValueChange={(v) => setFilters({ ...filters, status: v === "all" ? "" : v, page: 1 })}>
          <SelectTrigger className="w-36" data-testid="product-filter-status"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos status</SelectItem><SelectItem value="published">Publicado</SelectItem><SelectItem value="draft">Rascunho</SelectItem><SelectItem value="hidden">Oculto</SelectItem></SelectContent>
        </Select>
        <Select value={filters.sort} onValueChange={(v) => setFilters({ ...filters, sort: v })}>
          <SelectTrigger className="w-36" data-testid="product-sort"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="recent">Mais recentes</SelectItem><SelectItem value="name">Nome A-Z</SelectItem><SelectItem value="price_asc">Menor preço</SelectItem><SelectItem value="price_desc">Maior preço</SelectItem><SelectItem value="views">Mais vistos</SelectItem></SelectContent>
        </Select>
      </Card>

      {selected.length > 0 && (
        <div className="flex items-center gap-2 mb-3 bg-indigo-50 border border-indigo-100 rounded-lg p-2 flex-wrap" data-testid="bulk-bar">
          <span className="text-sm text-indigo-700 font-medium px-2">{selected.length} selecionado(s)</span>
          <Button size="sm" variant="outline" onClick={() => bulk("publish")} data-testid="bulk-publish">Publicar</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("hide")} data-testid="bulk-hide">Ocultar</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("unavailable")} data-testid="bulk-unavailable">Indisponível</Button>
          <Button size="sm" variant="outline" onClick={() => bulk("delete")} className="text-red-600" data-testid="bulk-delete">Excluir</Button>
        </div>
      )}

      {loading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> :
        data.items.length === 0 ? (
          <Card className="p-6"><EmptyState icon={Package} title="Nenhum produto encontrado" description="Adicione seu primeiro produto ao catálogo."
            action={<Button onClick={() => setEditing("new")} className="bg-indigo-600 hover:bg-indigo-700">Adicionar produto</Button>} /></Card>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto scayl-scroll">
              <table className="w-full text-sm" data-testid="products-table">
                <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="p-3 w-8"></th><th className="p-3 text-left">Produto</th><th className="p-3 text-left hidden sm:table-cell">Categoria</th>
                    <th className="p-3 text-left">Preço</th><th className="p-3 text-left hidden md:table-cell">Disponib.</th>
                    <th className="p-3 text-left">Status</th><th className="p-3 text-left hidden lg:table-cell">Views</th><th className="p-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.items.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50" data-testid={`product-row-${p.id}`}>
                      <td className="p-3"><Checkbox checked={selected.includes(p.id)} onCheckedChange={() => toggleSel(p.id)} data-testid={`product-select-${p.id}`} /></td>
                      <td className="p-3">
                        <div className="flex items-center gap-3">
                          {p.images?.[0] ? <img src={mediaUrl(p.images[p.cover_index] || p.images[0])} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" /> :
                            <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><ImageIcon className="w-4 h-4 text-slate-400" /></div>}
                          <div className="min-w-0"><p className="font-medium text-slate-900 truncate flex items-center gap-1">{p.featured && <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />}{p.name}</p></div>
                        </div>
                      </td>
                      <td className="p-3 hidden sm:table-cell text-slate-600">{catName(p.category_id)}</td>
                      <td className="p-3">
                        {p.price_on_request ? <span className="text-slate-500 text-xs">Sob consulta</span> :
                          p.promo_price ? <span><span className="font-semibold text-slate-900">{brl(p.promo_price)}</span> <span className="line-through text-slate-400 text-xs">{brl(p.price)}</span></span> :
                            <span className="font-semibold text-slate-900">{brl(p.price)}</span>}
                      </td>
                      <td className="p-3 hidden md:table-cell text-slate-600">{AVAIL_LABELS[p.availability]}</td>
                      <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${STATUS_COLORS[p.status]}`}>{STATUS_LABELS[p.status]}</span></td>
                      <td className="p-3 hidden lg:table-cell text-slate-600 font-mono-scayl">{p.views || 0}</td>
                      <td className="p-3">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild><button data-testid={`product-menu-${p.id}`} className="text-slate-400 hover:text-slate-700"><MoreVertical className="w-4 h-4" /></button></DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setEditing(p)} data-testid={`product-edit-${p.id}`}>Editar</DropdownMenuItem>
                            <DropdownMenuItem asChild><a href={`${BACKEND_URL}/loja/${store?.slug}?p=${p.id}`} target="_blank" rel="noreferrer">Visualizar no catálogo</a></DropdownMenuItem>
                            <DropdownMenuItem onClick={() => duplicate(p)}>Duplicar</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => quickUpdate(p, { featured: !p.featured })}>{p.featured ? "Remover destaque" : "Destacar"}</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => setEditing(p)}>Colocar em promoção</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => quickUpdate(p, { availability: "unavailable" })}>Marcar indisponível</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => quickUpdate(p, { availability: "out_of_stock" })}>Marcar esgotado</DropdownMenuItem>
                            <DropdownMenuItem onClick={() => quickUpdate(p, { status: "hidden" })}>Ocultar</DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => setDelId(p.id)} className="text-red-600" data-testid={`product-delete-${p.id}`}>Excluir</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between p-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">Página {filters.page} de {totalPages}</span>
              <div className="flex gap-1">
                <Button size="icon" variant="outline" disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} data-testid="page-prev"><ChevronLeft className="w-4 h-4" /></Button>
                <Button size="icon" variant="outline" disabled={filters.page >= totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} data-testid="page-next"><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>
          </Card>
        )}

      <ProductEditor open={!!editing} product={editing === "new" ? null : editing} cats={cats}
        onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />

      <AlertDialog open={!!delId} onOpenChange={(o) => !o && setDelId(null)}>
        <AlertDialogContent data-testid="product-delete-dialog">
          <AlertDialogHeader><AlertDialogTitle>Excluir produto?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={doDelete} className="bg-red-600 hover:bg-red-700" data-testid="product-delete-confirm">Excluir</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
