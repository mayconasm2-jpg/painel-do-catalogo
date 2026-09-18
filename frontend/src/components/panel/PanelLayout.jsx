import { useState } from "react";
import { Outlet, NavLink, useLocation, useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROLE_LABELS } from "@/lib/format";
import { mediaUrl } from "@/lib/apiClient";
import {
  LayoutDashboard, Package, FolderTree, Tag, Store, Palette, Truck, CreditCard,
  BarChart3, Share2, Users as UsersIcon, Sparkles, Settings as SettingsIcon,
  Menu, X, ExternalLink, LogOut, ChevronDown, Bell,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { label: "Visão geral", icon: LayoutDashboard, path: "/dashboard", key: "visao-geral" },
  { label: "Produtos", icon: Package, path: "/products", key: "produtos" },
  { label: "Categorias", icon: FolderTree, path: "/categories", key: "categorias" },
  { label: "Promoções e cupons", icon: Tag, path: "/promotions", key: "promocoes", manage: true },
  { label: "Minha loja", icon: Store, path: "/store-profile", key: "minha-loja", manage: true },
  { label: "Aparência e banners", icon: Palette, path: "/appearance", key: "aparencia", manage: true },
  { label: "Entrega e retirada", icon: Truck, path: "/delivery", key: "entrega", manage: true },
  { label: "Formas de pagamento", icon: CreditCard, path: "/payments", key: "pagamentos", manage: true },
  { label: "Métricas", icon: BarChart3, path: "/analytics", key: "metricas" },
  { label: "Compartilhar catálogo", icon: Share2, path: "/share", key: "compartilhar" },
  { label: "Usuários", icon: UsersIcon, path: "/users", key: "usuarios", manage: true },
  { label: "Plano e assinatura", icon: Sparkles, path: "/subscription", key: "plano", manage: true },
  { label: "Configurações", icon: SettingsIcon, path: "/settings", key: "config" },
];

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export function PanelLayout() {
  const { user, store, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const nav = useNavigate();
  const loc = useLocation();
  const canManage = user?.role === "owner" || user?.role === "admin";
  const items = NAV.filter((n) => !n.manage || canManage);
  const current = NAV.find((n) => loc.pathname.startsWith(n.path));
  const catalogUrl = store ? `${BACKEND_URL}/loja/${store.slug}` : "#";

  const doLogout = async () => { await logout(); nav("/login"); };

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-5 py-5 border-b border-slate-700/50">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-heading font-extrabold text-white text-lg">S</div>
          <div>
            <p className="font-heading font-extrabold text-white text-lg leading-none">Scayl</p>
            <p className="text-[10px] uppercase tracking-widest text-slate-400 mt-1">Painel do lojista</p>
          </div>
        </div>
      </div>
      {store && (
        <div className="px-4 py-3 border-b border-slate-700/50">
          <div className="flex items-center gap-3">
            <img src={mediaUrl(store.appearance?.profile_media) || "https://ui-avatars.com/api/?name=" + encodeURIComponent(store.name)}
              alt="loja" className="w-9 h-9 rounded-lg object-cover bg-slate-700" />
            <div className="min-w-0 flex-1">
              <p className="text-white text-sm font-semibold truncate" data-testid="active-store-name">{store.name}</p>
              <p className="text-[11px] text-slate-400 truncate">/{store.slug}</p>
            </div>
          </div>
          <a href={catalogUrl} target="_blank" rel="noreferrer" data-testid="sidebar-view-catalog"
            className="mt-2 flex items-center justify-center gap-1.5 text-xs text-indigo-300 hover:text-white bg-slate-800/60 hover:bg-slate-700 rounded-md py-1.5 transition-colors">
            <ExternalLink className="w-3.5 h-3.5" /> Visualizar catálogo
          </a>
        </div>
      )}
      <nav className="flex-1 overflow-y-auto scayl-scroll py-3 px-2 space-y-0.5">
        {items.map((n) => (
          <NavLink key={n.path} to={n.path} data-testid={`sidebar-nav-${n.key}`} onClick={() => setOpen(false)}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                isActive ? "bg-indigo-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
              }`}>
            <n.icon className="w-[18px] h-[18px] shrink-0" />
            <span className="truncate">{n.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-3 border-t border-slate-700/50">
        <button onClick={doLogout} data-testid="sidebar-logout"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors">
          <LogOut className="w-[18px] h-[18px]" /> Sair
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* desktop sidebar */}
      <aside className="hidden lg:flex w-64 bg-slate-900 flex-col fixed inset-y-0 z-30">
        <SidebarContent />
      </aside>
      {/* mobile drawer */}
      {open && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setOpen(false)} />
          <aside className="relative w-64 bg-slate-900 flex flex-col">
            <button onClick={() => setOpen(false)} className="absolute top-4 right-3 text-slate-400" data-testid="mobile-menu-close"><X className="w-5 h-5" /></button>
            <SidebarContent />
          </aside>
        </div>
      )}

      <div className="flex-1 lg:ml-64 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 h-16 flex items-center gap-3 px-4 sm:px-6">
          <button className="lg:hidden text-slate-700" onClick={() => setOpen(true)} data-testid="mobile-menu-open"><Menu className="w-6 h-6" /></button>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] uppercase tracking-wider text-slate-400">Scayl / Painel</p>
            <h1 className="font-heading font-bold text-slate-900 truncate text-base sm:text-lg">{current?.label || "Painel"}</h1>
          </div>
          <a href={catalogUrl} target="_blank" rel="noreferrer" data-testid="topbar-view-catalog"
            className="hidden sm:flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-700 border border-indigo-200 hover:bg-indigo-50 rounded-lg px-3 py-2 transition-colors">
            <ExternalLink className="w-4 h-4" /> Ver catálogo
          </a>
          <button className="relative text-slate-500 hover:text-slate-700" data-testid="topbar-notifications">
            <Bell className="w-5 h-5" />
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2" data-testid="topbar-profile">
                <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold text-sm">
                  {(user?.name || "?")[0].toUpperCase()}
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 hidden sm:block" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="font-semibold text-slate-900">{user?.name}</p>
                <p className="text-xs text-slate-500 font-normal">{ROLE_LABELS[user?.role]}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild><Link to="/settings" data-testid="profile-settings">Configurações</Link></DropdownMenuItem>
              <DropdownMenuItem onClick={doLogout} data-testid="profile-logout" className="text-red-600">Sair</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="flex-1 p-4 sm:p-6 max-w-[1400px] w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
