import { useState } from "react";
import api, { apiError } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/panel/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Loader2, Banknote, CreditCard, QrCode, Wallet } from "lucide-react";

export default function Payments() {
  const { store, reloadStore } = useAuth();
  const p = store?.payments || {};
  const [f, setF] = useState({
    pix: p.pix ?? true, credit: p.credit ?? true, credit_installments: p.credit_installments ?? 3,
    debit: p.debit ?? true, cash: p.cash ?? true, cash_change: p.cash_change ?? true, pix_key: p.pix_key || "",
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try { await api.put("/store/payments", f); await reloadStore(); toast.success("Formas de pagamento salvas"); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const Row = ({ icon: Icon, title, desc, k, children }) => (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3"><Icon className="w-5 h-5 text-indigo-600" /><div><p className="font-semibold text-slate-900">{title}</p><p className="text-xs text-slate-500">{desc}</p></div></div>
        <Switch checked={f[k]} onCheckedChange={(v) => setF({ ...f, [k]: v })} data-testid={`payment-${k}`} />
      </div>
      {f[k] && children && <div className="pl-8 mt-3">{children}</div>}
    </Card>
  );

  return (
    <div className="max-w-3xl">
      <PageHeader title="Formas de pagamento" subtitle="O catálogo não cobra nem coleta cartão — o pagamento é combinado no WhatsApp." />
      <div className="space-y-4">
        <Row icon={QrCode} title="Pix" desc="Chave enviada no WhatsApp" k="pix">
          <div className="space-y-2"><Label>Chave Pix</Label><Input value={f.pix_key} onChange={(e) => setF({ ...f, pix_key: e.target.value })} data-testid="pix-key" placeholder="email, telefone ou aleatória" /></div>
        </Row>
        <Row icon={CreditCard} title="Cartão de crédito" desc="Na entrega/retirada" k="credit">
          <div className="space-y-2"><Label>Parcelas máximas</Label>
            <Input type="number" min={1} max={12} value={f.credit_installments} onChange={(e) => setF({ ...f, credit_installments: parseInt(e.target.value) || 1 })} data-testid="credit-installments" className="w-32" /></div>
        </Row>
        <Row icon={CreditCard} title="Cartão de débito" desc="Na entrega/retirada" k="debit" />
        <Row icon={Banknote} title="Dinheiro" desc="Na entrega/retirada" k="cash">
          <div className="flex items-center gap-2"><Switch checked={f.cash_change} onCheckedChange={(v) => setF({ ...f, cash_change: v })} data-testid="cash-change" /><Label>Perguntar se precisa de troco</Label></div>
        </Row>
      </div>
      <div className="flex justify-end mt-4">
        <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700" data-testid="payments-save">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
      </div>
    </div>
  );
}
