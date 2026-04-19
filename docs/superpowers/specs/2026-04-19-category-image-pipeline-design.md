# Category Image Pipeline — 960 puuduvat kategooriapilti

**Kuupäev:** 2026-04-19
**Staatus:** Kinnitatud (Risto)
**Autor:** XL
**Seotud:** `storefront/public/cat-thumbs/`, `backend/src/data/taxonomy-image-aliases.yaml`, `storefront/lib/category-tree.generated.json`

---

## 1. Eesmärk

Täita `cat-thumbs/` kaust ühtsel visuaalsel tasemel kõikide taksonoomia v3 sõlmede jaoks. Praegu on 3017/3977 sõlmel pilt, **960 puudub**.

Tulemus: iga sõlmega seostub 150×150 webp tootefoto valge taustaga, mis on visuaalselt ühtses tonaalsuses olemasolevate 3017 pildiga.

## 2. Skoop

### In scope
- 960 puuduvat handle'it (18 L1 + 192 L2 + 542 L3 + 144 L4 + 59 L5 + 3 L6 + 2 L7)
- Failide paigutus `storefront/public/cat-thumbs/<handle>.webp`, 150×150 webp
- Alias map uuendus `backend/src/data/taxonomy-image-aliases.yaml` kui VEVOR CDN kaudu
- Gatekeeper kvaliteedi-loop, 3-strike rule
- Review queue handle'idele, mis loopist läbi ei läinud

### Out of scope
- Olemasoleva 3017 pildi ümbertegemine
- Homepage atmosphere PNG-d (eraldi artefakt)
- Tootelehe VEVOR tootefotod (teine süsteem)
- Prompt-inženeeria edasiarendus pärast pass rate ≥ 60% saavutamist

## 3. Arhitektuur

### 3.1 Pipeline (3 rolli, sekventsiaalne per handle, paralleelne üle handle'ite)

```
       ┌─────────┐      ┌───────────┐      ┌────────────┐
handle │  Scout  │ ───▶ │ Generator │ ───▶ │ Gatekeeper │ ──▶ cat-thumbs/<h>.webp
       └─────────┘      └───────────┘      └────────────┘
                              ▲                   │
                              └───── FAIL ────────┘
                             (max 4 strike/handle)
```

Kõigil rollidel on samad skill'id: **design-system**, **frontend-design**, **nano-banana:generate**.

### 3.2 Rollide detailid

**Scout (general-purpose agent)**
- Sisend: handle
- Väljund: 3-5 VEVOR CDN tootefoto URL-i + prompt-seed (tüüpiline toote nimi selles kategoorias)
- Loogika: päri Medusa DB-st `product_category_product` kaudu selle kategooria tooted, võta top-5 `thumbnail` URL-i (eelistada VEVOR CDN 800px+ variant).
- Kui kategoorias pole tooteid, järgne parent handle'ile ja päri sealt.

**Generator (nano-banana:generate kaudu)**
- Sisend: handle + prompt-seed + kuni 3 reference URL-i Scout'ilt
- Väljund: 2K PNG `reports/image-gen-2026-04-19/candidates/<handle>/try-<n>.png`
- Mudel: `pro` (Nano Banana Pro, `gemini-3-pro-image-preview`)
- Aspect: `1:1`, size: `2K`
- Prompt template: vt §5

**Gatekeeper (agent vision kaudu)**
- Sisend: kandidaat-pilt + handle kontekst (name_en, parent, level)
- Väljund: `{ pass: bool, reason: string, detected_subject: string }`
- Kriteeriumid: kõik 4 peavad olema `true` — vt §4

### 3.3 Strike progression (per handle)

| Strike | Allikas | Kandidaat |
|---|---|---|
| 1 | Scout | VEVOR toode #1 (parim match) |
| 2 | Scout | VEVOR toode #2 (teine kandidaat) |
| 3 | Generator | nano-banana pro gen #1 (default prompt) |
| 4 | Generator | nano-banana pro gen #2 (prompt parandatud Gatekeeper'i reason'i põhjal) |
| — | STOP | handle → `review-queue.json` |

### 3.4 Orkestratsioon

**Koordinaator:** XL agent (sessioon).
**Paralleelsus:** kuni 3 handle pipeline'is korraga (piirab Gatekeeper jagatud lat). Implementeeritud Agent tool'i paralleelsete kutsetega.
**State:** kirjutatakse `reports/image-gen-2026-04-19/state.json` iga handle'i lõpul (idempotentne, resume-able).

### 3.5 Töötlusjärjekord

1. L1 (18 handle'it) — homepage'il kõige nähtavamad, tee kõigepealt, XL kontrollib kõik 18 üle
2. L2 (192) — mega-menus nähtavad, teise batch'ina
3. L3-L7 (750) — kolmas batch, suurim maht

## 4. Gatekeeper kriteeriumid

Kõik 4 peavad olema `true`, muidu FAIL.

| # | Kriteerium | Definitsioon |
|---|---|---|
| 1 | **Valge taust** | Pure (#FFFFFF) või peaaegu-pure (≥#F5F5F5) seamless taust. Pole lifestyle/interjöör/outdoor/gradient värviline taust. |
| 2 | **Kvaliteet** | Terav, hea valgus, pole artefakte, pole watermark'e, pole teksti ega logosid pildil, pole ilmse copyright'iga brändi-logo. |
| 3 | **Asjakohasus** | Üks selge subjekt (või väike grupp sama asja). Pole segu erinevaid kategooriad ühel pildil. |
| 4 | **Äratuntavus** | Gatekeeper kirjutab `detected_subject` — peab kattuma handle `name_en` või olema sama kategooria sünonüüm. |

Gatekeeper kirjutab iga rejection'i `reports/image-gen-2026-04-19/rejections.jsonl`:
```json
{"handle":"ice-machines","strike":1,"source":"vevor","candidate_url":"...","reason":"detected_subject='freezer display case' does not match 'ice-machines'","ts":"..."}
```

## 5. Nano-banana prompt template

```
Professional product photograph of a {seed.primary_product},
{seed.detail_hint},
pure white seamless background (#FFFFFF),
soft even studio lighting,
centered composition,
commercial catalog style,
high detail, sharp focus,
no text, no logos, no people, no watermarks,
shot on medium-format camera,
square crop.
```

`seed.primary_product` ja `seed.detail_hint` tulevad Scout'ilt (näide: `primary_product="commercial countertop ice maker"`, `detail_hint="stainless steel body, front control panel"`).

Strike #4 korral lisatakse Gatekeeper'i reason'i põhjal parandus:
- Reason "not white background" → lisa prompt'i "STRICTLY pure white #FFFFFF background, no shadows, no gradient"
- Reason "unrecognizable" → lisa "clearly recognizable as {name_en}, shown from 3/4 angle"
- Reason "multiple subjects" → lisa "single isolated product, no accessories, no props"

## 6. Failide paigutus

```
storefront/public/cat-thumbs/<handle>.webp           ← 150×150 lõplik
backend/src/data/taxonomy-image-aliases.yaml        ← uuendus kui VEVOR kaudu
reports/image-gen-2026-04-19/
  ├── missing-handles.json                           ← 960 handle'i manifest (juba olemas)
  ├── state.json                                     ← edenemine, resume-able
  ├── candidates/<handle>/try-{1..4}.png             ← kõik kandidaadid audit'i jaoks
  ├── accepted/<handle>.png                          ← 2K originaal tagavara
  ├── rejections.jsonl                               ← gatekeeper FAIL logi
  ├── review-queue.json                              ← handle'id mis 4 katsega ei läinud läbi
  └── summary.md                                     ← lõplik kokkuvõte
```

VEVOR-kaudu aktsepteeritud juhul:
- EI kirjuta `cat-thumbs/<handle>.webp` — selle asemel kirjutab `taxonomy-image-aliases.yaml` rea `<handle>: <legacy-slug>`. See hoiab duplikaat-failide tekkimise ära ja tagab, et image resolver töötab.

Nano-banana genereeritud juhul:
- Kirjutab 2K PNG `accepted/<handle>.png`
- Konverdib 150×150 webp → `cat-thumbs/<handle>.webp` käsuga `python3 -c "from PIL import Image; Image.open('X.png').resize((150,150), Image.LANCZOS).save('Y.webp', 'webp', quality=85)"`

## 7. Eelarve ja ajakulu

| Ressurss | Hinnang |
|---|---|
| Nano-banana Pro kutsed | ~480 × 2 keskmiselt = ~960 Pro 2K kutset |
| Rahaline kulu | ~$80 (0.08 × 960) |
| Ajakulu paralleelselt (3 pipe) | ~4h |
| Gatekeeper ja Scout LLM tokens | sisaldub sessiooni eelarves |

## 8. Exit criteria

- `cat-thumbs/` kaetus ≥ 95% kõigile 3977 sõlmele (praegu 76%)
- L1 + L2 kaetus 100% (210/210)
- Review queue < 50 handle'it (praegu pole veel olemas)
- `rejections.jsonl` kasutatav hiljem batch-2 iteratsioonil (kui vaja)
- Summary `summary.md` kirjeldab: mis läbis 1. katsega, mis 2., mis 3., mis review queue'sse

## 9. Risk ja peatumiskriteerium

**Kill switch:** kui esimese 50 handle'i jooksul PASS rate < 40%, STOP pipeline ja raporteeri. Põhjus: kas prompt on vale, kas Gatekeeper liiga range.

**Token budget:** sessiooni token'i eelarves hoia Gatekeeper vastused lühikesed (≤150 tokenit). Scout vastused struktureeritud JSON'iks.

**Idempotentsus:** `state.json` põhjal peab saama pipeline'i uuesti käivitada, käsitledes ainult handle'eid, mida pole veel PASS'itud või review queue'sse märgitud.

## 10. Deploy

1. Pärast pipeline'i lõppu käivita `scripts/gen-category-tree.mjs` (uuenda `image_source` väljad `category-tree.generated.json`-is)
2. Commit: `cat-thumbs/*.webp` + `taxonomy-image-aliases.yaml` + `category-tree.generated.json`
3. VPS deploy: `cd storefront && npm run build && cp -r .next/static .next/standalone/.next/static && pm2 reload xlmarket-storefront`
4. Sanity check: `/xl-admin/taxonomy-health` peab näitama kõrgemat image coverage %

## 11. Mis EI ole spec'is

- Olemasolevate 3017 pildi asendamise otsus
- Storefront CSS muudatused (jätame 150×150 formaadi, pole vaja puutuda)
- Nano-banana fallback mudelile (jääme Pro juurde, kulu väike)
- Human-in-the-loop UI review-queue jaoks (JSON faili piisab)
