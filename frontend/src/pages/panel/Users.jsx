import { useEffect, useState } from "react";
import api, { apiError } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/panel/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { UserPlus, Copy, Loader2, Shield } from "lucide-react";
import { ROLE_LABELS } from "@/lib/format";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Users() {
  const { user } = useAuth();
  const [data, setData] = useState({ users: [], invites: [] });
  const [open, setOpen] = useState(false);
  const [invite, setInvite] = useState({ email: "", role: "editor" });
  const [saving, setSaving] = useState(false);

  const load = () => api.get("/users").then((r) => setData(r.data)).catch(() => {});
  useEffect(() => { load(); }, []);

  const sendInvite = async () => {
    setSaving(true);
    try {
      const { data: res } = await api.post("/users/invite", invite);
      const link = `${BACKEND_URL}${res.invite_link}`;
      navigator.clipboard.writeText(link);
      toast.success("Convite criado! Link copiado para a área de transferência.");
      setOpen(false); setInvite({ email: "", role: "editor" }); load();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };

  const changeRole = async (id, role) => {
    try { await api.put(`/users/${id}/role`, { role }); toast.success("Permissão atualizada"); load(); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  const changeStatus = async (id, status) => {
    try { await api.put(`/users/${id}/status`, { status }); toast.success("Status atualizado"); load(); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  const remove = async (id) => {
    try { await api.delete(`/users/${id}`); toast.success("Usuário removido"); load(); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };

  return (
    <div className="max-w-4xl">
      <PageHeader title="Usuários" subtitle="Equipe e permissões da loja.">
        <Button onClick={() => setOpen(true)} className="bg-indigo-600 hover:bg-indigo-700" data-testid="user-invite"><UserPlus className="w-4 h-4 mr-1" />Convidar</Button>
      </PageHeader>

      <Card className="divide-y divide-slate-100" data-testid="users-list">
        {data.users.map((u) => (
          <div key={u.id} className="flex items-center gap-3 p-4 flex-wrap" data-testid={`user-row-${u.id}`}>
            <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-semibold">{(u.name || "?")[0].toUpperCase()}</div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-slate-900 truncate">{u.name} {u.id === user.id && <span className="text-xs text-slate-400">(você)</span>}</p>
              <p className="text-xs text-slate-500 truncate">{u.email}</p>
              <p className="text-[11px] text-slate-400">Último acesso: {u.last_login ? new Date(u.last_login).toLocaleString("pt-BR") : "—"}</p>
            </div>
            <span className={`text-xs px-2 py-1 rounded-full ${u.status === "active" ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}>{u.status === "active" ? "Ativo" : "Desativado"}</span>
            {u.role === "owner" ? (
              <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600"><Shield className="w-3.5 h-3.5" />{ROLE_LABELS.owner}</span>
            ) : u.id !== user.id ? (
              <>
                <Select value={u.role} onValueChange={(v) => changeRole(u.id, v)}>
                  <SelectTrigger className="w-40 h-9" data-testid={`user-role-${u.id}`}><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="editor">Editor de produtos</SelectItem></SelectContent>
                </Select>
                <Button size="sm" variant="outline" onClick={() => changeStatus(u.id, u.status === "active" ? "disabled" : "active")} data-testid={`user-toggle-${u.id}`}>{u.status === "active" ? "Desativar" : "Ativar"}</Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild><Button size="sm" variant="ghost" className="text-red-500" data-testid={`user-remove-${u.id}`}>Remover</Button></AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader><AlertDialogTitle>Remover {u.name}?</AlertDialogTitle><AlertDialogDescription>O acesso será revogado imediatamente.</AlertDialogDescription></AlertDialogHeader>
                    <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={() => remove(u.id)} className="bg-red-600 hover:bg-red-700">Remover</AlertDialogAction></AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </>
            ) : <span className="text-xs font-semibold text-slate-500">{ROLE_LABELS[u.role]}</span>}
          </div>
        ))}
        {data.invites.map((inv) => (
          <div key={inv.id} className="flex items-center gap-3 p-4" data-testid={`invite-row-${inv.id}`}>
            <div className="w-9 h-9 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center"><UserPlus className="w-4 h-4" /></div>
            <div className="flex-1 min-w-0"><p className="font-medium text-slate-900 truncate">{inv.email}</p><p className="text-xs text-slate-500">Convite pendente • {ROLE_LABELS[inv.role]}</p></div>
            <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(`${BACKEND_URL}/aceitar-convite?token=${inv.token_preview}`); toast.success("Link copiado"); }} data-testid={`invite-copy-${inv.id}`}><Copy className="w-4 h-4 mr-1" />Copiar link</Button>
          </div>
        ))}
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="invite-dialog">
          <DialogHeader><DialogTitle>Convidar usuário</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} data-testid="invite-email" /></div>
            <div className="space-y-2"><Label>Papel</Label>
              <Select value={invite.role} onValueChange={(v) => setInvite({ ...invite, role: v })}>
                <SelectTrigger data-testid="invite-role"><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="admin">Administrador</SelectItem><SelectItem value="editor">Editor de produtos</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={sendInvite} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700" data-testid="invite-send">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Criar convite"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
