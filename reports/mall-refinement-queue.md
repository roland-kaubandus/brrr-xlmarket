# Spec-mallide refinement-järjekord

> Mallid, mis on tuletatud liiga vähesest tootearvust või mille väljad on nõrgad.
> **Tegevus:** kui tooteid koguneb (feed-kasv), tuleta mall UUESTI (`spec-extract-skus.mjs` derive-faas)
> ja üle-kirjuta `reports/spec-mallid/<handle>.json`. Seejärel re-ekstrakti mõjutatud tooted.

| Mall (handle) | Tuletatud | Probleem | Tegevus | Lisatud |
|---|---|---|---|---|
| `v4-sport-kalastus-kalapuunised` | 2 tootest | `kujund` väli segab cm/mm; `paadi_suurus` väli krabipüünisele ebasobiv (kalapüünis ≠ paat) | Re-tuleta kui ≥8 toodet; eemalda `paadi_suurus`, täpsusta `kujund` ühik | 2026-07-22 |

## Miks refinement, mitte kohe-parandus

Vähe-tootest tuletatud mall kajastab ainult nende 2 toote struktuuri — käsitsi parandus praegu
oleks oletus. Kui feed toob rohkem kalapüüniseid, annab derive-faas statistiliselt kindlama
väljakomplekti. Seni jääb mall kasutusse (2 toodet said spec'i), aga on **märgitud mitte-usaldusväärseks**.
