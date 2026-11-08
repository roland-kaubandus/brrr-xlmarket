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
>
> **📍 Aadresside marsruutimine (alias→postkast), DNS (SPF/DKIM/DMARC), NDR-nähtavus:**
> `docs/runbooks/email-aadressid.md`. Meili-kodu = mailcow `mail.xlrent.eu` (MX Zone→mailcow 2026-10-17).

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
| `EMAIL_DISABLED` | **LÕPPSEIS: PUUDUB** (prod saadab). ⚠️ cutover-AKNA ajal AJUTISELT `true` → EEMALDATAKSE (vt §D e-maili kill-switch sekvents) | medusa + worker |
| `EMAIL_ALLOWLIST` | **PUUDUB** (prod saadab kõigile) — allowlist ainult staging'us, prodis EI SEATA kunagi | medusa + worker |

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

## §D — E-maili kill-switch cutover-akna sekvents (Tarmo 2026-11-08)

> **Reegel (Tarmo):** `EMAIL_DISABLED` on prodis AINULT cutover-akna ajal (`true` kuni kontrollid + testkiri tehtud), siis EEMALDATAKSE. **LÕPPSEIS: `EMAIL_DISABLED` JA `EMAIL_ALLOWLIST` mõlemad PUUDUVAD** → prod saadab kõigile, ilma kaitseta. (Allowlisti prodis EI kasutata kunagi, ka akna ajal mitte.)
>
> **Miks ajutine kill-switch:** cutover-akna alguses läheb storefront live ja D1 SMTP-mandaat vahetub (`server@xlrent.eu`→`noreply@xlmarket.ee`). Kuni mandaadi + voo kontroll pole tehtud, EI tohi päris kliendile ekslik/pooleldi-seadistatud kiri välja minna. `EMAIL_DISABLED=true` = turvavõrk selle akna ajaks.

**Sekvents (järjekorras, ükski samm ei tohi jääda):**

1. **Akna algus — kill-switch SISSE.** Prod uo28 env (Coolify, Tarmo loal — HARD RULE #12 r2): sea `EMAIL_DISABLED=true` + D1 SMTP-mandaat (`SMTP_USER=noreply@xlmarket.ee`, `SMTP_PASSWORD` app-parool sha `deb7ef7a…`). Redeploy. Storefront läheb live, kirjad BLOKEERITUD.
2. **Kontrollid (kill-switch veel `true`):** jooksva konteineri env-räsi (§ allpool samm 1) — `SMTP_USER=noreply@`, parool sha `deb7ef7a`, `EMAIL_FROM=tellimused@`, `EMAIL_REPLY_TO=info@`, `EMAIL_DISABLED=true` KEHTIB. Montonio/webhook/order-voog kontroll (E2) — tellimus TEKIB, aga kiri EI lähe (ootuspärane, kill-switch sees).
3. **Testkiri — kill-switch VÄLJA.** EEMALDA `EMAIL_DISABLED` prod env-ist (kustuta muutuja, mitte `=false`) + redeploy. ⚠️ **testkiri saadetakse PÄRAST eemaldamist**, sest `EMAIL_DISABLED=true` blokeerib KÕIK (ka testi). Saada testkiri (prod testtellimus tarmo@naissaar.eu-le) → kinnitus + arve (PDF) jõuab, `From:`=`tellimused@xlmarket.ee`, `Reply-To:`=`info@xlmarket.ee`.
4. **Lõppseis — KONTROLLSAMM (KOHUSTUSLIK):** kinnita jooksvast konteinerist, et **`EMAIL_DISABLED` JA `EMAIL_ALLOWLIST` MÕLEMAD PUUDUVAD**:
   ```bash
   for C in $(docker ps --format '{{.Names}}' | grep -E '^medusa(-worker)?-uo28'); do
     echo "=== $C ==="
     docker exec "$C" sh -c 'printf "EMAIL_DISABLED=[%s] EMAIL_ALLOWLIST=[%s]\n" "$(printenv EMAIL_DISABLED)" "$(printenv EMAIL_ALLOWLIST)"'
   done
   # OODATUD mõlemal: EMAIL_DISABLED=[] EMAIL_ALLOWLIST=[]  (mõlemad TÜHJAD = puuduvad)
   ```
   Kui kumbki EI ole tühi → prod EI ole lõppseisus → eemalda + redeploy enne kui pood kliente teenindab.
5. **Kui testkiri (samm 3) EBAÕNNESTUB:** sea `EMAIL_DISABLED=true` TAGASI + redeploy (kirjad uuesti blokeeritud), paranda mandaat, korda sammust 2. Pood võib jääda live'i (storefront töötab kill-switchiga, ainult kirjad ootel).

### ⚠️ Prod testtellimus (samm 3) = PÄRIS makse + PÄRIS arve

Prod-is ei ole test-režiimi: samm 3 testtellimus on **päris Montonio makse** (raha liigub päriselt) ja **päris arve** (PDF kliendile + BCC raamatupidamisse). Kaks tagajärge tuleb pärast testi käsitseda — **Tarmo otsustab raamatupidajaga, kumb variant:**

1. **Raha tagastus Montonios (ALATI, mõlemal variandil):** päris makse → tee Montonio partnerportaalis (või admin-tagastus, kui seadistatud) **refund** samale kaardile/kontole. Ilma selleta jääb test-raha kliendi (Tarmo) arvelt kinni.

2. **Arve-pool — VARIANT A VÕI B (raamatupidaja otsus):**
   - **VARIANT A — `INVOICE_SERIES_ENABLED` SEES testi ajal → KREEDITARVE.** Kui seeria on testi hetkel SEES, tarbib testtellimus **päris arve-numbri** (`XL-AAAA-00001`) → lünkadeta seeria eeldab, et seda ei "kustutata". Tühistamiseks väljasta **kreeditarve** (sama numbri storno) → raamatupidamine korras, esimene päris-klient saab `…-00002`.
   - **VARIANT B — `INVOICE_SERIES_ENABLED` VÄLJAS testi ajal → lülita SISSE PÄRAST testi.** Kui seeria on testi hetkel VÄLJAS (praegune vaikeseis, kontrollitud 2026-11-09: prod+staging `INVOICE_SERIES_ENABLED=[]`), kasutab testtellimus tellimuse-nr fallback'i → **päris seeria-numbrit EI tarbita, kreeditarvet pole vaja**. Pärast edukat testi sea prod env `INVOICE_SERIES_ENABLED=true` + redeploy → esimene PÄRIS-klient saab puhta `XL-AAAA-00001`. (Montonio refund ikka vaja.)

> **SSoT:** arve-number loogika `backend/src/lib/invoice-number.ts` (`invoiceSeriesEnabled()`, vaikimisi VÄLJAS — HARD RULE #6 ohutu vaikimisi). Lipu väärtus (`true`/puudub) EI ole saladus → tohib logida.

> **Boolean, mitte saladus:** `EMAIL_DISABLED` ja `INVOICE_SERIES_ENABLED` väärtused (`true`/puudub) EI ole saladus → tohib logida/Telegrami (HARD RULE #11). SMTP_PASSWORD väärtust EI kuvata (ainult sha12). Iga prod-write logitakse sessioonilogisse + Telegram (HARD RULE #12 r1 analoog, prodil r2 = Tarmo luba).

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
