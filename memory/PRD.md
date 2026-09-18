# PRD — Scayl: Painel do Catálogo Multi-loja

## Problema original
Construir e CONECTAR o painel administrativo ao catálogo Scayl já existente (demo público "Hapster Cookies", tema teal, sacola → WhatsApp). Multi-tenant: base padrão para vários clientes; cada loja personaliza produtos, categorias, imagens, identidade, textos e dados. Painel do lojista + administração interna Scayl (/admin). pt-BR, desktop e mobile.

## Decisões de arquitetura (confirmadas com o usuário)
- Repositório do catálogo (github.com/mayconasm2-jpg/catalogo) é PRIVADO — sem acesso ao código/deploy/dados originais.
- Estratégia: reconstruir TUDO no Emergent (catálogo público + painel + backend) preservando a identidade visual; depois o usuário aponta o domínio/Vercel para cá.
- Auth: JWT e-mail/senha (cookies httpOnly), papéis por loja.
- Escopo entregue: NÚCLEO primeiro.
- Regras fixas: entrega R$ 8,00 fixo, retirada grátis, pagamentos Pix/crédito/débito/dinheiro, sem checkout interno (pedido vai ao WhatsApp), sem venda confirmada.

## Stack
- Backend: FastAPI + MongoDB (motor). `/app/backend/{server.py, core.py, seed.py}`. Rotas com prefixo /api.
- Frontend: React 19 + Tailwind + shadcn/ui + recharts + sonner. Alias `@/` = src.
- Auth: bcrypt + PyJWT (access 15m / refresh 7d em cookies httpOnly), brute-force por e-mail, reset de senha por e-mail (Emergent Email).
- Imagens: upload real via /api/media (binário no Mongo, servido em /api/media/{id}).
- QR: qrcode (PNG) em /api/share/qr.

## Personas
- Proprietário (owner), Administrador (admin), Editor de produtos (editor) — por loja.
- Administrador da plataforma Scayl (platform_admin) — acesso /admin.

## Implementado (2026-06)
- Auth completo: register(cria loja), login, logout, me, refresh, forgot/reset senha, change-password. Lockout keyed por e-mail (funciona atrás do ingress K8s).
- Isolamento por loja: toda rota escopada por store_id; guards get_store_user / require_store_manage / require_platform_admin.
- Produtos: lista (busca/filtros/ordenação/paginação), CRUD, duplicar, ações rápidas (destaque, indisponível, esgotado, ocultar), bulk, editor com upload múltiplo+capa+reordenar, variações, especificações, validação de promo.
- Categorias: CRUD, ativar/ocultar, reordenar, excluir com categoria destino, contagem de produtos.
- Minha loja: perfil, slug único, publicar/despublicar/manutenção.
- Aparência: logo/perfil/hero, cores, fonte, prévia ao vivo desktop/mobile; refletido no catálogo.
- Entrega/retirada (R$8 fixo / grátis) e Pagamentos (Pix/crédito+parcelas/débito/dinheiro+troco) com validações.
- Métricas: eventos reais (visit/product_view/search/category_view/cart_add/remove/checkout_click), dashboard e página de métricas com filtros e export PDF (print).
- Compartilhar: copiar link, WhatsApp, QR (baixável).
- Usuários: convite (link + validade + limite por plano), papel, ativar/desativar, remover.
- Plano/assinatura: uso e limites, estados reais (trial/active/suspended), sem simular cobrança.
- Configurações: conta, senha, exportar produtos.
- /admin Scayl: visão geral, lojas (busca/filtro/paginação, ver detalhes, abrir catálogo, alterar plano, estender teste, suspender/reativar + auditoria), usuários (bloquear/desbloquear), planos, assinaturas, métricas globais.
- Catálogo público reconstruído /loja/:slug: identidade por loja, categorias/busca, cards, detalhe, sacola, checkout → WhatsApp (entrega R$8/retirada grátis), rastreio de eventos. Renderiza dados reais do banco.
- Seed: admin Scayl + owner (mayconasm2@gmail.com) + loja Hapster Cookies migrada (5 categorias, 16 produtos, tema teal).

## Credenciais de teste
Ver /app/memory/test_credentials.md.

## Backlog (próximas fases)
- P1: Promoções e cupons funcionais (código, %/fixo, validade, limite, elegíveis) integrados à sacola.
- P1: Convite de usuário por e-mail (envio real) — hoje gera link copiável.
- P2: Domínio próprio (Premium), remoção de marca Scayl no catálogo.
- P2: Suporte/chamados no /admin.
- P2: Editor drag-and-drop de imagens (hoje botões de reordenar), regiões de entrega no mapa.

## Notas técnicas
- server.py grande (considerar split em routers no futuro).
- appearance/delivery/payments aceitam dict (validação estrutural mínima) — endurecer com Pydantic depois.
