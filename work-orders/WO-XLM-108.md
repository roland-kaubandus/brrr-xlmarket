# WO-XLM-108: Topeltpiltide eemaldamine rich text kirjeldustest
**Created:** 2026-04-09
**Author:** Cowork
**Assignee:** CC (XL agent, VPS)
**Priority:** P2
**Status:** TODO
**Detailne plaan:** `/SOLUTION-IMAGES.md`

---

## PROBLEEM

VEVOR feed'i `description_html` sisaldab `<img>` tage samade piltidega mis on juba galeriis (`goods_original_picture`, `image_link1`). Tulemus: **sama pilt ilmub tootelehel 2 korda** — üks kord galerii karrusellis ja teine kord kirjelduse tekstis.

Lisaks on osade toodete galeriis **väikesed/thumbnail pildid** originaalide asemel.

---

## EESMÄRK

1. Eemaldada rich text HTML-ist need `<img>` tagid mille URL kattub galerii piltidega
2. Säilitada unikaalsed rich text pildid mis EI ole galeriis (nt mõõtude diagrammid)

---

## LAHENDUS: Import-time filtering (SOOVITUSLIK)

Puhastame pildid **importimisel**, mitte frontendis. See on parem sest:
- Puhas data DB-s, pole vaja iga renderil filtreerida
- Üks koht kus loogika elab (import script)
- Vähem client-side tööd

### 1. URL normaliseerimise funktsioon

VEVOR CDN URL-id on tihti %-encoded ja varieeruvad formaadis. Vaja on normaliseerida enne võrdlemist:

```javascript
function normalizeImageUrl(url) {
  if (!url) return ''
  let norm = decodeURIComponent(url.trim())
  // Eemalda protocol
  norm = norm.replace(/^https?:\/\//, '')
  // Eemalda query string ja fragment
  norm = norm.replace(/[?#].*$/, '')
  // Eemalda trailing slash
  norm = norm.replace(/\/+$/, '')
  return norm.toLowerCase()
}
```

### 2. Rich text piltide filtreerimine

```javascript
function cleanRichDescription(html, galleryUrls) {
  if (!html || !galleryUrls?.length) return { html, removed: 0 }
  
  // Normaliseeri galerii URL-id set'iks
  const gallerySet = new Set(galleryUrls.map(normalizeImageUrl))
  
  let removed = 0
  // Leia kõik <img> tagid ja kontrolli src
  const cleaned = html.replace(/<img\s+[^>]*src\s*=\s*["']([^"']+)["'][^>]*\/?>/gi, 
    (match, src) => {
      const normSrc = normalizeImageUrl(src)
      // Kontrolli kas img src kattub mõne galerii URL-iga
      // Kasuta "includes" mõlemas suunas — CDN URL-id võivad olla lühemad/pikemad
      for (const gUrl of gallerySet) {
        if (normSrc.includes(gUrl) || gUrl.includes(normSrc)) {
          removed++
          return '' // Eemalda duplikaat
        }
      }
      return match // Säilita unikaalne pilt
    }
  )
  
  // Puhasta tühjad <p></p> tagid mis jäid pärast pildi eemaldamist
  const final = cleaned.replace(/<p>\s*<\/p>/gi, '')
  
  return { html: final, removed, totalGalleryImages: galleryUrls.length }
}
```

### 3. Integratsioon import-vevor-feed.mjs (~rida 300-315)

```javascript
// ENNE product payload loomist:
const galleryImgs = row.originalImages.length > 0 
  ? row.originalImages : row.galleryImages
const cleanResult = cleanRichDescription(row.richDescriptionHtml, galleryImgs)

// Kasuta puhastatud HTML-i metadata-s:
metadata: {
  // ...
  rich_description: cleanResult.html.slice(0, 15000),
  // ...
}
```

### 4. Statistika logimine

Lisa import lõppu kokkuvõte:
```
Image deduplication summary:
  Gallery images scanned:    2847
  Duplicates removed:        1423
  Dedup ratio:               50.0%
```

---

## ACCEPTANCE CRITERIA

- [ ] Galerii pildid EI kordu rich text kirjelduses
- [ ] Unikaalsed rich text pildid (mõõtude diagrammid jne) SÄILIVAD
- [ ] URL normaliseerimine käsitleb %-encoding erinevusi
- [ ] Tühjad `<p></p>` tagid puhastatakse pärast pildi eemaldamist
- [ ] Import logib mitu duplikaati eemaldati
- [ ] Olemasolevate toodete update ka puhastab pilte
- [ ] Rich text ilma piltideta ei lõhu midagi (edge case)

---

## KONTROLLIMINE

### 1. Import-aegne kontroll
Jooksuta import dry-run ja kontrolli logist:
```bash
node scripts/import-vevor-feed.mjs 2>&1 | grep -i "dedup\|removed\|image"
```

### 2. DB kontroll (pärast importi)
```sql
-- Kontrolli kas rich_description sisaldab veel galerii URL-e
SELECT p.id, p.title,
  (SELECT COUNT(*) FROM regexp_matches(
    p.metadata->>'rich_description', 
    '<img[^>]+src="([^"]+)"', 'g'
  )) as img_count
FROM product p
WHERE p.metadata->>'rich_description' LIKE '%<img%'
ORDER BY img_count DESC LIMIT 20;
```

### 3. Frontend kontroll
1. Ava toode mille kirjelduses olid duplikaatpildid
2. Scrolli "Toote kirjeldus" sektsiooni
3. Kontrolli: pildid mis on galeriis EI kordu kirjelduses
4. Kontrolli: mõõtude diagrammid ja muud unikaalsed pildid ON alles
5. DevTools → Network tab → kontrolli et sama pilti ei laeta 2x

### 4. Enne/pärast võrdlus
```sql
-- Salvesta enne importi:
SELECT id, length(metadata->>'rich_description') as desc_len,
  (metadata->>'rich_description')::text ~ '<img' as has_images
FROM product WHERE metadata->>'rich_description' IS NOT NULL
LIMIT 10;

-- Pärast importi peaksid desc_len olema väiksemad
```

---

## VIITED

- Täielik tehniline plaan: `/SOLUTION-IMAGES.md`
- Import script: `/scripts/import-vevor-feed.mjs` (read ~195-215, metadata ~300-315)
- Sanitizer: `/storefront/lib/sanitize.ts`
- Toote leht: `/storefront/app/[locale]/toode/[handle]/page.tsx` (~rida 210-228, 472-478)
- Galerii komponent: `/storefront/components/ProductGallery.tsx`
