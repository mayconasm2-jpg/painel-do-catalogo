export function brl(v) {
  if (v == null || v === "") return "R$ 0,00";
  return Number(v).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export const ROLE_LABELS = {
  platform_admin: "Admin Scayl",
  owner: "Proprietário",
  admin: "Administrador",
  editor: "Editor de produtos",
};

export const PLAN_LABELS = { essencial: "Essencial", profissional: "Profissional", premium: "Premium" };
export const STATUS_LABELS = {
  published: "Publicado", unpublished: "Despublicado", maintenance: "Manutenção",
  draft: "Rascunho", hidden: "Oculto",
};
export const AVAIL_LABELS = { available: "Disponível", unavailable: "Indisponível", out_of_stock: "Esgotado" };
