import { useEffect, useState } from "react";
import api, { apiError } from "@/lib/apiClient";
import { PageHeader } from "@/components/panel/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Building2, Users, Package, ShieldAlert, ExternalLink, Search, Info, Check } from "lucide-react";
import { PLAN_LABELS } from "@/lib/format";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export function AdminOverview() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/overview").then((r) => setD(r.data)); }, []);
  const cards = [
    [Building2, "Lojas", d?.total_stores], [Check, "Publicadas", d?.published],
    [Package, "Produtos", d?.total_products], [Users, "Usuários", d?.total_users],
    [ShieldAlert, "Suspensas", d?.suspended],
  ];
  return (
    <div>
      <PageHeader title="Visão geral Scayl" subtitle="Painel da administração da plataforma." />
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {cards.map(([Icon, l, v], i) => (
          <Card key={i} className="p-5"><Icon className="w-5 h-5 text-red-500" /><p className="text-3xl font-extrabold font-mono-scayl text-slate-900 mt-2">{v ?? 0}</p><p className="text-xs text-slate-500">{l}</p></Card>
        ))}
      </div>
      <Card className="p-5 mt-4">
        <h3 className="font-heading font-bold text-slate-900 mb-3">Lojas por plano</h3>
        <div className="grid grid-cols-3 gap-4">
          {Object.entries(d?.by_plan || {}).map(([k, v]) => (
            <div key={k} className="text-center p-4 bg-slate-50 rounded-lg"><p className="text-2xl font-bold">{v}</p><p className="text-sm text-slate-500">{PLAN_LABELS[k]}</p></div>
          ))}
        </div>
      </Card>
    </div>
  );
}

export function AdminStores() {
  const [data, setData] = useState({ items: [], total: 0 });
  const [f, setF] = useState({ search: "", plan: "", page: 1 });
  const [detail, setDetail] = useState(null);

  const load = () => {
    const q = new URLSearchParams({ search: f.search, plan: f.plan, page: f.page, page_size: 20 });
    api.get(`/admin/stores?${q}`).then((r) => setData(r.data));
  };
  useEffect(() => { load(); }, [f]);

  const action = async (id, fn, label) => {
    try { await fn(); toast.success(label); load(); if (detail) openDetail(id); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  const openDetail = (id) => api.get(`/admin/stores/${id}`).then((r) => setDetail(r.data));

  return (
    <div>
      <PageHeader title="Lojas" subtitle={`${data.total} loja(s) na plataforma`} />
      <Card className="p-3 mb-4 flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[180px]"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input placeholder="Buscar loja..." className="pl-9" value={f.search} onChange={(e) => setF({ ...f, search: e.target.value, page: 1 })} data-testid="admin-store-search" /></div>
        <Select value={f.plan || "all"} onValueChange={(v) => setF({ ...f, plan: v === "all" ? "" : v, page: 1 })}>
          <SelectTrigger className="w-40" data-testid="admin-plan-filter"><SelectValue placeholder="Plano" /></SelectTrigger>
          <SelectContent><SelectItem value="all">Todos</SelectItem><SelectItem value="essencial">Essencial</SelectItem><SelectItem value="profissional">Profissional</SelectItem><SelectItem value="premium">Premium</SelectItem></SelectContent>
        </Select>
      </Card>
      <Card className="overflow-hidden">
        <div className="overflow-x-auto scayl-scroll">
          <table className="w-full text-sm" data-testid="scayl-admin-stores-table">
            <thead className="bg-slate-50 text-slate-500 text-xs uppercase"><tr><th className="p-3 text-left">Loja</th><th className="p-3 text-left hidden sm:table-cell">Proprietário</th><th className="p-3 text-left">Plano</th><th className="p-3 text-left">Status</th><th className="p-3 text-left hidden md:table-cell">Produtos</th><th className="p-3 w-10"></th></tr></thead>
            <tbody className="divide-y divide-slate-100">
              {data.items.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50" data-testid={`admin-store-row-${s.id}`}>
                  <td className="p-3"><p className="font-medium text-slate-900">{s.name}</p><p className="text-xs text-slate-400">/{s.slug}</p></td>
                  <td className="p-3 hidden sm:table-cell text-slate-600">{s.owner_email}</td>
                  <td className="p-3">{PLAN_LABELS[s.plan]}</td>
                  <td className="p-3"><span className={`text-xs px-2 py-1 rounded-full ${s.plan_status === "suspended" ? "bg-red-50 text-red-600" : s.plan_status === "trial" ? "bg-amber-50 text-amber-600" : "bg-emerald-50 text-emerald-600"}`}>{s.plan_status}</span></td>
                  <td className="p-3 hidden md:table-cell font-mono-scayl">{s.product_count}</td>
                  <td className="p-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><button className="text-slate-400 hover:text-slate-700" data-testid={`admin-store-menu-${s.id}`}>⋮</button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openDetail(s.id)} data-testid={`admin-store-detail-${s.id}`}>Ver detalhes</DropdownMenuItem>
                        <DropdownMenuItem asChild><a href={`${BACKEND_URL}/loja/${s.slug}`} target="_blank" rel="noreferrer">Abrir catálogo</a></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => action(s.id, () => api.post(`/admin/stores/${s.id}/extend-trial`), "Teste estendido")}>Estender teste</DropdownMenuItem>
                        {s.plan_status === "suspended"
                          ? <DropdownMenuItem onClick={() => action(s.id, () => api.post(`/admin/stores/${s.id}/reactivate`), "Loja reativada")} data-testid={`admin-reactivate-${s.id}`}>Reativar</DropdownMenuItem>
                          : <DropdownMenuItem onClick={() => action(s.id, () => api.post(`/admin/stores/${s.id}/suspend`), "Loja suspensa")} className="text-red-600" data-testid={`admin-suspend-${s.id}`}>Suspender</DropdownMenuItem>}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent data-testid="admin-store-detail-dialog" className="max-w-lg">
          <DialogHeader><DialogTitle>{detail?.name}</DialogTitle></DialogHeader>
          {detail && (
            <div className="space-y-4 text-sm">
              <div className="flex gap-2 flex-wrap">
                <a href={`${BACKEND_URL}/loja/${detail.slug}`} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5"><ExternalLink className="w-3.5 h-3.5" />Abrir catálogo</a>
              </div>
              <div><p className="text-slate-500">Alterar plano</p>
                <Select value={detail.plan} onValueChange={(v) => action(detail.id, () => api.put(`/admin/stores/${detail.id}/plan`, { plan: v }), "Plano alterado")}>
                  <SelectTrigger className="mt-1" data-testid="admin-change-plan"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="essencial">Essencial</SelectItem><SelectItem value="profissional">Profissional</SelectItem><SelectItem value="premium">Premium</SelectItem></SelectContent>
                </Select>
              </div>
              <div><p className="text-slate-500 mb-1">Usuários ({detail.users?.length})</p>
                {detail.users?.map((u) => <div key={u.id} className="flex justify-between py-1 border-b border-slate-100"><span>{u.email}</span><span className="text-slate-400">{u.role}</span></div>)}
              </div>
              <div><p className="text-slate-500 mb-1">Histórico</p>
                {detail.history?.length ? detail.history.map((h) => <div key={h.id} className="text-xs text-slate-500 py-1">{new Date(h.created_at).toLocaleString("pt-BR")} — {h.detail} ({h.actor})</div>) : <p className="text-xs text-slate-400">Sem eventos.</p>}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const load = () => api.get(`/admin/users?search=${search}`).then((r) => setUsers(r.data));
  useEffect(() => { load(); }, [search]);
  const toggle = async (u) => { try { await api.put(`/admin/users/${u.id}/status`, { status: u.status === "active" ? "disabled" : "active" }); toast.success("Status atualizado"); load(); } catch (e) { toast.error(apiError(e.response?.data?.detail)); } };
  return (
    <div>
      <PageHeader title="Usuários da plataforma" />
      <Card className="p-3 mb-4"><div className="relative"><Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" /><Input placeholder="Buscar por e-mail..." className="pl-9" value={search} onChange={(e) => setSearch(e.target.value)} data-testid="admin-user-search" /></div></Card>
      <Card className="divide-y divide-slate-100">
        {users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 p-4" data-testid={`admin-user-${u.id}`}>
            <div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{u.email}</p><p className="text-xs text-slate-500">{u.store_name || "—"} • {u.role}</p></div>
            <span className={`text-xs px-2 py-1 rounded-full ${u.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{u.status === "active" ? "Ativo" : "Bloqueado"}</span>
            <Button size="sm" variant="outline" onClick={() => toggle(u)} data-testid={`admin-user-toggle-${u.id}`}>{u.status === "active" ? "Bloquear" : "Desbloquear"}</Button>
          </div>
        ))}
      </Card>
    </div>
  );
}

const PLAN_INFO = {
  essencial: ["30 produtos", "5 fotos/produto", "1 usuário", "Métricas básicas"],
  profissional: ["150 produtos", "10 fotos/produto", "5 usuários", "Cupons", "Métricas completas"],
  premium: ["Produtos ilimitados", "Mais usuários", "Domínio próprio", "Sem marca Scayl"],
};
export function AdminPlans() {
  return (
    <div>
      <PageHeader title="Planos" subtitle="Definições de cada plano (aplicadas de fato no painel do lojista)." />
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(PLAN_INFO).map(([k, feats]) => (
          <Card key={k} className="p-5"><h3 className="font-heading font-bold text-lg mb-3">{PLAN_LABELS[k]}</h3>
            <ul className="space-y-1.5">{feats.map((f) => <li key={f} className="flex items-center gap-2 text-sm text-slate-600"><Check className="w-4 h-4 text-emerald-500" />{f}</li>)}</ul></Card>
        ))}
      </div>
    </div>
  );
}

export function AdminSubscriptions() {
  return (
    <div>
      <PageHeader title="Assinaturas" />
      <Card className="p-6">
        <div className="flex gap-3 text-sm text-amber-700 bg-amber-50 border border-amber-100 rounded-lg p-4">
          <Info className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-semibold">Sem provedor de pagamento contratado</p>
            <p className="mt-1">O sistema não registra cobranças reais. Os planos são atribuídos manualmente pela administração em <b>Lojas → Alterar plano</b>. Estados exibidos: <b>trial</b>, <b>active</b> e <b>suspended</b> — nenhum estado de "pagamento recebido" é simulado.</p>
          </div>
        </div>
      </Card>
    </div>
  );
}

export function AdminMetrics() {
  const [d, setD] = useState(null);
  useEffect(() => { api.get("/admin/overview").then((r) => setD(r.data)); }, []);
  return (
    <div>
      <PageHeader title="Métricas globais" subtitle="Contagens reais da plataforma." />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5"><p className="text-3xl font-extrabold font-mono-scayl">{d?.total_stores ?? 0}</p><p className="text-xs text-slate-500">Lojas totais</p></Card>
        <Card className="p-5"><p className="text-3xl font-extrabold font-mono-scayl">{d?.published ?? 0}</p><p className="text-xs text-slate-500">Publicadas</p></Card>
        <Card className="p-5"><p className="text-3xl font-extrabold font-mono-scayl">{d?.total_products ?? 0}</p><p className="text-xs text-slate-500">Produtos</p></Card>
        <Card className="p-5"><p className="text-3xl font-extrabold font-mono-scayl">{d?.total_users ?? 0}</p><p className="text-xs text-slate-500">Usuários</p></Card>
      </div>
    </div>
  );
}
