# SANTEHNIKA LUKK #3 (2 FLAG, MAIN SULETUD) — LUKUSTATUD

**2026-07-09 · taxonomy-v4 0d4ee3bf.** Backup: backup-20260709-215626-santehnika3.sql.

## TEOSTATUD (2 uut L3 · 18 liigutust · 0 rename)
| FLAG | reegli-otsus | tulem |
|---|---|---|
| Põranda-kaasask (29) | ERI TÜÜP ×2 (jahutus≠mist≠kuivatus) | jäta 19 jahutus-ventilaatorit + **UUS** Udupihusti-ventilaatorid(6) + **UUS** Kuivatuspuhurid(4) |
| Kanalventilaatorid (14) | ERI TÜÜP (kanal≠portable) + DUP-VÄRAV | jäta 6 inline + 8 tsüklonpuhurit → **Tööstuslikud ventilaatorid**(26, olemas) |

**Dup-värav töötas:** Tööstuslikud ventilaatorid sisaldas juba "Portable Ventilator Cylinder Fan" → 8 sama-tüüpi sinna (0 uut L3).

## SANTEHNIKA LÕPLIK SEIS (3 lukku kokku)
- **13 uut L3** (lukk#1: 5 · #2: 6 · #3: 2). Kõik ERI-TÜÜP grab-bagid splititud, misfitid liigutatud.
- inv 0 FAIL · harness POST PASS · intra-QA 0 misfit · distinct 17425 (0 kadu) · L3 1595→1608.

## FLAG (granulaarsus — VARIANT-L3, jätsin reegli järgi terveks):
- **Tööstuslikud ventilaatorid (26):** portable+pedestal+drum+extractor (variant: sama funkts=tööstuslik õhk). Judge soovib vormi-splitti — Tarmo otsus.
- **Põranda-kaasask (19):** clip+desk+floor+pedestal personal-ventilaatorid (variant: sama funkts=jahutus). Judge soovib vormi-splitti — Tarmo otsus.
