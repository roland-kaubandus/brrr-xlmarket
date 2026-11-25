# Privaatsuspoliitika — otseturunduse punkt (MUSTAND ülevaatuseks)

**Kuupäev:** 2026-11-25
**Staatus:** 🟡 OOTAB TARMO HEAKSKIITU — enne seda uudiskirja kogumine staging'us EI aktiveeru (lipud OFF).
**Seotud:** `consent_text_version = "2026-11-25"` (logic.ts). See versioon = MIS tekstiga klient nõustus. Kui seda punkti materiaalselt muudad, tõstame versiooni.

---

## Miks see punkt on vaja

GDPR nõuab, et otseturundus (uudiskiri, pakkumised e-postiga) oleks poliitikas selgelt kirjeldatud:
õiguslik alus (nõusolek), mida kogume, kui kaua hoiame, kuidas loobuda. Kolm nõusoleku-allikat:
kassa linnuke (single opt-in), jaluse vorm (double opt-in — tuleb hiljem), ja edaspidi konto-konto.

**Soovitatav paigutus:** uus jaotis **§6 „Otseturundus"**, praegused §6–§8 nihkuvad §7–§9-ks.
(Alternatiiv: jätta numbrid ja lisada §3 „Töötlemise eesmärk" alla alapunkt — aga eraldi jaotis on selgem.)

---

## EESTI — lisatav jaotis (kopeeri-valmis)

> ## 6. Otseturundus
>
> Kui annad selleks nõusoleku, saadame sulle e-postiga uudiskirja, pakkumisi ja teateid toodete kohta.
>
> - **Õiguslik alus:** sinu nõusolek (GDPR art 6 lg 1 p a). Nõusolek on vabatahtlik — see ei ole tellimuse esitamise eeldus.
> - **Kuidas nõusolekut anda:** märgid kassas vastava linnukese (märkimata vaikimisi) või täidad veebilehe uudiskirja-vormi ja kinnitad liitumise e-kirja lingilt.
> - **Mida salvestame nõusoleku tõendamiseks:** e-posti aadress, nõusoleku aeg, allikas (kassa / vorm), nõusoleku-teksti versioon ning tehniline metaandmed (IP-aadress ja brauseri tunnus) — ainult selleks, et nõusolekut tõendada.
> - **Loobumine:** saad igal ajal loobuda ühe klikiga iga kirja jaluses oleva lingi kaudu või kirjutades aadressile info@xlmarket.ee. Loobumine lõpetab turunduskirjad, kuid ei mõjuta tellimustega seotud teateid (nt arve, tarneinfo).
> - **Säilitamine:** nõusoleku andmeid hoiame kuni loobumiseni ja mõistliku aja pärast seda, et tõendada nõusoleku kehtivust. Pärast loobumist sind enam turunduse sihtrühma ei lisata.
> - **Jagamine:** uudiskirja saatmiseks võime kasutada e-posti teenusepakkujat (volitatud töötleja), kes töötleb andmeid ainult meie juhiste alusel. Me ei müü sinu andmeid.

---

## ENGLISH — section to add (ready to paste)

> ## 6. Direct Marketing
>
> If you give your consent, we will send you a newsletter, offers and product updates by email.
>
> - **Legal basis:** your consent (GDPR Art. 6(1)(a)). Consent is voluntary — it is not a condition of placing an order.
> - **How to give consent:** tick the relevant box at checkout (unticked by default) or fill in the newsletter form on the website and confirm your subscription via the link in a confirmation email.
> - **What we store as proof of consent:** your email address, the time of consent, the source (checkout / form), the consent-text version, and technical metadata (IP address and browser identifier) — solely to evidence the consent.
> - **Unsubscribing:** you can unsubscribe at any time with one click via the link in the footer of every email, or by writing to info@xlmarket.ee. Unsubscribing stops marketing emails but does not affect order-related messages (e.g. invoice, delivery info).
> - **Retention:** we keep consent data until you unsubscribe and for a reasonable period afterwards to demonstrate that the consent was valid. After unsubscribing you are no longer included in marketing audiences.
> - **Sharing:** to send the newsletter we may use an email service provider (processor) that processes data only on our instructions. We do not sell your data.

---

## Mida see mustand EI tee veel

- EI ole kirjutatud live CMS-i (andmebaasi `legal_pages` rida võidab fallback-JSON-i, seega mustand ei kuvaks niikuinii enne kui sa kinnitad).
- Pärast sinu OK-d: uuendan CMS ET+EN privaatsuspoliitika read (§6 + renumbering) ja alles SIIS lülitan kogumis-lipud sisse.
- Kui muudad sõnastust nii, et nõusoleku sisu muutub → tõstan `CONSENT_TEXT_VERSION` uuele kuupäevale.

## Lahtised küsimused sulle

1. Kas „volitatud töötleja (ESP)" mainimine sobib juba praegu, kuigi ESP (#6) tuleb hiljem? (Soovitan jah — katab tuleviku, ei pea poliitikat uuesti muutma.)
2. Säilitustähtaeg pärast loobumist — kas fikseerime konkreetse aja (nt „kuni 3 aastat") või jätame „mõistliku aja"? (Jurist eelistab tihti konkreetset.)
3. Kas tahad kassa-linnukese teksti ja poliitika sõnastuse 1:1 samaks, või piisab sisulisest vastavusest? (Praegu: linnuke = „Soovin pakkumisi ja uudiseid e-postiga. Saan igal ajal loobuda.")
