# Auth Testing — Scayl Panel

Backend base: http://localhost:8001/api

## Accounts (seeded)
- Platform admin: admin@scayl.com / scayl@admin2026 (role platform_admin, no store)
- Store owner: mayconasm2@gmail.com / hapster@2026 (role owner, store "Hapster Cookies", slug hapster-cookies)

## Endpoints
- POST /auth/register {name,email,password,store_name} -> creates owner + store, sets cookies
- POST /auth/login {email,password} -> cookies
- GET /auth/me
- POST /auth/logout
- POST /auth/refresh
- POST /auth/forgot-password {email} -> generic 200
- POST /auth/reset-password {token,password}
- PUT /auth/change-password {current_password,new_password}

## Curl
curl -c ck.txt -X POST http://localhost:8001/api/auth/login -H "Content-Type: application/json" -d '{"email":"mayconasm2@gmail.com","password":"hapster@2026"}'
curl -b ck.txt http://localhost:8001/api/auth/me
curl -b ck.txt http://localhost:8001/api/store

## Tenant isolation
Owner token must only access its own store data. Platform admin routes /api/admin/* require platform_admin role. Editor role cannot access /api/users, /api/store PUT, etc (require owner/admin).
