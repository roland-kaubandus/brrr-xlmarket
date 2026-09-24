# Runbook — xl-admin env cutover'il (uo28 prod)

> Loodud 2026-09-24 (1f0a tee A). **Ainult nimed + kirjeldused — VÄÄRTUSI siin EI OLE.**

## Kontekst

`/xl-admin` (sh review-bucket) + `/admin-login` vajavad server-side auth-env-e, mida
Coolify compose EI mapi vaikimisi storefront-konteinerisse. `storefront/lib/admin-env.ts`
(`getMissingAdminEnv`) jõustab **FAIL-LOUD** — puudu env → selge nimekiri, MITTE 500.

Staging (k33g) sai need 2026-09-24. **Prod (uo28) vajab cutoveril SAMU env-e** — muidu
prod xl-admin ei avane (FAIL-LOUD kuvab puuduva nimekirja).

## Kohustuslikud env-id (storefront service)

| Env | Kirjeldus | Allikas |
|---|---|---|
| `ADMIN_SESSION_SECRET` | Admin-cookie JWT allkiri. Nõue **≥32 märki**. Genereeri `openssl rand -hex 32`. | Coolify UI env (prod eraldi saladus, mitte staging'i oma) |
| `TARMO_ADMIN_EMAIL` | UI-värava login-email. | Coolify UI env |
| `TARMO_ADMIN_PASS` | UI-värava login-parool. **Tarmo sisestab ise.** | Coolify UI env |
| `MEDUSA_ADMIN_EMAIL` | storefront→Medusa teenuskonto email (emailpass). | Coolify UI env |
| `MEDUSA_ADMIN_PASSWORD` | teenuskonto parool. Loo konto: `npx medusa user -e <email> -p <parool>` prod Medusas. | Coolify UI env |
| `MEDUSA_BACKEND_URL` | Medusa base-URL. **Compose'is literaalina `http://medusa:9000`** → Coolify env EI vaja. | `docker-compose.yml` (git) |

## Cutover-sammud (uo28)

1. Loo prod Medusas eraldi teenuskonto: `docker exec <prod-medusa> npx medusa user -e xl-admin-service@xlmarket.ee -p <tugev-parool>`.
2. Genereeri **uus** `ADMIN_SESSION_SECRET` prodile (`openssl rand -hex 32`) — **ära taaskasuta staging'i oma**.
3. Coolify prod-app env: sea `ADMIN_SESSION_SECRET`, `TARMO_ADMIN_EMAIL`, `TARMO_ADMIN_PASS`, `MEDUSA_ADMIN_EMAIL`, `MEDUSA_ADMIN_PASSWORD`. (`MEDUSA_BACKEND_URL` tuleb compose'ist.)
4. Redeploy prod storefront (compose `environment:` muutus jõustub konteineri recreate'iga).
5. Kontroll: `https://<prod>/xl-admin/review-bucket` avaneb pärast login'i (mitte FAIL-LOUD ekraan).

> **Kontrollnimekiri = `storefront/.env.example`** (sama komplekt, nimed + kirjeldused).
