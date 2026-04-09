# WO-XLM-107: SPU-põhine variantide grupeerimine (import script)
**Created:** 2026-04-09
**Author:** Cowork
**Assignee:** CC (XL agent, VPS)
**Priority:** P1
**Status:** TODO
**Detailne plaan:** `/SOLUTION-VARIANTS.md`

---

## PROBLEEM

VEVOR feed sisaldab `goods_spu` välja mis grupeerib sama toote erinevad variandid (suurus, värv, maht jne). Praegu iga feed rida = eraldi toode Medusas, kuigi nad peaksid olema ÜHE toote variandid.

**Tulemus:** Klient näeb 5 eraldi toodet "Drill Kit Red", "Drill Kit Blue" jne, selle asemel et näha ühte toodet värvivalikuga.

---

## EESMÄRK

Muuta `scripts/import-vevor-feed.mjs` nii, et sama SPU-ga read luuakse ühe Medusa toote alla eraldi variantidena.

---

## LAHENDUS (kokkuvõte)

### 1. SPU grupeerimine (import-vevor-feed.mjs, ~rida 470-484)

Pärast feed ridade parsimist, enne Medusa API kutseid:

```javascript
// Group rows by SPU
const spuGroups = new Map()
for (const row of feedRows) {
  const key = row.spu || `__solo_${row.sku}` // null SPU = eraldi toode
  if (!spuGroups.has(key)) spuGroups.set(key, [])
  spuGroups.get(key).push(row)
}
```

### 2. Optsioonide eraldamine pealkirjadest

Sama SPU grupis olevate toodete pealkirjad erinevad tavaliselt lõpuosas (nt "... Red", "... 10-Piece").
Leia ühine prefiks → erinevus = variandi väärtus.

```javascript
function extractOption(rows) {
  if (rows.length === 1) return { name: "Default", values: ["Default"] }
  
  const titles = rows.map(r => r.title)
  // Leia ühine prefiks
  let prefix = titles[0]
  for (const t of titles.slice(1)) {
    while (!t.startsWith(prefix)) prefix = prefix.slice(0, -1)
  }
  prefix = prefix.replace(/[\s\-,]+$/, '') // Eemalda trailing separaatorid
  
  const values = titles.map(t => t.slice(prefix.length).trim() || "Standard")
  
  // Tuvasta optiooni nimi mustri järgi
  let optionName = "Variant"
  const sample = values[0].toLowerCase()
  if (/^\d+\s*(mm|cm|m|inch|ft|"|')/i.test(sample)) optionName = "Suurus"
  else if (/^\d+\s*(pcs?|piece|tk|set)/i.test(sample)) optionName = "Komplekt"
  else if (/^\d+\s*(ah|v|w|kw|hp)/i.test(sample)) optionName = "Võimsus"
  else if (/^(red|blue|green|black|white|silver|gold)/i.test(sample)) optionName = "Värv"
  
  return { name: optionName, values }
}
```

### 3. Medusa API payload muutmine (~rida 274-330)

```javascript
// Praeguse single-variant asemel:
const option = extractOption(spuGroup)
const primaryRow = spuGroup[0] // Esimene rida = peamine (pilt, kirjeldus)

const payload = {
  title: primaryRow.title.slice(0, prefix.length).trim(), // Ühine nimi
  // ... ülejäänud väljad primaryRow'st
  options: [{ title: option.name, values: option.values }],
  variants: spuGroup.map((row, i) => ({
    title: option.values[i],
    sku: row.sku,
    manage_inventory: true,
    allow_backorder: false,
    prices: [{ amount: Math.round(row.price * 1.15 * 100), currency_code: "eur" }],
    options: { [option.name]: option.values[i] },
  })),
  metadata: {
    ...primaryRow.metadata,
    vevor_spu: primaryRow.spu,
    variant_skus: spuGroup.map(r => r.sku).join(","),
  },
}
```

### 4. Olemasolevate toodete uuendamine

Dedup loogika peab muutuma SKU → SPU põhiseks:
- Kui SPU juba eksisteerib DB-s: uuenda variante (lisa puuduvad, uuenda hindu)
- Kui ei eksisteeri: loo uus toode kõigi variantidega

### 5. Frontend — MUUDATUSI EI VAJA

`ProductPurchasePanel.tsx` juba toetab variante:
- Filtreerib välja "Default" optsioonid (rida 46)
- Näitab variant selector nuppe (rida 100-150)
- Uuendab hinda/laoseisu valiku järgi (rida 63-70)

---

## ACCEPTANCE CRITERIA

- [ ] Sama SPU-ga read luuakse ÜHE toote alla variantidena
- [ ] Null/tühi SPU = eraldi toode nagu enne
- [ ] Iga variandil oma SKU, hind, laoseis
- [ ] Optsioonide nimed on mõistlikud (Suurus, Värv, Komplekt jne)
- [ ] Toote pealkiri on ühine osa (ilma variandi suffiksita)
- [ ] Frontend variant selector töötab (dropdown/nupud)
- [ ] Hind uueneb variandi valikul
- [ ] Laoseis näidatakse variandi kohta
- [ ] Re-import ei loo duplikaate (idempotentne)
- [ ] Dry-run mode töötab (logib mis teeks, ei muuda DB-d)

---

## KONTROLLIMINE

### SQL päringud (pärast importi)

```sql
-- Mitu varianti on toodetel?
SELECT p.id, p.title, COUNT(v.id) as variant_count
FROM product p JOIN product_variant v ON v.product_id = p.id
GROUP BY p.id, p.title
HAVING COUNT(v.id) > 1
ORDER BY variant_count DESC LIMIT 20;

-- SPU jaotus
SELECT metadata->>'vevor_spu' as spu, COUNT(*) as variants
FROM product
WHERE metadata->>'vevor_spu' IS NOT NULL AND metadata->>'vevor_spu' != ''
GROUP BY spu HAVING COUNT(*) > 1
ORDER BY variants DESC;

-- Optsioonid
SELECT po.title as option_name, COUNT(DISTINCT pov.value) as value_count
FROM product_option po
JOIN product_option_value pov ON pov.option_id = po.id
WHERE po.title != 'Default'
GROUP BY po.title ORDER BY value_count DESC;
```

### Frontend kontroll
1. Ava toode millel on mitu varianti
2. Kontrolli: variant selector nupud on nähtavad
3. Kliki erinevaid variante → hind ja laoseis muutuvad
4. Lisa ostukorvi → õige variant (SKU) lisatakse
5. Medusa Admin → toote detail → variandid nähtavad

### Edge case'id testida
- SPU grupp kus kõigil sama hind
- SPU grupp kus hindades suur vahe (nt 29€ vs 149€)
- SPU grupp 10+ variandiga
- Toode ilma SPU-ta (peab jääma single-variant)
- Re-import: olemasolevale tootele uue variandi lisamine

---

## VIITED

- Täielik tehniline plaan: `/SOLUTION-VARIANTS.md` (1000+ rida)
- Import script: `/scripts/import-vevor-feed.mjs`
- Frontend: `/storefront/app/[locale]/toode/[handle]/ProductPurchasePanel.tsx`
- Medusa types: `/storefront/lib/medusa.ts`
