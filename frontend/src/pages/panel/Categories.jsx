import { useEffect, useState } from "react";
import api, { apiError, mediaUrl } from "@/lib/apiClient";
import { PageHeader, EmptyState } from "@/components/panel/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { FolderTree, Plus, ArrowUp, ArrowDown, Pencil, Trash2, Loader2 } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
  AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { ImageUpload } from "@/components/panel/ImageUpload";

export default function Categories() {
  const [cats, setCats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ name: "", image_media: null, active: true });
  const [saving, setSaving] = useState(false);
  const [delTarget, setDelTarget] = useState(null);
  const [moveTo, setMoveTo] = useState("");

  const load = () => api.get("/categories").then((r) => { setCats(r.data); setLoading(false); });
  useEffect(() => { load(); }, []);

  const openNew = () => { setEditing("new"); setForm({ name: "", image_media: null, active: true }); };
  const openEdit = (c) => { setEditing(c.id); setForm({ name: c.name, image_media: c.image_media, active: c.active }); };

  const save = async () => {
    if (!form.name.trim()) return toast.error("Informe o nome da categoria");
    setSaving(true);
    try {
      if (editing === "new") await api.post("/categories", form);
      else await api.put(`/categories/${editing}`, form);
      toast.success("Categoria salva");
      setEditing(null); load();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const move = async (idx, dir) => {
    const arr = [...cats];
    const j = idx + dir;
    if (j < 0 || j >= arr.length) return;
    [arr[idx], arr[j]] = [arr[j], arr[idx]];
    setCats(arr);
    await api.put("/categories/reorder", { ids: arr.map((c) => c.id) });
    toast.success("Ordem atualizada");
  };

  const toggle = async (c) => {
    await api.put(`/categories/${c.id}`, { name: c.name, image_media: c.image_media, active: !c.active });
    load();
  };

  const confirmDelete = async () => {
    try {
      await api.delete(`/categories/${delTarget.id}${moveTo ? `?target=${moveTo}` : ""}`);
      toast.success("Categoria excluída");
      setDelTarget(null); setMoveTo(""); load();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };

  return (
    <div>
      <PageHeader title="Categorias" subtitle="Organize os produtos do seu catálogo.">
        <Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700" data-testid="category-add"><Plus className="w-4 h-4 mr-1" />Nova categoria</Button>
      </PageHeader>

      {loading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> :
        cats.length === 0 ? (
          <Card className="p-6"><EmptyState icon={FolderTree} title="Nenhuma categoria" description="Crie categorias para organizar seus produtos no catálogo."
            action={<Button onClick={openNew} className="bg-indigo-600 hover:bg-indigo-700">Criar categoria</Button>} /></Card>
        ) : (
          <Card className="divide-y divide-slate-100" data-testid="categories-list">
            {cats.map((c, i) => (
              <div key={c.id} className="flex items-center gap-3 p-3 sm:p-4" data-testid={`category-row-${c.id}`}>
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="text-slate-400 hover:text-slate-700 disabled:opacity-30" data-testid={`category-up-${c.id}`}><ArrowUp className="w-4 h-4" /></button>
                  <button onClick={() => move(i, 1)} disabled={i === cats.length - 1} className="text-slate-400 hover:text-slate-700 disabled:opacity-30" data-testid={`category-down-${c.id}`}><ArrowDown className="w-4 h-4" /></button>
                </div>
                {c.image_media ? <img src={mediaUrl(c.image_media)} alt="" className="w-10 h-10 rounded-lg object-cover bg-slate-100" /> :
                  <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center"><FolderTree className="w-5 h-5 text-slate-400" /></div>}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 truncate">{c.name}</p>
                  <p className="text-xs text-slate-500">{c.product_count} produto(s)</p>
                </div>
                <Switch checked={c.active} onCheckedChange={() => toggle(c)} data-testid={`category-active-${c.id}`} />
                <Button size="icon" variant="ghost" onClick={() => openEdit(c)} data-testid={`category-edit-${c.id}`}><Pencil className="w-4 h-4" /></Button>
                <Button size="icon" variant="ghost" onClick={() => { setDelTarget(c); setMoveTo(""); }} className="text-red-500" data-testid={`category-delete-${c.id}`}><Trash2 className="w-4 h-4" /></Button>
              </div>
            ))}
          </Card>
        )}

      <Dialog open={!!editing} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent data-testid="category-dialog">
          <DialogHeader><DialogTitle>{editing === "new" ? "Nova categoria" : "Editar categoria"}</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>Nome</Label><Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="category-name-input" /></div>
            <div className="space-y-2"><Label>Imagem/Ícone (opcional)</Label>
              <ImageUpload value={form.image_media} onChange={(v) => setForm({ ...form, image_media: v })} testid="category-image" /></div>
            <div className="flex items-center gap-2"><Switch checked={form.active} onCheckedChange={(v) => setForm({ ...form, active: v })} data-testid="category-active-input" /><Label>Ativa</Label></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancelar</Button>
            <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700" data-testid="category-save">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!delTarget} onOpenChange={(o) => !o && setDelTarget(null)}>
        <AlertDialogContent data-testid="category-delete-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir "{delTarget?.name}"?</AlertDialogTitle>
            <AlertDialogDescription>
              {delTarget?.product_count > 0
                ? `Esta categoria tem ${delTarget?.product_count} produto(s). Escolha uma categoria de destino antes de excluir.`
                : "Esta ação não pode ser desfeita."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {delTarget?.product_count > 0 && (
            <Select value={moveTo} onValueChange={setMoveTo}>
              <SelectTrigger data-testid="category-move-target"><SelectValue placeholder="Mover produtos para..." /></SelectTrigger>
              <SelectContent>
                {cats.filter((c) => c.id !== delTarget?.id).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={delTarget?.product_count > 0 && !moveTo} className="bg-red-600 hover:bg-red-700" data-testid="category-delete-confirm">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
