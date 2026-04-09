# WO-CODEX-001: Tootenimetuste ja kirjelduste kvaliteettõlge EN→ET

> **Prioriteet:** Kõrge
> **Assignee:** Codex
> **Reviewer:** Risto / Claudia
> **Projekt:** XLM (Huly)
> **Kuupäev:** 2026-04-09

---

## Taust

xlmarket.eu müüb VEVOR professionaalseid seadmeid Eesti turule. Tooteandmed tulevad VEVOR XLSX feedist inglise keeles (~16 046 toodet). Osad on tõlgitud Google Translate'iga (`translate-products.mjs`), mis annab masinlikke tulemusi. **Kõik tootenimetused ja kirjeldused vajavad kvaliteetset, SEO-sõbralikku eestikeelset tõlget.**

---

## Eesmärk

1. **Tõlkida KÕIK ~16 000 tootenimetust** (title) loomulikku eesti keelde
2. **Tõlkida KÕIK tootekirjeldused** (description) informatiivselt ja müüvalt
3. **Tõlkida KÕIK selling points** (metadata selling_point_1…5) — lühidad, löövad
4. **Parandada MeiliSearch otsingutulemused** — eestikeelsed sünonüümid ja terminid
5. **SEO optimeerimine** — loomulikud eestikeelsed fraasid, mida klient otsiks Google'ist

**Sa teed kogu tõlketöö ise. See on suur töö — ~16 000 toodet. Tee seda batch-kaupa, kategooria haaval, kuni KÕIK on tehtud.**

---

## Ligipääs

### Andmebaas (otse)

```
DATABASE_URL=postgres://xlmarket:xlmarket_pg_2026_secure@localhost:5435/xlmarket
```

```sql
-- Tõlkimata toodete arv
SELECT count(*) FROM product WHERE deleted_at IS NULL AND (metadata->>'translated' IS NULL OR (metadata->>'translated')::boolean = false);

-- Tõlkimata tooted batch kaupa (100 korraga, kategooria järgi grupeeritud)
SELECT id, title, description, metadata->>'selling_point_1' as sp1, metadata->>'selling_point_2' as sp2,
       metadata->>'selling_point_3' as sp3, metadata->>'selling_point_4' as sp4, metadata->>'selling_point_5' as sp5,
       metadata->>'vevor_product_type' as product_type
FROM product
WHERE deleted_at IS NULL AND (metadata->>'translated' IS NULL OR (metadata->>'translated')::boolean = false)
ORDER BY metadata->>'vevor_product_type', title
LIMIT 100;
```

### Medusa Admin API

```
MEDUSA_URL=http://127.0.0.1:9001
ADMIN_EMAIL=tarmo@xlmarket.eu
ADMIN_PASS=XlmAdmin2026
```

```bash
# Login → Bearer token
curl -s -X POST http://127.0.0.1:9001/auth/user/emailpass \
  -H "Content-Type: application/json" \
  -d '{"email":"tarmo@xlmarket.eu","password":"XlmAdmin2026"}' | jq -r '.token'

# Toote uuendamine
curl -X POST http://127.0.0.1:9001/admin/products/{id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{"title":"...","description":"...","metadata":{...}}'
```

### Olemasolevad skriptid referentsiks

- `backend/src/scripts/translate-products.mjs` — Medusa API auth flow, batch töötlemine
- `backend/src/scripts/translate-claude.mjs` — DB otseühendus, metadata update SQL
- `backend/scripts/index-meilisearch.mjs` — MeiliSearch re-index pärast tõlget

---

## Töö käik

### Faas 1: Proovibatch (esimesed 50 toodet)

1. Loe 50 tõlkimata toodet DB-st, grupeeritud `vevor_product_type` järgi
2. Tõlgi title + description + selling_point_1…5
3. Salvesta `original_title` ja `original_description` metadata-sse
4. Kirjuta tõlked DB-sse (Medusa API või otse SQL)
5. Märgi `metadata.translated = true`
6. **PEATA ja raporteeri** — Risto vaatab üle enne jätkamist

### Faas 2: Bulk-tõlge (ülejäänud ~16 000)

7. Jätka sama protsessiga, 100-kaupa, `vevor_product_type` järgi grupeeritult
8. Iga 500 toote järel tee spot-check: vaata 10 juhuslikku tõlget
9. Jätka kuni `untranslated = 0`

### Faas 3: MeiliSearch + cache

10. `node backend/scripts/index-meilisearch.mjs` — et otsing uueneks
11. `rm -rf storefront/.next/cache/fetch-cache` + restart storefront
12. Verifitseeri 5-10 tootelehte xlmarket.eu peal

---

## Kuhu tõlge läheb (DB update)

### Medusa API variant

```bash
curl -X POST http://127.0.0.1:9001/admin/products/{id} \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "VEVOR Tööstuslik Hakklihamasin 550W",
    "description": "Võimas 550W vaskmootori ja roostevabast terasest lõikeketastega hakklihamasin...",
    "metadata": {
      "original_title": "VEVOR Commercial Meat Grinder 550W",
      "original_description": "Powerful 550W...",
      "selling_point_1": "Võimas mootor: 550W vaskmootor tagab tugeva jahvatusjõu",
      "selling_point_2": "Roostevaba teras: Toiduohutud materjalid, lihtne puhastada",
      "translated": true
    }
  }'
```

### Otse-SQL variant (kiirem bulk'i jaoks)

```sql
UPDATE product SET
  title = 'VEVOR Tööstuslik Hakklihamasin 550W',
  description = 'Võimas 550W vaskmootori ja roostevabast terasest...',
  metadata = metadata
    || jsonb_build_object(
      'original_title', title,
      'original_description', description,
      'selling_point_1', 'Võimas mootor: 550W vaskmootor...',
      'translated', true
    ),
  updated_at = NOW()
WHERE id = 'prod_xxx';
```

**TÄHTIS:** `original_title` ja `original_description` salvesta ENNE ülekirjutamist (kasuta praegust `title` väärtust).

---

## Tõlkereeglid

### Tootenimetused (title)

1. **VEVOR** brändinimi jääb ALATI muutmata
2. **Tehniline täpsus** — wattide, mõõtmete, mahutavuse numbrid jäävad samaks
3. **Loomulik eesti keel** — mitte sõnasõnaline tõlge
4. **Lühike ja selge** — max ~80 tähemärki
5. **SEO-fraasid** — kasuta sõnu mida eestlane Google'isse toksiks

**Näited (hea vs halb):**

| EN title | ❌ HALB | ✅ HEA |
|----------|--------|--------|
| VEVOR Commercial Meat Grinder 550W | VEVOR Kaubanduslik Liha Veski 550W | VEVOR Tööstuslik Hakklihamasin 550W |
| VEVOR Electric Food Dehydrator 10 Trays | VEVOR Elektriline Toidu Dehüdraator 10 Salve | VEVOR Toidukuivati 10 Riiuliga |
| VEVOR Stainless Steel Work Table 48x24" | VEVOR Roostevaba Teras Töölaud 48x24" | VEVOR Roostevabast Terasest Töölaud 122×61 cm |
| VEVOR Diesel Air Heater 8KW | VEVOR Diisli Õhu Soojendi 8KW | VEVOR Diiselküttega Õhksoojendaja 8kW |
| VEVOR Boat Trailer Guide Poles 48" | VEVOR Paadi Treileri Juhendpoolused 48" | VEVOR Paaditreileri Juhtsõrmed 122 cm |

**Mõõtühikud:** Tollid → sentimeetrid (1" = 2.54 cm), kui kontekstis loomulikum. Watts, kg, liitrid jäävad.

### Kirjeldused (description)

1. **Informatiivne ja müüv** — mitte lihtsalt tõlge, vaid Eesti kliendile suunatud
2. **HTML märgendid säilita** — `<br>`, `<strong>` jne
3. **Ära korda pealkirja** — kirjeldus peaks andma lisainfot
4. **Maini kasutuskonteksti** — "Sobib restoranidele, catering-firmadele ja lihatööstusele"
5. **Lisa sünonüüme** — kui title on "hakklihamasin", siis description maini ka "lihamasin" (SEO + MeiliSearch)

### Selling points (selling_point_1…5)

1. **Formaat säilita:** "Pealkiri: Selgitus"
2. **Pealkiri lühike ja löök** — max 3-4 sõna
3. **Selgitus konkreetne** — numbrid, materjalid, kasutegur

**Näide:**
- EN: "Powerful Motor: 550W copper motor provides strong grinding force for commercial use"
- ET: "Võimas mootor: 550W vaskmootor tagab tugeva jahvatusjõu professionaalseks kasutuseks"

---

## SEO + MeiliSearch kaalutlused

### Miks see oluline on

Google.ee otsingutulemused sõltuvad eestikeelsetest märksõnadest. Kui toote pealkiri on "VEVOR Commercial Meat Grinder", siis eestlane kes otsib "hakklihamasin" EI LEIA seda toodet.

MeiliSearch indekseerib `title` ja `description` väljad. Eestikeelsed sünonüümid kirjelduses = parem otsing.

### Mida silmas pidada

1. **Title = peamine SEO signaal** — kasuta sõnu mida otsitakse
2. **Sünonüümid kirjeldusse** — "hakklihamasin" title'is, "lihamasin / lihaveski" kirjelduses
3. **Valdkonnasspetsiifilised terminid:**
   - Kitchen/catering: suurköök, professionaalne köök, catering, HoReCa
   - Construction: ehitus, remont, tööstus
   - Marine: paat, meri, laev, veesõiduk
   - Garden: aed, haljastus, maastik
4. **Pikksaba-fraasid kirjeldusse:** "roostevabast terasest töölaud restorani köögis" > "töölaud"

---

## Konsistentsusreeglid

**Sama tooteliik = sama termin ALATI.** Ära kasuta vaheldumisi erinevaid sõnu:

| EN termin | ET standard | Alternatiivid (kirjeldusse OK) |
|-----------|-------------|-------------------------------|
| Meat Grinder | Hakklihamasin | lihamasin, lihaveski |
| Food Dehydrator | Toidukuivati | dehüdraator, kuivatusmasin |
| Work Table | Töölaud | tööpink, laud |
| Air Heater | Õhksoojendaja | soojapuhur, kütteseade |
| Pressure Washer | Survepesur | kõrgsurvepesumasin |
| Generator | Generaator | elektrigeneraator, diiselgeneraator |
| Winch | Vints | elektrivints |
| Hydraulic Jack | Hüdrauliline tungraud | tungraud |
| Welding Machine | Keevitusaparaat | keevitusmasin |
| Chainsaw | Kettsaag | mootorsaag |

**Lisa seda tabelit jooksvalt kui uusi tooteliike ette tuleb.**

---

## Skoop ja piirangud

- **TÕLGI:** title, description, selling_point_1…5
- **ÄRA TÕLGI:** rich_description (HTML piltidega), handle (URL slug), SKU, UPC, mõõtmete väärtused
- **ÄRA MUUDA:** hinnastamist, kategooriaid, pilte, variante, muid metadata välju
- **ÄRA KUSTUTA:** ühtegi metadata välja — ainult lisa/uuenda
- **SALVESTA ALATI:** original_title + original_description enne ülekirjutamist
- **ESIMESED 50:** → Risto review → ALLES SIIS bulk

---

## Pärast tõlget

1. **MeiliSearch re-index:** `node backend/scripts/index-meilisearch.mjs`
2. **Next.js cache clear:** `rm -rf storefront/.next/cache/fetch-cache` + restart storefront
3. **Verifitseeri:** ava xlmarket.eu ja kontrolli 5-10 tootelehte eri kategooriatest
4. **Raporteeri:** mitu toodet tõlgitud, mitu jäi, spot-check tulemused

---

## Edaspidi (POLE selle WO skoop)

- `rich_description` HTML tõlge (keeruline, pildid sees)
- MeiliSearch sünonüümide konfigureerimine
- Kategooriate nimede tõlge
- en.json / et.json UI stringide audit
