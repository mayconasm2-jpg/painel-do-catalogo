import { useState } from "react";
import api, { apiError } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/panel/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Truck, Store, Plus, X } from "lucide-react";
import { brl } from "@/lib/format";

export default function Delivery() {
  const { store, reloadStore } = useAuth();
  const d = store?.delivery || {};
  const [f, setF] = useState({
    delivery_enabled: d.delivery_enabled ?? true, pickup_enabled: d.pickup_enabled ?? true,
    regions: d.regions || [], pickup_address: d.pickup_address || "", pickup_instructions: d.pickup_instructions || "",
  });
  const [region, setRegion] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { await api.put("/store/delivery", f); await reloadStore(); toast.success("Configuração salva"); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Entrega e retirada" subtitle="Defina como o cliente recebe o pedido." />
      <div className="bg-indigo-50 border border-indigo-100 rounded-lg p-3 text-sm text-indigo-700 mb-4">
        Nesta versão, a <b>entrega</b> soma <b>{brl(8)}</b> fixos e a <b>retirada</b> é gratuita. O endereço do cliente é obrigatório apenas na entrega.
      </div>

      <Card className="p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Truck className="w-5 h-5 text-indigo-600" /><div><p className="font-semibold text-slate-900">Entrega</p><p className="text-xs text-slate-500">Taxa fixa de {brl(8)}</p></div></div>
          <Switch checked={f.delivery_enabled} onCheckedChange={(v) => setF({ ...f, delivery_enabled: v })} data-testid="delivery-toggle" />
        </div>
        {f.delivery_enabled && (
          <div className="pl-8 space-y-2">
            <Label>Regiões atendidas</Label>
            <div className="flex gap-2">
              <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="Ex: Centro" data-testid="region-input" />
              <Button type="button" onClick={() => { if (region.trim()) { setF({ ...f, regions: [...f.regions, region.trim()] }); setRegion(""); } }} data-testid="region-add"><Plus className="w-4 h-4" /></Button>
            </div>
            <div className="flex flex-wrap gap-2">
              {f.regions.map((r, i) => (
                <span key={i} className="flex items-center gap-1 bg-slate-100 rounded-full px-3 py-1 text-sm" data-testid={`region-${i}`}>
                  {r}<button onClick={() => setF({ ...f, regions: f.regions.filter((_, j) => j !== i) })}><X className="w-3 h-3" /></button>
                </span>
              ))}
            </div>
          </div>
        )}
      </Card>

      <Card className="p-5 space-y-4 mt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3"><Store className="w-5 h-5 text-indigo-600" /><div><p className="font-semibold text-slate-900">Retirada no local</p><p className="text-xs text-slate-500">Gratuita</p></div></div>
          <Switch checked={f.pickup_enabled} onCheckedChange={(v) => setF({ ...f, pickup_enabled: v })} data-testid="pickup-toggle" />
        </div>
        {f.pickup_enabled && (
          <div className="pl-8 space-y-3">
            <div className="space-y-2"><Label>Endereço de retirada</Label><Input value={f.pickup_address} onChange={(e) => setF({ ...f, pickup_address: e.target.value })} data-testid="pickup-address" /></div>
            <div className="space-y-2"><Label>Instruções</Label><Textarea value={f.pickup_instructions} onChange={(e) => setF({ ...f, pickup_instructions: e.target.value })} data-testid="pickup-instructions" rows={2} /></div>
          </div>
        )}
      </Card>

      <div className="flex justify-end mt-4">
        <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700" data-testid="delivery-save">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
      </div>
    </div>
  );
}
