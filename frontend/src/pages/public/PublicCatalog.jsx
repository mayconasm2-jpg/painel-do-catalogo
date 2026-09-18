import { useEffect, useState, useMemo, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import api, { mediaUrl } from "@/lib/apiClient";
import { brl } from "@/lib/format";
import { Search, MapPin, ShoppingBag, X, Trash2, MessageCircle, Store, Clock, Loader2 } from "lucide-react";

const FONT_MAP = { Poppins: "'Poppins',sans-serif", Manrope: "'Manrope',sans-serif", "IBM Plex Sans": "'IBM Plex Sans',sans-serif" };

function track(slug, type, product_id = null, meta = null) {
  api.post("/public/events", { slug, type, product_id, meta }).catch(() => {});
}

export default function PublicCatalog() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const [data, setData] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [cat, setCat] = useState("Todos");
  const [q, setQ] = useState("");
  const [cart, setCart] = useState([]);
  const [detail, setDetail] = useState(null);
  const [checkout, setCheckout] = useState(false);

  useEffect(() => {
    api.get(`/public/store/${slug}`).then((r) => {
      setData(r.data);
      track(slug, "visit");
      const pid = params.get("p");
      if (pid) { const p = r.data.products.find((x) => x.id === pid); if (p) openDetail(p, r.data); }
    }).catch(() => setNotFound(true));
  }, [slug]);

  const openDetail = (p, d) => { setDetail(p); track((d || data).store.slug, "product_view", p.id); };

  const store = data?.store;
  const theme = store?.appearance || {};
  const primary = theme.primary_color || "#37AFB4";

  const filtered = useMemo(() => {
    if (!data) return [];
    let items = data.products;
    if (cat === "Promoções") items = items.filter((p) => p.promo_price);
    else if (cat !== "Todos") { const c = data.categories.find((x) => x.name === cat); items = items.filter((p) => p.category_id === c?.id); }
    if (q) items = items.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
    return items;
  }, [data, cat, q]);

  const addToCart = (p, opts = {}) => {
    setCart((c) => {
      const price = p.promo_price || p.price;
      return [...c, { key: Date.now(), id: p.id, name: p.name, price, qty: 1, opts }];
    });
    track(slug, "cart_add", p.id);
  };
  const removeItem = (key) => { setCart((c) => c.filter((i) => i.key !== key)); track(slug, "cart_remove"); };
  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const doSearch = (val) => { setQ(val); if (val.length > 2) track(slug, "search", null, val); };

  if (notFound) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loja não encontrada.</div>;
  if (!data) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin" style={{ color: primary }} /></div>;

  if (store.status === "maintenance") {
    return <div className="min-h-screen flex flex-col items-center justify-center text-center p-6" style={{ background: theme.bg_color }}>
      <Store className="w-12 h-12 mb-3" style={{ color: primary }} /><h1 className="text-2xl font-bold text-slate-800">Loja em manutenção</h1>
      <p className="text-slate-500 mt-2">Voltamos em breve.</p></div>;
  }

  const font = FONT_MAP[theme.font] || FONT_MAP.Poppins;
  const sections = [...(theme.sections || [])].filter((s) => s.visible).sort((a, b) => a.order - b.order);

  return (
    <div style={{ background: theme.bg_color || "#EAF6F6", fontFamily: font, minHeight: "100vh" }} data-testid="public-catalog">
      {/* nav */}
      <nav className="text-white" style={{ background: primary }}>
        <div className="max-w-6xl mx-auto flex items-center justify-center gap-6 py-3 text-sm font-medium">
          <span className="font-semibold">Início</span><span className="opacity-80">Promoções</span><span className="opacity-80">Pedidos</span>
        </div>
      </nav>

      {/* hero */}
      <div className="max-w-6xl mx-auto px-4">
        <div className="rounded-b-2xl overflow-hidden" style={{ background: primary }}>
          {theme.hero_desktop_media && <img src={mediaUrl(theme.hero_desktop_media)} alt="" className="w-full h-48 sm:h-64 object-cover" style={{ objectFit: theme.hero_fit || "cover" }} />}
        </div>
        <div className="flex items-end gap-4 -mt-10 px-2 sm:px-6">
          <img src={mediaUrl(theme.profile_media) || `https://ui-avatars.com/api/?name=${encodeURIComponent(store.name)}`} alt="" className="w-24 h-24 rounded-2xl border-4 border-white object-cover bg-white shadow" />
          <div className="pb-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800">{store.name}</h1>
            <div className="flex items-center gap-3 text-sm text-slate-600 mt-1 flex-wrap">
              {store.notice && <span style={{ color: primary }} className="font-medium">{store.notice}</span>}
              {store.address && <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{store.address}</span>}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          {/* filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-5">
            <select value={cat} onChange={(e) => { setCat(e.target.value); track(slug, "category_view", null, e.target.value); }} data-testid="catalog-category-select"
              className="rounded-lg border border-slate-200 px-3 py-2.5 text-sm bg-white">
              <option>Todos</option><option>Promoções</option>
              {data.categories.map((c) => <option key={c.id}>{c.name}</option>)}
            </select>
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={q} onChange={(e) => doSearch(e.target.value)} placeholder="Buscar produtos" data-testid="catalog-search"
                className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2.5 text-sm" />
            </div>
          </div>

          {filtered.length === 0 ? <p className="text-slate-400 text-sm py-10 text-center">Nenhum produto encontrado.</p> :
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4" data-testid="catalog-grid">
              {filtered.map((p) => {
                const canBuy = p.availability === "available" && !p.price_on_request;
                return (
                  <div key={p.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer" data-testid={`catalog-product-${p.id}`} onClick={() => openDetail(p)}>
                    <div className="relative">
                      <img src={mediaUrl(p.images?.[p.cover_index] || p.images?.[0]) || "https://via.placeholder.com/300"} alt={p.name} className="w-full h-36 sm:h-44 object-cover" />
                      {p.promo_price && <span className="absolute top-2 right-2 text-white text-xs font-bold px-2 py-0.5 rounded" style={{ background: primary }}>Promoção</span>}
                      {p.featured && !p.promo_price && <span className="absolute top-2 right-2 bg-amber-500 text-white text-xs font-bold px-2 py-0.5 rounded">Destaque</span>}
                    </div>
                    <div className="p-3">
                      <h3 className="font-semibold text-slate-800 text-sm truncate">{p.name}</h3>
                      <p className="text-xs text-slate-500 line-clamp-2 h-8 mt-0.5">{p.short_description}</p>
                      <div className="mt-2 flex items-center justify-between">
                        <div>
                          {p.price_on_request ? <span className="text-xs text-slate-500">Sob consulta</span> :
                            <span className="font-bold" style={{ color: primary }}>{brl(p.promo_price || p.price)}{p.promo_price && <span className="text-xs line-through text-slate-400 ml-1">{brl(p.price)}</span>}</span>}
                        </div>
                      </div>
                      {canBuy ? <button onClick={(e) => { e.stopPropagation(); addToCart(p); }} data-testid={`catalog-add-${p.id}`}
                        className="mt-2 w-full text-white text-xs font-semibold py-1.5 rounded-lg" style={{ background: primary }}>Adicionar</button>
                        : <p className="mt-2 text-xs text-center text-slate-400">{p.availability === "out_of_stock" ? "Esgotado" : p.price_on_request ? "Consulte" : "Indisponível"}</p>}
                    </div>
                  </div>
                );
              })}
            </div>}
        </div>

        {/* cart */}
        <div className="lg:sticky lg:top-4 h-fit">
          <div className="bg-white rounded-xl shadow-sm p-4" data-testid="catalog-cart">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-slate-800 flex items-center gap-2"><ShoppingBag className="w-4 h-4" />Sua sacola</h3>
              {cart.length > 0 && <button onClick={() => setCart([])} className="text-xs text-slate-400">LIMPAR</button>}
            </div>
            {cart.length === 0 ? <p className="text-sm text-slate-400 py-4">Sua sacola está vazia. Escolha um produto para começar.</p> :
              <div className="space-y-2 max-h-64 overflow-y-auto scayl-scroll">
                {cart.map((i) => (
                  <div key={i.key} className="flex items-center justify-between text-sm border-b border-slate-100 pb-2">
                    <span className="text-slate-700 truncate flex-1">{i.name}</span>
                    <span className="font-semibold mx-2">{brl(i.price)}</span>
                    <button onClick={() => removeItem(i.key)}><Trash2 className="w-3.5 h-3.5 text-slate-400" /></button>
                  </div>
                ))}
              </div>}
            <div className="mt-3 pt-3 border-t border-slate-100 text-sm space-y-1">
              <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span className="font-semibold">{brl(subtotal)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Entrega</span><span className="text-slate-500">a definir</span></div>
            </div>
            <button disabled={!cart.length} onClick={() => setCheckout(true)} data-testid="catalog-checkout"
              className="mt-3 w-full text-white font-semibold py-2.5 rounded-lg disabled:opacity-40" style={{ background: primary }}>Continuar pedido</button>
          </div>
        </div>
      </div>

      {detail && <DetailModal p={detail} primary={primary} onClose={() => setDetail(null)} onAdd={(opts) => { addToCart(detail, opts); setDetail(null); }} />}
      {checkout && <CheckoutModal store={store} cart={cart} subtotal={subtotal} primary={primary} slug={slug} onClose={() => setCheckout(false)} />}
    </div>
  );
}

function DetailModal({ p, primary, onClose, onAdd }) {
  const canBuy = p.availability === "available" && !p.price_on_request;
  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose} data-testid="catalog-detail">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[90vh] overflow-y-auto scayl-scroll" onClick={(e) => e.stopPropagation()}>
        <div className="relative">
          <img src={mediaUrl(p.images?.[p.cover_index] || p.images?.[0]) || "https://via.placeholder.com/500"} alt={p.name} className="w-full h-56 object-cover" />
          <button onClick={onClose} className="absolute top-3 right-3 bg-white rounded-full p-1.5 shadow"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5">
          <h2 className="text-xl font-bold text-slate-800">{p.name}</h2>
          <p className="text-slate-500 text-sm mt-1">{p.description || p.short_description}</p>
          <p className="text-2xl font-bold mt-3" style={{ color: primary }}>{p.price_on_request ? "Sob consulta" : brl(p.promo_price || p.price)}{p.promo_price && <span className="text-sm line-through text-slate-400 ml-2">{brl(p.price)}</span>}</p>
          {p.specs?.length > 0 && <div className="mt-3 text-sm">{p.specs.map((s, i) => <div key={i} className="flex justify-between py-1 border-b border-slate-100"><span className="text-slate-500">{s.name}</span><span className="text-slate-700">{s.value}</span></div>)}</div>}
          {canBuy ? <button onClick={() => onAdd({})} data-testid="catalog-detail-add" className="mt-4 w-full text-white font-semibold py-2.5 rounded-lg" style={{ background: primary }}>Adicionar à sacola</button>
            : <p className="mt-4 text-center text-slate-400 text-sm">{p.availability === "out_of_stock" ? "Produto esgotado" : "Indisponível no momento"}</p>}
        </div>
      </div>
    </div>
  );
}

function CheckoutModal({ store, cart, subtotal, primary, slug, onClose }) {
  const d = store.delivery || {};
  const pay = store.payments || {};
  const [mode, setMode] = useState(d.delivery_enabled ? "delivery" : "pickup");
  const [address, setAddress] = useState("");
  const [name, setName] = useState("");
  const [payment, setPayment] = useState("");
  const fee = mode === "delivery" ? (d.delivery_fee || 8) : 0;
  const total = subtotal + fee;

  const payOptions = [
    pay.pix && ["pix", "Pix"], pay.credit && ["credit", "Cartão de crédito"],
    pay.debit && ["debit", "Cartão de débito"], pay.cash && ["cash", "Dinheiro"],
  ].filter(Boolean);

  const finish = () => {
    if (mode === "delivery" && !address.trim()) return alert("Informe o endereço de entrega.");
    if (!payment) return alert("Escolha a forma de pagamento.");
    track(slug, "checkout_click");
    let msg = `*Novo pedido - ${store.name}*%0A%0A`;
    if (name) msg += `Cliente: ${name}%0A`;
    cart.forEach((i) => { msg += `• ${i.name} - ${brl(i.price)}%0A`; });
    msg += `%0ASubtotal: ${brl(subtotal)}%0A`;
    msg += mode === "delivery" ? `Entrega: ${brl(fee)}%0AEndereço: ${address}%0A` : `Retirada no local%0A`;
    msg += `*Total: ${brl(total)}*%0A`;
    msg += `Pagamento: ${payOptions.find((o) => o[0] === payment)?.[1]}%0A`;
    if (payment === "pix" && pay.pix_key) msg += `Chave Pix: ${pay.pix_key}%0A`;
    const closed = false;
    window.open(`https://wa.me/${store.whatsapp}?text=${msg}`, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose} data-testid="catalog-checkout-modal">
      <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto scayl-scroll p-5" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4"><h2 className="text-lg font-bold text-slate-800">Finalizar pedido</h2><button onClick={onClose}><X className="w-5 h-5" /></button></div>
        <p className="text-sm font-semibold text-slate-700 mb-2">Nome</p>
        <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-4" data-testid="checkout-name" />

        <p className="text-sm font-semibold text-slate-700 mb-2">Como deseja receber?</p>
        <div className="grid grid-cols-2 gap-2 mb-4">
          {d.delivery_enabled && <button onClick={() => setMode("delivery")} data-testid="checkout-delivery" className={`border rounded-lg p-3 text-sm ${mode === "delivery" ? "border-2" : "border-slate-200"}`} style={mode === "delivery" ? { borderColor: primary } : {}}>Entrega<br /><b>{brl(d.delivery_fee || 8)}</b></button>}
          {d.pickup_enabled && <button onClick={() => setMode("pickup")} data-testid="checkout-pickup" className={`border rounded-lg p-3 text-sm ${mode === "pickup" ? "border-2" : "border-slate-200"}`} style={mode === "pickup" ? { borderColor: primary } : {}}>Retirada<br /><b>Grátis</b></button>}
        </div>
        {mode === "delivery" && <>
          <input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Endereço completo *" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm mb-2" data-testid="checkout-address" />
          {d.regions?.length > 0 && <p className="text-xs text-slate-400 mb-4">Regiões atendidas: {d.regions.join(", ")}. Fora dessas regiões, consulte a loja.</p>}
        </>}
        {mode === "pickup" && d.pickup_address && <p className="text-xs text-slate-500 mb-4 flex items-center gap-1"><MapPin className="w-3 h-3" />{d.pickup_address}</p>}

        <p className="text-sm font-semibold text-slate-700 mb-2">Pagamento</p>
        <div className="space-y-1 mb-4">
          {payOptions.map(([k, l]) => <label key={k} className="flex items-center gap-2 text-sm p-2 border border-slate-200 rounded-lg cursor-pointer" data-testid={`checkout-pay-${k}`}><input type="radio" name="pay" checked={payment === k} onChange={() => setPayment(k)} />{l}</label>)}
        </div>

        <div className="text-sm space-y-1 border-t border-slate-100 pt-3">
          <div className="flex justify-between"><span className="text-slate-500">Subtotal</span><span>{brl(subtotal)}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Entrega</span><span>{fee ? brl(fee) : "Grátis"}</span></div>
          <div className="flex justify-between font-bold text-base"><span>Total</span><span>{brl(total)}</span></div>
        </div>
        <button onClick={finish} data-testid="checkout-send" className="mt-4 w-full text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2" style={{ background: primary }}><MessageCircle className="w-4 h-4" />Enviar pedido no WhatsApp</button>
        <p className="text-[11px] text-center text-slate-400 mt-2">O pedido será enviado ao WhatsApp da loja. Nenhum pagamento é cobrado aqui.</p>
      </div>
    </div>
  );
}
