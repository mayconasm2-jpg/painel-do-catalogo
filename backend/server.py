"""Scayl multi-tenant catalog panel — main FastAPI app."""
import os
import io
import base64
import logging
from datetime import datetime, timedelta

from fastapi import (FastAPI, APIRouter, Request, Response, Depends, HTTPException,
                     UploadFile, File, BackgroundTasks, Query)
from fastapi.responses import StreamingResponse
from starlette.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Any
from bson import ObjectId
import qrcode

from core import (db, client, hash_password, verify_password, create_access_token,
                  create_refresh_token, set_auth_cookies, clear_auth_cookies, clean_user,
                  get_current_user, get_store_user, require_store_manage, require_platform_admin,
                  send_password_reset_email, sha256, now_utc, gen_token, get_jwt_secret,
                  JWT_ALGORITHM)
import jwt as pyjwt

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("scayl")

app = FastAPI(title="Scayl Panel API")
api = APIRouter(prefix="/api")

PLAN_LIMITS = {
    "essencial": {"products": 30, "photos": 5, "users": 1, "coupons": False},
    "profissional": {"products": 150, "photos": 10, "users": 5, "coupons": True},
    "premium": {"products": 100000, "photos": 30, "users": 50, "coupons": True},
}
DELIVERY_FEE = 8.00


def oid(v) -> ObjectId:
    try:
        return ObjectId(v)
    except Exception:
        raise HTTPException(status_code=404, detail="Registro não encontrado")


def ser(doc: dict) -> dict:
    if not doc:
        return doc
    doc = dict(doc)
    doc["id"] = str(doc.pop("_id"))
    for k, v in list(doc.items()):
        if isinstance(v, ObjectId):
            doc[k] = str(v)
        if isinstance(v, datetime):
            doc[k] = v.isoformat()
    return doc


# ============================================================ AUTH
class RegisterIn(BaseModel):
    name: str
    email: EmailStr
    password: str
    store_name: str


class LoginIn(BaseModel):
    email: EmailStr
    password: str


class ForgotIn(BaseModel):
    email: EmailStr


class ResetIn(BaseModel):
    token: str
    password: str


def slugify(text: str) -> str:
    import re, unicodedata
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode()
    text = re.sub(r"[^a-zA-Z0-9]+", "-", text).strip("-").lower()
    return text or "loja"


async def unique_slug(base: str) -> str:
    slug = slugify(base)
    candidate, i = slug, 1
    while await db.stores.find_one({"slug": candidate}):
        i += 1
        candidate = f"{slug}-{i}"
    return candidate


def default_store_doc(name: str, slug: str, owner_email: str, is_demo=False) -> dict:
    return {
        "name": name, "slug": slug, "segment": "", "description": "",
        "whatsapp": "", "instagram": "", "address": "", "map_url": "",
        "hours": "", "notice": "", "status": "unpublished",
        "plan": "profissional", "plan_status": "trial",
        "trial_ends_at": (now_utc() + timedelta(days=14)).isoformat(),
        "is_demo": is_demo,
        "appearance": {
            "logo_media": None, "profile_media": None,
            "hero_desktop_media": None, "hero_mobile_media": None,
            "hero_fit": "cover",
            "primary_color": "#37AFB4", "support_color": "#6B4A2B", "bg_color": "#EAF6F6",
            "font": "Poppins",
            "sections": [
                {"key": "destaques", "label": "Destaques", "visible": True, "order": 0},
                {"key": "promocoes", "label": "Promoções", "visible": True, "order": 1},
                {"key": "categorias", "label": "Categorias", "visible": True, "order": 2},
            ],
        },
        "delivery": {"delivery_enabled": True, "pickup_enabled": True, "delivery_fee": DELIVERY_FEE,
                     "regions": [], "pickup_address": "", "pickup_instructions": ""},
        "payments": {"pix": True, "credit": True, "credit_installments": 3,
                     "debit": True, "cash": True, "cash_change": True, "pix_key": ""},
        "created_at": now_utc().isoformat(), "updated_at": now_utc().isoformat(),
    }


async def _brute_locked(ip: str, email: str) -> bool:
    ident = f"{ip}:{email}"
    rec = await db.login_attempts.find_one({"identifier": ident})
    if rec and rec.get("count", 0) >= 5:
        if rec.get("locked_until") and rec["locked_until"] > now_utc().isoformat():
            return True
    return False


@api.post("/auth/register")
async def register(body: RegisterIn, response: Response):
    email = body.email.lower().strip()
    if await db.users.find_one({"email": email}):
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    slug = await unique_slug(body.store_name)
    store = default_store_doc(body.store_name, slug, email)
    res = await db.stores.insert_one(store)
    store_id = res.inserted_id
    user = {"email": email, "password_hash": hash_password(body.password), "name": body.name,
            "role": "owner", "store_id": store_id, "status": "active",
            "token_version": 0, "last_login": now_utc().isoformat(), "created_at": now_utc().isoformat()}
    ures = await db.users.insert_one(user)
    uid = str(ures.inserted_id)
    set_auth_cookies(response, create_access_token(uid, email, 0), create_refresh_token(uid, 0))
    user["_id"] = ures.inserted_id
    return clean_user(user)


@api.post("/auth/login")
async def login(body: LoginIn, request: Request, response: Response):
    email = body.email.lower().strip()
    ip = request.client.host if request.client else "?"
    ident = f"{ip}:{email}"
    if await _brute_locked(ip, email):
        raise HTTPException(status_code=429, detail="Muitas tentativas. Tente novamente em 15 minutos.")
    user = await db.users.find_one({"email": email})
    if not user or not verify_password(body.password, user["password_hash"]):
        await db.login_attempts.update_one(
            {"identifier": ident},
            {"$inc": {"count": 1}, "$set": {"email": email, "locked_until": (now_utc() + timedelta(minutes=15)).isoformat()}},
            upsert=True)
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    if user.get("status") == "disabled":
        raise HTTPException(status_code=403, detail="Acesso desativado. Contate o administrador.")
    await db.login_attempts.delete_many({"identifier": ident})
    await db.users.update_one({"_id": user["_id"]}, {"$set": {"last_login": now_utc().isoformat()}})
    uid = str(user["_id"])
    tv = user.get("token_version", 0)
    set_auth_cookies(response, create_access_token(uid, email, tv), create_refresh_token(uid, tv))
    return clean_user(user)


@api.post("/auth/logout")
async def logout(response: Response, user: dict = Depends(get_current_user)):
    clear_auth_cookies(response)
    return {"message": "Sessão encerrada"}


@api.get("/auth/me")
async def me(user: dict = Depends(get_current_user)):
    return user


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="Sem sessão")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Token inválido")
        user = await db.users.find_one({"_id": ObjectId(payload["sub"])})
        if not user or payload.get("ver", 0) != user.get("token_version", 0):
            raise HTTPException(status_code=401, detail="Sessão expirada")
        uid = str(user["_id"])
        set_auth_cookies(response, create_access_token(uid, user["email"], user.get("token_version", 0)),
                         create_refresh_token(uid, user.get("token_version", 0)))
        return {"message": "ok"}
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Token inválido")


@api.post("/auth/forgot-password")
async def forgot_password(body: ForgotIn, background_tasks: BackgroundTasks):
    email = body.email.lower().strip()
    generic = {"message": "Se o e-mail estiver cadastrado, enviaremos um link de redefinição."}
    await db.password_reset_requests.insert_one({"email": email, "created_at": now_utc()})
    recent = await db.password_reset_requests.count_documents(
        {"email": email, "created_at": {"$gt": now_utc() - timedelta(minutes=15)}})
    if recent > 5:
        return generic
    user = await db.users.find_one({"email": email})
    if not user:
        return generic
    token = gen_token()
    await db.password_reset_tokens.insert_one({
        "token_hash": sha256(token), "user_id": user["_id"], "email": email,
        "expires_at": now_utc() + timedelta(hours=1), "used": False})
    background_tasks.add_task(send_password_reset_email, user["email"], token)
    return generic


@api.post("/auth/reset-password")
async def reset_password(body: ResetIn):
    h = sha256(body.token)
    rec = await db.password_reset_tokens.find_one_and_update(
        {"token_hash": h, "used": False, "expires_at": {"$gt": now_utc()}},
        {"$set": {"used": True}})
    if not rec:
        raise HTTPException(status_code=400, detail="Link inválido ou expirado")
    await db.users.update_one({"_id": rec["user_id"]},
                              {"$set": {"password_hash": hash_password(body.password)}, "$inc": {"token_version": 1}})
    await db.password_reset_tokens.delete_many({"user_id": rec["user_id"], "used": False})
    await db.login_attempts.delete_many({"email": rec["email"]})
    return {"message": "Senha redefinida com sucesso"}


class ChangePwIn(BaseModel):
    current_password: str
    new_password: str


@api.put("/auth/change-password")
async def change_password(body: ChangePwIn, user: dict = Depends(get_current_user)):
    u = await db.users.find_one({"_id": oid(user["id"])})
    if not verify_password(body.current_password, u["password_hash"]):
        raise HTTPException(status_code=400, detail="Senha atual incorreta")
    await db.users.update_one({"_id": u["_id"]},
                              {"$set": {"password_hash": hash_password(body.new_password)}, "$inc": {"token_version": 1}})
    return {"message": "Senha alterada"}


class AccountIn(BaseModel):
    name: str


@api.put("/auth/account")
async def update_account(body: AccountIn, user: dict = Depends(get_current_user)):
    await db.users.update_one({"_id": oid(user["id"])}, {"$set": {"name": body.name}})
    return {"message": "Conta atualizada"}


# ============================================================ STORE (tenant)
async def store_of(user: dict) -> dict:
    st = await db.stores.find_one({"_id": oid(user["store_id"])})
    if not st:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    return st


@api.get("/store")
async def get_store(user: dict = Depends(get_store_user)):
    st = await store_of(user)
    st = ser(st)
    st["limits"] = PLAN_LIMITS.get(st.get("plan", "essencial"))
    st["product_count"] = await db.products.count_documents({"store_id": oid(user["store_id"])})
    st["user_count"] = await db.users.count_documents({"store_id": oid(user["store_id"])})
    return st


class StoreProfileIn(BaseModel):
    name: Optional[str] = None
    segment: Optional[str] = None
    description: Optional[str] = None
    slug: Optional[str] = None
    whatsapp: Optional[str] = None
    instagram: Optional[str] = None
    address: Optional[str] = None
    map_url: Optional[str] = None
    hours: Optional[str] = None
    notice: Optional[str] = None


@api.put("/store")
async def update_store(body: StoreProfileIn, user: dict = Depends(require_store_manage)):
    data = {k: v for k, v in body.model_dump().items() if v is not None}
    if "slug" in data:
        slug = slugify(data["slug"])
        exists = await db.stores.find_one({"slug": slug, "_id": {"$ne": oid(user["store_id"])}})
        if exists:
            raise HTTPException(status_code=400, detail="Este endereço (slug) já está em uso")
        data["slug"] = slug
    data["updated_at"] = now_utc().isoformat()
    await db.stores.update_one({"_id": oid(user["store_id"])}, {"$set": data})
    return ser(await store_of(user))


@api.put("/store/appearance")
async def update_appearance(body: dict, user: dict = Depends(require_store_manage)):
    await db.stores.update_one({"_id": oid(user["store_id"])},
                               {"$set": {"appearance": body, "updated_at": now_utc().isoformat()}})
    return ser(await store_of(user))


@api.put("/store/delivery")
async def update_delivery(body: dict, user: dict = Depends(require_store_manage)):
    body["delivery_fee"] = DELIVERY_FEE
    if not body.get("delivery_enabled") and not body.get("pickup_enabled"):
        raise HTTPException(status_code=400, detail="Ative ao menos entrega ou retirada")
    await db.stores.update_one({"_id": oid(user["store_id"])},
                               {"$set": {"delivery": body, "updated_at": now_utc().isoformat()}})
    return ser(await store_of(user))


@api.put("/store/payments")
async def update_payments(body: dict, user: dict = Depends(require_store_manage)):
    if not any([body.get("pix"), body.get("credit"), body.get("debit"), body.get("cash")]):
        raise HTTPException(status_code=400, detail="Habilite ao menos uma forma de pagamento")
    await db.stores.update_one({"_id": oid(user["store_id"])},
                               {"$set": {"payments": body, "updated_at": now_utc().isoformat()}})
    return ser(await store_of(user))


class StatusIn(BaseModel):
    status: str


@api.post("/store/status")
async def set_store_status(body: StatusIn, user: dict = Depends(require_store_manage)):
    if body.status not in ("published", "unpublished", "maintenance"):
        raise HTTPException(status_code=400, detail="Status inválido")
    await db.stores.update_one({"_id": oid(user["store_id"])},
                               {"$set": {"status": body.status, "updated_at": now_utc().isoformat()}})
    return ser(await store_of(user))


# ============================================================ MEDIA
@api.post("/media")
async def upload_media(file: UploadFile = File(...), user: dict = Depends(get_store_user)):
    content = await file.read()
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="Imagem acima de 5MB")
    doc = {"store_id": oid(user["store_id"]), "content_type": file.content_type or "image/png",
           "data": base64.b64encode(content).decode(), "created_at": now_utc().isoformat()}
    res = await db.media.insert_one(doc)
    return {"id": str(res.inserted_id), "url": f"/api/media/{res.inserted_id}"}


@api.get("/media/{media_id}")
async def get_media(media_id: str):
    doc = await db.media.find_one({"_id": oid(media_id)})
    if not doc:
        raise HTTPException(status_code=404, detail="Mídia não encontrada")
    data = base64.b64decode(doc["data"])
    return StreamingResponse(io.BytesIO(data), media_type=doc.get("content_type", "image/png"),
                             headers={"Cache-Control": "public, max-age=31536000"})


# ============================================================ CATEGORIES
class CategoryIn(BaseModel):
    name: str
    image_media: Optional[str] = None
    active: bool = True


@api.get("/categories")
async def list_categories(user: dict = Depends(get_store_user)):
    sid = oid(user["store_id"])
    cats = await db.categories.find({"store_id": sid}).sort("order", 1).to_list(500)
    out = []
    for c in cats:
        c = ser(c)
        c["product_count"] = await db.products.count_documents({"store_id": sid, "category_id": c["id"]})
        out.append(c)
    return out


@api.post("/categories")
async def create_category(body: CategoryIn, user: dict = Depends(get_store_user)):
    sid = oid(user["store_id"])
    count = await db.categories.count_documents({"store_id": sid})
    doc = {"store_id": sid, "name": body.name, "image_media": body.image_media,
           "active": body.active, "order": count, "created_at": now_utc().isoformat()}
    res = await db.categories.insert_one(doc)
    doc["_id"] = res.inserted_id
    return ser(doc)


class ReorderIn(BaseModel):
    ids: List[str]


@api.put("/categories/reorder")
async def reorder_categories(body: ReorderIn, user: dict = Depends(get_store_user)):
    sid = oid(user["store_id"])
    for i, cid in enumerate(body.ids):
        await db.categories.update_one({"_id": oid(cid), "store_id": sid}, {"$set": {"order": i}})
    return {"message": "Ordem atualizada"}


@api.put("/categories/{cid}")
async def update_category(cid: str, body: CategoryIn, user: dict = Depends(get_store_user)):
    sid = oid(user["store_id"])
    r = await db.categories.update_one({"_id": oid(cid), "store_id": sid},
                                       {"$set": body.model_dump()})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Categoria não encontrada")
    return ser(await db.categories.find_one({"_id": oid(cid)}))


@api.delete("/categories/{cid}")
async def delete_category(cid: str, target: Optional[str] = None, user: dict = Depends(get_store_user)):
    sid = oid(user["store_id"])
    n = await db.products.count_documents({"store_id": sid, "category_id": cid})
    if n > 0:
        if not target:
            raise HTTPException(status_code=400, detail="Escolha uma categoria de destino para os produtos")
        await db.products.update_many({"store_id": sid, "category_id": cid}, {"$set": {"category_id": target}})
    await db.categories.delete_one({"_id": oid(cid), "store_id": sid})
    return {"message": "Categoria excluída", "moved": n}


# ============================================================ PRODUCTS
class ProductIn(BaseModel):
    name: str
    category_id: Optional[str] = None
    subcategory: Optional[str] = ""
    sku: Optional[str] = ""
    description: Optional[str] = ""
    short_description: Optional[str] = ""
    tags: List[str] = []
    price: float = 0
    promo_price: Optional[float] = None
    price_on_request: bool = False
    installments: Optional[int] = None
    availability: str = "available"
    status: str = "draft"
    featured: bool = False
    images: List[str] = []
    cover_index: int = 0
    variations: List[Any] = []
    specs: List[Any] = []


def validate_product(body: ProductIn, plan_photos: int):
    if not body.price_on_request and body.promo_price is not None and body.promo_price >= body.price and body.promo_price > 0:
        raise HTTPException(status_code=400, detail="Preço promocional deve ser menor que o preço normal")
    if len(body.images) > plan_photos:
        raise HTTPException(status_code=400, detail=f"Seu plano permite até {plan_photos} fotos por produto")


@api.get("/products")
async def list_products(user: dict = Depends(get_store_user), search: str = "", category: str = "",
                        status: str = "", promo: str = "", sort: str = "recent",
                        page: int = 1, page_size: int = 20):
    sid = oid(user["store_id"])
    q: dict = {"store_id": sid}
    if search:
        q["name"] = {"$regex": search, "$options": "i"}
    if category:
        q["category_id"] = category
    if status:
        q["status"] = status
    if promo == "true":
        q["promo_price"] = {"$ne": None, "$gt": 0}
    sort_map = {"recent": ("created_at", -1), "name": ("name", 1),
                "price_asc": ("price", 1), "price_desc": ("price", -1), "views": ("views", -1)}
    sk, sv = sort_map.get(sort, ("created_at", -1))
    total = await db.products.count_documents(q)
    cur = db.products.find(q).sort(sk, sv).skip((page - 1) * page_size).limit(page_size)
    items = [ser(p) for p in await cur.to_list(page_size)]
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@api.post("/products")
async def create_product(body: ProductIn, user: dict = Depends(get_store_user)):
    sid = oid(user["store_id"])
    st = await store_of(user)
    limits = PLAN_LIMITS.get(st.get("plan", "essencial"))
    count = await db.products.count_documents({"store_id": sid})
    if count >= limits["products"]:
        raise HTTPException(status_code=403, detail=f"Limite do plano atingido ({limits['products']} produtos). Faça upgrade.")
    validate_product(body, limits["photos"])
    doc = body.model_dump()
    doc.update({"store_id": sid, "views": 0, "created_at": now_utc().isoformat(), "updated_at": now_utc().isoformat()})
    res = await db.products.insert_one(doc)
    doc["_id"] = res.inserted_id
    return ser(doc)


@api.get("/products/{pid}")
async def get_product(pid: str, user: dict = Depends(get_store_user)):
    p = await db.products.find_one({"_id": oid(pid), "store_id": oid(user["store_id"])})
    if not p:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return ser(p)


@api.put("/products/{pid}")
async def update_product(pid: str, body: ProductIn, user: dict = Depends(get_store_user)):
    sid = oid(user["store_id"])
    st = await store_of(user)
    limits = PLAN_LIMITS.get(st.get("plan", "essencial"))
    validate_product(body, limits["photos"])
    doc = body.model_dump()
    doc["updated_at"] = now_utc().isoformat()
    r = await db.products.update_one({"_id": oid(pid), "store_id": sid}, {"$set": doc})
    if not r.matched_count:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return ser(await db.products.find_one({"_id": oid(pid)}))


@api.post("/products/{pid}/duplicate")
async def duplicate_product(pid: str, user: dict = Depends(get_store_user)):
    sid = oid(user["store_id"])
    p = await db.products.find_one({"_id": oid(pid), "store_id": sid})
    if not p:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    p.pop("_id")
    p["name"] = f"{p['name']} (cópia)"
    p["status"] = "draft"
    p["views"] = 0
    p["created_at"] = p["updated_at"] = now_utc().isoformat()
    res = await db.products.insert_one(p)
    p["_id"] = res.inserted_id
    return ser(p)


class BulkIn(BaseModel):
    action: str
    ids: List[str]


@api.post("/products/bulk")
async def bulk_products(body: BulkIn, user: dict = Depends(get_store_user)):
    sid = oid(user["store_id"])
    ids = [oid(i) for i in body.ids]
    q = {"_id": {"$in": ids}, "store_id": sid}
    if body.action == "delete":
        await db.products.delete_many(q)
    elif body.action == "publish":
        await db.products.update_many(q, {"$set": {"status": "published"}})
    elif body.action == "hide":
        await db.products.update_many(q, {"$set": {"status": "hidden"}})
    elif body.action == "unavailable":
        await db.products.update_many(q, {"$set": {"availability": "unavailable"}})
    elif body.action == "available":
        await db.products.update_many(q, {"$set": {"availability": "available"}})
    else:
        raise HTTPException(status_code=400, detail="Ação inválida")
    return {"message": "Ação aplicada", "count": len(ids)}


@api.delete("/products/{pid}")
async def delete_product(pid: str, user: dict = Depends(get_store_user)):
    r = await db.products.delete_one({"_id": oid(pid), "store_id": oid(user["store_id"])})
    if not r.deleted_count:
        raise HTTPException(status_code=404, detail="Produto não encontrado")
    return {"message": "Produto excluído"}


# ============================================================ USERS (tenant)
class InviteIn(BaseModel):
    email: EmailStr
    role: str


@api.get("/users")
async def list_users(user: dict = Depends(require_store_manage)):
    sid = oid(user["store_id"])
    users = [clean_user(u) for u in await db.users.find({"store_id": sid}).to_list(100)]
    invites = [ser(i) for i in await db.invites.find({"store_id": sid, "used": False}).to_list(100)]
    return {"users": users, "invites": invites}


@api.post("/users/invite")
async def invite_user(body: InviteIn, user: dict = Depends(require_store_manage)):
    if body.role not in ("admin", "editor"):
        raise HTTPException(status_code=400, detail="Papel inválido")
    sid = oid(user["store_id"])
    st = await store_of(user)
    limits = PLAN_LIMITS.get(st.get("plan", "essencial"))
    total = await db.users.count_documents({"store_id": sid}) + await db.invites.count_documents({"store_id": sid, "used": False})
    if total >= limits["users"]:
        raise HTTPException(status_code=403, detail=f"Limite de usuários do plano atingido ({limits['users']})")
    token = gen_token()
    doc = {"store_id": sid, "email": body.email.lower(), "role": body.role,
           "token_hash": sha256(token), "token_preview": token, "expires_at": (now_utc() + timedelta(days=7)).isoformat(),
           "used": False, "created_at": now_utc().isoformat()}
    res = await db.invites.insert_one(doc)
    return {"id": str(res.inserted_id), "invite_link": f"/aceitar-convite?token={token}", "email": body.email}


class RoleIn(BaseModel):
    role: str


@api.put("/users/{uid}/role")
async def change_user_role(uid: str, body: RoleIn, user: dict = Depends(require_store_manage)):
    if body.role not in ("owner", "admin", "editor"):
        raise HTTPException(status_code=400, detail="Papel inválido")
    await db.users.update_one({"_id": oid(uid), "store_id": oid(user["store_id"])}, {"$set": {"role": body.role}})
    return {"message": "Permissão atualizada"}


@api.put("/users/{uid}/status")
async def change_user_status(uid: str, body: StatusIn, user: dict = Depends(require_store_manage)):
    if uid == user["id"]:
        raise HTTPException(status_code=400, detail="Não é possível alterar seu próprio status")
    await db.users.update_one({"_id": oid(uid), "store_id": oid(user["store_id"])},
                              {"$set": {"status": body.status}, "$inc": {"token_version": 1}})
    return {"message": "Status atualizado"}


@api.delete("/users/{uid}")
async def remove_user(uid: str, user: dict = Depends(require_store_manage)):
    if uid == user["id"]:
        raise HTTPException(status_code=400, detail="Não é possível remover a si mesmo")
    await db.users.delete_one({"_id": oid(uid), "store_id": oid(user["store_id"]), "role": {"$ne": "owner"}})
    return {"message": "Usuário removido"}


@api.get("/invite/{token}")
async def get_invite(token: str):
    inv = await db.invites.find_one({"token_hash": sha256(token), "used": False})
    if not inv or inv["expires_at"] < now_utc().isoformat():
        raise HTTPException(status_code=404, detail="Convite inválido ou expirado")
    st = await db.stores.find_one({"_id": inv["store_id"]})
    return {"email": inv["email"], "role": inv["role"], "store_name": st["name"] if st else ""}


class AcceptInviteIn(BaseModel):
    token: str
    name: str
    password: str


@api.post("/invite/accept")
async def accept_invite(body: AcceptInviteIn, response: Response):
    inv = await db.invites.find_one({"token_hash": sha256(body.token), "used": False})
    if not inv or inv["expires_at"] < now_utc().isoformat():
        raise HTTPException(status_code=404, detail="Convite inválido ou expirado")
    if await db.users.find_one({"email": inv["email"]}):
        raise HTTPException(status_code=400, detail="E-mail já cadastrado")
    user = {"email": inv["email"], "password_hash": hash_password(body.password), "name": body.name,
            "role": inv["role"], "store_id": inv["store_id"], "status": "active",
            "token_version": 0, "last_login": now_utc().isoformat(), "created_at": now_utc().isoformat()}
    res = await db.users.insert_one(user)
    await db.invites.update_one({"_id": inv["_id"]}, {"$set": {"used": True}})
    uid = str(res.inserted_id)
    set_auth_cookies(response, create_access_token(uid, inv["email"], 0), create_refresh_token(uid, 0))
    user["_id"] = res.inserted_id
    return clean_user(user)


# ============================================================ ANALYTICS / DASHBOARD
def period_range(period: str, frm: Optional[str], to: Optional[str]):
    end = now_utc()
    if period == "today":
        start = end.replace(hour=0, minute=0, second=0, microsecond=0)
    elif period == "30d":
        start = end - timedelta(days=30)
    elif period == "custom" and frm:
        start = datetime.fromisoformat(frm)
        if to:
            end = datetime.fromisoformat(to)
    else:
        start = end - timedelta(days=7)
    return start.isoformat(), end.isoformat()


@api.get("/analytics")
async def analytics(user: dict = Depends(get_store_user), period: str = "7d",
                    frm: Optional[str] = Query(None, alias="from"), to: Optional[str] = None):
    sid = oid(user["store_id"])
    start, end = period_range(period, frm, to)
    base = {"store_id": sid, "created_at": {"$gte": start, "$lte": end}}

    async def cnt(t):
        return await db.events.count_documents({**base, "type": t})

    kpis = {
        "visits": await cnt("visit"),
        "product_views": await cnt("product_view"),
        "cart_adds": await cnt("cart_add"),
        "checkout_clicks": await cnt("checkout_click"),
        "active_products": await db.products.count_documents({"store_id": sid, "status": "published"}),
    }
    # top viewed products
    pipeline = [{"$match": {**base, "type": "product_view", "product_id": {"$ne": None}}},
                {"$group": {"_id": "$product_id", "n": {"$sum": 1}}},
                {"$sort": {"n": -1}}, {"$limit": 5}]
    top = await db.events.aggregate(pipeline).to_list(5)
    top_products = []
    for t in top:
        try:
            p = await db.products.find_one({"_id": oid(t["_id"])})
            if p:
                top_products.append({"name": p["name"], "count": t["n"]})
        except Exception:
            pass
    # searches
    spipe = [{"$match": {**base, "type": "search"}},
             {"$group": {"_id": "$meta", "n": {"$sum": 1}}}, {"$sort": {"n": -1}}, {"$limit": 5}]
    searches = [{"term": s["_id"], "count": s["n"]} for s in await db.events.aggregate(spipe).to_list(5) if s["_id"]]
    # daily series for chart
    dpipe = [{"$match": base},
             {"$group": {"_id": {"d": {"$substr": ["$created_at", 0, 10]}, "t": "$type"}, "n": {"$sum": 1}}}]
    raw = await db.events.aggregate(dpipe).to_list(1000)
    series: dict = {}
    for r in raw:
        d = r["_id"]["d"]
        series.setdefault(d, {"date": d, "visits": 0, "product_views": 0, "cart_adds": 0, "checkout_clicks": 0})
        k = {"visit": "visits", "product_view": "product_views", "cart_add": "cart_adds", "checkout_click": "checkout_clicks"}.get(r["_id"]["t"])
        if k:
            series[d][k] += r["n"]
    return {"kpis": kpis, "top_products": top_products, "searches": searches,
            "series": sorted(series.values(), key=lambda x: x["date"])}


# ============================================================ SHARE (QR)
@api.get("/share/qr")
async def share_qr(user: dict = Depends(get_store_user)):
    st = await store_of(user)
    base = os.environ.get("FRONTEND_URL", "").rstrip("/")
    url = f"{base}/loja/{st['slug']}"
    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return StreamingResponse(buf, media_type="image/png",
                             headers={"Content-Disposition": f'attachment; filename="qrcode-{st["slug"]}.png"'})


# ============================================================ PUBLIC CATALOG
@api.get("/public/store/{slug}")
async def public_store(slug: str):
    st = await db.stores.find_one({"slug": slug})
    if not st:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    sid = st["_id"]
    cats = [ser(c) for c in await db.categories.find({"store_id": sid, "active": True}).sort("order", 1).to_list(500)]
    prods = [ser(p) for p in await db.products.find(
        {"store_id": sid, "status": "published"}).sort("created_at", -1).to_list(1000)]
    store = ser(st)
    store.pop("plan", None)
    store.pop("plan_status", None)
    return {"store": store, "categories": cats, "products": prods}


class EventIn(BaseModel):
    slug: str
    type: str
    product_id: Optional[str] = None
    meta: Optional[str] = None


@api.post("/public/events")
async def track_event(body: EventIn):
    st = await db.stores.find_one({"slug": body.slug})
    if not st:
        return {"ok": False}
    valid = {"visit", "product_view", "search", "category_view", "cart_add", "cart_remove", "checkout_click"}
    if body.type not in valid:
        return {"ok": False}
    await db.events.insert_one({"store_id": st["_id"], "type": body.type, "product_id": body.product_id,
                                "meta": body.meta, "created_at": now_utc().isoformat()})
    if body.type == "product_view" and body.product_id:
        try:
            await db.products.update_one({"_id": oid(body.product_id)}, {"$inc": {"views": 1}})
        except Exception:
            pass
    return {"ok": True}


# ============================================================ PLATFORM ADMIN
@api.get("/admin/overview")
async def admin_overview(user: dict = Depends(require_platform_admin)):
    total_stores = await db.stores.count_documents({})
    published = await db.stores.count_documents({"status": "published"})
    suspended = await db.stores.count_documents({"plan_status": "suspended"})
    total_products = await db.products.count_documents({})
    total_users = await db.users.count_documents({"role": {"$ne": "platform_admin"}})
    by_plan = {}
    for p in ("essencial", "profissional", "premium"):
        by_plan[p] = await db.stores.count_documents({"plan": p})
    return {"total_stores": total_stores, "published": published, "suspended": suspended,
            "total_products": total_products, "total_users": total_users, "by_plan": by_plan}


@api.get("/admin/stores")
async def admin_stores(user: dict = Depends(require_platform_admin), search: str = "",
                       plan: str = "", page: int = 1, page_size: int = 20):
    q: dict = {}
    if search:
        q["name"] = {"$regex": search, "$options": "i"}
    if plan:
        q["plan"] = plan
    total = await db.stores.count_documents(q)
    cur = db.stores.find(q).sort("created_at", -1).skip((page - 1) * page_size).limit(page_size)
    items = []
    for s in await cur.to_list(page_size):
        d = ser(s)
        d["product_count"] = await db.products.count_documents({"store_id": s["_id"]})
        owner = await db.users.find_one({"store_id": s["_id"], "role": "owner"})
        d["owner_email"] = owner["email"] if owner else ""
        items.append(d)
    return {"items": items, "total": total, "page": page, "page_size": page_size}


@api.get("/admin/stores/{sid}")
async def admin_store_detail(sid: str, user: dict = Depends(require_platform_admin)):
    st = await db.stores.find_one({"_id": oid(sid)})
    if not st:
        raise HTTPException(status_code=404, detail="Loja não encontrada")
    d = ser(st)
    d["product_count"] = await db.products.count_documents({"store_id": st["_id"]})
    d["users"] = [clean_user(u) for u in await db.users.find({"store_id": st["_id"]}).to_list(100)]
    d["history"] = [ser(h) for h in await db.audit_log.find({"store_id": st["_id"]}).sort("created_at", -1).to_list(50)]
    return d


async def audit(store_id, actor, action, detail=""):
    await db.audit_log.insert_one({"store_id": store_id, "actor": actor, "action": action,
                                   "detail": detail, "created_at": now_utc().isoformat()})


class PlanIn(BaseModel):
    plan: str


@api.put("/admin/stores/{sid}/plan")
async def admin_set_plan(sid: str, body: PlanIn, user: dict = Depends(require_platform_admin)):
    if body.plan not in PLAN_LIMITS:
        raise HTTPException(status_code=400, detail="Plano inválido")
    await db.stores.update_one({"_id": oid(sid)}, {"$set": {"plan": body.plan, "plan_status": "active"}})
    await audit(oid(sid), user["email"], "plan_change", f"Plano alterado para {body.plan}")
    return {"message": "Plano atualizado"}


@api.post("/admin/stores/{sid}/suspend")
async def admin_suspend(sid: str, user: dict = Depends(require_platform_admin)):
    await db.stores.update_one({"_id": oid(sid)}, {"$set": {"plan_status": "suspended", "status": "unpublished"}})
    await audit(oid(sid), user["email"], "suspend", "Loja suspensa")
    return {"message": "Loja suspensa"}


@api.post("/admin/stores/{sid}/reactivate")
async def admin_reactivate(sid: str, user: dict = Depends(require_platform_admin)):
    await db.stores.update_one({"_id": oid(sid)}, {"$set": {"plan_status": "active"}})
    await audit(oid(sid), user["email"], "reactivate", "Loja reativada")
    return {"message": "Loja reativada"}


@api.post("/admin/stores/{sid}/extend-trial")
async def admin_extend_trial(sid: str, user: dict = Depends(require_platform_admin)):
    new_end = (now_utc() + timedelta(days=14)).isoformat()
    await db.stores.update_one({"_id": oid(sid)}, {"$set": {"trial_ends_at": new_end, "plan_status": "trial"}})
    await audit(oid(sid), user["email"], "extend_trial", "Teste estendido por 14 dias")
    return {"message": "Teste estendido"}


@api.get("/admin/users")
async def admin_users(user: dict = Depends(require_platform_admin), search: str = ""):
    q = {"role": {"$ne": "platform_admin"}}
    if search:
        q["email"] = {"$regex": search, "$options": "i"}
    users = []
    for u in await db.users.find(q).sort("created_at", -1).to_list(200):
        d = clean_user(u)
        if u.get("store_id"):
            st = await db.stores.find_one({"_id": u["store_id"]})
            d["store_name"] = st["name"] if st else ""
        users.append(d)
    return users


@api.put("/admin/users/{uid}/status")
async def admin_user_status(uid: str, body: StatusIn, user: dict = Depends(require_platform_admin)):
    await db.users.update_one({"_id": oid(uid)}, {"$set": {"status": body.status}, "$inc": {"token_version": 1}})
    return {"message": "Status atualizado"}


@api.get("/")
async def root():
    return {"service": "Scayl Panel API", "status": "ok"}


app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get("CORS_ORIGINS", "*").split(","),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    from seed import run_seed
    await db.users.create_index("email", unique=True)
    await db.stores.create_index("slug", unique=True)
    await db.password_reset_tokens.create_index("expires_at", expireAfterSeconds=0)
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.login_attempts.create_index("email")
    await db.login_attempts.create_index("identifier")
    await db.password_reset_requests.create_index("email")
    await db.password_reset_requests.create_index("created_at", expireAfterSeconds=1800)
    await db.events.create_index([("store_id", 1), ("created_at", -1)])
    await run_seed(db)


@app.on_event("shutdown")
async def shutdown():
    client.close()
