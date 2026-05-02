# CLAUDE.md — XL: xlmarket.eu e-pood

> Viimati uuendatud: 2026-05-02

---

## Sessioon 2026-05-02 muudatused

**Sessioonilogi:** `brrr-kadzin/memory/2026-05-02-xl.md` (täielik kontekst)

**Tõlke pipeline 5-step fix** (commits b309563, 216fff3, 80cf9ee, 7bd3565):
- `--effort low` Claude CLI args'idesse (translation pole multi-step reasoning)
- Chunk sizes 30/22/15 → **10/6/3** (väldib 480s timeout)
- execClaude timeout 8min → **90s**
- Validator critical_warning_codes **tühi** (validator regex liiga karm — `06` count'kse missing, lokaliseeritud units `inch→tolli` flag'b unit_missing'iks)
- `source_hash_et` metadata salvestus (tulevane stale detection)

**DB seis 2026-05-02:** **6456 / 16 335 = 39.5%** (+846 tõlget täna)

**Throughput:** ~830/h Sonnet 4.6 + Max plan, ~12h aktiivset fleet'i lõpetuseks (Max kvoot lööb iga 5h sessiooni järel).

**Repo on Tarmo githubis:** `roland-kaubandus/brrr-xlmarket` (canonical), local main remote `roland`. Kõik commits sünk.

**Tarmo Coolify deploy POOLELI:** Faas C (Coolify resource create) + Faas D (andmemigration) — pole alustatud. Plaan: `~/.claude/plans/xlmarket-on-n-d-mber-mossy-hopper.md` + `COOLIFY_DEPLOY.md`.

**Research raport** uutele keeltele + parimatest praktikatest: `outputs/translation-research-2026-05-02.md` (50+ allikat). Anthropic Max + Batch API kombinatsiooni LAHENDUST EI OLE (Anthropic blokeerib OAuth tokeni).

---

## Keelestrateegia (aktiivne 2026-04-24)

XLM liigub multi-keele peale. Baaskeel EN, primaarne per-regioon kohalik
(EE → ET, ES → ES, hiljem DE/FR/LT/LV/FI/SV/RU). Vt täispõhjalik plaan:
`/home/brrr/.claude/plans/hei-homsest-hakkavad-natuke-binary-lobster.md`

**Tõlked lähevad:** `product.metadata.title_et / description_et / selling_point_N_et`.
**Tõlked EI kirjuta üle** `product.title` / `product.description` — need jäävad
EN baseline (fallback kui locale-spetsiifiline väli puudub).

**Storefront loeb locale-aware:**
- `lib/meilisearch.ts#getProductTitle(hit, locale)` → `title_et` kui locale=et
- `lib/map-meili-hit.ts#mapMeiliHitToProduct(hit, locale)` — locale propageerib
- `app/api/product/[handle]/route.ts` — selling_point_N_et overlay

**Endine "HARD RULE #1 — 100% INGLISE KEEL"** (2026-04-20) oli ajutine kaitse
kuni storefront code sai locale-aware (B1 tehtud 2026-04-24). Enam ei kehti —
tõlkepipeline on aktiivne, metadata fieldid on õiged sihtmärgid.

---

## 🛑 HARD RULE #2 — SEVERITY LEVEL: "LOW" JA "MEDIUM" EI EKSISTEERI

**Kasuta AINULT 2 kategooriat:**
- **CRITICAL** (või **BLOCKER**) — pood katki, raha kaob, data corruption, exploit elus
- **VAJA ÄRA TEHA** — kõik muu

**ÄRA KASUTA:** `LOW`, `MEDIUM`, `MED`, `MINOR`, `NICE-TO-HAVE`, `P3`, `P4`
või ühegi muud "võib oodata" tüüpi silti.

**Why:** Risto selgitas 2026-04-20: "see on täpselt see kuidas neid sinna
liigitatakse ja kuidas neid eiratakse. Sa võid panna mõne asja kohta critical
või blocker, aga kõik ülejäänud on täpselt samal pulgal 'vaja ära teha'".

**How to apply:**
- Audit-raportites: ainult 2 sektsiooni — "CRITICAL / BLOCKER" ja "VAJA ÄRA TEHA"
- Severity tabelites: ära kasuta `MED`/`LOW` veerge
- Backlog'is: kui miski pole CRITICAL, siis on "vaja ära teha" — pole "low priority"
- Tänasest päevast: CRITICAL ja VAJA ÄRA TEHA. Kõik muu on "me ei tee kunagi"
  (sest seda ei ole kunagi tehtud).

**Kui audit-agent ise pakub MEDIUM/LOW severity'd → tõlgi ümber:**
- Pakkutud `HIGH` → CRITICAL või VAJA ÄRA TEHA (sina otsustad)
- Pakkutud `MEDIUM` → VAJA ÄRA TEHA
- Pakkutud `LOW` → VAJA ÄRA TEHA (mitte kunagi "nice to have")

---

## Kes sa oled

**XL** — xlmarket.eu e-poe arendusagent.
Huly projekt: **XLM** | Konto: xl@brrr.ee

---

## Kasutaja eelistused (sticky reeglid)

**Kui kasutaja palub kindlat skilli/agenti/workflow'i kasutada — kasuta seda kuni sessiooni lõpuni.**
- Sama kehtib kui palutakse "kasuta frontend-design skill", "nano-banana pro", "reviewer-ui + gatekeeper loop" vms — need jäävad aktiivseks kogu sessiooniks, isegi kui järgmistes käskudes ei mainita.
- Ära langetaks oma algatusel kasutusele odavamat/lihtsamat varianti (nt flash pro asemel, lihtne build loopi asemel).
- Ainult kasutaja enda uus korraldus tühistab eelmise.

---

## Stack

```
Medusa.js 2.0  — e-poe backend (port 9001)
Next.js 16     — storefront (port 3030)
PostgreSQL 16  — andmebaas (port 5435)
Redis 7        — cache/sessions (port 6380)
MeiliSearch    — full-text search + facets (port 7700)
Medusa Admin   — admin paneel (port 7001)
nginx          — reverse proxy + SSL
Docker Compose — kõik teenused konteinerites
```

### Tootefeed
- **Sync:** iga 4 tundi
- **Hinnavalem:** algne_hind * 1.15 = lõpphind (käibemaksuga, erandit ei ole)
- **Tooted:** ~16 046, 1 688 kategooriat

### Makselahendus
- **Montonio** — pangalingid + kaardimaksed

### Integratsioonid
- osta.ee (XML feed), Facebook Commerce + Pixel, X Twitter Cards

---

## Commands

```bash
# Storefront
npm run dev                     # dev (port 3000)
npm run build && npm run start  # prod (port 3030)

# Backend
cd backend && npm run dev       # medusa (port 9001)

# VEVOR import
node scripts/import-vevor-feed.mjs --execute --update

# Backfill sanitized HTML (kiire, ilma XLSX-ita)
node scripts/backfill-sanitized-html.mjs --execute

# VPS deploy
cd storefront && npm run build
cp -r .next/static .next/standalone/.next/static
pm2 reload xlmarket-storefront
```

---

## Gotchas

- **sanitizeHtml regex:** PEAB kasutama bounded quantifiers! `{0,50}[^{}]{0,300}\{[^}]{0,5000}\}`. Vana nested regex `(?:\s+[charclass]*)*` põhjustas catastrophic backtracking ja kogu serveri hangumise.
- **MeiliSearch otse brauserist:** ProductGrid küsib `/meili/indexes/products/search` (nginx proxy). Ära kunagi tõsta MeiliSearch päringuid tagasi Next.js API route'i — see oli hangumise põhjus.
- **sanitizeHtml pre-compute:** Feed import salvestab `sanitized_description` + `sanitized_rich_description` Medusa metadata'sse. Product API route loeb neid, fallback runtime sanitize'ile.
- **Standalone build static copy:** `npm run build` järel PEAB tegema `cp -r .next/static .next/standalone/.next/static` — muidu CSS puudub!
- **PM2 deploy:** Kasuta `pm2 reload xlmarket-storefront`, mitte `fuser -k`. 5 cluster workerit, graceful reload.
- **Next.js fetch cache:** Medusa API update järelt storefront serveerib vana data. Fix: `rm -rf .next/cache/fetch-cache` + rebuild
- **MeiliSearch facetDistribution:** Tagastab KÕIK category_handles. Filtreeri L1 branch handles manuaalselt (`lib/branches.ts`)
- **VEVOR CDN %2B:** Mõned failinimed sisaldavad `+` (%2B). ÄRA decodeURIComponent — CDN nõuab kodeeritud URL-e
- **Medusa admin (Vite):** `allowedHosts: ["xlmarket.store"]` + `backendUrl: "https://xlmarket.store"`
- **nginx /app proxy:** `location ^~` (mitte `location /`)
- **Email subscribers KATKI:** `order-placed.ts` ja `order-shipped.ts` kommenteeritud välja
- **CORS:** STORE_CORS, ADMIN_CORS, AUTH_CORS peavad sisaldama `https://xlmarket.store`
- **Meili index WIPED (price/taxonomy puudu):** Medusa plugin kirjutab cron restart'i järel indeksi üle minimaalsete väljadega. Taastamine: `cd /home/brrr/brrr-xlmarket && set -a && source .env && set +a && unset DATABASE_URL && node backend/scripts/index-meilisearch.mjs && node scripts/sync-existing-synonyms.mjs` + `find /home/brrr/brrr-xlmarket/storefront/.next/cache -type f -delete` + `pm2 reload xlmarket-storefront`. feed-sync.sh EXIT trap + Slack alerts peaks nüüd kaitsma (2026-04-22 acff4d7).
- **admin@xlmarket.eu jagab login + feed-sync cron auth:** Parooli vahetades UUENDA `.env` MEDUSA_ADMIN_PASS ka, muidu cron hängib [3/6] Medusa import sammu juures, [4/6] Meili reindex ei käivitu, sait näitab €0.00.
- **Meili settings PATCH panics:** Meili 1.41 teadaolev bug — `PUT /indexes/products/settings/searchable-attributes` crashib internal error'iga. Kui vaja muuta, tee kogu index uuesti (`index-meilisearch.mjs` loob õiged settings'id).

---

## Key files

- `scripts/import-vevor-feed.mjs` — VEVOR XLSX importer (SPU grouping, image dedup, sanitizeHtml pre-compute)
- `scripts/backfill-sanitized-html.mjs` — Kerge backfill: sanitized HTML kõigile toodetele (ilma XLSX-ita)
- `scripts/feed-sync.sh` — Cron sync (4h): download, cache, reindex, stock, feeds
- `storefront/lib/sanitize.ts` — HTML sanitizer (KRIITLINE: bounded quantifiers regex!)
- `storefront/lib/meilisearch.ts` — MeiliSearch client + compound word expansion
- `storefront/lib/map-meili-hit.ts` — MeiliSearch hit → Product mapper (shared)
- `storefront/components/ProductGrid.tsx` — Client-side tooteloend, küsib MeiliSearch'i otse brauserist
- `storefront/components/SafeLink.tsx` — Link wrapper, prefetch=false + 300ms throttle
- `storefront/app/api/product/[handle]/route.ts` — Toote andmete koondamine (Medusa + MeiliSearch + sanitizeHtml)
- `storefront/app/api/products/route.ts` — Toote otsingu API (fallback)
- `storefront/app/[locale]/toode/[handle]/page.tsx` — Toote detail (kerge SSR shell)
- `storefront/app/[locale]/toode/[handle]/ProductPageClient.tsx` — Bridge: fetchib API, renderdab client-side
- `storefront/app/[locale]/toode/[handle]/ProductContent.tsx` — Toote UI (client-only)
- `storefront/app/[locale]/kategooriad/[handle]/page.tsx` — Kategooria leht (L1/L2/L3, spec §3.5)
- `storefront/app/xl-admin/taxonomy-health/page.tsx` — Live invariants dashboard (F5.7)
- `storefront/app/xl-admin/categorization-queue/page.tsx` — Review queue UI (F3.5)
- `storefront/components/CategoryThumb.tsx` — Ühtne kategooria pilt/SVG fallback (F5b)
- `storefront/components/MegaMenu.tsx` — N-level SSoT drill (F5b)
- `storefront/lib/category-tree.ts` — SSoT helpers (getBreadcrumbTrail, firstKnownHandle, getL1Ancestor)
- `backend/src/data/taxonomy.yaml` — SSoT (F2.1)
- `backend/src/data/taxonomy-image-aliases.yaml` — Image alias map (F5b, 176/176 kate)
- `scripts/gen-category-tree.mjs` — YAML → JSON snapshot (`--check`, `--report`)
- `scripts/check-taxonomy-invariants.mjs` — 23 invariants, `--json` CI mode
- `docs/runbooks/taxonomy-invariant-failures.md` — per-INV remediation steps
- `storefront/lib/branches.ts` — Branch definitsioonid
- `storefront/ecosystem.config.js` — PM2 cluster config (5 workerit)
- `nginx/microcache.conf` — nginx microcache konfiguratsioon

---

## Reeglid

- Pildid: kasuta VEVOR CDN URL-e, ara kopeeri serverisse
- Tarmole peab admin olema lihtne ja eestikeelne
- Tootehinnad ALATI * 1.15


---

## 💎 TOKEN-SÄÄSTMISE REEGEL (lisatud 2026-04-30)

1. **PowerShell skript >5 rida** → kirjuta .ps1 faili, käivita `-File` (mitte inline)
2. **Diagnostika** → ÜKS batch-skript, mitte mitu eraldi tool-call'i
3. **Taustal jooksvale tööle** → ÜKS check, mitte spam
4. **2 katset ebaõnnestus** → küsi userilt, mitte 5. lähenemist proovida
5. **Pika info kuvamiseks** → markdown-fail `outputs/`-i + link
6. **SSH/Bash escape probleem** ($, \, ") → kohe script-faili lähenemisele
7. **Kontekst >70%** → KOHE mälu kirjutada (compaction reegel)
8. **Vastused lühikesed:** tabel/link > pikk seletus. Selgitused ainult kui küsitakse.

Detailid: `brrr-kadzin/memory/2026-04-30-cowork.md`

