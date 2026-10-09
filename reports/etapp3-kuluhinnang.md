# ETAPP 3 (40 uut L3) — kuluhinnang

> Koostatud 2026-10-08, **ümber arvutatud 2026-10-09** tegeliku kandidaatide arvu põhjal (Variant B task 4).
> Piir ajutiselt tõstetud: **XLM_SPEND_LIMIT_USD=600** (konsooli piir oli $350, tõstetud $600).
> Allikas: `scripts/classify-etapp3-create.mjs` (draiver) + `scripts/lib/l3-create-engine.mjs` (mootor, SAMA kui öine auto-create),
> `scripts/lib/l3-desc.mjs`, `scripts/lib/l3-gates.mjs`, `scripts/pipeline-neighbor-chain.mjs`, DRY-mõõtmised sessioonilogidest.

---

## Kandidaatide värskendus (52 → 40) — Variant B task 1–4 + granulaarsus-värav (2026-10-09)

| Samm | Arv | Selgitus |
|---|---:|---|
| audit new_l3 (2026-10-07) | **52** | `final_decision=new_l3` + `gate.allPass` |
| − live-DB MOOT | −1 | spu:13156 «Klaasijahutajad» — kõik tooted vahepeal (ETAPP1/2/naaber) mujale liigutatud |
| = KEEP | **51** | tooted endiselt currentL3-s või kodutud; 0 DUP, 0 NO_PARENT |
| − fold exact-name+L2 | −3 | «Mullivanni katted» (2→1), «Tuhaimejad» (2→1), «Kattemadratsid» (2→1) — sama nimi+L2 → üks L3, tooted liidetud |
| = distinct (fold järel) | **48** | |
| − near-dup merge (variant/subset, sama L2) | −3 | «Mullafreesid ja kultivaatorid» (absorbeeris mootorfreesid), «Antenni- ja satelliidikinnitused» (absorbeeris satelliitantenni kinn.), «Infusiooni- ja verevõtutoolid» (absorbeeris vereproovivõtutoolid) |
| = distinct (near-dup järel) | **45** | |
| − **🔎 GRANULAARSUS-VÄRAV** (spets §4 gate #8, suhteline — BUG-parandus) | **−5** | «Mullivanni katted» (13, →Basseinikatted), «Vaipplaadid» (10, →Vaibad), «Kasvuhoone ventilaatorid» (3), «Mullafreesid ja kultivaatorid» (5, →Mullaharimine), «Hoiusahtlikapid» (2, →Lauasahtlid) = variant olemas-õest → **EI loodud, tooted jäävad koju, 5 shadow-signaali** |
| = **distinct L3 (LÕPLIK)** | **40** | **87 toodet** · 4 partii (à 10) |

### 🐛 Granulaarsus-värava BUG + parandus (Tarmo task 1–2)

- **BUG:** spets §4 gate #8 (suhteline merge-judge «uus L3 vs õed») polnud KUNAGI mootoris implementeeritud; `scripts/merge-judge.mjs` puudub; über-frag-guard on **AINULT L2** (ei loo uut L2 ühe L3 jaoks), EI takista õhukest L3 olemas-L2 all. → õhukesed variandid (Vaipplaadid=Vaibad, Mullivanni katted=Basseinikatted) läbisid kontrollimata.
- **PARANDUS:** jagatud moodul `scripts/lib/granularity-gate.mjs` (Opus, **SUHTELINE** semantiline kaugus — EI loe tooteid). Variant/ebaselge → EI loo (konservatiivne). **Rakendatud mõlemale kutsujale (HARD RULE #5):** (a) ETAPP3 eel-filter `scripts/apply-granularity-gate.mjs`, (b) öine auto-create → mootori PRE-värav `l3-create-engine.mjs` (default sees). *Tõestus suhtelisusest: «Kallutuskomplektid» (1 toode) JÄI (eristuv), «Vaipplaadid» (10 toodet) KUKKUS (variant) — otsus EI sõltu arvust.*

**Asümm-kindlus (task 2):** kõik 51 KEEP vastavad reeglile — **1 consensus** (judge+ref=new_l3 → Fable kinnitus=new_l3) + **50 tie** (viigimurdja 3× hääletus, ≥2/3 new_l3). **0 täiendavat Fable-kutset** vaja (hääled olid auditis juba olemas), **0 drop kindluse tõttu**.

---

## 🔑 KAKS ERALDI ARVE-ÄMBRIT (kriitiline piiri-otsuse jaoks)

| Ämber | Mis | Läheb $600 cap'i alla? | Topeldus |
|---|---|---|---|
| **Anthropic (Claude)** | SEO/nimi (Fable) · kirjeldus (Opus+Sonnet+Fable) · naabrite ülehindamine (neighbor-chain) · merge-judge (Opus) | **JAH** — xlmarket.ee workspace | — |
| **Gemini (Google AI Studio)** | kategooria-pilt (nano-banana pro) + gatekeeper (flash) | **EI** — eraldi prepaid-ämber (vt [[gemini-billing-2-ambrit]]) | AI Studio "Buy credits" |

**Piiri tõstmine ($600) puudutab AINULT Anthropic-ämbrit.** Gemini vajab eraldi prepaid-krediiti (NB: €50 refund lahtine).

---

## Komponendid per uus L3 (Anthropic-ämber)

| Samm | Mudel | Realistlik | Ülempiir | Alus |
|---|---|---:|---:|---|
| SEO + nimi + tagline (genAssetsGated, regen ≤3×) | Fable ($10/$50) | $0.10 | $0.15 | 1–1.3 kutset × ~1.3K out |
| Tüübi-profiil kirjeldus (genValidatedDesc) | Opus gen+judge + Sonnet ref ± Fable | $0.022 | $0.03 | **DRY mõõdetud:** 10 näidist = $0.2151 |
| **Naabrite ülehindamine (neighbor-chain)** | Opus+Sonnet konsensus + Fable | **$1.50** | **$3.00** | cap-per **$3** (hard ceiling); DRY 9 L3=$13.34 → ~$1.48/L3 |
| merge-judge (per-lukk) | Opus | $0.08 | $0.10 | per puudutatud L2, ~$3–5 kokku ÷48 |
| DUP · über-frag · nime-värav · inv-taxonomy · lock-harness · completeness · brightness | **lokaalne** | $0 | $0 | skriptid/sharp, EI LLM |
| **KOKKU / L3 (Anthropic)** | | **~$1.70** | **~$3.28** | |

### Gemini-ämber per L3 (EI lähe cap'i alla)
| Samm | Mudel | Realistlik | Ülempiir |
|---|---|---:|---:|
| VEVOR CDN kandidaadid (olemas-fotod, strike 1–3) | — | $0 | $0 |
| Gatekeeper (serva-kontroll) | gemini-2.5-flash | ~$0.008 | ~$0.01 |
| Pildi-genereerimine AINULT kui VEVOR kukub | nano-banana pro ($0.134/pilt) | ~$0.05 (blend ~35% vajab) | ~$0.28 (2 gen) |
| **KOKKU / L3 (Gemini)** | | **~$0.06** | **~$0.29** |

---

## KOKKU 40 uut L3 (87 toodet, 4 partii)

| | Anthropic ($600 cap) | Gemini (eraldi prepaid) |
|---|---:|---:|
| **Realistlik** | **~$68** | **~$2.4** |
| **Ülempiir** (naaber cap-per $3 täis) | **~$131** | **~$11.6** |

> Juba KULUTATUD (ühekordne, enne execute'it): plaani-gen (SEO+tüübiprofiil 45×) ~$6 + near-dup fold ~$0.3 + **granulaarsus-värav $0.39** (45→40, 38 Opus-kutset). Execute-faas (naaber + merge per partii, 40 L3) = **~$62 realistlik / ~$125 ülempiir**. $600 cap katab suure puhvriga.

**Domineeriv kulu = naabrite ülehindamine** (~85% Anthropic-summast, jookseb execute-faasis per partii). See on ka ainus reguleeritav nupp:
`--cap-per` langetamine $3 → $1.5 poolitab laele: Anthropic ülempiir **~$157 → ~$88**.

### Faasijaotus (Anthropic)
| Faas | Millal | Kulu (realistlik) | DB-koormus |
|---|---|---:|---|
| **Plaani-genereerimine (DRY)** | üks kord, ENNE execute'it | **~$6** (SEO $0.10 + tüübiprofiil $0.022) × 48 | kerge (read-only) |
| **Execute (naaber + merge per partii)** | 4 partii × ~10 L3 | **~$62** | raske → väljaspool öö-akent (02:45–04:30) |

---

## Soovitus

1. **Piir $600 katab mugavalt** ETAPP 3 ülempiiri (~$157 Anthropic) + öise pipeline'i tavakulu + puhvri. Headroom suur.
2. **Gemini AI Studio:** kontrolli, et prepaid-krediiti on ≥**$14** (nano-banana pro varukäik). NB: €50 refund lahtine — kui krediit maas → pildid kukuvad, L3 completeness-värav (§4 gate #3.5) peatab loomise (ohutu, aga blokeerib partii).
3. **Partiidena ~10 L3** (4 partii). Iga partii järel väravad → rohelised → järgmine automaatselt; värav kukub → peata + Telegram.
4. **Öö-aken 02:45–04:30 (host CEST):** execute DB-töö peatub automaatselt (draiver `assertNotNightWindow`), kuni --force-window.
5. Pärast jooksu langeta konsooli piir tagasi tavapärasele.

**Kindluse-tase:** kirjeldus + SEO = **mõõdetud** (DRY). Naaber = **reaalne DRY** aga sõltub naabrite arvust per L3 (cap $3 kaitseb ülempiiri). Pildid = **eraldi ämber**, cap'i ei puuduta.
