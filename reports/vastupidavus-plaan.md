# Vastupidavuse plaan — XL (xlmarket.ee/.eu)

> Loodud 2026-08-25 (Tarmo: "mõtle kõigele"). **Disain + mõju-kaardistus, mitte ehitus.**
> Iga väline sõltuvus → degrade-käitumine + taastumis-mehhanism + launch-eelne kontroll.
> Severity: **CRITICAL/BLOCKER** vs **VAJA ÄRA TEHA** (HARD RULE #2 — LOW/MEDIUM ei eksisteeri).

---

## Kokkuvõttev maatriks — mis töötab kui X maas

| Sõltuvus maas | Pood sirvib? | Ost/makse? | Laoseis+hind? | Taastumine | Seis |
|---|---|---|---|---|---|
| **Krediit/API** | ✅ 100% | ✅ | ✅ värske | automaatne (queue) | 🔧 disain valmis, ehitus ootab |
| **Server (host/VPS)** | — | — | — | backup+restore | ✅ tehtud |
| **Feed (VEVOR)** | ✅ (vana cache) | ✅ | ✅ (vana) | guard abordib | ✅ tehtud |
| **Meili (otsing)** | ⚠️ osaline | ✅ | ⚠️ | ise (defensiivne) | 🔧 3 auku |
| **Medusa API** | ✅ grid | ❌ checkout | ✅ grid | ise | ⚠️ toote-detail 404 |
| **Montonio (makse)** | ✅ | ⚠️ selge viga | ✅ | ise | 🔧 teade üldine |

---

## 1. KREDIIT / API MAAS — pood töötab, queue taastub

**Põhiprintsiip:** krediidi-tõrge = DEGRADE, mitte FAIL. LLM-sammud skipivad, mitte-LLM sammud jätkavad → **laoseis+hind+pood jääb värske**. Uued tooted → nähtamatu draft (`pending-enrichment`), ootavad krediiti.

### Struktuur juba kaitseb (ei vaja ehitust, ainult mitte-lõhkuda)
| Fakt | Tõend | Tähendus |
|---|---|---|
| Uus toode → `draft`, kategooriata | `import-pipeline.sh:71` | poes juba nähtamatu kuni [4] publitseerib |
| Reindeks ainult `published` | `index-meilisearch.mjs:158` | draft ei jõua Meilisse → olematu poes |
| draft→published alles [4] paigutusel | `import-pipeline.sh:73` | [4] ei jookse → toode jääb draftiks (ohutu) |
| Draft INVISIBLE kõigil teedel | index + `medusa.ts:202` + `page.tsx:69` (404) + `sitemap.ts:93` | otselink/sitemap/otsing ei lekita draftit |

### Mis muutub igas pipeline-sammus krediidi-veal
| Samm | LLM? | Praegu | **Disain** |
|---|---|---|---|
| [1] cache-refresh | ei | töötab | töötab |
| [3] import-new | ei | töötab → draft | töötab → **draft, nähtamatu** |
| [3.5] title-strip | ei | töötab | töötab |
| **[4] classify** | Opus | ❌ `fail`→surm | **SKIP+rc=3 → `pending_classify`** |
| [5] price | ei | (ei jõua) | ✅ **jookseb → 18k hind värske** |
| **[6] spec** | Haiku | ❌ `fail`→surm | **SKIP+rc=3 → `pending_spec`** |
| [6.5] content | LLM | ✅ rc=3 (tehtud) | rc=3 degrade |
| [7] reindeks | ei | (ei jõua) | ✅ **jookseb → 18k laoseis Meilis värske** |

**Degrade-kaskaad on iseenesest õige:** [4] skip → `/tmp/classify-skus.txt` tühi → [6]+[6.5] skipivad automaatselt (`:164, :198`). Üks degrade → terve LLM-ahel vahele, mitte-LLM ahel jätkub.

### Pending-queue = IMPLITSIITNE (mitte DB-lipud)
Queue on juba iga sammu valiku-tingimuses — **ei materialiseeri lippe** (drift-vaba, propose-not-create, 0 migratsiooni):
| Pending | Tuvastus (liputa) | Tühjendaja |
|---|---|---|
| classify | `draft AND kategooriata` | [4] `--source unhomed` |
| spec | `specs IS NULL` | [6] null-spec valik |
| content | `content_gen_hash IS NULL` | [6.5]/backfill hash-guard |

Ainus lisand: host-fail `reports/credit-outage.state` (outage-algus + viimane-teavitus) — ainult anti-spämmiks, MITTE per-toode.

### Taastumine — automaatne, 0 käsku
Krediit tagasi → järgmine öine cron: [4] näeb kogunenud draftid, [6] näeb spec-lünga, [6.5] näeb sisu-lünga → **queue tühjeneb ise**. Manuaalne kiirendus: `bash scripts/drain-pending.sh` (backfill-skriptide wrapper).

**Eeltingimus:** pipeline algab **krediit-probe'ga** (1-token proov). 200 → jätka; krediidi-viga → jää degrade'i (ära raiska 18k katset).

### Teavitus — anti-spämm (õppetund: 26 identset = müra)
| Sündmus | Telegram | Kaitse |
|---|---|---|
| 1. tõrge | ⚠️ "Krediit otsas — pood töötab, N ootab rikastust" | loob state |
| 2.–N. öö | ⚠️ 1×/päev "päev N, M queue's" | `last_notify != täna` → 1/päev |
| krediit tagasi | ✅ "Taastatud, M→0" | kustutab state |

**Ehitus-skoop (ootab kinnitust):** (1) [4]+[6] rc=3 degrade nagu [6.5], (2) krediit-probe värav, (3) state+anti-spämm digest, (4) `drain-pending.sh`.

---

## 2. SERVER (host / VPS) MAAS — ✅ tehtud

- **Backup:** pg_dump + Meili dump (2026-05-02 migrate tõestas taaste). Vana VPS + Tarmo Coolify = kaks elus setup'i (CLAUDE.md päis).
- **Taaste:** dokumenteeritud (Coolify redeploy, konteineri-restart).
- **VAJA ÄRA TEHA:** automaat-backup ajakava kinnitus (kas pg_dump cron jookseb regulaarselt k33g-l? — kontrolli enne launchi).

---

## 3. FEED (VEVOR) MAAS — ✅ tehtud

- **Guard abordib:** `refresh-feed-cache.sh` fail-loud; feed download nurjub → EXIT trap + Slack/Telegram, **vana cache jääb alles** → pood sirvib vana laoseisuga edasi.
- **Valideerimise värav ilma fikseeritud numbriteta** (CLAUDE.md gotcha): võrdle tõe-allikaga + hälve (isekohanduv).
- Pood töötab vana feed-cache pealt (laoseis külmub, aga ei purune).

---

## 4. MEILI (otsing/facetid) MAAS — ⚠️ osaline degrade, 3 auku

Meili katab: otsing, tootearvud, avalehe-sektsioonid, soodus-/hittribad, seotud tooted. **Nav/kategooria-struktuur EI sõltu Meili'st** (SSoT `category-tree.generated.json`).

| Pind | Käitumine Meili-maas | Tõend | Seis |
|---|---|---|---|
| Tootegrid | ✅ FALLBACK: 3 retry + selge veakast "temporarily unavailable" | `ProductGrid.tsx:131` | OK |
| Toote-detail | ✅ FALLBACK Medusa'le (hind `calculated_price`, pealkiri `title_et`) | `product/route.ts:233` | OK |
| Kategooria-navi | ✅ TÖÖTAB (SSoT) | `page.tsx:113` | OK |
| **Kategooria tootegrid** | ❌ näitab **"tooteid ei leitud"** (eksitav — justkui kategooria tühi) | `page.tsx:446` | 🔧 **VAJA ÄRA TEHA** |
| **Avaleht/otsing** | ❌ sektsioonid **tühjad ilma teateta** | `HomepageShell.tsx:90` | 🔧 **VAJA ÄRA TEHA** |
| **Toote-detail laoseis** | ⚠️ `in_stock undefined` → koheldakse **"laos"** (võib müüa OOS) | `product/route.ts:472` | 🔧 **VAJA ÄRA TEHA** |

**Taastumine:** kõik Meili-teed defensiivsed (catch → `[]`/`null`/503, ei viska) → Meili tagasi = pood taastub ise, 0 sekkumist. Reindeks-gotcha (CLAUDE.md): plugin võib cron-restartil indeksi üle kirjutada → taaste `index-meilisearch.mjs`.

**Augud (VAJA ÄRA TEHA, enne launchi):**
1. Kategooria tühi-grid Meili-maas → näita "otsing ajutiselt maas", mitte "tooteid ei leitud" (eristus: tühi kategooria vs katkine otsing).
2. Avaleht tühjad sektsioonid → vähemalt üks nähtav "otsing taastub" riba (muidu klient arvab pood katki).
3. Laoseis-fallback "laos" Meili-maas → kaalu "laoseis kontrollimisel" neutraalset teksti (väldi OOS-müüki). **Checkout Medusa reserveerib päris laoseisu** → tegelik ületellimus blokeeritakse seal, aga UX eksitab.

---

## 5. MEDUSA API (port 9001) MAAS — ⚠️ toote-detail 404

| Pind | Käitumine | Tõend | Seis |
|---|---|---|---|
| Sirvimine (grid) | ✅ TÖÖTAB (Meili, hind Meili'st; Medusa enrich try/catch) | `products/route.ts:113` | OK |
| Kategooria (SSoT) | ✅ TÖÖTAB (22 v3-kat Medusa-vaba) | `page.tsx:113` | OK |
| **Toote-detail** | ❌ **404** (`getProduct` catch→null→`notFound()`) | `medusa.ts:203`+`page.tsx:69` | ⚠️ **VAJA ÄRA TEHA** |
| **Checkout** | ❌ 503 (klient näeb viga) | `payment/route.ts:88` | osa §6 |

- Medusa kaitstud: semaphore max 3 samaaegset + 10s timeout (`medusa.ts:7`) → event-loop ei uppu.
- **Auk (VAJA ÄRA TEHA):** toote-detail sõltub Medusa'st SSR-is → Medusa maas = 404. Kaalu: kui Meili-hit olemas, renderdada toode Meili-andmetest ka Medusa-maas (praegu Medusa on esmane toote-detailis). ISR-cache (`revalidate=3600`) leevendab kuni tund.

---

## 6. MONTONIO (makse) MAAS — 🔧 teade üldine

| Aspekt | Käitumine | Tõend |
|---|---|---|
| Klient näeb viga? | ✅ JAH — punane kast, nupp taastub, ei spinnerit | `tellimus/page.tsx:204,349` |
| Serveri-route | 503 `{error:"Failed to connect"}` / provider-vead propageeritud | `payment/route.ts:88,55` |
| Suunamine | ainult kui `redirect_url` olemas (muidu jääb lehele veaga) | `page.tsx:213` |

**Auk (VAJA ÄRA TEHA, launch-eelne):** veateade üldine — *"Makse ettevalmistus ebaõnnestus"*. Parem: spetsiifiline *"Makse on ajutiselt kättesaamatu, proovi mõne minuti pärast või vali teine makseviis"* + tellimus ei kao (korv säilib). Klient ei tohi arvata, et raha võeti.

---

## 7. NGINX / STALE-SERVE — microcache inaktiivne

- `nginx/microcache.conf` **defineerib** cache-tsooni, aga peakonfis (`xlmarket.conf`) **PUUDUB** `proxy_cache*` → tsoon **ei ole kasutuses**. Backend maas → nginx ei serveeri vana, päring läheb otse üles.
- Vastupidavus tuleb **Next.js ISR-ist** (`revalidate=3600` toote/kat-lehel) + route `s-maxage/stale-while-revalidate` (`products/route.ts:166`), MITTE nginx-ist.
- **Märkus:** committed `xlmarket.conf` on `.eu` domeenile ega sisalda `/meili` proxy-location'it, kuigi `HomepageShell.tsx:70` eeldab brauseri-`/meili` teed → tootmis-nginx repost väljas (dokumenteerimata konfiguratsioon).
- **VAJA ÄRA TEHA:** kaalu microcache aktiveerimine `location /` peal (nt 1-5s) → backend-piigi/lühi-maas-serveerib vana → suurem vastupidavus. + kinnita `/meili` proxy tootmis-konfis (versioonihalduseta konf = risk).

---

## 8. LAUNCH-EELNE KONTROLLNIMEKIRI

**CRITICAL / BLOCKER (peab enne launchi):**
- [ ] Krediit-degrade [4]+[6] ehitatud + testitud (praegu HARD FAIL → laoseis külmuks krediidi-katkestusel)
- [ ] Montonio-maas teade: klient ei tohi arvata et raha võeti; korv säilib
- [ ] Backup-cron kinnitatud jooksma k33g-l (server-maas taaste eeldab värsket dumpi)

**VAJA ÄRA TEHA (enne launchi):**
- [ ] Kategooria tühi-grid Meili-maas → "otsing maas" teade (mitte "tooteid ei leitud")
- [ ] Avaleht Meili-maas → nähtav "taastub" riba (mitte vaikne tühjus)
- [ ] Toote-detail laoseis Meili-maas → neutraalne tekst (väldi OOS-müügi UX)
- [ ] Toote-detail Medusa-maas → Meili-fallback render (praegu 404)
- [ ] Montonio veateade spetsiifiliseks
- [ ] nginx microcache aktiveerimine (stale-serve backend-piigil) + `/meili` proxy tootmis-konfi kinnitus
- [ ] Draft-nähtamatus: eksplitsiitne storefront-guard (praegu tugineb Medusa Store API vaikekäitumisele — tingimuslik eeldus)
- [ ] `drain-pending.sh` manuaalne queue-tühjendus (krediit-taastel kiirendus)

**JUBA KAETUD (✅):**
- Feed-maas guard + vana-cache-serveerimine
- Server-maas backup+restore (2 elus setup'i)
- Meili defensiivsus (catch → ei viska; pood taastub ise)
- Medusa semaphore + timeout (event-loop kaitse)
- [6.5] sisu krediit-degrade (rc=3)

---

## Filosoofia (miks nii)

**Iga väline sõltuvus = eelda maas-olekut, disaini degrade + iseparanev taastumine.** Mitte "kas maas", vaid "kui maas, kas pood elab + kas taastub ise". Kaskaad-reegel: **mitte-kriitiline sõltuvus (LLM, otsing, feed) ei tohi blokeerida kriitilist teed (sirvi→ost→laoseis)**. Sama muster igal pool: B-fix (üksik tõrge ≠ peata kõik), HARD RULE #5 fail-loud, krediit-degrade.
