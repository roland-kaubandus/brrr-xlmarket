# Title-parandus-nimekiri (VEVOR strip erandid) — 2026-08-24

VEVOR-title-strip (`v4-staging/vevor-title-strip-migrate.sql`) jättis puutumata alljärgnevad,
sest strip teeks title'i katkiseks/segaseks. **Need vajavad KÄSITSI title-parandust** (tootenimi
puudu / trükiviga) — EI ole automaatselt strippitavad.

| # | product_id | Praegune title | Probleem | Soovitus |
|---|---|---|---|---|
| E1 | `prod_01KNXX8WWK90WXW59S0963A1AN` | `VEVOR 20` | Strip → `20`. Tootenimi PUUDU (tegelik toode: A-Frame Chalkboard Sign). Katkine title juba enne stripi. | Taasta õige tootenimi feedist/allikast, siis strip. |
| E2 | `prod_01KZSQTFBDJVZJ3G5JQXAVZDZN` | `VVEVOR 200W 12V Complete Solar Power Kit …` | Trükiviga `VVEVOR` (topelt-V). Robust-regex `^[Vv][Ee][Vv][Oo][Rr]` EI matchi (2. täht V≠E) → jäi puutumata. | Paranda `VVEVOR` → eemalda bränd käsitsi: `Complete Solar Power Kit …` |

## Kontekst
- Strip kate: **18278** toodet (robust-regex `^([Vv][Ee][Vv][Oo][Rr]([[:space:]]|NBSP)+)+`, kordumis-muster).
- 3 tootel oli bränd KAKS korda (`VEVOR VEVOR …` / `VEVOR Vevor …`) — kordumis-muster eemaldas mõlemad.
- E1 välistatud id järgi; E2 ei matchi regex'it → mõlemad ootavad käsitsi-parandust.
- Handle EI muutunud (0 redirect); bränd säilib (Meili facet brand:vevor + searchable brand_name + schema.org Product.brand).
- Rollback: `title_strip_backup_20260824` (18278 rida, old_title/new_title).
