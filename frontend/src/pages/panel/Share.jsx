import { useState, useEffect } from "react";
import api, { API } from "@/lib/apiClient";
import { useAuth } from "@/context/AuthContext";
import { PageHeader } from "@/components/panel/PageHeader";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Copy, MessageCircle, Download, QrCode, Instagram } from "lucide-react";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function Share() {
  const { store } = useAuth();
  const url = store ? `${BACKEND_URL}/loja/${store.slug}` : "";
  const [qr, setQr] = useState("");

  useEffect(() => {
    let alive = true;
    api.get("/share/qr", { responseType: "blob" }).then((r) => {
      if (alive) setQr(URL.createObjectURL(r.data));
    }).catch(() => {});
    return () => { alive = false; };
  }, []);

  const copy = () => { navigator.clipboard.writeText(url); toast.success("Link copiado!"); };
  const wa = () => window.open(`https://wa.me/?text=${encodeURIComponent("Confira nosso catálogo: " + url)}`, "_blank");
  const downloadQr = () => {
    const a = document.createElement("a");
    a.href = qr; a.download = `qrcode-${store?.slug}.png`; a.click();
    toast.success("QR Code baixado");
  };

  return (
    <div className="max-w-3xl">
      <PageHeader title="Compartilhar catálogo" subtitle="Divulgue o link da sua loja." />
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-4">
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-2">Link do catálogo</p>
            <div className="flex gap-2">
              <Input value={url} readOnly data-testid="share-url" />
              <Button onClick={copy} variant="outline" data-testid="share-copy"><Copy className="w-4 h-4" /></Button>
            </div>
          </div>
          <Button onClick={wa} className="w-full bg-emerald-600 hover:bg-emerald-700" data-testid="share-whatsapp"><MessageCircle className="w-4 h-4 mr-2" />Compartilhar no WhatsApp</Button>
          {store?.instagram && (
            <a href={`https://instagram.com/${store.instagram.replace("@", "")}`} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-2 w-full border border-slate-200 rounded-lg py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50" data-testid="share-instagram">
              <Instagram className="w-4 h-4" />Ver Instagram
            </a>
          )}
        </Card>
        <Card className="p-5 flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2 text-slate-900 font-semibold mb-3"><QrCode className="w-4 h-4" />QR Code</div>
          {qr ? <img src={qr} alt="QR Code" className="w-44 h-44 rounded-lg border border-slate-200" data-testid="share-qr-img" /> :
            <div className="w-44 h-44 rounded-lg bg-slate-100 animate-pulse" />}
          <Button onClick={downloadQr} disabled={!qr} variant="outline" className="mt-4" data-testid="share-qr-download"><Download className="w-4 h-4 mr-2" />Baixar QR Code</Button>
        </Card>
      </div>
    </div>
  );
}
