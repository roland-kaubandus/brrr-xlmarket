# Lünk B — Duplikaat-handle kaart (2026-08-25)

> **Read-only kaardistus. Ei paranda — Tarmo otsustab koristuse.**

## 1. MUSTER — mis need 363 on

Mitte "topelt-tooted", vaid **zombie soft-deleted kaksikud** ühest re-impordist:

| Fakt | Väärtus |
|---|---|
| published, `deleted_at IS NULL` (elus) | 18 382 |
| published, `deleted_at SET` (zombie) | **363** |
| Igal zombie'l elus handle-kaksik | **363 / 363** (0 orbu) |
| Tõelisi live-live duplikaate | **0** |

**Iga paar:** sama `handle` + **sama `vevor_sku`**, DELETED = vanem originaal, LIVE = uuem.

## 2. TEKE — üks sündmus, ei kordu

- **Kõik 363 live-kaksikut loodud `2026-04-19`.**
- **Kõik 363 vana soft-deletitud `2026-04-19`** (sama päev).
- **Järeldus:** üks re-import 2026-04-19 lõi iga SKU jaoks UUE toote (uus id, sama handle+SKU), soft-deletis vana — **AGA jättis vana `status='published'`** (unpublish ununes). Ühekordne, bounded, **ei ole korduv** (ükski soft-delete pärast 04-19).

## 3. SISU — kummal on (paari kohta)

| Muster | Gruppe |
|---|---|
| MÕLEMAL sisu | 203 |
| **ainult DELETED sisu (⚠ storefront tühi)** | **103** |
| ainult LIVE sisu (OK) | 36 |
| KUMMALGI pole sisu | 21 |

Storefront kuvab **LIVE** kaksikut (Medusa välistab soft-deleted). Probleem = **103 paari**, kus sisu jäi vana (deleted) külge, live tühi → ET-leht tühi.

## 4. TOPELT-ARVESTUS — EI OLE

| Kontroll | Tulem |
|---|---|
| Deleted-twin Meili's? | **0 hits** (välistatud) |
| Deleted-twin variandid | **kõik soft-deleted** (2/2) → laoseis/hind ei topeldu |
| Storefront kuva | ainult live-twin (Medusa filter) |

→ **Laoseis/hind ei topeldu, topelt-kuva pole.** Zombie on igal pool välistatud, ainult DB-s.

## 5. SALVAGE vs REGEN — regen on õige

103 "ainult-deleted-sisu" paari: **EN-title ERINEB live vs deleted kõigil 103-l** (re-import muutis EN-allikat). Vana ET genereeriti VANA EN pealt → kopeeri deleted→live oleks **vale sisu** (hash-guard regeneeriks niikuinii). → **Salvage POLE ohutu, REGEN kindlam.**

## 6. ⚠️ AVASTATUD BACKFILL-BUG (kulu-oluline)

`content-gen-run.mjs` (batch-backfill) valib `WHERE status='published'` — **PUUDUB `deleted_at IS NULL` filter** (rida 58, 91). Seetõttu backfill genereeris sisu ka zombie-twinidele:

| "Done" (content_gen_hash) | 13 356 |
|---|---|
| — neist ELUS (päris) | **13 050** |
| — neist **ZOMBIE (raisatud kulu)** | **306** (~306×$0.016 ≈ **~$4.9** raisku) |

**Mõju re-run'ile:** 57 zombie'l (363−306) hash=NULL → järgmine re-run raiskaks nende peale ka. **SOOVITUS: lisa `AND p.deleted_at IS NULL` content-gen-run.mjs päringutesse ENNE re-run'i** (väldi zombie-raiskamist + tagab et 5332 sihtmärk on ainult elusad).

## 7. RE-RUN TEGELIK SIHTMÄRK

**Elus published ilma sisuta = 5332** (mitte 5332+zombie). Kattub varasema 5332-arvuga → re-run sihib õigeid, kui backfill-bug fikseeritud.

---

## KORISTUS-VALIKUD (Tarmo otsustab)

**Merge EI ole vajalik** (0 tõelist live-dup'i; zombie igal pool välistatud). Kaks sõltumatut asja:

### A. Zombie-koristus (struktuur)
- **Ohutu hard-delete** kõik 363 zombie'd (juba soft-deleted, Meili-väline, variandid deleted) — puhas koristus, 0 riski.
- VÕI **jäta** — kahjutud (ainult DB-müra). Ei mõjuta poodi.
- **Soovitus:** unpublish/hard-delete 363 → DB puhas, tulevased handle-päringud üheselt.

### B. Sisu-lünk (103 + 21 = 124 elus-tühja)
- **Regen backfill'iga** (live-twinid, hash=NULL) — kattub 5332 re-run'iga (124 ⊂ 5332).
- **EELTINGIMUS:** paranda backfill-bug (§6) + töötav krediit.

**Järjekord:** (1) fix backfill deleted-filter → (2) re-run 5332 (katab 124 sisu-lünka) → (3) hard-delete 363 zombie'd.
