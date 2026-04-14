# Ikoonilised kategooriapildid — Disain

> Kuupaev: 2026-04-14

## Eesmark

Iga ~2000 kategooria saab kaks professionaalse tootepildi suurust (Amazon-stiilis: uks ese, valge taust, aratuntav ka pisipildina).

- `cat-icons/80/{handle}.webp` — 80x80 pisipilt (kategooriapuu, menyy)
- `cat-icons/400/{handle}.webp` — 400x400 medium (esileht, tulemused)

## Andmeallikas

- **Primaarne:** MeiliSearch otsing kategooria nime jargi -> VEVOR CDN tootefoto URL
- **Fallback:** nano-banana AI-genereerimine (ainult L1-d, kus MeiliSearch'ist ei leia sobilikku pilti)

## Kategooriate struktuur

| Tase | Arv |
|------|-----|
| L1 | 31 |
| L2 | 250 |
| L3 | 942 |
| L4 | 777 |
| L5+ | ~400 |
| **Kokku** | **~2400** |

## Meeskond ja toovoog

### 1. Kategooriate jaotamine (XL orkestraator)

Koik kategooriad L1->L7 jagatakse 5 osaks, iga osa ~400-500 kategooriat.

### 2. Otsinguagendid (5 paralleelset)

Iga agent:
1. Saab oma partii kategooriaid (handle + name)
2. Iga kategooria kohta:
   - MeiliSearch query: kategooria nimi
   - Filter: `category_handles = "{handle}"`
   - Top 10 tulemust
   - Hindab iga pildi URL-i ja valib parima
3. Valjund: JSON `{handle, name, imageUrl, score, reason}`

### 3. Review agent (1 agent)

Hindab koiki valitud pilte 5 kriteeriumiga (0-10 skaala):

| # | Kriteerium | Labi (>= 6) | Ei labi (< 6) |
|---|-----------|-------------|---------------|
| 1 | Valge/puhas taust | Puhas valge voi vaga hele | Segane, varviline, stseenifoto |
| 2 | Uks selge ese | Uks toode, keskne | Mitu toodet, komplekt |
| 3 | Aratuntav 80x80 juures | Selge siluett | Pisikesed detailid kaovad |
| 4 | Esindab kategooriat | Tuupiline, ikooniline toode | Nissitoode, lisatarvik |
| 5 | Uhtlane valgustus | Stuudiolik, uhtlane | Tugevad varjud, uleeksponeeritud |

- Keskmine skoor >= 6 -> laeb edasi tootlemisse
- Keskmine skoor < 6 -> tagasi otsinguagendile (max 2 retryt)
- Parast 2 retryt -> nano-banana fallback (ainult L1)

### 4. Tootlemisagendid (paralleelsed)

1. Laeb originaalpildi VEVOR CDN-ist
2. sharp resize:
   - 400x400 WebP (quality 85, fit: contain, valge taust)
   - 80x80 WebP (quality 80, fit: contain, valge taust)
3. Salvestab: `storefront/public/cat-icons/400/` ja `cat-icons/80/`
4. Uuendab manifest.json

### 5. Nano-banana fallback

- Ainult L1 kategooriad, kus skoor < 6 parast 2 retryt
- Prompt: "iconic {category name} product, white background, studio lighting, single object, product photography, clean minimal"
- Resize samadesse suurustesse

## Too jarjekord

1. **L1** (31 kategooriat) — koigepealt, sest need on koige nahtavamad
2. **L2** (250) -> **L3** (942) -> **L4** (777) -> ulejaanud
3. Iga tase laheb labi kogu pipeline'i (otsing -> review -> tootlemine)

## Failide struktuur

```
storefront/public/cat-icons/
  80/
    {handle}.webp          (80x80, ~2-5KB)
  400/
    {handle}.webp          (400x400, ~15-30KB)
  manifest.json            {handle: {sm: "/cat-icons/80/...", md: "/cat-icons/400/..."}}
```

## Tehniline detail

- **Worktree:** Kogu too tehakse eraldi git worktree's (`category-icons` branch)
- **MeiliSearch:** localhost:7700, index: `products`
- **sharp:** Node.js image processing (juba installitud)
- **Formaat:** WebP molemas suuruses
- **Manifest:** JSON fail, mis mapib handle -> {sm, md} URL-id
- **Olemasolev cat-thumbs/:** Jaab alles, uus susteem on eraldi `cat-icons/` kaustas

## Integreerimine (tulevikus, eraldi PR)

- MegaMenu.tsx: asenda `cat-thumbs` -> `cat-icons/80`
- Featured categories: asenda -> `cat-icons/400`
- Kategoorialehed: kasuta `cat-icons/400` headeris
- Esilehe bento grid: kasuta `cat-icons/400`
