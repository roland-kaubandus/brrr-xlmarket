# #24 LASTEKAUBAD KOMBINEERITUD LUKK (10 GRAB) — LUKUSTATUD

**2026-07-09 · taxonomy-v4 3eb8f653.** Backup: backup-20260710-005017-lastekaubad2.sql. Meie enda võlg (main ehitati enne judge-tööriista).

## TEOSTATUD — 9 uut L3 · 6 rename · 2 move
| GRAB | reegel | tulem |
|---|---|---|
| Õppemänguasjad(16) | ERI TÜÜP ×3 | UUS Tegevustahvlid(5)·Kuulirajad(4)·Mootori-mänguasjad(→) + jää 3 |
| Tööpingid(8) | ERI TÜÜP | mootor→Mootori-mänguasjad(8, +Õppe 4) · jää Laste tööpingid(4) |
| Valgusmõõgad+relvad(10) | ERI TÜÜP | UUS Mänguvibud(3) · jää Valgusmõõgad(7) |
| Kiiged+kiikhobud(30) | ERI TÜÜP ×2 | UUS Kiikhobud(5)·Kiikautud(6) · jää Kiiged(19) |
| Muusika(15) | ERI TÜÜP ×2 | UUS Tantsumatid(3, ≠instrument)·Trummikomplektid(7) · jää Klaverid(5) |
| Liiva+vee(9) | ERI TÜÜP | UUS Veelauad(3) · jää Liivakastid(6) |
| Mänguväljakud(5) | **DUP-VÄRAV** | 2 playground→Ronimismänguasjad · jää Libamäed(3) |
| Mänguautod(7) | **DUP-VÄRAV** | 3 rongilaud→Mängu- ja tegevuslauad · jää 4 rongikompl |

## REKURSIIVNE JÄÄK-KONTROLL (uus reegel)
Split-jäägid → judge: **CLEAN peale Muusika teist splitti** (trummid/klaverid). 12→ kõik CLEAN.
**KEEP (FLAG, seotud/thin):** Kunstitarvikud(molbert+värvid=seotud) · Õppemänguasjad-jääk(globe+detektor, thin) · Reisikohvrid(luggage variant).

## Eksklusiivsus: kõik tooted eksklusiivselt laste → #24 (0 cross-main).
## LÕPP: inv 0 FAIL · distinct 17425 (0 kadu) · L3 1619→1628 (+9). #24 nüüd judge-CLEAN.
