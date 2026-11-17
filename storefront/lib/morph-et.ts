// Eesti liitsõna-otsing KIHT 1 — PÄRINGU-POOL (server-side, kasutab searchProducts).
//
// Andmed: `lib/data/morph-et-query.generated.json` (genereerib scripts/morph-et-apply.mjs
// SSoT-ist scripts/lib/morph_et.py). Struktuur: { lemma:{surface→lemma}, head:{liitlemma→põhisõna},
// comp:[komponent-lexikon] }.
//
// Kaks teisendust:
//   1) PRIMAARNE — käände-normaliseerimine: iga sõna → lemma (ahjud→ahi, pumbad→pump).
//      MITTE komponent-split (õhksoojuspump → kõik pumbad = üle-laienemine; DRY tõestatud).
//   2) PÕHISÕNA-FALLBACK (Tarmo, deterministlik) — AINULT kui primaarne annab alla läve:
//      liitsõna VIIMANE komponent (head-final): praeahi→ahi, aurupesur→pesur.
//      Lävi = suhteline (päringu limit), MITTE fikseeritud arv (CLAUDE.md: väravates ei tohi
//      olla fikseeritud numbreid). õhksoojuspump (110 ≥ limit) → EI lähe fallbacki.
import qmap from "./data/morph-et-query.generated.json"

type QMap = { lemma: Record<string, string>; head: Record<string, string>; comp: string[] }
const Q = qmap as QMap
const LEMMA = Q.lemma || {}
const HEAD = Q.head || {}
const COMP = new Set(Q.comp || [])
const MINC = 3 // komponendi min pikkus (sama kui morph_et.py MIN)

function lemmaOf(w: string): string {
  return LEMMA[w] || w
}

// Põhisõna = eesti liitsõna VIIMANE komponent (head-final). Esmalt autoriteetne korpuse-head,
// muidu pikim tuntud komponent-sufiks (lühem kui sõna ise). null = lihtsõna/ei leia (ära fallbacki).
function headOf(w: string): string | null {
  const base = lemmaOf(w)
  if (HEAD[base]) return HEAD[base]
  if (HEAD[w]) return HEAD[w]
  for (let i = 1; i <= w.length - MINC; i++) {
    const suf = w.slice(i)
    if (suf.length >= MINC && COMP.has(suf)) return suf
  }
  return null
}

export interface ExpandedQuery {
  primary: string // käände-normaliseeritud (põhipäring)
  heads: string | null // põhisõna-fallback-päring (või null kui ükski sõna pole liitsõna)
}

/** Teisenda kasutaja-päring: primaarne (lemma) + põhisõna-fallback (liitsõna viimane komponent). */
export function expandEstonianQuery(q: string): ExpandedQuery {
  const words = (q || "").trim().toLowerCase().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { primary: q, heads: null }
  const primary = words.map(lemmaOf).join(" ")
  // Põhisõna-fallback AINULT ühesõnalise liitsõna-päringu puhul (praeahi/aurupesur). Mitmesõnalisel
  // päringul on juba mitu terminit + sufiks-põhine head võib ühe sõna pealt valesti laieneda
  // ("jäätise masin" → "ise masin") → ohtlik. Tarmo fallback-näited on kõik ühesõnalised.
  if (words.length === 1) {
    const h = headOf(words[0])
    if (h && h !== primary) return { primary, heads: h }
  }
  return { primary, heads: null }
}
