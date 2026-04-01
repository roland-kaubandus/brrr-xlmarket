# XLM Issue List

Uuendatud: 2026-04-02

See nimekiri on koostatud Huly `XLM` projekti ja praeguse koodibaasi võrdluse põhjal.
Eesmärk on eraldada:
- mis on päriselt tegemata,
- mis on pooleli,
- mis on blokeeritud,
- mis on Huly-s vananenud ja vajab sulgemist, ühendamist või ümberkirjutamist.

## 1. Tee Kohe

### XLM-85
- Pealkiri: Otsingutulemuste leht: filtrid + sortimine + intent UX
- Staatus hinnang: aktiivne
- Seis:
  otsinguleht on olemas, filtrid ja sortimine olid osaliselt puudu
- 2026-04-02 tehtud:
  lisatud otsingulehele hinnafilter, sortimise ühtlustus, facet-põhine hinnavahemik ja query säilitamine paginationi vahel
- Järgmine töö:
  relevancy audit, synonym/intent kontroll, valede vastejuhtude testimine

### XLM-83
- Pealkiri: Tooteleht: pildid + kirjeldused + manuaalid + specid
- Staatus hinnang: aktiivne
- Seis:
  tooteleht on olemas, galerii/specide/accordioni põhiosa on olemas
- Puudu:
  manualide kuvamine, VPS-is olevate PDF-ide sidumine toodetega, võimalik täpsem spetsifikatsiooni struktuur

### XLM-87
- Pealkiri: /avasta leht: projekti-põhine navigatsioon üle kategooriate
- Staatus hinnang: aktiivne
- Seis:
  route ei paista storefrontis olemas olevat
- Järgmine töö:
  defineerida selle lehe roll otsingu, valdkondade ja AI müüja vahel

### XLM-86
- Pealkiri: Müüja widget: hõljuv vestluskast kogu saidil
- Staatus hinnang: partial
- Seis:
  widget on olemas ja layoutis sees
- Puudu:
  parem UX, tugevam navigatsiooniloogika, visuaalne polish, võimalik hääljuhtimine tulevikus

### XLM-82
- Pealkiri: Kirjelduste tõlge EN→ET (14 310 toodet)
- Staatus hinnang: aktiivne
- Seis:
  tõlkeprotsess on olemas, aga töö ise ei ole sisuliselt “done”
- Märkus:
  see on pigem jooksva pipeline’i teema kui ühekordne frontend-issue

## 2. Jookseb Taustal

### XLM-51
- Pealkiri: VPS: Tõlkeagent (Claude CLI, Max plaan, iga 15 min)
- Staatus Huly-s: In Progress
- Hinnang:
  jätta eraldi pipeline/ops reale, mitte segada feature-backlogiga

### XLM-56
- Pealkiri: VPS: VEVOR PDF manualide scraper
- Staatus Huly-s: In Progress
- Hinnang:
  scraper ise jookseb eraldi teemana, aga selle väljundi sidumine storefrontiga kuulub XLM-83 alla

## 3. Blokeeritud

### XLM-90
- Pealkiri: DNS xlmarket.eu → VPS + Let's Encrypt SSL
- Blokaator:
  infra / DNS / välised seaded

### XLM-91
- Pealkiri: Montonio maksete integratsioon
- Blokaator:
  võtmed / teenuse seadistus / välissõltuvused

### XLM-94
- Pealkiri: VEVOR feed import pipeline (vevor-571.xlsx)
- Staatus hinnang: ümberdefineerida
- Seis:
  importeri skriptid on olemas, aga uus feedi allikas ja VPS-i meedia/manualide sidumine vajab uut täpset scope’i
- Soovitus:
  jagada kaheks:
  1. feed sync ja uute toodete/stocki update pipeline
  2. meedia/manualide/local assets sidumine toodetega

## 4. Huly-s Vananenud Või Sulgeda

### XLM-84
- Pealkiri: Avalehe redesign
- Hinnang:
  sisuliselt juba tehtud
- Soovitus:
  märkida Done või sulgeda asendatuna väiksemate polish-ticketitega

### XLM-95
- Pealkiri: Kahekeelne storefront: EN+ET koos fallback'iga
- Hinnang:
  osaliselt juba tehtud
- Põhjus:
  `et` ja `en` locale on olemas, i18n süsteem on olemas
- Soovitus:
  sulgemise asemel teha uus täpsem issue:
  “EN/ET coverage audit + missing translations”

### XLM-93
- Pealkiri: Autoresearch loop: automaatne UX optimeerimine
- Hinnang:
  liiga ebamäärane praeguse etapi jaoks
- Soovitus:
  hoida backlogis või jagada väikesteks mõõdetavateks UX/analytics issue’deks

## 5. Juba Tehtud Ja Alles Jätta Suletuks

Need paistavad koodi ja Huly järgi mõistlikult suletud:
- XLM-72 Avalehe redesigni esimene suur etapp
- XLM-92 Otsing + teadmusgraaf
- XLM-59 / XLM-66 otsingu alussammud
- XLM-49 / XLM-50 / XLM-52 / XLM-53 / XLM-55 / XLM-63 infra ja search/media vundament
- XLM-17 kuni XLM-25 bugfixid
- XLM-1 kuni XLM-16 algne WO plokk, v.a maksete teema

## 6. Uus Praktiline Tööjärjekord

1. XLM-85
   otsingu relevancy ja intent UX lõpuni
2. XLM-83
   tooteleht: manualid, specid, meedia sidumine
3. XLM-87
   `/avasta` leht ja projektipõhine nav
4. XLM-86
   AI müüja UX ja juhtloogika polish
5. XLM-82
   tõlke kvaliteet, coverage, fallback audit
6. XLM-94
   sõnastada ümber kaheks eraldi issueks

## 7. Soovitus Huly Korrastamiseks

Huly-s võiks teha järgmised muudatused:
- Sulge või märgi tehtuks: XLM-84
- Muuda “partial / split” tüüpi töödeks: XLM-94, XLM-95
- Hoia blokeerituna: XLM-90, XLM-91
- Hoia aktiivsena: XLM-83, XLM-85, XLM-86, XLM-87, XLM-82

