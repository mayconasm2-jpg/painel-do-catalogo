import { useEffect, useState } from "react";
import api, { apiError, mediaUrl } from "@/lib/apiClient";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Loader2, Plus, Trash2, X, Upload, Star, ArrowLeft, ArrowRight } from "lucide-react";
import { useRef } from "react";

const EMPTY = {
  name: "", category_id: "", subcategory: "", sku: "", description: "", short_description: "",
  tags: [], price: 0, promo_price: null, price_on_request: false, installments: null,
  availability: "available", status: "draft", featured: false, images: [], cover_index: 0,
  variations: [], specs: [],
};

export function ProductEditor({ open, product, cats, onClose, onSaved }) {
  const [f, setF] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef();

  useEffect(() => {
    if (open) { setF(product ? { ...EMPTY, ...product } : EMPTY); setDirty(false); }
  }, [open, product]);

  const set = (k, v) => { setF((p) => ({ ...p, [k]: v })); setDirty(true); };

  const uploadImages = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = [];
      for (const file of files) {
        const fd = new FormData(); fd.append("file", file);
        const { data } = await api.post("/media", fd, { headers: { "Content-Type": "multipart/form-data" } });
        urls.push(data.url);
      }
      set("images", [...f.images, ...urls]);
    } catch (err) { toast.error(apiError(err.response?.data?.detail) || "Falha no upload"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const moveImg = (i, dir) => {
    const arr = [...f.images]; const j = i + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]]; set("images", arr);
  };
  const removeImg = (i) => set("images", f.images.filter((_, j) => j !== i));

  const addVariation = () => set("variations", [...f.variations, { name: "", type: "single", required: false, options: [{ label: "", price_diff: 0, available: true }] }]);
  const updVar = (i, patch) => set("variations", f.variations.map((v, j) => j === i ? { ...v, ...patch } : v));
  const addOpt = (i) => updVar(i, { options: [...f.variations[i].options, { label: "", price_diff: 0, available: true }] });
  const updOpt = (i, oi, patch) => updVar(i, { options: f.variations[i].options.map((o, j) => j === oi ? { ...o, ...patch } : o) });

  const addSpec = () => set("specs", [...f.specs, { name: "", value: "" }]);
  const updSpec = (i, patch) => set("specs", f.specs.map((s, j) => j === i ? { ...s, ...patch } : s));

  const save = async (status, thenView) => {
    if (!f.name.trim()) return toast.error("Informe o nome do produto");
    setSaving(true);
    const body = { ...f, status, price: parseFloat(f.price) || 0, promo_price: f.promo_price ? parseFloat(f.promo_price) : null, cover_index: Math.min(f.cover_index, Math.max(0, f.images.length - 1)) };
    try {
      let saved;
      if (product?.id) saved = (await api.put(`/products/${product.id}`, body)).data;
      else saved = (await api.post("/products", body)).data;
      toast.success(status === "published" ? "Produto publicado" : "Produto salvo");
      onSaved();
      if (thenView) {
        const st = await api.get("/store");
        window.open(`${process.env.REACT_APP_BACKEND_URL}/loja/${st.data.slug}?p=${saved.id}`, "_blank");
      }
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const handleClose = () => {
    if (dirty && !window.confirm("Há alterações não salvas. Deseja sair mesmo assim?")) return;
    onClose();
  };

  return (
    <Sheet open={open} onOpenChange={(o) => !o && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl overflow-y-auto scayl-scroll p-0" data-testid="product-editor">
        <SheetHeader className="p-5 border-b border-slate-100 sticky top-0 bg-white z-10">
          <SheetTitle>{product?.id ? "Editar produto" : "Novo produto"}</SheetTitle>
        </SheetHeader>
        <div className="p-5 space-y-5">
          <div className="space-y-2"><Label>Nome *</Label><Input value={f.name} onChange={(e) => set("name", e.target.value)} data-testid="pe-name" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Categoria</Label>
              <Select value={f.category_id || ""} onValueChange={(v) => set("category_id", v)}>
                <SelectTrigger data-testid="pe-category"><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{cats.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="space-y-2"><Label>Subcategoria</Label><Input value={f.subcategory} onChange={(e) => set("subcategory", e.target.value)} data-testid="pe-subcategory" /></div>
          </div>
          <div className="space-y-2"><Label>SKU (opcional)</Label><Input value={f.sku} onChange={(e) => set("sku", e.target.value)} data-testid="pe-sku" /></div>
          <div className="space-y-2"><Label>Descrição curta</Label><Input value={f.short_description} onChange={(e) => set("short_description", e.target.value)} data-testid="pe-short" /></div>
          <div className="space-y-2"><Label>Descrição completa</Label><Textarea rows={3} value={f.description} onChange={(e) => set("description", e.target.value)} data-testid="pe-description" /></div>

          {/* Images */}
          <div className="space-y-2">
            <Label>Imagens</Label>
            <div className="grid grid-cols-3 gap-2">
              {f.images.map((img, i) => (
                <div key={i} className={`relative rounded-lg overflow-hidden border-2 ${f.cover_index === i ? "border-indigo-500" : "border-slate-200"}`} data-testid={`pe-image-${i}`}>
                  <img src={mediaUrl(img)} alt="" className="w-full h-20 object-cover" />
                  <button onClick={() => removeImg(i)} className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5"><X className="w-3 h-3" /></button>
                  <div className="absolute bottom-0 inset-x-0 bg-black/50 flex justify-between items-center px-1">
                    <button onClick={() => moveImg(i, -1)} className="text-white"><ArrowLeft className="w-3 h-3" /></button>
                    <button onClick={() => set("cover_index", i)} title="Capa"><Star className={`w-3 h-3 ${f.cover_index === i ? "text-amber-400 fill-amber-400" : "text-white"}`} /></button>
                    <button onClick={() => moveImg(i, 1)} className="text-white"><ArrowRight className="w-3 h-3" /></button>
                  </div>
                </div>
              ))}
              <button onClick={() => fileRef.current?.click()} data-testid="pe-image-add"
                className="h-20 rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 flex items-center justify-center text-slate-400">
                {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Upload className="w-5 h-5" />}
              </button>
            </div>
            <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={uploadImages} data-testid="pe-image-input" />
          </div>

          {/* Price */}
          <div className="flex items-center gap-2"><Switch checked={f.price_on_request} onCheckedChange={(v) => set("price_on_request", v)} data-testid="pe-on-request" /><Label>Preço sob consulta</Label></div>
          {!f.price_on_request && (
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2"><Label>Preço normal (R$)</Label><Input type="number" step="0.01" value={f.price} onChange={(e) => set("price", e.target.value)} data-testid="pe-price" /></div>
              <div className="space-y-2"><Label>Preço promocional</Label><Input type="number" step="0.01" value={f.promo_price ?? ""} onChange={(e) => set("promo_price", e.target.value || null)} data-testid="pe-promo" /></div>
            </div>
          )}
          <div className="space-y-2"><Label>Parcelas (opcional)</Label><Input type="number" value={f.installments ?? ""} onChange={(e) => set("installments", e.target.value ? parseInt(e.target.value) : null)} data-testid="pe-installments" className="w-32" /></div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2"><Label>Disponibilidade</Label>
              <Select value={f.availability} onValueChange={(v) => set("availability", v)}>
                <SelectTrigger data-testid="pe-availability"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="available">Disponível</SelectItem><SelectItem value="unavailable">Indisponível</SelectItem><SelectItem value="out_of_stock">Esgotado</SelectItem></SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2 pb-2"><Switch checked={f.featured} onCheckedChange={(v) => set("featured", v)} data-testid="pe-featured" /><Label>Destaque</Label></div>
          </div>

          {/* Variations */}
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Variações</Label><Button size="sm" variant="outline" onClick={addVariation} data-testid="pe-add-variation"><Plus className="w-3 h-3 mr-1" />Grupo</Button></div>
            {f.variations.map((v, i) => (
              <div key={i} className="border border-slate-200 rounded-lg p-3 space-y-2" data-testid={`pe-variation-${i}`}>
                <div className="flex gap-2">
                  <Input placeholder="Nome (ex: Tamanho)" value={v.name} onChange={(e) => updVar(i, { name: e.target.value })} />
                  <Button size="icon" variant="ghost" className="text-red-500" onClick={() => set("variations", f.variations.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Select value={v.type} onValueChange={(val) => updVar(i, { type: val })}><SelectTrigger className="w-32 h-8"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="single">Escolha única</SelectItem><SelectItem value="multiple">Múltipla</SelectItem></SelectContent></Select>
                  <label className="flex items-center gap-1"><Switch checked={v.required} onCheckedChange={(val) => updVar(i, { required: val })} />Obrigatório</label>
                </div>
                {v.options.map((o, oi) => (
                  <div key={oi} className="flex gap-2 items-center">
                    <Input placeholder="Opção" value={o.label} onChange={(e) => updOpt(i, oi, { label: e.target.value })} className="h-8" />
                    <Input placeholder="+R$" type="number" step="0.01" value={o.price_diff} onChange={(e) => updOpt(i, oi, { price_diff: parseFloat(e.target.value) || 0 })} className="h-8 w-20" />
                    <Switch checked={o.available} onCheckedChange={(val) => updOpt(i, oi, { available: val })} />
                  </div>
                ))}
                <Button size="sm" variant="ghost" onClick={() => addOpt(i)}><Plus className="w-3 h-3 mr-1" />Opção</Button>
              </div>
            ))}
          </div>

          {/* Specs */}
          <div className="space-y-2">
            <div className="flex items-center justify-between"><Label>Especificações técnicas</Label><Button size="sm" variant="outline" onClick={addSpec} data-testid="pe-add-spec"><Plus className="w-3 h-3 mr-1" />Add</Button></div>
            {f.specs.map((s, i) => (
              <div key={i} className="flex gap-2">
                <Input placeholder="Nome" value={s.name} onChange={(e) => updSpec(i, { name: e.target.value })} className="h-8" />
                <Input placeholder="Valor" value={s.value} onChange={(e) => updSpec(i, { value: e.target.value })} className="h-8" />
                <Button size="icon" variant="ghost" className="text-red-500 h-8 w-8" onClick={() => set("specs", f.specs.filter((_, j) => j !== i))}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </div>
        </div>

        <div className="sticky bottom-0 bg-white border-t border-slate-100 p-4 flex flex-wrap gap-2 justify-end">
          <Button variant="ghost" onClick={handleClose} data-testid="pe-cancel">Cancelar</Button>
          <Button variant="outline" onClick={() => save("draft")} disabled={saving} data-testid="pe-save-draft">Salvar rascunho</Button>
          <Button variant="outline" onClick={() => save(f.status === "published" ? "published" : "draft", true)} disabled={saving} data-testid="pe-save-view">Salvar e visualizar</Button>
          <Button onClick={() => save("published")} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700" data-testid="pe-publish">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Publicar"}</Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
