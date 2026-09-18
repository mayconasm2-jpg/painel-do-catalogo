import { useState } from "react";
import api, { apiError } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/panel/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Loader2, Globe, EyeOff, Wrench } from "lucide-react";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";
import { STATUS_LABELS } from "@/lib/format";

export default function StoreProfile() {
  const { store, reloadStore } = useAuth();
  const [f, setF] = useState({
    name: store?.name || "", segment: store?.segment || "", description: store?.description || "",
    slug: store?.slug || "", whatsapp: store?.whatsapp || "", instagram: store?.instagram || "",
    address: store?.address || "", map_url: store?.map_url || "", hours: store?.hours || "", notice: store?.notice || "",
  });
  const [saving, setSaving] = useState(false);
  const upd = (k) => (e) => setF({ ...f, [k]: e.target.value });

  const save = async () => {
    setSaving(true);
    try { await api.put("/store", f); await reloadStore(); toast.success("Dados salvos"); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const setStatus = async (status) => {
    try { await api.post("/store/status", { status }); await reloadStore(); toast.success("Status atualizado"); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };

  const statusColor = { published: "text-emerald-600 bg-emerald-50", unpublished: "text-slate-600 bg-slate-100", maintenance: "text-amber-600 bg-amber-50" };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Minha loja" subtitle="Informações públicas exibidas no catálogo.">
        <span className={`text-xs font-semibold px-3 py-1.5 rounded-full ${statusColor[store?.status]}`} data-testid="store-status-badge">{STATUS_LABELS[store?.status]}</span>
      </PageHeader>

      <Card className="p-5 sm:p-6 space-y-4">
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Nome da loja</Label><Input value={f.name} onChange={upd("name")} data-testid="store-name" /></div>
          <div className="space-y-2"><Label>Segmento</Label><Input value={f.segment} onChange={upd("segment")} data-testid="store-segment" /></div>
        </div>
        <div className="space-y-2"><Label>Descrição</Label><Textarea value={f.description} onChange={upd("description")} data-testid="store-description" rows={3} /></div>
        <div className="space-y-2">
          <Label>Endereço público (slug)</Label>
          <div className="flex items-center rounded-lg border border-slate-200 overflow-hidden">
            <span className="px-3 text-sm text-slate-400 bg-slate-50 py-2.5">/loja/</span>
            <input value={f.slug} onChange={upd("slug")} data-testid="store-slug" className="flex-1 px-2 py-2.5 outline-none text-sm" />
          </div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>WhatsApp principal (com DDI)</Label><Input value={f.whatsapp} onChange={upd("whatsapp")} placeholder="5599999999999" data-testid="store-whatsapp" /></div>
          <div className="space-y-2"><Label>Instagram</Label><Input value={f.instagram} onChange={upd("instagram")} placeholder="@sualoja" data-testid="store-instagram" /></div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-2"><Label>Endereço</Label><Input value={f.address} onChange={upd("address")} data-testid="store-address" /></div>
          <div className="space-y-2"><Label>Link do mapa (opcional)</Label><Input value={f.map_url} onChange={upd("map_url")} data-testid="store-map" /></div>
        </div>
        <div className="space-y-2"><Label>Horários / aviso comercial</Label><Input value={f.hours} onChange={upd("hours")} data-testid="store-hours" /></div>
        <div className="space-y-2"><Label>Aviso destacado</Label><Input value={f.notice} onChange={upd("notice")} data-testid="store-notice" /></div>
        <div className="flex justify-end pt-2">
          <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700" data-testid="store-save">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
        </div>
      </Card>

      <Card className="p-5 sm:p-6 mt-4">
        <h3 className="font-heading font-bold text-slate-900 mb-1">Publicação</h3>
        <p className="text-sm text-slate-500 mb-4">Controle a visibilidade do catálogo público.</p>
        <div className="flex flex-wrap gap-2">
          <StatusButton onConfirm={() => setStatus("published")} icon={Globe} label="Publicar" desc="O catálogo ficará visível publicamente." testid="publish" className="bg-emerald-600 hover:bg-emerald-700 text-white" />
          <StatusButton onConfirm={() => setStatus("unpublished")} icon={EyeOff} label="Despublicar" desc="O catálogo deixará de ficar acessível." testid="unpublish" className="border" />
          <StatusButton onConfirm={() => setStatus("maintenance")} icon={Wrench} label="Manutenção" desc="Exibe aviso de manutenção aos visitantes." testid="maintenance" className="border" />
        </div>
      </Card>
    </div>
  );
}

function StatusButton({ onConfirm, icon: Icon, label, desc, testid, className }) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" className={className} data-testid={`store-${testid}`}><Icon className="w-4 h-4 mr-1" />{label}</Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader><AlertDialogTitle>{label} catálogo?</AlertDialogTitle><AlertDialogDescription>{desc}</AlertDialogDescription></AlertDialogHeader>
        <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={onConfirm} data-testid={`store-${testid}-confirm`}>Confirmar</AlertDialogAction></AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
