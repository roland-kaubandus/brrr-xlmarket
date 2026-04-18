# XLMarket B2B Turu-uuring — Uurimisprompt

> Kopeeri see prompt uude Claude sessiooni (XL agent, brrr-xlmarket repo).
> Eeldab: MeiliSearch töötab (port 7700), internet kättesaadav.

---

## Prompt

```
Sa oled XLMarket.eu turuanalüütik. XLMarket on Eesti e-pood, mis müüb VEVOR tööstusseadmeid ja professionaalseid tööriistu. ~16 000 toodet, 1688 kategooriat.

Sinu ülesanne on teha põhjalik turu-uuring, mis vastab küsimusele:
**Millistes B2B sektorites on XLMarketil suurim potentsiaal ja kuidas neid sihtida?**

---

### 1. SORTIMENDI ANALÜÜS (sisemine)

Kasuta MeiliSearchi (port 7700, search-only key: MEILI_SEARCH_KEY_REDACTED) ja Medusa API-t, et kaardistada:

a) **Top kategooriad tootearvult** — millised L1/L2 kategooriad on suurimad?
b) **Top kategooriad hinnatasemelt** — kus on kallimad tooted (B2B potentsiaal)?
c) **Sektoripõhine gruppeerimine** — grupeeri kategooriad ärisektorite kaupa:
   - Catering / HoReCa (suurköögiseadmed, toiduainetetööstus, kaubanduslikud külmikud/ahjud)
   - Ehitus ja remont (betooniseadmed, tõstukid, generaatorid)
   - Metallitöö ja keevitus (keevitusaparaadid, treipingid, lõikurid)
   - Autohooldus ja -remont (tõstukid, diagnostika, tööriistad)
   - Laondus ja logistika (kaalud, kärud, riiulid, pakkimisseadmed)
   - Põllumajandus (pumbad, generaatorid, aiatehnika)
   - Puhastusteenused (tolmuimejad, põrandahooldus, survepesurid)
   - Ilutööstus (juuksuritoolid, SPA seadmed)
   - Muu (tuvasta ise)
d) **Iga sektori kohta:** toodete arv, hinnavahemik (min-max-keskmine), top 5 toodet

### 2. EESTI TURU KAARDISTAMINE (välimine)

Uuri veebist iga tuvastatud sektori kohta:

a) **Kes on praegused tarnijad Eestis?** (nt Stokker, Abplanalp, Würth, Gastrocom jne)
b) **Hinnatasemed** — kuidas VEVOR hind võrdleb? (VEVOR USP on "pool hinda")
c) **Turu suurus hinnanguliselt** — mitu ettevõtet selles sektoris Eestis tegutseb?
   - Kasuta statistikat (stat.ee, e-krediidiinfo, Teatmik.ee)
   - Catering: mitu restorani, kohvikut, hotelli Eestis?
   - Metallitöö: mitu ettevõtet EMTAK koodiga 25xx?
   - jne.
d) **Ostuharjumused** — kas B2B kliendid ostavad veebist või vajavad kontakti?
e) **Hooajalisus** — kas sektoril on hooaeg?

### 3. KONKURENTSIANALÜÜS

Iga top-3 sektori kohta:

a) **Otsesed konkurendid** — kes müüb sarnaseid tooteid Eestis?
b) **Hinnavõrdlus** — 3-5 konkreetse toote hind XLMarket vs konkurent
c) **Tugevused/nõrkused** — mida XLMarket teeb paremini? Mida halvemini?
d) **Barjäärid** — mis takistab B2B klienti XLMarketist ostmast? (garantii? kohaletoimetamine? arveldus?)

### 4. POTENTSIAALI HINDAMINE

Koosta sektorite edetabel järgmiste kriteeriumite alusel:

| Kriteerium | Kaal |
|------------|------|
| Turu suurus Eestis (ettevõtete arv) | 25% |
| VEVOR sortimendi tugevus (tootevalik + hind) | 25% |
| Konkurentsi intensiivsus (vähem = parem) | 20% |
| Keskmine tellimuse väärtus | 15% |
| Korduvostude tõenäosus | 15% |

**Iga sektori kohta anna skoor 1-10 ja arvuta kaalutud tulemus.**

### 5. SOOVITUSED

a) **Top 3 prioriteetsektorit** koos põhjendusega
b) **Iga prioriteetsektori kohta:**
   - Sihtrühma kirjeldus (kes ostab, mis ametikoht, mis vajadus)
   - Soovituslik turunduskanal (otsepost? Google Ads? LinkedIn? külmkõned?)
   - Esimesed sammud (mis tooted esile tõsta, mis sõnum)
   - Potentsiaalne käive (konservatiivne hinnang)
c) **Sektorid mida MITTE sihtida** (ja miks)

---

### VÄLJUNDI FORMAAT

Kirjuta raport faili: `docs/research/2026-04-15-b2b-market-research.md`

Struktuur:
1. Juhtivkokkuvõte (1 lk — Tarmole lugemiseks)
2. Sortimendi analüüs (tabelid)
3. Turukaardistus sektorite kaupa
4. Konkurentsianalüüs
5. Potentsiaali edetabel (tabel + selgitused)
6. Soovitused ja järgmised sammud

**NB:**
- Ära genereeri numbreid — kui ei leia, ütle "andmed puuduvad, vajab käsitsi uurimist"
- Kasuta allikaid ja viita neile
- Eesti turu spetsiifika on oluline — Eesti on väike turg, 1.3M inimest
- VEVOR on Hiina bränd — mõnel sektoril on see eelis (hind), mõnel takistus (usaldus)
- Raport on eestikeelne
```

---

## Märkused

- Sessioon vajab internetti (WebSearch/WebFetch) + MeiliSearchi ligipääsu
- Hinnanguliselt 30-60 min aega
- Tulemus läheb sisendiks AI töötajaskonna visioonidokumenti
