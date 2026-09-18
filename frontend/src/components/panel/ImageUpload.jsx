import { useRef, useState } from "react";
import api, { apiError, mediaUrl } from "@/lib/apiClient";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";

export function ImageUpload({ value, onChange, testid = "image", label = "Enviar imagem", className = "" }) {
  const ref = useRef();
  const [loading, setLoading] = useState(false);

  const pick = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const { data } = await api.post("/media", fd, { headers: { "Content-Type": "multipart/form-data" } });
      onChange(data.url);
      toast.success("Imagem enviada");
    } catch (err) { toast.error(apiError(err.response?.data?.detail) || "Falha no upload"); }
    finally { setLoading(false); if (ref.current) ref.current.value = ""; }
  };

  return (
    <div className={className}>
      {value ? (
        <div className="relative w-full aspect-video rounded-lg overflow-hidden bg-slate-100 border border-slate-200 group">
          <img src={mediaUrl(value)} alt="" className="w-full h-full object-cover" />
          <button type="button" onClick={() => onChange(null)} data-testid={`${testid}-remove`}
            className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1 hover:bg-black/80"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} data-testid={`${testid}-upload`}
          className="w-full aspect-video rounded-lg border-2 border-dashed border-slate-300 hover:border-indigo-400 hover:bg-indigo-50/40 flex flex-col items-center justify-center text-slate-500 transition-colors">
          {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <><Upload className="w-6 h-6 mb-1" /><span className="text-sm">{label}</span></>}
        </button>
      )}
      <input ref={ref} type="file" accept="image/*" className="hidden" onChange={pick} data-testid={`${testid}-input`} />
    </div>
  );
}
