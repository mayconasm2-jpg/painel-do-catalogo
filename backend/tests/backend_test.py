"""Scayl Panel — backend integration tests (pytest)"""
import os
import io
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://lojista-panel.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

OWNER_EMAIL = "mayconasm2@gmail.com"
OWNER_PASSWORD = "hapster@2026"
ADMIN_EMAIL = "admin@scayl.com"
ADMIN_PASSWORD = "scayl@admin2026"
SLUG = "hapster-cookies"


# ------------------ fixtures ------------------
@pytest.fixture(scope="session")
def owner_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": OWNER_EMAIL, "password": OWNER_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"owner login failed: {r.status_code} {r.text}"
    return s


@pytest.fixture(scope="session")
def admin_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=30)
    assert r.status_code == 200, f"admin login failed: {r.status_code} {r.text}"
    return s


# ------------------ auth ------------------
class TestAuth:
    def test_owner_login_and_me(self, owner_session):
        r = owner_session.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == OWNER_EMAIL
        assert d["role"] == "owner"
        assert d.get("store_id")

    def test_admin_login_and_me(self, admin_session):
        r = admin_session.get(f"{API}/auth/me", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["email"] == ADMIN_EMAIL
        assert d["role"] == "platform_admin"

    def test_wrong_password_returns_401(self):
        r = requests.post(f"{API}/auth/login", json={"email": OWNER_EMAIL, "password": "wrong-pw-xyz"}, timeout=30)
        assert r.status_code == 401

    def test_brute_force_lockout(self):
        # Use a fake email to avoid locking owner. 5 failures should trigger 429 on the 6th.
        fake = "TEST_bruteforce@example.com"
        codes = []
        for _ in range(6):
            r = requests.post(f"{API}/auth/login", json={"email": fake, "password": "bad"}, timeout=30)
            codes.append(r.status_code)
        # After 5 failed attempts, subsequent should be 429
        assert 429 in codes, f"Expected 429 lockout after 5 fails, got sequence: {codes}"


# ------------------ admin overview ------------------
class TestAdminOverview:
    def test_overview_counts(self, admin_session):
        r = admin_session.get(f"{API}/admin/overview", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["total_stores"] >= 1
        assert d["total_products"] >= 16

    def test_owner_cannot_access_admin(self, owner_session):
        r = owner_session.get(f"{API}/admin/overview", timeout=30)
        assert r.status_code == 403


# ------------------ store profile ------------------
class TestStore:
    def test_get_store(self, owner_session):
        r = owner_session.get(f"{API}/store", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["slug"] == SLUG
        assert "limits" in d
        assert d["product_count"] >= 16

    def test_appearance_update_reflects_in_public(self, owner_session):
        # get current
        st = owner_session.get(f"{API}/store", timeout=30).json()
        appearance = st.get("appearance", {})
        new_color = "#123456"
        appearance["primary_color"] = new_color
        r = owner_session.put(f"{API}/store/appearance", json=appearance, timeout=30)
        assert r.status_code == 200
        pub = requests.get(f"{API}/public/store/{SLUG}", timeout=30).json()
        assert pub["store"]["appearance"]["primary_color"] == new_color

    def test_delivery_requires_at_least_one(self, owner_session):
        r = owner_session.put(f"{API}/store/delivery", json={"delivery_enabled": False, "pickup_enabled": False}, timeout=30)
        assert r.status_code == 400

    def test_delivery_fee_forced_to_8(self, owner_session):
        r = owner_session.put(f"{API}/store/delivery",
                              json={"delivery_enabled": True, "pickup_enabled": True, "delivery_fee": 20.0},
                              timeout=30)
        assert r.status_code == 200
        assert r.json()["delivery"]["delivery_fee"] == 8.00

    def test_payments_requires_one(self, owner_session):
        r = owner_session.put(f"{API}/store/payments",
                              json={"pix": False, "credit": False, "debit": False, "cash": False}, timeout=30)
        assert r.status_code == 400

    def test_payments_ok(self, owner_session):
        r = owner_session.put(f"{API}/store/payments",
                              json={"pix": True, "credit": True, "debit": True, "cash": True, "credit_installments": 3,
                                    "cash_change": True, "pix_key": "test@pix"},
                              timeout=30)
        assert r.status_code == 200

    def test_status_publish(self, owner_session):
        r = owner_session.post(f"{API}/store/status", json={"status": "published"}, timeout=30)
        assert r.status_code == 200
        assert r.json()["status"] == "published"


# ------------------ categories ------------------
class TestCategories:
    def test_list(self, owner_session):
        r = owner_session.get(f"{API}/categories", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
        assert len(r.json()) >= 1

    def test_create_edit_toggle_delete_with_target(self, owner_session):
        # create A
        a = owner_session.post(f"{API}/categories", json={"name": "TEST_CatA", "active": True}, timeout=30).json()
        b = owner_session.post(f"{API}/categories", json={"name": "TEST_CatB", "active": True}, timeout=30).json()
        # edit A
        r = owner_session.put(f"{API}/categories/{a['id']}", json={"name": "TEST_CatA2", "active": False}, timeout=30)
        assert r.status_code == 200
        assert r.json()["name"] == "TEST_CatA2"
        # create a product in A
        p = owner_session.post(f"{API}/products", json={"name": "TEST_p", "price": 10, "status": "draft",
                                                       "category_id": a["id"]}, timeout=30).json()
        # delete A without target -> 400
        r = owner_session.delete(f"{API}/categories/{a['id']}", timeout=30)
        assert r.status_code == 400
        # with target -> success
        r = owner_session.delete(f"{API}/categories/{a['id']}?target={b['id']}", timeout=30)
        assert r.status_code == 200
        # cleanup
        owner_session.delete(f"{API}/products/{p['id']}", timeout=30)
        owner_session.delete(f"{API}/categories/{b['id']}", timeout=30)

    def test_reorder(self, owner_session):
        cats = owner_session.get(f"{API}/categories", timeout=30).json()
        ids = [c["id"] for c in cats][::-1]
        r = owner_session.put(f"{API}/categories/reorder", json={"ids": ids}, timeout=30)
        assert r.status_code == 200


# ------------------ products ------------------
class TestProducts:
    def test_list_seeded(self, owner_session):
        r = owner_session.get(f"{API}/products", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["total"] >= 16
        assert len(d["items"]) > 0

    def test_search_and_filter(self, owner_session):
        r = owner_session.get(f"{API}/products?search=cook", timeout=30)
        assert r.status_code == 200

    def test_sort(self, owner_session):
        r = owner_session.get(f"{API}/products?sort=price_asc&page_size=5", timeout=30)
        assert r.status_code == 200
        items = r.json()["items"]
        prices = [i["price"] for i in items]
        assert prices == sorted(prices)

    def test_pagination(self, owner_session):
        r = owner_session.get(f"{API}/products?page=1&page_size=5", timeout=30)
        assert r.status_code == 200
        assert len(r.json()["items"]) <= 5

    def test_promo_validation(self, owner_session):
        r = owner_session.post(f"{API}/products",
                               json={"name": "TEST_promo", "price": 10, "promo_price": 20}, timeout=30)
        assert r.status_code == 400

    def test_create_publish_appears_public(self, owner_session):
        r = owner_session.post(f"{API}/products",
                               json={"name": "TEST_pub_prod", "price": 42.5, "status": "published"}, timeout=30)
        assert r.status_code == 200
        pid = r.json()["id"]
        # verify via GET (persistence)
        g = owner_session.get(f"{API}/products/{pid}", timeout=30)
        assert g.status_code == 200
        assert g.json()["name"] == "TEST_pub_prod"
        # public
        pub = requests.get(f"{API}/public/store/{SLUG}", timeout=30).json()
        names = [p["name"] for p in pub["products"]]
        assert "TEST_pub_prod" in names
        # duplicate
        dup = owner_session.post(f"{API}/products/{pid}/duplicate", timeout=30)
        assert dup.status_code == 200
        assert dup.json()["status"] == "draft"
        dup_id = dup.json()["id"]
        # edit price
        upd = owner_session.put(f"{API}/products/{pid}",
                                json={"name": "TEST_pub_prod", "price": 50.0, "status": "published"}, timeout=30)
        assert upd.status_code == 200
        # bulk hide
        b = owner_session.post(f"{API}/products/bulk", json={"action": "hide", "ids": [pid]}, timeout=30)
        assert b.status_code == 200
        # cleanup
        owner_session.delete(f"{API}/products/{pid}", timeout=30)
        owner_session.delete(f"{API}/products/{dup_id}", timeout=30)


# ------------------ media ------------------
class TestMedia:
    def test_upload_and_fetch(self, owner_session):
        # 1x1 png
        png = bytes.fromhex("89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c63f8cf00000003000100254e0f7e0000000049454e44ae426082")
        files = {"file": ("t.png", io.BytesIO(png), "image/png")}
        r = owner_session.post(f"{API}/media", files=files, timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert "url" in d and "id" in d
        g = requests.get(f"{BASE_URL}{d['url']}", timeout=30)
        assert g.status_code == 200
        assert g.headers["content-type"].startswith("image/")


# ------------------ share qr ------------------
class TestShare:
    def test_qr_returns_png(self, owner_session):
        r = owner_session.get(f"{API}/share/qr", timeout=30)
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("image/png")


# ------------------ users / invites ------------------
class TestUsersInvite:
    def test_invite_flow(self, owner_session):
        email = f"test_editor_{int(time.time())}@example.com"
        r = owner_session.post(f"{API}/users/invite", json={"email": email, "role": "editor"}, timeout=30)
        assert r.status_code == 200
        link = r.json()["invite_link"]
        token = link.split("token=")[-1]
        # validate
        r = requests.get(f"{API}/invite/{token}", timeout=30)
        assert r.status_code == 200
        assert r.json()["email"] == email
        # accept
        s = requests.Session()
        r = s.post(f"{API}/invite/accept", json={"token": token, "name": "TEST Editor", "password": "editor@2026"}, timeout=30)
        assert r.status_code == 200
        me = s.get(f"{API}/auth/me", timeout=30).json()
        assert me["role"] == "editor"
        # editor cannot invite (owner-only)
        r = s.post(f"{API}/users/invite", json={"email": "TEST_x@example.com", "role": "editor"}, timeout=30)
        assert r.status_code == 403


# ------------------ analytics / events ------------------
class TestAnalytics:
    def test_events_and_analytics(self, owner_session):
        for t in ["visit", "product_view", "cart_add", "checkout_click"]:
            r = requests.post(f"{API}/public/events", json={"slug": SLUG, "type": t}, timeout=30)
            assert r.status_code == 200
        r = owner_session.get(f"{API}/analytics?period=7d", timeout=30)
        assert r.status_code == 200
        k = r.json()["kpis"]
        assert k["visits"] >= 1
        assert k["checkout_clicks"] >= 1


# ------------------ public catalog ------------------
class TestPublic:
    def test_public_store(self):
        r = requests.get(f"{API}/public/store/{SLUG}", timeout=30)
        assert r.status_code == 200
        d = r.json()
        assert d["store"]["slug"] == SLUG
        assert "plan" not in d["store"]
        assert isinstance(d["categories"], list)
        assert isinstance(d["products"], list)
        for p in d["products"]:
            assert p["status"] == "published"


# ------------------ platform admin ------------------
class TestPlatformAdmin:
    def test_list_stores(self, admin_session):
        r = admin_session.get(f"{API}/admin/stores?search=hapster", timeout=30)
        assert r.status_code == 200
        assert r.json()["total"] >= 1

    def test_plan_change_and_audit(self, admin_session):
        stores = admin_session.get(f"{API}/admin/stores?search=hapster", timeout=30).json()["items"]
        sid = stores[0]["id"]
        r = admin_session.put(f"{API}/admin/stores/{sid}/plan", json={"plan": "premium"}, timeout=30)
        assert r.status_code == 200
        # invalid plan
        r = admin_session.put(f"{API}/admin/stores/{sid}/plan", json={"plan": "bad"}, timeout=30)
        assert r.status_code == 400
        # extend trial
        r = admin_session.post(f"{API}/admin/stores/{sid}/extend-trial", timeout=30)
        assert r.status_code == 200
        # suspend + reactivate
        r = admin_session.post(f"{API}/admin/stores/{sid}/suspend", timeout=30)
        assert r.status_code == 200
        r = admin_session.post(f"{API}/admin/stores/{sid}/reactivate", timeout=30)
        assert r.status_code == 200
        # restore plan to profissional
        admin_session.put(f"{API}/admin/stores/{sid}/plan", json={"plan": "profissional"}, timeout=30)
        # detail with history
        d = admin_session.get(f"{API}/admin/stores/{sid}", timeout=30).json()
        assert len(d["history"]) >= 1

    def test_users_list(self, admin_session):
        r = admin_session.get(f"{API}/admin/users", timeout=30)
        assert r.status_code == 200
        assert isinstance(r.json(), list)
