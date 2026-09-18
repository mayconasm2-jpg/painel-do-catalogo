import { useState } from "react";
import api, { apiError, mediaUrl } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/panel/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { ImageUpload } from "@/components/panel/ImageUpload";
import { Loader2, Monitor, Smartphone, ExternalLink, RotateCcw } from "lucide-react";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogTrigger, AlertDialogContent, AlertDialogHeader, AlertDialogTitle,
  AlertDialogDescription, AlertDialogFooter, AlertDialogCancel, AlertDialogAction,
} from "@/components/ui/alert-dialog";

const FONTS = ["Poppins", "Manrope", "IBM Plex Sans"];
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const DEFAULTS = { primary_color: "#37AFB4", support_color: "#6B4A2B", bg_color: "#EAF6F6", font: "Poppins" };

export default function Appearance() {
  const { store, reloadStore } = useAuth();
  const a = store?.appearance || {};
  const [f, setF] = useState({
    logo_media: a.logo_media || null, profile_media: a.profile_media || null,
    hero_desktop_media: a.hero_desktop_media || null, hero_mobile_media: a.hero_mobile_media || null,
    hero_fit: a.hero_fit || "cover",
    primary_color: a.primary_color || DEFAULTS.primary_color, support_color: a.support_color || DEFAULTS.support_color,
    bg_color: a.bg_color || DEFAULTS.bg_color, font: a.font || DEFAULTS.font,
    sections: a.sections || [],
  });
  const [saving, setSaving] = useState(false);
  const [preview, setPreview] = useState("desktop");
  const set = (k, v) => setF({ ...f, [k]: v });

  const save = async () => {
    setSaving(true);
    try { await api.put("/store/appearance", f); await reloadStore(); toast.success("Aparência salva"); }
    catch (e) { toast.error(apiError(e.response?.data?.detail)); }
    finally { setSaving(false); }
  };
  const restore = async () => {
    const next = { ...f, ...DEFAULTS };
    setF(next);
    try { await api.put("/store/appearance", next); await reloadStore(); toast.success("Padrão restaurado"); } catch (e) {}
  };

  const catalogUrl = `${BACKEND_URL}/loja/${store?.slug}`;
  const Color = ({ k, label }) => (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <div className="flex items-center gap-2">
        <input type="color" value={f[k]} onChange={(e) => set(k, e.target.value)} data-testid={`color-${k}`} className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
        <span className="text-sm font-mono-scayl text-slate-600">{f[k]}</span>
      </div>
    </div>
  );

  return (
    <div>
      <PageHeader title="Aparência e banners" subtitle="Personalize o visual do seu catálogo.">
        <Button asChild variant="outline" data-testid="appearance-view"><a href={catalogUrl} target="_blank" rel="noreferrer"><ExternalLink className="w-4 h-4 mr-1" />Ver catálogo</a></Button>
        <AlertDialog>
          <AlertDialogTrigger asChild><Button variant="outline" data-testid="appearance-restore"><RotateCcw className="w-4 h-4 mr-1" />Restaurar padrão</Button></AlertDialogTrigger>
          <AlertDialogContent><AlertDialogHeader><AlertDialogTitle>Restaurar aparência padrão?</AlertDialogTitle><AlertDialogDescription>As cores e fonte voltarão ao padrão. As imagens serão mantidas.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter><AlertDialogCancel>Cancelar</AlertDialogCancel><AlertDialogAction onClick={restore}>Restaurar</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
        </AlertDialog>
        <Button onClick={save} disabled={saving} className="bg-indigo-600 hover:bg-indigo-700" data-testid="appearance-save">{saving ? <Loader2 className="w-4 h-4 animate-spin" /> : "Salvar"}</Button>
      </PageHeader>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <Card className="p-5 space-y-4">
            <h3 className="font-heading font-bold text-slate-900">Imagens</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><Label className="text-xs mb-1 block">Logo</Label><ImageUpload value={f.logo_media} onChange={(v) => set("logo_media", v)} testid="ap-logo" /></div>
              <div><Label className="text-xs mb-1 block">Foto de perfil</Label><ImageUpload value={f.profile_media} onChange={(v) => set("profile_media", v)} testid="ap-profile" /></div>
            </div>
            <div><Label className="text-xs mb-1 block">Hero (desktop)</Label><ImageUpload value={f.hero_desktop_media} onChange={(v) => set("hero_desktop_media", v)} testid="ap-hero-desktop" /></div>
            <div><Label className="text-xs mb-1 block">Hero (mobile)</Label><ImageUpload value={f.hero_mobile_media} onChange={(v) => set("hero_mobile_media", v)} testid="ap-hero-mobile" /></div>
            <div className="flex items-center gap-2"><Label className="text-xs">Enquadramento</Label>
              <Select value={f.hero_fit} onValueChange={(v) => set("hero_fit", v)}><SelectTrigger className="w-40 h-9" data-testid="ap-fit"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="cover">Preencher</SelectItem><SelectItem value="contain">Conter</SelectItem></SelectContent></Select>
            </div>
          </Card>
          <Card className="p-5 space-y-4">
            <h3 className="font-heading font-bold text-slate-900">Cores e fonte</h3>
            <div className="grid grid-cols-3 gap-3"><Color k="primary_color" label="Principal" /><Color k="support_color" label="Apoio" /><Color k="bg_color" label="Fundo" /></div>
            <div className="space-y-1"><Label className="text-xs">Fonte</Label>
              <Select value={f.font} onValueChange={(v) => set("font", v)}><SelectTrigger data-testid="ap-font"><SelectValue /></SelectTrigger><SelectContent>{FONTS.map((x) => <SelectItem key={x} value={x}>{x}</SelectItem>)}</SelectContent></Select>
            </div>
          </Card>
        </div>

        {/* live preview */}
        <div>
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-bold text-slate-900">Prévia</h3>
              <div className="flex gap-1 bg-slate-100 rounded-lg p-1">
                <button onClick={() => setPreview("desktop")} data-testid="preview-desktop" className={`p-1.5 rounded ${preview === "desktop" ? "bg-white shadow" : ""}`}><Monitor className="w-4 h-4" /></button>
                <button onClick={() => setPreview("mobile")} data-testid="preview-mobile" className={`p-1.5 rounded ${preview === "mobile" ? "bg-white shadow" : ""}`}><Smartphone className="w-4 h-4" /></button>
              </div>
            </div>
            <div className={`mx-auto rounded-xl overflow-hidden border border-slate-200 ${preview === "mobile" ? "max-w-[300px]" : "w-full"}`} style={{ background: f.bg_color }}>
              <div style={{ background: f.primary_color, height: 10 }} />
              {(preview === "desktop" ? f.hero_desktop_media : f.hero_mobile_media || f.hero_desktop_media) &&
                <img src={mediaUrl(preview === "desktop" ? f.hero_desktop_media : f.hero_mobile_media || f.hero_desktop_media)} alt="" className="w-full h-28 object-cover" style={{ objectFit: f.hero_fit }} />}
              <div className="p-3 flex items-center gap-2 -mt-6">
                <img src={mediaUrl(f.profile_media) || `https://ui-avatars.com/api/?name=${encodeURIComponent(store?.name || "L")}`} alt="" className="w-12 h-12 rounded-xl border-2 border-white object-cover bg-white" />
                <span className="font-bold text-slate-800" style={{ fontFamily: f.font }}>{store?.name}</span>
              </div>
              <div className="px-3 pb-4 grid grid-cols-2 gap-2">
                {[1, 2].map((i) => (
                  <div key={i} className="bg-white rounded-lg p-2 shadow-sm">
                    <div className="w-full h-16 rounded bg-slate-100" />
                    <p className="text-xs font-semibold text-slate-700 mt-1" style={{ fontFamily: f.font }}>Produto {i}</p>
                    <p className="text-xs font-bold" style={{ color: f.primary_color }}>R$ 99,90</p>
                    <button className="w-full text-white text-[10px] py-1 rounded mt-1" style={{ background: f.primary_color }}>Adicionar</button>
                  </div>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-3 text-center">Prévia ilustrativa. Clique em "Ver catálogo" para o resultado real.</p>
          </Card>
        </div>
      </div>
    </div>
  );
}
