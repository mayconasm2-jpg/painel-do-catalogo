import { useState } from "react";
import api, { apiError } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader, EmptyState } from "@/components/panel/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Tag, Sparkles, Check, Loader2, Info } from "lucide-react";
import { PLAN_LABELS } from "@/lib/format";

const PLAN_DETAILS = {
  essencial: { price: "R$ 0", features: ["30 produtos", "5 fotos por produto", "1 usuário", "Métricas básicas"] },
  profissional: { price: "R$ 79/mês", features: ["150 produtos", "10 fotos por produto", "5 usuários", "Cupons", "Métricas completas"] },
  premium: { price: "R$ 149/mês", features: ["Produtos ilimitados", "Mais usuários", "Domínio próprio", "Sem marca Scayl"] },
};

export function Promotions() {
  const { store } = useAuth();
  const hasCoupons = store?.limits?.coupons;
  return (
    <div>
      <PageHeader title="Promoções e cupons" subtitle="Crie descontos e códigos promocionais." />
      {!hasCoupons ? (
        <Card className="p-6"><EmptyState icon={Tag} title="Cupons disponíveis no plano Profissional"
          description="Seu plano atual não inclui cupons. Faça upgrade para o Profissional ou Premium para criar códigos de desconto."
          action={<Button asChild className="bg-indigo-600 hover:bg-indigo-700"><a href="/subscription">Ver planos</a></Button>} /></Card>
      ) : (
        <Card className="p-6"><EmptyState icon={Tag} title="Módulo de cupons em ativação"
          description="A criação de cupons (código, desconto %, valor mínimo, validade, limite de usos e produtos elegíveis) será conectada ao fluxo da sacola do catálogo. Marque suas promoções por produto na aba 'Colocar em promoção' de cada item enquanto isso." /></Card>
      )}
    </div>
  );
}

export function Subscription() {
  const { store, reloadStore } = useAuth();
  const plan = store?.plan || "essencial";
  const limits = store?.limits || {};
  const used = store?.product_count || 0;
  const pct = limits.products ? Math.min(100, Math.round((used / limits.products) * 100)) : 0;

  return (
    <div className="max-w-4xl">
      <PageHeader title="Plano e assinatura" subtitle="Gerencie seu plano Scayl." />
      <Card className="p-5 mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="text-xs uppercase tracking-wider text-slate-400">Plano atual</p>
            <p className="font-heading text-2xl font-extrabold text-slate-900">{PLAN_LABELS[plan]}</p>
            <p className="text-sm text-slate-500 capitalize">Status: {store?.plan_status}</p>
          </div>
          <div className="w-full sm:w-64">
            <div className="flex justify-between text-xs text-slate-500 mb-1"><span>Produtos</span><span>{used}/{limits.products === 100000 ? "∞" : limits.products}</span></div>
            <Progress value={pct} data-testid="usage-products" />
          </div>
        </div>
      </Card>

      <div className="bg-amber-50 border border-amber-100 rounded-lg p-3 text-sm text-amber-700 mb-4 flex gap-2">
        <Info className="w-4 h-4 shrink-0 mt-0.5" />
        <span>Ainda não há provedor de pagamento contratado. A troca de plano é feita manualmente pela administração Scayl — as opções abaixo são informativas e não geram cobrança.</span>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(PLAN_DETAILS).map(([k, d]) => (
          <Card key={k} className={`p-5 ${k === plan ? "ring-2 ring-indigo-500" : ""}`} data-testid={`plan-card-${k}`}>
            <div className="flex items-center gap-2 mb-2"><Sparkles className="w-4 h-4 text-indigo-600" /><span className="font-heading font-bold">{PLAN_LABELS[k]}</span></div>
            <p className="text-2xl font-extrabold text-slate-900 mb-3">{d.price}</p>
            <ul className="space-y-1.5 mb-4">{d.features.map((f) => <li key={f} className="flex items-center gap-2 text-sm text-slate-600"><Check className="w-4 h-4 text-emerald-500" />{f}</li>)}</ul>
            <Button disabled={k === plan} variant={k === plan ? "outline" : "default"} className={k === plan ? "w-full" : "w-full bg-indigo-600 hover:bg-indigo-700"} data-testid={`plan-select-${k}`}
              onClick={() => toast.info("Para alterar o plano, entre em contato com a administração Scayl.")}>
              {k === plan ? "Plano atual" : "Selecionar"}
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export function Settings() {
  const { user } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [pw, setPw] = useState({ current_password: "", new_password: "" });
  const [saving, setSaving] = useState(false);

  const saveAccount = async () => {
    try { await api.put("/auth/account", { name }); toast.success("Conta atualizada"); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  const changePw = async () => {
    setSaving(true);
    try { await api.put("/auth/change-password", pw); toast.success("Senha alterada"); setPw({ current_password: "", new_password: "" }); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  const exportData = async () => {
    const { data } = await api.get("/products?page_size=1000");
    const blob = new Blob([JSON.stringify(data.items, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "produtos-scayl.json"; a.click();
    toast.success("Dados exportados");
  };

  return (
    <div className="max-w-2xl">
      <PageHeader title="Configurações" subtitle="Conta e preferências." />
      <Card className="p-5 space-y-4">
        <h3 className="font-heading font-bold text-slate-900">Dados da conta</h3>
        <div className="space-y-2"><Label>Nome</Label><Input value={name} onChange={(e) => setName(e.target.value)} data-testid="settings-name" /></div>
        <div className="space-y-2"><Label>E-mail</Label><Input value={user?.email} disabled /></div>
        <div className="flex justify-end"><Button onClick={saveAccount} className="bg-indigo-600 hover:bg-indigo-700" data-testid="settings-save-account">Salvar</Button></div>
      </Card>
      <Card className="p-5 space-y-4 mt-4">
        <h3 className="font-heading font-bold text-slate-900">Alterar senha</h3>
        <div className="space-y-2"><Label>Senha atual</Label><Input type="password" value={pw.current_password} onChange={(e) => setPw({ ...pw, current_password: e.target.value })} data-testid="settings-current-pw" /></div>
        <div className="space-y-2"><Label>Nova senha</Label><Input type="password" value={pw.new_password} onChange={(e) => setPw({ ...pw, new_password: e.target.value })} data-testid="settings-new-pw" /></div>
        <div className="flex justify-end"><Button onClick={changePw} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700" data-testid="settings-change-pw">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Alterar senha"}</Button></div>
      </Card>
      <Card className="p-5 space-y-3 mt-4">
        <h3 className="font-heading font-bold text-slate-900">Dados</h3>
        <p className="text-sm text-slate-500">Exporte seus produtos em JSON.</p>
        <Button onClick={exportData} variant="outline" data-testid="settings-export">Exportar produtos</Button>
      </Card>
    </div>
  );
}
