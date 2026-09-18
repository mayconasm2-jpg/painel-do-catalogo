"""Idempotent seed: platform admin + migrated Hapster Cookies store (real catalog data)."""
import os
from datetime import datetime, timezone, timedelta
from core import hash_password, verify_password

HERO = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-hTa3ia3tikRELbj6cjBzdYAi0E5NVU.png"
MASCOTE = "https://hebbkx1anhila5yf.public.blob.vercel-storage.com/image-TAnOUDml2jXItZy4sArsPrUBKTUwDm.png"


def now():
    return datetime.now(timezone.utc).isoformat()


CATEGORIES = ["Eletrônicos", "Moda", "Acessórios", "Beleza", "Casa"]

PRODUCTS = [
    ("Smartwatch Pulse Pro", "Eletrônicos", "Monitoramento completo para acompanhar sua rotina com estilo.", 319.90, 249.90, True,
     "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format&fit=crop&w=700&q=85"),
    ("Fone Bluetooth AirBeat", "Eletrônicos", "Som nítido, conforto e bateria para acompanhar seu dia.", 129.90, None, True,
     "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=700&q=85"),
    ("Caixa de Som Mini Bass", "Eletrônicos", "Sua trilha sonora em qualquer lugar.", 109.90, None, False,
     "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?auto=format&fit=crop&w=700&q=85"),
    ("Bolsa Aurora", "Moda", "Design versátil e acabamento sofisticado para todos os momentos.", 229.90, 189.90, True,
     "https://images.unsplash.com/photo-1584917865442-de89df76afd3?auto=format&fit=crop&w=700&q=85"),
    ("Tênis Urban Move", "Moda", "Leveza e conforto para a sua rotina urbana.", 219.90, None, False,
     "https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=700&q=85"),
    ("Camiseta Essential Premium", "Moda", "Malha macia e caimento confortável para o dia a dia.", 79.90, None, False,
     "https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?auto=format&fit=crop&w=700&q=85"),
    ("Sandália Confort", "Moda", "Conforto para caminhar com leveza.", 149.90, 119.90, False,
     "https://images.unsplash.com/photo-1562273138-f46be4ebdf33?auto=format&fit=crop&w=700&q=85"),
    ("Óculos Solar Riviera", "Acessórios", "Proteção e personalidade em um só acessório.", 129.90, 99.90, False,
     "https://images.unsplash.com/photo-1511499767150-a48a237f0083?auto=format&fit=crop&w=700&q=85"),
    ("Mochila Executiva Compact", "Acessórios", "Organização inteligente para trabalho e estudos.", 169.90, None, False,
     "https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=700&q=85"),
    ("Relógio Classic", "Acessórios", "Um clássico atemporal para completar seu visual.", 179.90, None, False,
     "https://images.unsplash.com/photo-1524805444758-089113d48a6d?auto=format&fit=crop&w=700&q=85"),
    ("Kit Skincare Essencial", "Beleza", "Uma rotina simples para cuidar da sua pele todos os dias.", 89.90, None, False,
     "https://images.unsplash.com/photo-1556228578-8c89e6adf883?auto=format&fit=crop&w=700&q=85"),
    ("Perfume Lumière 100 ml", "Beleza", "Fragrância marcante com notas florais e amadeiradas.", 159.90, None, False,
     "https://images.unsplash.com/photo-1541643600914-78b084683601?auto=format&fit=crop&w=700&q=85"),
    ("Necessaire Bella", "Beleza", "Compacta por fora, espaçosa por dentro.", 59.90, None, False,
     "https://images.unsplash.com/photo-1594223274512-ad4803739b7c?auto=format&fit=crop&w=700&q=85"),
    ("Luminária de Mesa Nórdica", "Casa", "Luz aconchegante e design que transforma o ambiente.", 139.90, None, False,
     "https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=700&q=85"),
    ("Garrafa Térmica Inox 1 L", "Casa", "Bebidas na temperatura ideal por muito mais tempo.", 79.90, None, False,
     "https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=700&q=85"),
    ("Organizador Multiuso", "Casa", "Praticidade para deixar tudo no lugar.", 49.90, None, False,
     "https://images.unsplash.com/photo-1586023492125-27b2c045efd7?auto=format&fit=crop&w=700&q=85"),
]


async def run_seed(db):
    # platform admin
    admin_email = os.environ.get("ADMIN_EMAIL", "admin@scayl.com")
    admin_pw = os.environ.get("ADMIN_PASSWORD", "scayl@admin2026")
    existing = await db.users.find_one({"email": admin_email})
    if not existing:
        await db.users.insert_one({"email": admin_email, "password_hash": hash_password(admin_pw),
                                   "name": "Administração Scayl", "role": "platform_admin", "store_id": None,
                                   "status": "active", "token_version": 0, "created_at": now()})
    elif not verify_password(admin_pw, existing["password_hash"]):
        await db.users.update_one({"email": admin_email}, {"$set": {"password_hash": hash_password(admin_pw)}})

    # Hapster store (migrated real catalog)
    owner_email = os.environ.get("OWNER_EMAIL", "mayconasm2@gmail.com")
    owner_pw = os.environ.get("OWNER_PASSWORD", "hapster@2026")
    store = await db.stores.find_one({"slug": "hapster-cookies"})
    if not store:
        store_doc = {
            "name": "Hapster Cookies", "slug": "hapster-cookies", "segment": "Loja mista",
            "description": "Produtos escolhidos para facilitar o seu dia.",
            "whatsapp": "5599999999999", "instagram": "hapstercookies",
            "address": "Açailândia - MA", "map_url": "",
            "hours": "Apenas agendamento · Abrimos às 13h30", "notice": "Apenas agendamento · Abrimos às 13h30",
            "status": "published", "plan": "profissional", "plan_status": "active",
            "trial_ends_at": None, "is_demo": False,
            "appearance": {
                "logo_media": MASCOTE, "profile_media": MASCOTE,
                "hero_desktop_media": HERO, "hero_mobile_media": HERO, "hero_fit": "cover",
                "primary_color": "#37AFB4", "support_color": "#6B4A2B", "bg_color": "#EAF6F6",
                "font": "Poppins",
                "sections": [
                    {"key": "destaques", "label": "Destaques", "visible": True, "order": 0},
                    {"key": "promocoes", "label": "Promoções", "visible": True, "order": 1},
                    {"key": "categorias", "label": "Categorias", "visible": True, "order": 2},
                ],
            },
            "delivery": {"delivery_enabled": True, "pickup_enabled": True, "delivery_fee": 8.00,
                         "regions": ["Açailândia - Centro", "Açailândia - Zona Rural"],
                         "pickup_address": "Rua Principal, 100 - Centro, Açailândia - MA",
                         "pickup_instructions": "Retire no balcão a partir das 13h30."},
            "payments": {"pix": True, "credit": True, "credit_installments": 3,
                         "debit": True, "cash": True, "cash_change": True, "pix_key": "hapster@pix.com"},
            "created_at": now(), "updated_at": now(),
        }
        res = await db.stores.insert_one(store_doc)
        sid = res.inserted_id
        # owner
        if not await db.users.find_one({"email": owner_email}):
            await db.users.insert_one({"email": owner_email, "password_hash": hash_password(owner_pw),
                                       "name": "Maycon (Proprietário)", "role": "owner", "store_id": sid,
                                       "status": "active", "token_version": 0, "last_login": now(), "created_at": now()})
        # categories
        cat_ids = {}
        for i, name in enumerate(CATEGORIES):
            r = await db.categories.insert_one({"store_id": sid, "name": name, "image_media": None,
                                                "active": True, "order": i, "created_at": now()})
            cat_ids[name] = str(r.inserted_id)
        # products
        for name, cat, desc, price, promo, featured, img in PRODUCTS:
            await db.products.insert_one({
                "store_id": sid, "name": name, "category_id": cat_ids.get(cat), "subcategory": "",
                "sku": "", "description": desc, "short_description": desc, "tags": [],
                "price": price, "promo_price": promo, "price_on_request": False, "installments": None,
                "availability": "available", "status": "published", "featured": featured,
                "images": [img], "cover_index": 0, "variations": [], "specs": [],
                "views": 0, "created_at": now(), "updated_at": now()})

    await _write_credentials(admin_email, admin_pw, owner_email, owner_pw)


async def _write_credentials(admin_email, admin_pw, owner_email, owner_pw):
    from pathlib import Path
    p = Path("/app/memory/test_credentials.md")
    p.write_text(f"""# Credenciais de Teste — Painel Scayl

## Administrador da Plataforma Scayl (/admin)
- Email: {admin_email}
- Senha: {admin_pw}
- Papel: platform_admin

## Proprietário da loja (Hapster Cookies)
- Email: {owner_email}
- Senha: {owner_pw}
- Papel: owner
- Loja: Hapster Cookies (slug: hapster-cookies)
- Catálogo público: /loja/hapster-cookies

## Observações
- Papéis por loja: owner, admin, editor. Editor não gerencia assinatura/segurança/usuários.
- Convide um editor pela página Usuários para testar restrições.

## Endpoints de auth
- POST /api/auth/register, /api/auth/login, /api/auth/logout, /api/auth/me
- POST /api/auth/refresh, /api/auth/forgot-password, /api/auth/reset-password
- PUT /api/auth/change-password, /api/auth/account
""")
