# XL Agent Task — 2026-03-28

## Kontekst
Desktop Claude tegi auditi ja leidis 9 bugi (Huly XLM-17 kuni XLM-25).
WO-001 kuni WO-003 on tehtud aga ilma review protsessita.
WO-005 (storefront) on osaliselt tehtud.

## Prioriteetne task
Paranda leitud bugid prioriteedi jarjekorras:

1. XLM-17: KRIITILINE - Ostukorvi leht puudub (/ostukorv)
2. XLM-19: Toote leht naitab alati Laos - ei kontrolli laoseisu
3. XLM-20: Hardcoded credentials koodis - eemalda, kasuta env vars
4. XLM-21: Kategooriate nimed ilma tapitahtedeta
5. XLM-23: Cart API route ei valideeri inputi

## KOHUSTUSLIK WORKFLOW
Iga WO ja iga bug fix PEAB labima:

1. KIRJUTAJA (sina) - kirjutad koodi
2. Spawnid reviewer-func agendi - funktsionaalsuse review
3. Spawnid reviewer-ui agendi - UI/UX review
4. Spawnid tester agendi - testib acceptance criteriad
5. Spawnid gatekeeper agendi - loplik kontroll

Kui keegi rejectib, parandad ja lahed uuesti ringi.
Alles siis kui gatekeeper annab APPROVE, on too valmis.

## Juhised
- Loe esmalt docs/cc-vps/memory/active-wo.md
- Loe CLAUDE.md reegleid
- Paranda bugid uhe kaupa
- Iga bug fix lopus: git commit + push
- Uuenda Huly issue staatus Done iks kui valmis
- Kirjuta paeva lopus memory log
