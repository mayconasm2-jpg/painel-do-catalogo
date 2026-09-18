import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ShieldAlert, Building2, UserCheck, Layers, Receipt, TrendingUp, LogOut, Menu, X } from "lucide-react";
import { useState } from "react";

const NAV = [
  { label: "Visão geral", icon: ShieldAlert, path: "/admin", key: "overview", end: true },
  { label: "Lojas", icon: Building2, path: "/admin/stores", key: "stores" },
  { label: "Usuários", icon: UserCheck, path: "/admin/users", key: "users" },
  { label: "Planos", icon: Layers, path: "/admin/plans", key: "plans" },
  { label: "Assinaturas", icon: Receipt, path: "/admin/subscriptions", key: "subscriptions" },
  { label: "Métricas", icon: TrendingUp, path: "/admin/metrics", key: "metrics" },
];

export function AdminLayout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  const current = NAV.find((n) => (n.end ? loc.pathname === n.path : loc.pathname.startsWith(n.path)));
  const doLogout = async () => { await logout(); nav("/login"); };

  const Side = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-red-500 flex items-center justify-center font-heading font-extrabold text-white text-lg">S</div>
          <div>
            <p className="font-heading font-extrabold text-white text-lg leading-none">Scayl</p>
            <p className="text-[10px] uppercase tracking-widest text-red-300 mt-1">Administração</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 overflow-y-auto scayl-scroll py-3 px-2 space-y-0.5">
        {NAV.map((n) => (
          <NavLink key={n.path} to={n.path} end={n.end} data-testid={`admin-nav-${n.key}`} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-red-500 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}>
            <n.icon className="w-[18px] h-[18px]" /> {n.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-800">
        <button onClick={doLogout} data-testid="admin-logout"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white">
          <LogOut className="w-[18px] h-[18px]" /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 flex">
      <aside className="hidden lg:flex w-64 bg-slate-950 flex-col fixed inset-y-0 z-30"><Side /></aside>
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-slate-950 flex flex-col">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-3 text-slate-400"><X className="w-5 h-5" /></button>
            <Side />
          </aside>
        </div>
      )}
      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-16 flex items-center gap-3 px-4 sm:px-6">
          <button className="lg:hidden text-slate-700" onClick={() => setOpen(true)} data-testid="admin-mobile-open"><Menu className="w-6 h-6" /></button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-red-400">Administração Scayl</p>
            <h1 className="font-heading font-bold text-slate-900 truncate text-base sm:text-lg">{current?.label || "Admin"}</h1>
          </div>
          <span className="text-xs font-semibold bg-red-50 text-red-600 px-3 py-1.5 rounded-full">{user?.email}</span>
        </header>
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto"><Outlet /></main>
      </div>
    </div>
  );
}
