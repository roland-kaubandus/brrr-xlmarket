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
> Kui annad selleks nõusoleku, saadame sulle e-postiga uudiskirja, pakkumisi ja teateid toodete kohta. Pakkumisi võime kohandada sinu varasemate ostude põhjal.
>
> - **Õiguslik alus:** sinu nõusolek (GDPR art 6 lg 1 p a). Nõusolek on vabatahtlik — see ei ole tellimuse esitamise eeldus.
> - **Kuidas nõusolekut anda:** lisad kassas linnukese vastavasse kasti (märkimata vaikimisi) või täidad veebilehe uudiskirja-vormi ja kinnitad liitumise e-kirja lingilt.
> - **Mida salvestame nõusoleku tõendamiseks:** e-posti aadress, nõusoleku aeg, allikas (kassa / vorm), nõusoleku-teksti versioon ning tehnilised metaandmed (IP-aadress ja brauseri tunnus) — ainult selleks, et nõusolekut tõendada.
> - **Loobumine:** saad igal ajal loobuda ühe klikiga iga kirja jaluses oleva lingi kaudu või kirjutades aadressile info@xlmarket.ee. Loobumine lõpetab turunduskirjad, kuid ei mõjuta tellimustega seotud teateid (nt arve, tarneinfo). Loobumine ei mõjuta enne seda toimunud töötlemise seaduslikkust.
> - **Säilitamine:** nõusoleku andmeid hoiame seni, kuni oled uudiskirjaga liitunud. Pärast loobumist kasutame neid enam ainult nõusoleku tõendamiseks võimaliku vaidluse korral ja kustutame hiljemalt 3 aasta möödudes. Lisaks hoiame keeldude nimekirjas sinu e-posti aadressi ja loobumise kuupäeva nii kaua, kui see on vajalik, et sind kogemata uuesti turunduse sihtrühma ei lisataks.
> - **Jagamine:** uudiskirja saatmiseks võime kasutada volitatud töötlejat (e-posti teenusepakkuja), kes töötleb andmeid ainult meie juhiste alusel. Konkreetse teenusepakkuja nime avaldame selles poliitikas, kui see on valitud. Me ei müü sinu andmeid.

---

## ENGLISH — section to add (ready to paste)

> ## 6. Direct Marketing
>
> If you give your consent, we will send you a newsletter, offers and product updates by email. We may tailor offers based on your previous purchases.
>
> - **Legal basis:** your consent (GDPR Art. 6(1)(a)). Consent is voluntary — it is not a condition of placing an order.
> - **How to give consent:** tick the relevant box at checkout (unticked by default) or fill in the newsletter form on the website and confirm your subscription via the link in a confirmation email.
> - **What we store as proof of consent:** your email address, the time of consent, the source (checkout / form), the consent-text version, and technical metadata (IP address and browser identifier) — solely to evidence the consent.
> - **Unsubscribing:** you can unsubscribe at any time with one click via the link in the footer of every email, or by writing to info@xlmarket.ee. Unsubscribing stops marketing emails but does not affect order-related messages (e.g. invoice, delivery info). Withdrawal does not affect the lawfulness of processing before it.
> - **Retention:** we keep consent data while you are subscribed. After you unsubscribe, we use it only to demonstrate the validity of your consent in case of a dispute, and delete it no later than 3 years afterwards. In addition, we keep your email address and the date of unsubscribing on a suppression list for as long as needed to avoid accidentally adding you back to marketing audiences.
> - **Sharing:** to send the newsletter we may use a processor (an email service provider) that processes data only on our instructions. We will name the specific provider in this policy once one is selected. We do not sell your data.

---

## Mida see mustand EI tee veel

- EI ole kirjutatud live CMS-i (andmebaasi `legal_pages` rida võidab fallback-JSON-i, seega mustand ei kuvaks niikuinii enne kui sa kinnitad).
- Pärast sinu OK-d: uuendan CMS ET+EN privaatsuspoliitika read (§6 + renumbering) ja alles SIIS lülitan kogumis-lipud sisse.
- Kui muudad sõnastust nii, et nõusoleku sisu muutub → tõstan `CONSENT_TEXT_VERSION` uuele kuupäevale.

## Lahtised küsimused — LAHENDATUD (Tarmo, 2026-11-25)

1. ✅ ESP mainitakse üldiselt: „volitatud töötleja (e-posti teenusepakkuja)", **nime pole** (lisandub kui valitud).
2. ✅ Säilitamine pärast loobumist: keeldude nimekirjas **ainult e-post + loobumise kuupäev**; nõusoleku tõend **kuni 3 aastat**.
3. ✅ Sisuline vastavus piisab. Linnukese tekst jääb samaks („Soovin pakkumisi ja uudiseid e-postiga. Saan igal ajal loobuda."), **kõrvale lisatakse link privaatsuspoliitikale** („Loe lähemalt" / „Read more" → `/${locale}/privaatsus`).

**`CONSENT_TEXT_VERSION` jääb `2026-11-25`:** nõusoleku _sisu_ (mida klient linnukesega kinnitab) ei muutunud — muutusid vaid meiepoolse käitlemise kirjeldused (säilitus/jagamine) ja lisandub info-link. Kui tulevikus linnukese sõnastus ise muutub, tõstame versiooni.
