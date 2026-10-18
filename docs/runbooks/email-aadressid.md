# Runbook — xlmarket.ee e-posti aadressid

> Loodud 2026-10-18. **Ainult dokumentatsioon — koodi ei muuda.**
> Meili-kodu = **mailcow `mail.xlrent.eu`** (65.21.126.235, sama Coolify-host).
> MX liigutati Zone → mailcow 2026-10-17 (vt [[mail-mx-cutover-mailcow]] mälu + sessioon 2026-10-17).

---

## 1. Marsruutimine (Tarmo 18.10.2026, mailcow)

| Aadress | Tüüp | Kuhu läheb |
|---|---|---|
| `info@xlmarket.ee` | **päris postkast** | ← siia tuleb KÕIK (keskne postkast) |
| `noreply@xlmarket.ee` | **päris postkast** | tehniline saatja (SMTP_USER); **siia tulevad tagasipõrked (NDR)** |
| `tellimused@xlmarket.ee` | alias | → `info@` |
| `arved@xlmarket.ee` | alias | → `info@` |
| `tagastused@xlmarket.ee` | alias | → `info@` |
| `b2b@xlmarket.ee` | alias | → `info@` |
| `postmaster@xlmarket.ee` | alias | → `info@` |
| `abuse@xlmarket.ee` | alias | → `info@` |
| `admin@xlmarket.ee` | alias | → `info@` |
| `dmarc@xlmarket.ee` | alias | → `dmarc@xlrent.eu` (DMARC-raportid eraldi) |

**SSoT:** mailcow DB `mailbox` + `alias` tabelid (`mail.xlrent.eu`). Vaata:
```bash
# (hostil) mailcow mysql — ainult metadata, EI loe kirjasisu
CONF=/opt/mailcow-dockerized/mailcow.conf
DBPW=$(grep -E '^DBPASS=' "$CONF" | cut -d= -f2-)
docker exec -e MYSQL_PWD="$DBPW" mailcowdockerized-mysql-mailcow-1 \
  mysql -N -umailcow mailcow -e \
  "SELECT address,goto,active FROM alias WHERE address LIKE '%@xlmarket.ee';"
```

---

## 2. Kus pood neid kasutab (env → aadress)

| Env | Aadress | Roll |
|---|---|---|
| `SMTP_USER` | `noreply@xlmarket.ee` | relay-autentimine; tagasipõrked tulevad siia |
| `EMAIL_FROM` | `tellimused@xlmarket.ee` | kõigi poe-kirjade `From:` |
| `EMAIL_REPLY_TO` | `info@xlmarket.ee` | `Reply-To:` — kliendi vastus läheb keskpostkasti |
| `EMAIL_ADMIN` | `tellimused@xlmarket.ee` | uue-tellimuse admin-teade |
| `EMAIL_INVOICE` | `arved@xlmarket.ee` | arve BCC-koopia (raamatupidamine; vt arve-muudatus 2026-10-14) |
| kontaktileht / CMS global | `info@xlmarket.ee` | avalik kontaktaadress |

**SSoT värav:** `backend/src/lib/email.ts` → `emailGate`. Saatmist juhivad (järjekorras):
1. `EMAIL_DISABLED=true` → blokeerib KÕIK (kill-switch).
2. `EMAIL_ALLOWLIST` mittetühi → ainult allowlistitud aadressid (staging-kaitse).
3. prod (mõlemad puuduvad) → saadab.

> **Staging (k33g)** lisab `EMAIL_DISABLED` + `EMAIL_ALLOWLIST` (praegu `EMAIL_DISABLED=true`,
> allowlist `tarmo@naissaar.eu`). **Prod (uo28)** — mõlemad **PUUDUVAD** (saadab kõigile).

---

## 3. Kuidas muuta

### 3a. Aliase sihtkoha muutmine (nt tuleb raamatupidaja → `arved@` tema postkasti)
**Tehakse mailcow'is (UI https://mail.xlrent.eu/ → Configuration → Mailboxes → Aliases, VÕI DB).**
Näide: `arved@` suunata raamatupidaja aadressile.

> **🔑 POOD EI VAJA MUUDATUST** — pood kasutab **aliast** (`arved@xlmarket.ee`), mitte lõpp-postkasti.
> Alias on kaudsuse-kiht: sihtkoht muutub mailcow'is, env jääb samaks, redeploy'd EI vaja.
> Sama kehtib: raamatupidaja vahetub, tellimuste-haldur lisandub jne → ainult mailcow alias muutub.

### 3b. Env-i muutmine (AINULT kui aadress ISE muutub)
Vajalik **ainult siis, kui pood peab kasutama teist aadressi** (nt `arved@` → `raamatupidamine@`).
Siis:
1. Coolify Production plokk (uo28) → muuda env-väärtus.
2. **Redeploy** (konteineri recreate — `docker restart` EI jõusta env-muutust).
3. Kontroll: jooksva konteineri env-räsi + testkiri (vt **cutover-runbook**
   `docs/runbooks/cutover-xl-admin-env.md` → e-mail-sektsioon + "ÕPPETUND: kontrolli jooksvat konteinerit").

---

## 4. DNS (praegused väärtused, 2026-10-18)

| Kirje | Väärtus |
|---|---|
| **MX** `xlmarket.ee` | `10 mail.xlrent.eu` (A = 65.21.126.235) |
| **SPF** (TXT root) | `v=spf1 a mx include:mail.spf.elkdata.ee a:mail.xlrent.eu ~all` |
| **DKIM** (`dkim._domainkey.xlmarket.ee`) | selektor `dkim`, RSA, mailcow-hallatud (avalik võti DNS-is) |
| **DMARC** (`_dmarc.xlmarket.ee`) | `v=DMARC1; p=none; rua=mailto:dmarc@xlrent.eu; fo=1; adkim=r; aspf=r` |

**Kustutatud cutover'il** (osutasid Veebimajutusele): vana MX `mh7/mh9.elkdata.ee`,
`mail` CNAME, `autoconfig` CNAME, `_autodiscover._tcp` SRV.

### VAJA ÄRA TEHA (DNS-i hügieen, mitte blokeeriv)
- **SPF sisaldab veel `include:mail.spf.elkdata.ee`** — pärand Veebimajutuse ajast. Kuna saatmine
  käib nüüd `mail.xlrent.eu` kaudu (katab `a:mail.xlrent.eu` + `mx`), on Elkdata-include üleliigne,
  **kui** Elkdata enam xlmarket.ee nimel kirju ei saada. Üle vaadata enne eemaldamist (kinnita, et
  ükski Elkdata-teenus enam ei saada), siis Cloudflare's eemaldada.
- **DMARC `p=none`** — ainult monitooring, ei jõusta. Kui DKIM+SPF on stabiilselt rohelised
  (kontrolli dmarc@xlrent.eu raporteid), kaalu `p=quarantine` → hiljem `p=reject`.

---

## 5. ⚠️ Tagasipõrked (NDR) — noreply@ nähtavus

`noreply@xlmarket.ee` on **päris postkast** ja `SMTP_USER` → kõik tagasipõrked (vale kliendi-aadress,
täis-postkast, blokeering) tulevad **sinna**. Tagasipõrge = **kliendile kiri EI jõudnud**
(nt tellimuse-kinnitus / arve ei kätte saanud).

**Probleem (oli kuni 18.10.2026):** `noreply@` postkasti **keegi ei jälginud rutiinselt** → tagasipõrked
kogunesid nähtamatult → vaikne "klient ei saanud arvet". **Lahendatud allpool.**

**✅ TEOSTATUD 18.10.2026 (vt `eumotors-tasks/OTSUSTE-LOGI.md` kanne O-64).**

`noreply@xlmarket.ee` saadab nüüd iga saabuva kirja **koopia** keskpostkasti
`info@xlmarket.ee` ja **jätab originaali alles**. Tehtud mailcow'i oma vahendiga —
postkasti-põhine **sieve-eelfilter** (`sieve_filters` id=1, `filter_type=prefilter`):

```
require ["copy"];
redirect :copy "info@xlmarket.ee";
```

**Miks sieve ja mitte alias, nagu soovitus ütles:** iga mailcow'i postkast *on* ise
alias (rida `address = goto`), ja `functions.mailbox.inc.php:2743` eemaldab gotost
aadressi, mis võrdub aliase enda omaga (`alias_goto_identical`). Aliase kaudu oleks
tulemuseks **ainult** edasisuunamine — kohalik koopia oleks vaikselt kadunud, ilma et
miski oleks hoiatanud. `:copy` on samal põhjusel kohustuslik: ilma selleta tühistab
`redirect` implitsiitse `keep`-i. Postkast `noreply@` ja tema protokollid jäid
puutumata, nii et SMTP-auth ei katkenud (nagu soovitus ette nägi).

**Tõestatud** kahe testiga, mõlemad kontrollitud **mõlemast** postkastist: tavakiri
ja **päris tagasipõrge** (kiri olematule aadressile domeenis `example.com`, millel on
null-MX → postfix põrgatab ise, väljapoole ei lähe ühtegi paketti). Mõlemad kirjad
on nii `noreply@`-s kui `info@`-s.

**Kaasleid:** testimisel selgus, et sieve `redirect` oli **kogu mailcow-paigalduses**
katki (dovecot valis `postfix:588` jaoks IPv6, postfix kuulab ainult IPv4) — ehk ka
ükski puhkusevastus ega kasutaja-edasisuunamine ei oleks töötanud. Parandatud, vt O-64.

**Jääb veel (valikuline, Tarmo otsustab):**
- **Robustsem (fail-loud, HARD RULE #5 vaimus):** cron-skript loeb `info@` või `noreply@`
  IMAP-i, tuvastab NDR-id (Content-Type `multipart/report; report-type=delivery-status`)
  → **Telegram-teade** "X tellimuse-kirja põrkas tagasi" + kliendi-aadress. Nüüd vähem
  pakiline, sest NDR-id on keskpostkastis nähtavad — aga *nähtavus* ei ole *teavitus*.
- **Miinimum vahepeal:** `info@` lugemine katab ka NDR-id; eraldi `noreply@` rutiini
  enam vaja ei ole.

---

## Viited
- Mälu: `[[mail-mx-cutover-mailcow]]` (MX cutover otsus + tõestus).
- Sessioon: `memory/sessions/2026-10-17-xl.md` (split-brain leid + cutover-tõestus).
- Cutover: `docs/runbooks/cutover-xl-admin-env.md` (e-mail / SMTP env cutover'il, räsi/testkiri-kontroll).
- Kood: `backend/src/lib/email.ts` (emailGate SSoT), `backend/src/lib/invoice-pdf.ts` (arve-PDF).
