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

---

# E-mail / SMTP env cutover'il (uo28 prod medusa + worker)

> Lisatud 2026-10-17 (1f0a read-only audit). Erand header-reeglist: **mitte-saladus-väärtused** (aadressid)
> on siin tahtlikult kirjas (cutover-sihtväärtused); **saladus (SMTP_PASSWORD) AINULT räsi-sõrmejäljena**,
> mitte parool ise.

## Prod SIHT-väärtused (mida uo28 peab cutover'i järel kandma)

| Env | Prod siht-väärtus | Teenus |
|---|---|---|
| `SMTP_USER` | `noreply@xlmarket.ee` | medusa + worker |
| `SMTP_PASSWORD` | *(saladus — Coolify UI)* **sha256 algab `deb7ef7a…`** | medusa + worker |
| `SMTP_HOST` / `SMTP_PORT` | *(sisemine relay — Coolify UI)* | medusa + worker |
| `EMAIL_FROM` | `tellimused@xlmarket.ee` | medusa + worker |
| `EMAIL_REPLY_TO` | `info@xlmarket.ee` | medusa + worker |
| `EMAIL_INVOICE` | `arved@xlmarket.ee` (arve BCC-koopia raamatupidamisse; vt arve-muudatus 2026-10-14) | medusa + worker |
| `EMAIL_ADMIN` | `tellimused@xlmarket.ee` (uue-tellimuse admin-teade) | medusa + worker |
| `EMAIL_FROM_NAME` | *(valikuline; puudu → koodi vaikeväärtus `XLmarket.ee`)* | medusa + worker |
| `EMAIL_DISABLED` | **PUUDUB** (prod saadab) — kill-switch ainult staging'us | medusa + worker |
| `EMAIL_ALLOWLIST` | **PUUDUB** (prod saadab kõigile) — allowlist ainult staging'us | medusa + worker |

## Coolify Production env — SEADISTATUD (Tarmo 2026-10-17)

Tarmo seadis Production plokki (redeploy'd EI tehtud — jõustub cutover'iga):
`SMTP_USER=noreply@xlmarket.ee` · `SMTP_PASSWORD` (räsi `deb7ef7a…`, app-parool) ·
`EMAIL_FROM=tellimused@xlmarket.ee` · **`EMAIL_REPLY_TO=info@xlmarket.ee` (LISATUD — varasem auk lahendatud)** ·
`EMAIL_ADMIN=tellimused@xlmarket.ee` · `EMAIL_INVOICE=arved@xlmarket.ee`.
`EMAIL_ALLOWLIST` ja `EMAIL_DISABLED` **EI OLE seatud** (kontrollitud) → prod saadab.

- **`EMAIL_FROM_NAME` EI OLE Coolifys** → saatja-nimeks jääb koodi default `XLmarket.ee`. Kui soovitakse muud → lisa.
- **Coolify list-envs API maskib väärtused** (`value=None`) → Coolifys staged väärtusi EI SAA API-st kinnitada;
  õigsust näeb Coolify UI-s (secrets shown-once) JA lõplikult jooksvas konteineris cutover-redeploy järel (allpool).

## 📸 Hetkeseis — jooksev uo28 konteiner (2026-10-17, EI redeploy'tud, VANAD väärtused — ootuspärane)

| Env | Jooksev konteiner (vana) | Prod siht (cutover) |
|---|---|---|
| `SMTP_USER` | `server@xlrent.eu` | `noreply@xlmarket.ee` |
| `SMTP_PASSWORD` | sha256 `9a1b333e…` len=14 | sha256 `deb7ef7a…` |
| `EMAIL_FROM` | `info@xlmarket.ee` | `tellimused@xlmarket.ee` |
| `EMAIL_REPLY_TO` | *(puudub)* | `info@xlmarket.ee` |
| `EMAIL_INVOICE` / `EMAIL_ADMIN` | `tarmo@naissaar.eu` / `tarmo@naissaar.eu` | `arved@xlmarket.ee` / `tellimused@xlmarket.ee` |
| `EMAIL_DISABLED` / `EMAIL_ALLOWLIST` | *(puudub)* ✓ | *(puudub)* ✓ |

> Konteiner = vanad väärtused on **õige seis** — uo28 pole redeploy'tud, env-muutus jõustub alles recreate'il.

## ✅ Cutover-JÄRGNE kontroll (pärast prod redeploy'd — KOHUSTUSLIK)

> **🔑 ÕPPETUND (Tarmo 2026-10-17): kontrolli JOOKSVAT KONTEINERIT, mitte ainult Coolify väärtusi.**
> Coolify salvestatud env ja jooksva konteineri env **VÕIVAD lahkneda ja mõlemad on omas kontekstis õiged** —
> Coolify näitab *staged* (järgmise recreate'i) väärtust, konteiner *praegu kehtivat* (viimase recreate'i) väärtust.
> Env-muutus jõustub AINULT konteineri recreate'il (redeploy), MITTE `docker restart`-il. Seega: ainult Coolify
> väärtuse lugemine EI TÕESTA, et saatmine kasutab õiget kontot. **Tõe-allikas = jooksva konteineri env (räsi) + testkiri.**

1. **Jooksva konteineri env** (väärtust printimata, parool räsina):
   ```bash
   for C in $(docker ps --format '{{.Names}}' | grep -E 'medusa.*uo28|medusa-worker.*uo28'); do
     echo "=== $C ==="
     docker inspect --format '{{json .Config.Env}}' "$C" \
       | python3 -I /opt/xlmarket-github/scripts/... (vt scratchpad env-reader muster)
   done
   ```
   Oota: `SMTP_USER=noreply@xlmarket.ee`, `EMAIL_FROM=tellimused@xlmarket.ee`,
   `EMAIL_REPLY_TO=info@xlmarket.ee`, **SMTP_PASSWORD sha256 algab `deb7ef7a`**,
   `EMAIL_DISABLED`/`EMAIL_ALLOWLIST` PUUDUVAD.
2. **Testkiri:** tee prod-is testtellimus (või käivita saatmine) → kinnitus + arve (PDF-manus) jõuab
   kliendile, arve-koopia BCC raamatupidamisse. Kontrolli `From:` = `tellimused@xlmarket.ee`,
   `Reply-To:` = `info@xlmarket.ee`.
3. **Kui räsi ≠ deb7ef7a VÕI EMAIL_REPLY_TO puudub** → Coolify env vale/puudu → paranda + redeploy ENNE
   kui prod päris kliente teenindab.
