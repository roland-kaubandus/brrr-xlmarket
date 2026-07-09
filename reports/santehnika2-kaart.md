# SANTEHNIKA LUKK #2 (kesk-kindlus) — LUKUSTATUD

**2026-07-09 · taxonomy-v4 aee615f5.** Backup: backup-20260709-204748-santehnika2.sql. VARIANT vs ERI TÜÜP reegel rakendatud.

## TEOSTATUD (6 uut L3 · 5 rename)
| Allikas (kesk) | reegli-otsus | tulem |
|---|---|---|
| Korsten (28) | ERI TÜÜP | Korstnapühkimise komplektid(23) + UUS Korstnamütsid & -katted(5) |
| Kliimakatted (22) | ERI TÜÜP | Kliimaseadme katted(17) + UUS Kliimaseadme torukatted(5) |
| Ventilatsioonivõred (16) | ERI TÜÜP | Seina ventilatsioonivõred(8) + UUS Tagasivooluõhu filterrestid(8) |
| Õhupuhastid+filtrid (15) | ERI TÜÜP | Õhupuhastid(8+2 intra=10) + UUS Osoonigeneraatorid(3) + UUS Õhufiltrid & varufiltrid(4) |
| **Gravit. veefiltrid (10)** | **VARIANT** | **JÄÄB** (süsteemid+kannud = sama funkts, eri vorm) |
| Õhuniisutajad ja jahutid (6) [SAMM2] | ERI TÜÜP | Õhuniisutid(3) + UUS Õhujahutid(3) |
| Lae- ja seinaventilaatorid (9) [SAMM2] | **VARIANT** | **JÄÄB** (sama funkts, eri paigaldus) |

**Intra-kesk (3):** 2× HVAC-puhasti Kanalvent→Õhupuhastid · 1× tornvent Põranda-kaasask→Tornventilaatorid.

## Kontrollid: inv 0 FAIL · harness POST 🟢 PASS · distinct 17425 (0 kadu) · L3 1600→1606 · 0 orb/dead/dup.

## FLAG järgmiseks (inkrementaalne judge leidis naabrites, väljaspool skoopi):
- **Kanalventilaatorid (14):** 5 tööstus-puhurit → Tööstuslikud ventilaatorid · inline vs portable split.
- **Põranda- ja kaasaskantavad ventilaatorid (29):** misting+air-movers+pjedestaal segu (lukk#1 laiuse-otsus) — kaalu split.
