import { useState, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import api, { apiError } from "@/lib/apiClient";
import { toast } from "sonner";
import { Eye, EyeOff, Loader2, Store, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function Shell({ children, title, subtitle }) {
  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-slate-50">
      <div className="hidden lg:flex flex-col justify-between bg-slate-900 p-12 text-white relative overflow-hidden">
        <div className="relative z-10">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center font-heading font-extrabold text-xl">S</div>
            <span className="font-heading font-extrabold text-2xl">Scayl</span>
          </div>
        </div>
        <div className="relative z-10 space-y-6">
          <h2 className="font-heading text-4xl font-extrabold leading-tight">Seu catálogo, no controle total.</h2>
          <p className="text-slate-300 text-lg max-w-md">Gerencie produtos, categorias, aparência e pedidos via WhatsApp — tudo em um painel só.</p>
          <div className="flex items-center gap-4 text-slate-400 text-sm">
            <span className="flex items-center gap-2"><Store className="w-4 h-4" /> Multi-loja</span>
            <span className="flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Seguro por papel</span>
          </div>
        </div>
        <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl" />
        <div className="absolute right-40 top-20 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl" />
      </div>
      <div className="flex items-center justify-center p-6 sm:p-12">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-2 mb-8">
            <div className="w-9 h-9 rounded-lg bg-indigo-600 flex items-center justify-center font-heading font-extrabold text-white">S</div>
            <span className="font-heading font-extrabold text-xl text-slate-900">Scayl</span>
          </div>
          <h1 className="font-heading text-2xl font-extrabold text-slate-900">{title}</h1>
          <p className="text-slate-500 mt-1 mb-8">{subtitle}</p>
          {children}
        </div>
      </div>
    </div>
  );
}

function PasswordInput({ value, onChange, testid, placeholder = "••••••••" }) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Input type={show ? "text" : "password"} value={value} onChange={onChange} placeholder={placeholder}
        data-testid={testid} className="pr-10" required />
      <button type="button" onClick={() => setShow(!show)} data-testid={`${testid}-toggle`}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
        {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
      </button>
    </div>
  );
}

export function Login() {
  const { login, user } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    if (user && user.role) nav(user.role === "platform_admin" ? "/admin" : "/dashboard", { replace: true });
  }, [user, nav]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const u = await login(email, password);
      toast.success("Bem-vindo(a) de volta!");
      nav(u.role === "platform_admin" ? "/admin" : "/dashboard", { replace: true });
    } catch (err) {
      toast.error(apiError(err.response?.data?.detail) || "Falha no login");
    } finally { setLoading(false); }
  };

  return (
    <Shell title="Entrar" subtitle="Acesse o painel da sua loja.">
      <form onSubmit={submit} className="space-y-4" data-testid="login-form">
        <div className="space-y-2">
          <Label>E-mail</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" data-testid="login-email" required />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <Label>Senha</Label>
            <Link to="/forgot-password" className="text-xs text-indigo-600 hover:underline" data-testid="login-forgot-link">Esqueci a senha</Link>
          </div>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} testid="login-password" />
        </div>
        <Button type="submit" disabled={loading} data-testid="login-submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-11">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Entrar"}
        </Button>
        <p className="text-center text-sm text-slate-500">
          Não tem uma loja? <Link to="/register" className="text-indigo-600 font-medium hover:underline" data-testid="login-register-link">Criar conta</Link>
        </p>
      </form>
    </Shell>
  );
}

export function Register() {
  const { setUser, reloadStore } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "", store_name: "" });
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const upd = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/auth/register", form);
      setUser(data);
      await reloadStore();
      toast.success("Loja criada com sucesso!");
      nav("/dashboard", { replace: true });
    } catch (err) {
      toast.error(apiError(err.response?.data?.detail) || "Falha ao criar conta");
    } finally { setLoading(false); }
  };

  return (
    <Shell title="Criar sua loja" subtitle="Comece grátis com 14 dias de teste.">
      <form onSubmit={submit} className="space-y-4" data-testid="register-form">
        <div className="space-y-2"><Label>Seu nome</Label>
          <Input value={form.name} onChange={upd("name")} data-testid="register-name" required /></div>
        <div className="space-y-2"><Label>Nome da loja</Label>
          <Input value={form.store_name} onChange={upd("store_name")} data-testid="register-store" required /></div>
        <div className="space-y-2"><Label>E-mail</Label>
          <Input type="email" value={form.email} onChange={upd("email")} data-testid="register-email" required /></div>
        <div className="space-y-2"><Label>Senha</Label>
          <PasswordInput value={form.password} onChange={upd("password")} testid="register-password" /></div>
        <Button type="submit" disabled={loading} data-testid="register-submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-11">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar loja"}
        </Button>
        <p className="text-center text-sm text-slate-500">
          Já tem conta? <Link to="/login" className="text-indigo-600 font-medium hover:underline">Entrar</Link>
        </p>
      </form>
    </Shell>
  );
}

export function Forgot() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try { await api.post("/auth/forgot-password", { email }); setSent(true); }
    catch (err) { setSent(true); }
    finally { setLoading(false); }
  };
  return (
    <Shell title="Recuperar acesso" subtitle="Enviaremos um link para redefinir sua senha.">
      {sent ? (
        <div className="space-y-4" data-testid="forgot-sent">
          <p className="text-sm text-slate-600">Se o e-mail estiver cadastrado, você receberá um link em instantes.</p>
          <Link to="/login" className="text-indigo-600 font-medium hover:underline text-sm">Voltar para entrar</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4" data-testid="forgot-form">
          <div className="space-y-2"><Label>E-mail</Label>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} data-testid="forgot-email" required /></div>
          <Button type="submit" disabled={loading} data-testid="forgot-submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-11">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Enviar link"}
          </Button>
          <Link to="/login" className="block text-center text-sm text-indigo-600 hover:underline">Voltar para entrar</Link>
        </form>
      )}
    </Shell>
  );
}

export function Reset() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();
  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/auth/reset-password", { token, password });
      toast.success("Senha redefinida! Faça login.");
      nav("/login");
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    finally { setLoading(false); }
  };
  return (
    <Shell title="Nova senha" subtitle="Defina uma nova senha para sua conta.">
      <form onSubmit={submit} className="space-y-4" data-testid="reset-form">
        <div className="space-y-2"><Label>Nova senha</Label>
          <PasswordInput value={password} onChange={(e) => setPassword(e.target.value)} testid="reset-password" /></div>
        <Button type="submit" disabled={loading || !token} data-testid="reset-submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-11">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Redefinir senha"}
        </Button>
        <Link to="/login" className="block text-center text-sm text-indigo-600 hover:underline">Voltar para entrar</Link>
      </form>
    </Shell>
  );
}

export function AcceptInvite() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [invite, setInvite] = useState(null);
  const [form, setForm] = useState({ name: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const { setUser, reloadStore } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    api.get(`/invite/${token}`).then(({ data }) => setInvite(data)).catch(() => setError("Convite inválido ou expirado."));
  }, [token]);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/invite/accept", { token, ...form });
      setUser(data); await reloadStore();
      toast.success("Convite aceito! Bem-vindo(a).");
      nav("/dashboard", { replace: true });
    } catch (err) { toast.error(apiError(err.response?.data?.detail)); }
    finally { setLoading(false); }
  };

  return (
    <Shell title="Aceitar convite" subtitle={invite ? `Você foi convidado para ${invite.store_name}` : ""}>
      {error ? <p className="text-red-600" data-testid="invite-error">{error}</p> : invite ? (
        <form onSubmit={submit} className="space-y-4" data-testid="invite-form">
          <div className="space-y-2"><Label>E-mail</Label><Input value={invite.email} disabled /></div>
          <div className="space-y-2"><Label>Seu nome</Label>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} data-testid="invite-name" required /></div>
          <div className="space-y-2"><Label>Crie uma senha</Label>
            <PasswordInput value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} testid="invite-password" /></div>
          <Button type="submit" disabled={loading} data-testid="invite-submit" className="w-full bg-indigo-600 hover:bg-indigo-700 h-11">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Aceitar e entrar"}
          </Button>
        </form>
      ) : <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />}
    </Shell>
  );
}
