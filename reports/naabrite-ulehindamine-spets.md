# SPETS (koodita) — NAABRITE ÜLEHINDAMINE uue L3 sünnil

> Tarmo direktiiv 2026-10-07. Järgmine samm pärast kataloogi-auditit.
> **Idee:** kui auto-klassifikaator loob uue L3, hindab ahel üle tooted **naaber-L3-des**, kas mõni sobiks uude L3-sse paremini. Sihitud ja odav → **asendab perioodilise täisauditi vajaduse.**
> Staatus: DISAIN. Koodi EI ole. Ehitus eraldi tööna pärast Tarmo kinnitust.

---

## 1. Miks see on õige lahendus (ja täisaudit vale)

Kataloogi-audit (2026-10-07) tõestas: **truu kogu-kataloogi täisahel maksab ~$175–200** ja kordub iga feed-kasvuga. See on **vale mustrilt** (HARD RULE #6: korduv kallis skänn = katki disain). Juurpõhjus, miks misfit tekib, on **ajaline**: toode paigutati kodusse X, kuna uut (paremat) kodu Y **polnud veel olemas**. Kui Y hiljem sünnib, jäävad vanad tooted X-i "lõksu".

**Võti:** misfit ei teki juhuslikult üle kataloogi — see **kobardub äsja-sündinud L3 ümber**. Seega pole vaja skännida 5225 klastrit; piisab, kui uue L3 sünnil vaadata üle **ainult need, kes oleksid võinud sinna minna, kui ta oleks varem olnud olemas** — s.o. semantilised naabrid. See on **sündmus-põhine** (mitte perioodiline), **sihitud** (mitte täis-skänn) ja **odav** (kümned–sadu klastreid, mitte tuhanded).

**Tulemus:** kataloog **paraneb ise** iga uue L3 sünnil. Perioodilist täisauditit pole enam vaja — iga uus kodu "korjab" oma naabritelt valesti-paigutatud tooted automaatselt.

---

## 2. Käivitaja ja ulatus

### 2.1 Käivitaja
Hook jookseb **TÄPSELT siis, kui auto-create loob uue L3** (öises `import-pipeline.sh`-s [4] ahelas, pärast seda kui kõik loomise-väravad läbitud ja L3 on LIVE). Olemas-L3-sse assign EI käivita naabrite-ülehindamist (kodu polnud uus → lõksu pole tekkinud).

Sama käivitub ka **shadow-režiimis** (Variant 1): kui ahel "oleks loonud" uue L3, hinnatakse naabrid shadow'na üle ja logitakse "oleks liigutanud N toodet" — annab Tarmole nähtavuse enne auto-create sisselülitamist.

### 2.2 Naabruskonna definitsioon (keda üle hinnata)
Uue L3 `H_new` naaber-kandidaadid = **ÜHEND** kahest allikast:

1. **Struktuurne naabrus:** kõik L3-d sama L2 all + sama L2-vanemate õe-L2-de all (1 samm üles-alla taksonoomias). Deterministlik, odav.
2. **Semantiline naabrus:** top-K L3-d (K≈15–25) `H_new` tüübi-profiili (nimi + SEO-kirjeldus) embeddingu/trigram-lähedusel üle KOGU kataloogi. Püüab naabreid, mis struktuurselt kaugel aga tähenduselt lähedal (nt uus «Kallutuskomplektid» → «Hüdroagregaadid» eri mainis).

**Hinnatakse ainult NENDE naaber-L3-de tooted** (klaster-tasandil, nagu auditis), **MITTE kogu kataloog.** Tüüpiline naaber-hulk: 10–40 L3 → 50–400 klastrit.

> **DUP-värav esimesena:** kui mõni naaber-L3 on `H_new`-ga **sama tüüp** (mitte lihtsalt lähedal), siis `H_new` poleks tohtinud sündida — see on juba auto-create DUP-värava töö (§4 gate #1 b-spetsis). Naabrite-ülehindamine EELDAB et DUP-värav on juba läbitud; ta tegeleb ainult **õigete, eristuvate** naabritega, kust üksikud tooted võiksid rännata.

---

## 3. Otsustusahel (sama SSoT, kitsas kandidaat-hulk)

Naabrite-ülehindamine EI ole uus mudel — see on **sama `classify-chain.mjs` ahel**, ainult **kandidaat-list on kitsendatud** `{H_new} ∪ {naaber-L3-d}` (~10–40 L3, mitte täis-1684). See teeb iga kutse **odavaks** (list ~1–3k tok, mitte 91k) ja **cache-sõbralikuks** (väike list → isegi batch'is tühine).

Iga naaber-klastri kohta küsitakse ahelalt **suunatud küsimus**:
> "See toode on praegu L3 `X`-s. Uus L3 `H_new` («nimi», profiil: …) tekkis äsja. Kumb on PAREM kodu — jää `X` või liigu `H_new`? Või kolmas olemas-naaber?"

Ahel (Opus-kohtunik → Sonnet-referents → Fable-viigimurdja lahkhelil, §2c asümmeetriline kindlus) annab verdiktina:
- **stay** — jää praegu (enamik; naaber on õige, ei kuulu uude).
- **move_to_new** — liigu `H_new`-sse (lõksus-toode leitud).
- **move_to_other** — liigu kolmandasse olemas-naabrisse (bonus-leid).

**Asümmeetriline kindlus kehtib:** toote LIIGUTAMINE on struktuuri-mõjuta (lihtne assign, 1 Fable-kutse viigimurdjana piisab). Uut L3 see hook EI loo — kui mõni naaber-klaster näib vajavat *veel* uut kodu, see läheb tavalisse shadow-ledgerisse, mitte siit kaskaadina.

---

## 4. Väravad ja ohutus (HARD RULE #5, #6)

- **Fail-loud:** kui ahel kukub (API/timeout) ühel naaber-klastril → skip + jätka + Telegram raporteerib skipitud arvu (nagu [4]). Süsteemne viga (kogu partii kukub) → HOLD.
- **Kõik liigutused transaktsioonis + undo:** iga naabrite-ülehindamise jooks saab `batch_id` (nt `nbr-<ts>`) → `classifier-undo <batch_id>` pöörab KÕIK liigutused tagasi. Telegram-teade: "uue L3 «nimi» sünnil liigutati N toodet M naaber-L3-st; undo: …".
- **Invariandid pärast:** `inv-taxonomy.mjs` (0 orb/dup) + `lock-harness post` (distinct säilinud, 0 tootekadu) + `merge-judge` `H_new` ↔ naabrid (kui liigutamine tühjendas naabri või tegi `H_new` naabriga liiga sarnaseks → WARN).
- **Deploy:** liigutused = AINULT toote-lingid muutuvad (struktuur juba olemas `H_new` loomisest) → **kerge tee: ainult Meili reindeks** (CLAUDE.md deploy-nüanss), EI vaja SSoT-regen/push/redeploy.
- **Shadow enne live (Variant 1):** kuni `auto_create_enabled=false`, naabrite-ülehindamine logib "oleks liigutanud" `classifier_shadow_ledger`-isse, EI liiguta. Lülitub live'iks koos auto-create'iga (sama `evaluateTransition` lävi).

---

## 5. Kulu (miks see asendab täisauditi)

| | Täisaudit (perioodiline) | Naabrite-ülehindamine (sündmus-põhine) |
|---|---|---|
| Ulatus | kõik 5225 klastrit | 50–400 naaber-klastrit per uus L3 |
| Kandidaat-list | 91k tok (täis-1684) | 1–3k tok (kitsas naabrus) |
| Kulu | **~$175–200** per jooks | **~$0.50–3** per uus L3 |
| Sagedus | perioodiline (kordub feed-kasvuga) | ainult uue L3 sünnil |
| Katvus | kogu kataloog korraga | iga uus kodu korjab oma lõksus-tooted |

**Majanduslik võti:** kallis osa (alternatiivide vastu võrdlemine) on nüüd **kitsas** (naabrid, mitte kõik), ja list on väike → **caching + output mõlemad väikesed.** Aastas ~X uut L3 × ~$2 = marginaalne, vs korduv $200 täisaudit.

---

## 6. Jääk-risk (aus)

- **Misfit kahe L3 vahel, mis MÕLEMAD on vanad** (ei teki uue sünnist) → naabrite-ülehindamine ei püüa. Need on olemuselt harvem (kui mõlemad kodud ammu olemas, paigutati toode juba nende vahel valides). Kui soov neid püüda → **harv** (nt kord kvartalis) täis-merge-judge + intra-qa skänn kõrge-tihedusega mainidel, MITTE täis-ahel. Odavam ja sihitud.
- **Semantiline naabrus võib õige naabri vahele jätta** (embedding-recall < 100%). Leevendus: struktuurne naabrus (sama L2-pere) on ALATI kaasas → katab lähima perekonna deterministlikult; semantiline lisab kaugemad. Audit mõõtis shortlist-recall 99.3% (top-40) → naabrus K≈20 + struktuur katab praktiliselt kõik.

---

## 7. Ehitus-checklist (kui Tarmo kinnitab)

1. `neighborsOf(H_new)` — struktuurne (taksonoomia 1 samm) ∪ semantiline (top-K embedding/trigram). SSoT helper.
2. Naaber-klastrite kogumine (sama `clusterize` nagu audit).
3. Kitsa-listi ahela-kutse (`classify-chain.mjs` kandidaat-list = naabrus) — **uus kutsuja, sama transform** (HARD RULE #5).
4. Hook `import-pipeline.sh` [4] ahelasse, PÄRAST auto-create L3 LIVE-sammu, per uus L3.
5. Väravad: fail-loud + transaktsioon + undo + inv + lock-harness + merge-judge + Meili reindeks.
6. Shadow-režiim Variant 1 (logi enne, liiguta koos auto-create'iga).
7. Telegram-teade + `batch_id` undo.

> **Seotud:** [[956-autopaigutus-pipeline-leiud]] · [[klassifikaator-partii-dup-idee]] · `reports/b-klassifikaator-taisautomaatika-spets.md` (DUP-värav §4 gate #1, mille eeldust see spets kasutab).
