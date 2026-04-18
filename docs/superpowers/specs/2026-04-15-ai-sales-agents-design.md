# XLMarket AI Sales Agents — Design Spec

> 2026-04-15 | Sessioon: AI otsing + müüjad

---

## Eesmärk

Lisada XLMarket e-poele kolmetasemeline AI-assistentide süsteem, mis aitab klientidel tooteid leida ja otsustada. Süsteem töötab AiSearchPalette vestlusaknas (Ctrl+K).

---

## Arhitektuur

```
Kasutaja → AiSearchPalette (UI, vestlusaken)
              ↓
         /api/ai-chat (POST, streaming)
              ↓
         Router (valib agendi konteksti põhjal)
              ↓
    ┌─────────┼──────────────┐
 Claudia    Spetsialist   Kliendihaldur
 (Haiku)    (Sonnet)      (Sonnet, Phase 2)
    │           │              │
 MeiliSearch  MeiliSearch   MeiliSearch
 kategooriad  + specs       + kliendi ajalugu
```

### Eraldusjooned

- **SearchBar** jääb muutmata — kiire MeiliSearch typeahead (~5ms), eraldi kogemus
- **AiSearchPalette** on vestlusaken — AI agentide ühine liidesepind
- **Üks API route** (`/api/ai-chat`) haldab vestlusajalugu ja agentide vahetust
- Eskaleerimine on sujuv, kasutaja näeb märget ("Tootespetsialist vastab")

---

## Tase 1: Claudia — poe infopunkt

### Roll
Poe sissepääsu juures seisev sõbralik inimene, kes teab kus miski asub, aga ei tea toodete spetsifikatsioone.

### Mudel
`claude-haiku-4-5-20251001` — kiire, odav

### Kontekst (system prompt)
- Kategooriapuu (1688 kategooriat, ~15KB kompaktne JSON)
- Poe üldinfo: tarne (4.99 EUR), tagastuspoliitika, hinnapoliitika
- 5-10 populaarset toodet per L1 kategooria (nimed + handles)

### Tool
- `search_products` — MeiliSearch päring, tagastab nimed + lingid + hinnad + thumbnailid (max 6 tulemust)

### Toon ja käitumine
- Sõbralik, tagasihoidlik, eestipärane
- **EI müü.** Ei ole entusiastlik. Ei kasuta emojisid ülemäära. Ei ütle "suurepärane valik!"
- Aitab kui küsid. Ei tule ise peale soovitustega
- Kui keegi teeb nalja, läheb kaasa. Ise huumorit ei otsi
- Kui ei tea — ütleb ausalt: "Seda ma täpselt ei tea, aga saan kutsuda tootespetsialisti"
- Küsib tagasi ainult kui küsimus on ebaselge ("Mis materjali puurid? Puit, betoon, metall?")

### Eskaleerimine
- **Tootespetsialistile** (automaatne või küsides): spetsifikatsioonide küsimus, toodete võrdlus, tehniline nõuanne
- **Kliendihaldurile** (automaatne): projektimüük (köök, kontor, ladu), hulgiost, B2B kontekst
- Otsustab ise kas küsib kasutajalt kinnitust või eskaleerib kohe — lihtne speci küsimus = kohe, pikk võrdlus = küsib

---

## Tase 2: Tootespetsialist — osakonna ekspert

### Roll
Kategooriapõhine tehniline ekspert. Teab oma osakonna toodete spetsifikatsioone, oskab võrrelda.

### Mudel
`claude-sonnet-4-6` — targem, aeglasem

### Kontekst (system prompt)
- Claudia vestlusajalugu (et teab mida klient küsis)
- Konkreetse kategooria toodete specs (tõmmatakse päringuga)
- Max 5-10 toote täisandmed korraga (nimi, hind, specs, features, mõõdud)

### Tools
- `search_products` — MeiliSearch päring (sama mis Claudial)
- `get_product_details` — toote täisandmed Medusa API-st (`/api/product/[handle]`), sisaldab specs, features, mõõtmed

### Toon ja käitumine
- Tehniline, aus, konkreetne
- "Selle keevitusaparaadi MIG-režiim töötab kuni 200A, 0.8-1.0mm traat" — mitte "see on super aparaat!"
- Kui ei tea — ütleb ausalt, ei genereeri fakte
- Võrdleb konkreetseid numbreid, mitte ebamääraselt "see on parem"

### Eskaleerimine
- **Kliendihaldurile**: kui selgub projektimüügi vajadus vestluse käigus

---

## Tase 3: Ärikliendihaldur (Phase 2 — EI EHITATA praegu)

### Roll
Isiklik müügihaldur projektiklientidele.

### Põhimõtted (tuleviku spec)
- Aktiivne müük OK — klient eeldab seda projektimüügis
- Sisselogimine pole eskaleerimiseks vajalik — konto luuakse müügi lõpus
- Claudia eskaleerib siia automaatselt kui tunneb B2B konteksti
- Tulevikus: saadab personaalseid e-kirju (uued tooted kliendi kategoorias)
- Haldab pikaajalist suhet — teab mis klient varem ostis

### Selle sessiooni skoop
- Claudia system prompt mainib kliendihalduri olemasolu
- Kui vestlus läheb B2B suunas, Claudia ütleb: "Projektimüügiks saad isikliku kliendihalduri — see on hetkel ettevalmistamisel, aga saan juba aidata toodete leidmisel"
- Tegelikku kliendihalduri agenti EI ehitata

---

## API: `/api/ai-chat`

### Endpoint
```
POST /api/ai-chat
Content-Type: application/json

{
  "messages": [
    { "role": "user", "content": "Millist puuri betoonile vaja?" }
  ],
  "locale": "et",
  "sessionId": "uuid"       // vestluse jälgimine
}
```

### Response (streaming)
```
data: {"type":"agent","agent":"claudia"}
data: {"type":"text","content":"Betoonile sobivad..."}
data: {"type":"products","items":[{handle,title,price,thumbnail}]}
data: {"type":"escalation","from":"claudia","to":"specialist","reason":"tech_compare"}
data: {"type":"agent","agent":"specialist"}
data: {"type":"text","content":"Vaatasin mõlema spetsifikatsioonid..."}
data: {"type":"done"}
```

### Streaming protokoll
- Server-Sent Events (SSE) — lihtne, natiivne brauseri tugi
- Toodete kaardid renderdatakse inline vestlusesse
- Agendi vahetus näidatakse väikese märkega ("Tootespetsialist vastab")

### Vestlusajalugu
- Hoitakse client-side (React state) sessiooni jooksul
- Saadetakse iga päringuga kaasa (viimased 20 sõnumit max)
- Ei salvestata serveris (Phase 1)

---

## UI: AiSearchPalette muudatused

### Praegune seisund
- Modal: Ctrl+K avab, Escape sulgeb
- Ülemine input: uncontrolled, mitte midagi ei tee
- Quick actions: 3 nuppu, onClick puudub
- AI chat: disabled input + disabled nupp, staatiline tervitus

### Uus struktuur

```
┌─────────────────────────────────────┐
│ [🔍] Otsi tooteid või küsi AI-lt… [AI] │  ← input, Enter saadab
├─────────────────────────────────────┤
│                                       │
│  Claudia: Tere! Saan aidata...       │  ← vestlus
│                                       │
│  Sina: Vajan puuri betoonile          │
│                                       │
│  Claudia: Betoonile sobivad...       │
│  ┌──────┐ ┌──────┐ ┌──────┐         │  ← tootekaardid inline
│  │Puur 1│ │Puur 2│ │Puur 3│         │
│  └──────┘ └──────┘ └──────┘         │
│                                       │
│  ─ Tootespetsialist vastab ─         │  ← eskaleerimine
│                                       │
│  Spets: Vaatasin mõlemat...          │
│                                       │
├─────────────────────────────────────┤
│ [💬 Küsi toote kohta…        ] [Saada]│  ← aktiivne input
└─────────────────────────────────────┘
```

### Quick actions
- "Tänased pakkumised" → navigeerib `/{locale}/otsing?filter=deals`
- "Uued tooted" → navigeerib `/{locale}/otsing?sort=uusimad`
- "Bestsellerid" → navigeerib `/{locale}/otsing?sort=bestsellerid`
- Quick actions kaovad pärast esimest sõnumit (vestlus asendab)

### Tootekaardid vestluses
- Kompaktsed horisontaalsed kaardid: thumbnail (40x40) + nimi + hind
- Klikk → navigeerib tootelehele
- Max 6 toodet korraga

---

## MeiliSearch tool implementatsioon

### search_products (mõlema agendi jaoks)
```typescript
// Claude tool definition
{
  name: "search_products",
  description: "Search XLMarket product catalog. Returns product names, prices, thumbnails and links.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Search keywords" },
      category: { type: "string", description: "Filter by category handle (optional)" },
      limit: { type: "number", description: "Max results (default 6, max 10)" },
      sort: { type: "string", enum: ["relevance", "price_asc", "price_desc", "newest"] }
    },
    required: ["query"]
  }
}
```

### get_product_details (ainult spetsialist)
```typescript
{
  name: "get_product_details",
  description: "Get full product details including specifications, features, dimensions. Use when comparing products or answering technical questions.",
  input_schema: {
    type: "object",
    properties: {
      handle: { type: "string", description: "Product URL handle" }
    },
    required: ["handle"]
  }
}
```

---

## Claudia system prompt (lühendatud näide)

```
Sa oled Claudia, XLMarket.eu e-poe infopunkti töötaja.

KUIDAS SA KÄITUD:
- Sa oled sõbralik ja tagasihoidlik. Sa ei ole Ameerika müügimees.
- Sa ei müü midagi. Sa aitad leida.
- Kui keegi teeb nalja, mine kaasa. Ise nalja ei otsi.
- Kui ei tea — ütle ausalt. Ära genereeri fakte.
- Ära kasuta ülemäära emojisid ega hüüumärke.

MIDA SA TEAD:
- Poe kategooriad ja kus tooted asuvad
- Saad otsida tooteid nime, kategooria, hinna järgi
- Tarne: 4.99€, tasuta alates 99€. Tagastus: 30 päeva.

MIDA SA EI TEA:
- Toodete spetsifikatsioone (watt, materjal, mõõdud)
- Kui keegi küsib spece → kutsu tootespetsialist

ESKALEERIMINE:
- Tehniline küsimus → tootespetsialist (ütle kasutajale)
- Projektimüük (köök, kontor, hulgiost) → kliendihaldur (ütle et see teenus on tulemas)

POE INFO:
- XLMarket.eu — professionaalsed tööriistad poole hinnaga
- ~16 000 toodet, 1688 kategooriat
[kategooriapuu: L1 kategooriad nimede ja handle'itega, ~50 rida]
```

> Kategooriapuu genereeritakse build-time `lib/branches.ts` + MeiliSearch facetDistribution'i põhjal. Kompaktne formaat: `{handle: "power-tools", name: "Power Tools", subcategories: ["drills","saws",...]}`

---

## Autentimine

**Claude Max tellimus** — kõik AI agendid ("poe töötajad") jooksevad Max plaani peal.
- Kuumaks, mitte per-token billing
- Autentimine läbi Max API (OAuth/subscription token), mitte `ANTHROPIC_API_KEY` sk-ant-...
- Tuleb uurida täpne auth flow: kas Max annab API tokeni, OAuth, või muu mehhanism

> Implementeerimisel: kontrollida kuidas Max plaan API juurdepääsu annab ja seadistada vastavalt.

## Mahu ja rate limit'ide kalkulatsioon

### Token'id per vestlus

| Komponent | Input tokens | Output tokens | Kokku |
|-----------|-------------|---------------|-------|
| Claudia (Haiku) — 1 sõnum | ~2000 (system + kategooriad + tool) | ~500 | ~2500 |
| Claudia — vestlus 3 sõnumit | ~6000 | ~1500 | ~7500 |
| Spetsialist (Sonnet) — 1 eskaleerimine | ~4000 (vestlus + specs) | ~800 | ~4800 |
| Tool call: search_products | ~100 in + ~600 out (6 toodet) | — | ~700 |
| Tool call: get_product_details | ~100 in + ~2000 out (specs) | — | ~2100 |

**Tüüpiline vestlus (3-4 sõnumit, 1 eskaleerimine):** ~15 000 tokenit kokku

### Mahuprognoos

| Stsenaarium | Vestlusi/päev | Tokenit/päev | Tokenit/kuu |
|-------------|---------------|--------------|-------------|
| Algus (vähe liiklust) | 10-20 | 150K-300K | 4.5M-9M |
| Keskmine | 50-100 | 750K-1.5M | 22M-45M |
| Kõrghooaeg | 200-500 | 3M-7.5M | 90M-225M |

### Max plaani rate limit'id (kontrollida!)

- Max plaani täpsed rate limit'id tuleb kontrollida — RPM (requests per minute) ja TPM (tokens per minute)
- Haiku on kiirem ja odavam, seega Claudia vestlused ei tohiks kitsaskohaks olla
- Sonnet'i eskaleerimine on harvem (~20-30% vestlustest) ja aeglasem
- Kui rate limit lööb vastu: queue + retry loogika API route'is

### Kuluefektiivsus

- Max kuumaks vs API hinnad: kui >50 vestlust/päevas, on Max selgelt soodsam
- Haiku esimene tase hoiab Sonnet'i kasutuse madalal
- Kliendihaldur (Phase 2) ja turundusosakond (tulevikus) mahuvad samasse plaani

---

## Selle sessiooni skoop

### Ehitatakse
1. `/api/ai-chat` route — SSE streaming, Anthropic SDK, tool use
2. Claudia agent — system prompt, MeiliSearch tool, eskaleerimisloogika
3. Tootespetsialist agent — system prompt, specs tool, kategooria kontekst
4. AiSearchPalette UI — vestlus, streaming, tootekaardid, agendi vahetus
5. Quick actions tööle

### EI ehitata
- Ärikliendihaldur (Phase 2)
- Vestlusajaloo salvestamine serveris
- Kasutaja autentimine AI vestluses
- Lehtede alumised soovitusread (eraldi ülesanne, kui aega jääb)

---

## Sõltuvused

- `@anthropic-ai/sdk` — Anthropic TypeScript SDK (lisada storefront package.json)
- Claude Max tellimuse auth token — seadistada .env ja PM2 ecosystem config
- Olemasolev MeiliSearch infrastruktuur (juba töötab)
- Olemasolev `/api/product/[handle]` route (juba töötab)
