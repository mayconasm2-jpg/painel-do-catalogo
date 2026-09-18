import { useEffect, useState } from "react";
import api from "@/lib/apiClient";
import { PageHeader } from "@/components/panel/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { FileDown, Eye, ShoppingBag, MessageCircle, Package } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const PERIODS = [{ k: "today", l: "Hoje" }, { k: "7d", l: "7 dias" }, { k: "30d", l: "30 dias" }, { k: "custom", l: "Período" }];

export default function Analytics() {
  const [period, setPeriod] = useState("7d");
  const [range, setRange] = useState({ from: "", to: "" });
  const [data, setData] = useState(null);

  const load = () => {
    let q = `/analytics?period=${period}`;
    if (period === "custom" && range.from) q += `&from=${range.from}&to=${range.to || range.from}`;
    api.get(q).then((r) => setData(r.data)).catch(() => {});
  };
  useEffect(() => { load(); }, [period]);

  const k = data?.kpis || {};
  const exportPdf = () => {
    const win = window.open("", "_blank");
    const rows = (data?.top_products || []).map((p) => `<tr><td>${p.name}</td><td>${p.count}</td></tr>`).join("");
    win.document.write(`<html><head><title>Relatório Scayl</title><style>body{font-family:Arial;padding:40px}h1{color:#4f46e5}table{width:100%;border-collapse:collapse;margin-top:12px}td,th{border:1px solid #e2e8f0;padding:8px;text-align:left}.kpi{display:inline-block;margin:8px 16px 8px 0}</style></head><body>
      <h1>Relatório de Métricas — Scayl</h1>
      <p>Período: ${period} • Emitido em ${new Date().toLocaleString("pt-BR")}</p>
      <div><span class="kpi"><b>${k.visits || 0}</b> visitas</span><span class="kpi"><b>${k.product_views || 0}</b> visualizações</span><span class="kpi"><b>${k.cart_adds || 0}</b> adições à sacola</span><span class="kpi"><b>${k.checkout_clicks || 0}</b> cliques WhatsApp</span></div>
      <h3>Produtos mais vistos</h3><table><tr><th>Produto</th><th>Visualizações</th></tr>${rows || "<tr><td colspan=2>Sem dados</td></tr>"}</table>
      <script>window.onload=()=>window.print()</script></body></html>`);
    win.document.close();
    toast.success("Relatório gerado — use a caixa de impressão para salvar em PDF");
  };

  const chartData = [
    { name: "Visitas", v: k.visits || 0 }, { name: "Produtos", v: k.product_views || 0 },
    { name: "Sacola", v: k.cart_adds || 0 }, { name: "WhatsApp", v: k.checkout_clicks || 0 },
  ];

  return (
    <div>
      <PageHeader title="Métricas" subtitle="Eventos registrados no seu catálogo real.">
        <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1">
          {PERIODS.map((p) => (
            <button key={p.k} onClick={() => setPeriod(p.k)} data-testid={`analytics-period-${p.k}`}
              className={`px-3 py-1.5 text-sm rounded-md font-medium ${period === p.k ? "bg-indigo-600 text-white" : "text-slate-600 hover:bg-slate-100"}`}>{p.l}</button>
          ))}
        </div>
        <Button onClick={exportPdf} variant="outline" data-testid="analytics-export"><FileDown className="w-4 h-4 mr-1" />Exportar PDF</Button>
      </PageHeader>

      {period === "custom" && (
        <Card className="p-4 mb-4 flex flex-wrap items-end gap-3">
          <div className="space-y-1"><Label className="text-xs">De</Label><Input type="date" value={range.from} onChange={(e) => setRange({ ...range, from: e.target.value })} data-testid="analytics-from" /></div>
          <div className="space-y-1"><Label className="text-xs">Até</Label><Input type="date" value={range.to} onChange={(e) => setRange({ ...range, to: e.target.value })} data-testid="analytics-to" /></div>
          <Button onClick={load} data-testid="analytics-apply">Aplicar</Button>
        </Card>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[[Eye, "Visitas", k.visits], [Package, "Visualizações", k.product_views], [ShoppingBag, "Sacola", k.cart_adds], [MessageCircle, "Cliques WhatsApp", k.checkout_clicks]].map(([Icon, l, v], i) => (
          <Card key={i} className="p-4"><Icon className="w-5 h-5 text-indigo-600" /><p className="text-2xl font-extrabold font-mono-scayl text-slate-900 mt-2">{v ?? 0}</p><p className="text-xs text-slate-500">{l}</p></Card>
        ))}
      </div>

      <Card className="p-5 mt-4">
        <h3 className="font-heading font-bold text-slate-900 mb-4">Funil de conversão</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
            <XAxis dataKey="name" tick={{ fontSize: 12 }} stroke="#94a3b8" />
            <YAxis tick={{ fontSize: 12 }} stroke="#94a3b8" allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="v" fill="#4f46e5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-5 mt-4">
        <h3 className="font-heading font-bold text-slate-900 mb-4">Produtos mais vistos</h3>
        {data?.top_products?.length ? data.top_products.map((p, i) => (
          <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0"><span className="text-sm text-slate-700">{p.name}</span><span className="font-mono-scayl font-semibold">{p.count}</span></div>
        )) : <p className="text-sm text-slate-400">Sem dados no período.</p>}
      </Card>
    </div>
  );
}
