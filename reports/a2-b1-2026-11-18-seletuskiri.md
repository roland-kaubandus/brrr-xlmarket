# A2-split partii `a2-b1-2026-11-18T1927` — seletuskiri

**Kuupäev:** 2026-11-18
**Olek:** 2 L3 JÄÄVAD live (läbisid granulaarsus- + INV-väravad). Audit backfill'itud.

## Mida commit `6b9bca87` TEGI ja mida MITTE

Commit `6b9bca87` on sõnumiga **"revert: A2-split p1/1 rollback a2-b1-2026-11-18T1927"**, aga see nimi on **eksitav**:

- **MIDA TEGI:** regenereeris SSoT (`category-tree.generated.json` + `outlet-labels.generated.json`).
  Diff oli AINULT `generated_at` ajatempel (`19:28:36` → `19:33:17`) — sisu ei muutunud.
- **MIDA EI TEINUD:** EI pööranud tagasi 2 loodud L3-d ega 11 toote sidumist.
  Regen luges DB-d, mis **ikka sisaldas** mõlemat L3-d, seega genereeritud puu kajastab neid
  siiani (`patarei-punktkeevitusaparaadid` + `golfiauto-kiirusekontrollerid` = 10 vastet failis).

## Miks nii läks (juurpõhjus)

Mootori `rollback()` ja [8/9] `review_decision_log` INSERT kasutasid **ühe korra** partii alguses
püütud DB-konteineri nime. Coolify deploy ([7/9]) recreate'is konteineri **uue timestamp-nimega**
→ vana nimega `docker exec` → `"No such container"` → FATAAL. Tagajärg:

1. Mootor viskas vea PEALE deploy'd → "rollback" käivitus, aga **sama aegunud nimega** → DB-taaste EI toiminud.
2. `review_decision_log` jäi **TÜHJAKS** (INSERT ei jõudnud käia).
3. Automaatne SSoT-regen (`6b9bca87`) luges DB-d, kus 2 L3 olid **endiselt sees** → "revert" ei revert'inud.

**Netotulemus:** 2 L3 + 11 toodet jäid live ja **järjepidevaks** (DB + puu + deploy kooskõlas). Nad
läbisid nii granulaarsus- kui INV-värava → neid **EI undo'ta** (kasutaja otsus 2026-11-18).

## Parandused (eraldi commit'id)

- `3905fd67` — mootor re-resolvib DB/MEDUSA/MEILI/SF konteinerid PEALE deploy'd (`let`, mitte `const`)
  → ei enam aegunud nime FATAALi ega vigast rollback'i.
- **See partii:** `review_decision_log` 2 kirjet backfill'itud (`meta.backfill=true`), undo-fail kehtiv
  (`node scripts/classifier-undo.mjs a2-b1-2026-11-18T1927 --dry` = 2 L3 · 11 toodet).
- `classifier-undo.mjs` CLI-parsimise viga parandatud (positsiooniline `<batch_id>` andis varem `undefined`).

## Ajalugu EI kirjutata ümber

`6b9bca87` jääb alles. See fail on ainult **tõene selgitus**, mitte revert ega force-push.
