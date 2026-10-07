# ETAPP 2 — PIIRIAUDIT: liigutuste + piirireeglite kaart

> Batch: `e2-20261007T115317` · koostatud 2026-10-07 · staging k33g · taxonomy-v4
> Tööriist: `scripts/etapp2-execute.mjs` · undo: `scripts/etapp2-undo.mjs e2-20261007T115317`

## Mida see lukk teeb

1. **63 toote liigutust** (26 klastrit) — AINULT **13 konsensuse paari** (Opus+Sonnet üksmeel). Range enamus, praegune kodu = hääl.
2. **29 piirireeglit** l3meta `description`-väljale (176 L3-käepidet) — 13 konsensus + 16 Fable-stabiilne. Öine kohtunik [4] loeb need LIVE DB-st → reeglid jõuavad kohe igaöisesse otsustamisse.
3. **EI kustutata ühtegi L3-e.** Tühi L3 = automaatselt peidetud, kahjutu (CLAUDE.md 2026-10-07 reegel).

## 275 → 63: vahe tõendiga (TINGIMUS täidetud)

Plaani algne "275 liigutust" oli **kõigi paaride** (konsensus+Fable-viik) toore liigutus-summa. Execute liigutab AINULT **konsensuse paare** (Fable-viigid = reegel-ainult, mitte liigutus — struktuurne otsus nõuab stabiilsust, HARD RULE #6).

| Kiht | Paare | move | keep | Rakendatud? |
|---|---|---|---|---|
| Konsensus (Opus+Sonnet) | 13 | 66 | 91 | ✅ JAH (63 rakendatavat) |
| Fable-viik | 21 | 209 | 177 | ❌ EI (reegel-ainult: 16 stabiilne kirjutab reegli, 5 signaal) |
| Kõik-eri-signaal | 2 | 0 | 33 | ❌ EI (signaal=33, puutumata) |
| **KOKKU** | **36** | **275** | **301** | |

**Konsensuse 66 → 63 rakendatavat, puuduv 3 seletus (summa = 66):**

- **63** — liigutatud (toode from-kodus olemas, sihtkoht kehtiv).
- **1** — `spu:16541` juba sihtkohas (ETAPP 1 järel; 0 toodet from-kodus).
- **1** — `spu:10157` variant mujal (from-kodus puudub).
- **1** — `spu:16599` sihtkoht-handle olematu DB-s (`v4-tooriistad-ja-tarvikud-hudraulika-agregaadid`) → skip, toode jääb kehtivasse from-kodusse (autovaruosad/hüdroagregaadid). Vt skip allpool.

## Aritmeetika (punkt 4): 197 klastrit / 576 toodet

- move 275 + keep 301 = **576** (kõik klastri-tooted).
- signaal 33 on keep-i ALAMHULK (kõik-eri paarid) — EI liideta eraldi. (Varasem 609 = topeltloendus, VALE.)
- klastreid kokku: 197.

## 1 skip — `spu:16599`

- ck=`spu:16599`, n=1, paar=`v4-autovaruosad-ja-tarvikud::v4-tooriistad-ja-tarvikud`
- Põhjus: handle olematu DB-s. Sihtkoht-handle `v4-tooriistad-ja-tarvikud-hudraulika-agregaadid` ei eksisteeri DB-s.
- Käitlus ÕIGE: toode jääb kehtivasse praegusesse kodusse (hüdroagregaadid). Analoogne `validateTargetHandles` case-3 (invalid_handle → keep, ohutu vaikimisi). Execute h2id-värav püüdis.

## Väravad (HARD RULE #6 — nähtavus + undo asendab eel-kinnituse)

- Backup: `product_category` + `product_category_product` pg_dump (affected scope) → `/opt/eumotors-tasks/reports/backups/`.
- Undo-fail: `reports/backups/etapp2-undo-e2-20261007T115317.json` (kirjeldused + liigutused tagasi).
- INV: `node scripts/inv-taxonomy.mjs` 0 FAIL (pre+post).
- lock-harness pre+post. Meili reindeks. Telegram-teade.
- Logi: `review_decision_log` bucket_type=`audit-move`/`audit-boundary-rule`, actor=`claude-code-test`.

## Olemas-sisu säilitus (2 L3)

- `v4-ladu-riiulid-restid-pika-materjali-hoiuriiulid` — olemas SEO/piirireegel SÄILIB, ETAPP2-reegel kirjutatakse ETTE (öine kohtunik loeb esimesed 400 tähemärki).
- `v4-ladu-riiulid-kaubaalused` — olemas SEO/piirireegel SÄILIB, ETAPP2-reegel kirjutatakse ETTE (öine kohtunik loeb esimesed 400 tähemärki).

## 63 liigutatud toote product_id (evidence-gate)

```
prod_01KPJXC97WT76YS1BKZWDG25PX
prod_01KNXX6SE7MV8ZJJ2NSWK0EW6A
prod_01KPJXCBGB3PC1BE11M1H450RX
prod_01KNXX6REPWWK2WHADWPK9JQBQ
prod_01KNXX6SE5052250PEQZSNMBY8
prod_01KNXXAZYENYVJ1SDWA0S1EBDD
prod_01KNXX9JPZWGDMGYX4RVSYFDY4
prod_01KNXXAPXVKBNTZP1PNR8BGYT7
prod_01KNXXB2KDQ2ZKG5WM6QQTV4SQ
prod_01KNXXQF0GM2QNHQ75P3J971GC
prod_01KPJXC4SGXPG9CJ1Z71580JS3
prod_01KNXXACZGQ6AACKG2W2DX1D80
prod_01KNXXAETCJ71S52SFPSER0D5J
prod_01KNXXAKB8E5YNCP7RZ80MGX8C
prod_01KNXXACZK2D6H9WQSG5VT85GS
prod_01KNXXAC35WG332EN9RB4VH3P0
prod_01KNXXAJF60NKV2K43Q6CQ8MB7
prod_01KNXXGFCX49KM6B6F69XQZ4JQ
prod_01KNXXADXJXPX4GFGM32ZE32KR
prod_01KNXXAESSZ6KKXAA1EBHVHK8A
prod_01KNXXAHJRTHBDEECVAMCJCC1M
prod_01KNXXT8WM0PB12XFDW6Y598DK
prod_01KNXXT9SZ55YCY5B8AJGS90ZA
prod_01KNXXAHJN2PAHATM7F8MX1R22
prod_01KNXXCSNN9VAXE0YHA342EVXZ
prod_01KNXXBF8SV5VQ0VE0NQ839SC4
prod_01KNXXBF8T0YT9GTN5CP9PX381
prod_01KNXXBF9JY8FQVTXY8APXV57Z
prod_01KNXXHJAE4FFQGSWGMQQF8QVK
prod_01KNXXMH2P3DX6GQGSRE9DC797
prod_01KPJVEJ4K24CX126MTB44GF95
prod_01KPJVEHY8GYCNZBHAK80R1BAW
prod_01KPJVEJRAHS5S254F3XFY4CRW
prod_01KPJVEJHHGWBQ78X0NGS2NN3J
prod_01KPJVEJYGE8XMT7MVT01CJ9TP
prod_01KPJVEJAYAWA3PH8Q3RHMQ2ZE
prod_01KNXXESKKQ26043H8ZQ97YH2D
prod_01KNXXESKME284177TC7EW1BCT
prod_01KNXXERPV55KY72T5ZVEMJ089
prod_01KNXXSMGE69Q8Y1T540NAAYCN
prod_01KPJVETPSC60W1MTBR2YFG1FD
prod_01KNXXA0AC01T80K2B9ZJXDKNE
prod_01KNXX9ZCRZBF9KVPP59TC3CRR
prod_01KNXX9ZCMHSKNC83YDT4TRM6E
prod_01KNXX6AEZMH46SNM9DMWAQZC7
prod_01KNXXPRD9W97FT218T3TCMBF7
prod_01KNXXSJSPKZVE4TYB6TC43XJP
prod_01KNXXS9PRAX0C50NRCSQNENH7
prod_01KNXXS9PNKGZT6X7QPMXRB6MD
prod_01KNXXS9PM2YENM7DCTWC8S1JK
prod_01KNXX6Z2Z2JW0JKWSSCGP7N01
prod_01KNXXBKQN16HAANK6Q7335Y39
prod_01KNXXNDZ5TGS7CHZA9MK67TP3
prod_01KNXX6DES1SHH70CDPT4BGEYW
prod_01KNXX65SMM0Y6AP5GZR1AV89P
prod_01KNXX6KSPYK1AC7452QQT008P
prod_01KNXXCQWYV4A8P8VVNK0E638M
prod_01KNXX7SJ8VNCCT626F8W6T972
prod_01KNXX7SJCSQ5K8M80DE8FN4PE
prod_01KPJXF1BSCHWBH4KMCY76E626
prod_01KNXXA7KFAG647TENSH9WV21S
prod_01KNXXKFNKC1SS5RXJFWCX2YRP
prod_01KNXXM9027ZG29SQBQC74JQFF
```

## 26 liigutatud klastrit (ck → from → to)

| ck | n | from | to |
|---|---|---|---|
| `spu:01529` | 11 | v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-terastrossid | v4-ehitus-remont-ja-varvid-aiad-varavad-ja-piirded-kaabel-ja-trosspiirded |
| `spu:10903` | 10 | v4-ehitus-laaduri-haakeseadmed-pallikahvlid-ja-kahvlid | v4-tooriistad-ja-tarvikud-tosteseadmed-ja-talid-kahveltostuki-lisaseadmed |
| `spu:15164` | 2 | v4-ehitus-remont-ja-varvid-tellingud-toestuspostid | v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-posti-eemaldajad |
| `spu:05792` | 1 | v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-terastrossid | v4-ehitus-remont-ja-varvid-aiad-varavad-ja-piirded-kaabel-ja-trosspiirded |
| `vpt:Material Handling > Hoists & Winches & Rigging > Support Pole` | 1 | v4-ehitus-remont-ja-varvid-tellingud-toestuspostid | v4-tooriistad-ja-tarvikud-tostmine-talid-trollid |
| `vpt:Automotive > Towing System > Tow Strap` | 3 | v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-koormarihmad | v4-autovaruosad-ja-tarvikud-pukseerimisseadmed-rataste-kinnitusrihmad-ja-kiilud |
| `spu:12485` | 1 | v4-autovaruosad-ja-tarvikud-hudraulika-pumbad-mootorid | v4-tooriistad-ja-tarvikud-kasitooriistad-hudraulilised-pressimistooriistad |
| `spu:13380` | 1 | v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-koormarihmad | v4-autovaruosad-ja-tarvikud-pukseerimisseadmed-rataste-kinnitusrihmad-ja-kiilud |
| `spu:16542` | 6 | v4-peoinventar-taimeseinad-ja-haljasseinad | v4-aed-ja-aiatehnika-l10-privaatsusekraanid-ja-kunsthekid |
| `spu:11778` | 4 | v4-aed-ja-aiatehnika-l7-aiapingid | v4-peoinventar-kokkupandavad-peotoolid |
| `spu:16541` | 1 | v4-peoinventar-taimeseinad-ja-haljasseinad | v4-aed-ja-aiatehnika-l10-privaatsusekraanid-ja-kunsthekid |
| `spu:10332` | 3 | v4-suurkoogiseadmed-koogivalamud-roostevabast-terasest-valamud | v4-santehnika-kute-ja-ventilatsioon-segistid-ja-valamud-koogivalamud |
| `spu:06349` | 1 | v4-santehnika-kute-ja-ventilatsioon-veepumbad-pinna-ja-iseimevad-pumbad | v4-suurkook-ollepruulimisseadmed |
| `spu:14513` | 1 | v4-suurkoogiseadmed-koogivalamud-roostevabast-terasest-valamud | v4-santehnika-kute-ja-ventilatsioon-segistid-ja-valamud-koogivalamud |
| `spu:15338` | 4 | v4-sport-mull-sporditelgid | v4-varjualused-telgid-ja-kasvuhooned-kuppel-mullitelgid |
| `vpt:Restaurant & Food Service > Venue Decoration > Marine Carpet` | 1 | v4-moobel-ja-sisustus-sisustusdekoor-vaibad | v4-sport-ja-vaba-aeg-veesport-ja-paadindus-paadiporandakatted |
| `spu:10876` | 1 | v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine-matkatoolid-ja-lamamistoolid | v4-aed-ja-aiatehnika-l7-aiakiiged-ja-vorkkiiged |
| `spu:14028` | 1 | v4-aed-ja-aiatehnika-l4-valipitsaahjud-ja-kupsetajad | v4-sport-ja-vaba-aeg-matkavarustus-ja-telkimine-telgipliidid-ja-matkapliidid |
| `spu:07932` | 2 | v4-autovaruosad-ja-tarvikud-hudraulika-pumbad-mootorid | v4-autovaruosad-ja-tarvikud-hudraulika-agregaadid |
| `vpt:Pumps > Hydraulic Pumps > Electric Driven Hydraulic Pump` | 1 | v4-autovaruosad-ja-tarvikud-hudraulika-pumbad-mootorid | v4-autovaruosad-ja-tarvikud-hudraulika-agregaadid |
| `spu:06920` | 1 | v4-tooriistad-ja-tarvikud-turva-ja-objektivarustus-lekke-ja-uleujutustorje | v4-aed-ja-aiatehnika-l3-uleujutuskaitse-kotid-ja-barjaarid |
| `vpt:Automotive > Fuel Transfer & Lubrication > Portable Fuel Tank` | 2 | v4-garaaziseadmed-olivahetus-ja-hooldus-kutusemahutid-ja-konteinerid-ratastega | v4-autovaruosad-ja-tarvikud-veoauto-tarvikud-kutusepaagid-ja-mahutid |
| `spu:10157` | 1 | v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-vintsid | v4-autovaruosad-ja-tarvikud-pukseerimisseadmed-kasivintsid |
| `spu:10158` | 1 | v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-vintsid | v4-autovaruosad-ja-tarvikud-pukseerimisseadmed-kasivintsid |
| `spu:12889` | 1 | v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-vintsid | v4-autovaruosad-ja-tarvikud-pukseerimisseadmed-kasivintsid |
| `vpt:Automotive > Towing System > Towing Winches` | 1 | v4-tooriistad-ja-tarvikud-tostmine-ja-kinnitamine-vintsid | v4-autovaruosad-ja-tarvikud-pukseerimisseadmed-kasivintsid |
