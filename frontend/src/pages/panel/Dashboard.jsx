import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import api from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/panel/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Eye, ShoppingBag, MessageCircle, Package, Users, Plus, ExternalLink,
  CheckCircle2, Circle, TrendingUp,
} from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const PERIODS = [{ k: "today", l: "Hoje" }, { k: "7d", l: "7 dias" }, { k: "30d", l: "30 dias" }];
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

function Kpi({ icon: Icon, label, value, color }) {
  return (
    <Card className="p-4 sm:p-5" data-testid={`kpi-${label}`}>
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}><Icon className="w-5 h-5" /></div>
      </div>
      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono-scayl mt-3">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </Card>
  );
}

export default function Dashboard() {
  const { store } = useAuth();
  const [period, setPeriod] = useState("7d");
  const [data, setData] = useState(null);
  const catalogUrl = store ? `${BACKEND_URL}/loja/${store.slug}` : "#";

  useEffect(() => {
    api.get(`/analytics?period=${period}`).then((r) => setData(r.data)).catch(() => {});
  }, [period]);

  const k = data?.kpis || {};
  const checklist = [
    { done: !!store?.description, label: "Completar dados da loja", to: "/store-profile" },
    { done: (store?.product_count || 0) >= 3, label: "Cadastrar ao menos 3 produtos", to: "/products" },
    { done: store?.delivery?.delivery_enabled || store?.delivery?.pickup_enabled, label: "Configurar entrega/retirada", to: "/delivery" },
    { done: store?.status === "published", label: "Publicar o catálogo", to: "/store-profile" },
  ];

  return (
    <div>
      <PageHeader title="Visão geral" subtitle="Acompanhe o desempenho do seu catálogo.">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1" data-testid="period-toggle">
          {PERIODS.map((p) => (
            <button key={p.k} onClick={() => setPeriod(p.k)} data-testid={`period-${p.k}`}
              className={`px-3 py-1.5 text-sm rounded-md font-medium transition-colors ${period === p.k ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{p.l}</button>
          ))}
        </div>
        <Button asChild variant="outline" data-testid="dashboard-view-catalog"><a href={catalogUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-1" />Ver catálogo</a></Button>
        <Button asChild className="bg-indigo-600 hover:bg-indigo-700" data-testid="dashboard-add-product"><Link to="/products?new=1"><Plus className="w-4 h-4 mr-1" />Adicionar produto</Link></Button>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Kpi icon={Eye} label="Visitas" value={k.visits ?? 0} color="bg-blue-50 text-blue-600" />
        <Kpi icon={Package} label="Visualizações de produtos" value={k.product_views ?? 0} color="bg-violet-50 text-violet-600" />
        <Kpi icon={ShoppingBag} label="Adições à sacola" value={k.cart_adds ?? 0} color="bg-amber-50 text-amber-600" />
        <Kpi icon={MessageCircle} label="Cliques finalizar WhatsApp" value={k.checkout_clicks ?? 0} color="bg-emerald-50 text-emerald-600" />
        <Kpi icon={Users} label="Produtos ativos" value={k.active_products ?? 0} color="bg-indigo-50 text-indigo-600" />
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-4">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-4 h-4 text-indigo-600" /><h3 className="font-heading font-bold text-slate-900">Eventos no período</h3></div>
          {data?.series?.length ? (
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={data.series}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="#94a3b8" />
                <YAxis tick={{ fontSize: 11 }} stroke="#94a3b8" allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="visits" name="Visitas" stroke="#4f46e5" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="product_views" name="Visualizações" stroke="#8b5cf6" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="cart_adds" name="Sacola" stroke="#f59e0b" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="checkout_clicks" name="WhatsApp" stroke="#10b981" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[260px] flex flex-col items-center justify-center text-center text-slate-400">
              <TrendingUp className="w-10 h-10 mb-2" />
              <p className="text-sm">Sem eventos registrados neste período.</p>
              <p className="text-xs mt-1">Os dados aparecem conforme os visitantes acessam seu catálogo.</p>
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="font-heading font-bold text-slate-900 mb-4">Primeiros passos</h3>
          <div className="space-y-2" data-testid="onboarding-checklist">
            {checklist.map((c) => (
              <Link key={c.label} to={c.to} data-testid={`checklist-${c.to}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-50 transition-colors">
                {c.done ? <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" /> : <Circle className="w-5 h-5 text-slate-300 shrink-0" />}
                <span className={`text-sm ${c.done ? "text-slate-400 line-through" : "text-slate-700"}`}>{c.label}</span>
              </Link>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4 mt-4">
        <Card className="p-5">
          <h3 className="font-heading font-bold text-slate-900 mb-4">Produtos mais vistos</h3>
          {data?.top_products?.length ? data.top_products.map((p, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-700">{p.name}</span>
              <span className="text-sm font-mono-scayl font-semibold text-slate-900">{p.count}</span>
            </div>
          )) : <p className="text-sm text-slate-400">Nenhuma visualização ainda.</p>}
        </Card>
        <Card className="p-5">
          <h3 className="font-heading font-bold text-slate-900 mb-4">Buscas mais frequentes</h3>
          {data?.searches?.length ? data.searches.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
              <span className="text-sm text-slate-700">{s.term}</span>
              <span className="text-sm font-mono-scayl font-semibold text-slate-900">{s.count}</span>
            </div>
          )) : <p className="text-sm text-slate-400">Nenhuma busca registrada ainda.</p>}
        </Card>
      </div>
    </div>
  );
}
