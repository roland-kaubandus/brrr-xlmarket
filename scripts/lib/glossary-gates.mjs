/**
 * glossary-gates.mjs — glossary uue-termini VÄRAVAD (SSoT §3, jagatud backfill + hook, HARD RULE #5).
 *
 * Kõik väravad PUHTAD (I/O-vabad) → testitavad. Värav kukub → termin EI lähe glossary'sse (jääb review/defer).
 * Väravad (plaan §3):
 *   1. DUP          — termin (en + aliased, normaliseeritud) ei tohi juba olla; longest-match-ohutu.
 *   2. KEHTIVUS     — ET-vaste on päris eesti (mitte EN-koopia/translit), mitte tühi, cluster kehtiv, pole fluff.
 *   3. MATCH-OHUTUS — uue termini lisamine EI kaota olemas-adherence-matche (empiiriline enne/pärast skänn valimil).
 *   4. FREQ         — freq ≥1 → locked; 0 → defer (aktiveerub kui feed toob). Väldib fantoom-termineid.
 */

export const CLUSTERS = new Set(["tööriistad", "tehniline", "materjalid", "ühikud", "turundus"]);

// turundus-fluff mustrid (õppetund §A1 "Thoughtful Tool") — ET-vaste ei tohi olla hinnang/lubadus
const FLUFF = /\b(parim|suurepärane|imeline|revolutsioon|premium|luksus|ülim|täiuslik|professionaalne\s+kvaliteet)\b/i;

export const normEn = (s) => (s || "").toLowerCase().trim();

/** buildMatchList — entries → [{en,et,status}] KÕIK EN-vormid (en+aliases), sorteeritud pikkuse järgi KAHANEVALT. */
export function buildMatchList(entries) {
  const out = [];
  for (const e of entries) for (const enForm of [e.en, ...(e.aliases || [])]) out.push({ en: enForm, et: e.et, status: e.status });
  out.sort((a, b) => b.en.length - a.en.length);
  return out;
}

/** scanEnLongest — longest-match-first skänn (maskib matchitud vahemikud → lühem ei topeltmatchi). Tagastab [{en,et,at}]. */
export function scanEnLongest(source, matchList) {
  const src = normEn(source);
  const masked = new Array(src.length).fill(false);
  const hits = [];
  for (const term of matchList) {
    const en = normEn(term.en);
    if (en.length < 3) continue;
    let from = 0;
    while (true) {
      const idx = src.indexOf(en, from);
      if (idx < 0) break;
      let free = true;
      for (let k = idx; k < idx + en.length; k++) if (masked[k]) { free = false; break; }
      if (free) { for (let k = idx; k < idx + en.length; k++) masked[k] = true; hits.push({ en: term.en, et: term.et, at: idx }); }
      from = idx + en.length;
    }
  }
  return hits;
}

/**
 * dupGate — kas EN-termin (normaliseeritud, sh aliased) JUBA glossarys?
 * pass=false → skip (juba kaetud). Longest-match overlap (substring kummaski suunas) on OHUTU
 * (longest-match-first lahendab), seega EI blokeeri — ainult TÄPNE duplikaat blokeerib.
 */
export function dupGate({ en }, entries) {
  const n = normEn(en);
  if (!n) return { pass: false, note: "tühi EN-termin" };
  for (const e of entries) {
    for (const form of [e.en, ...(e.aliases || [])]) {
      if (normEn(form) === n) return { pass: false, note: `juba glossarys: '${form}' → '${e.et}' (${e.status})` };
    }
  }
  return { pass: true, note: "uus termin (pole glossarys)" };
}

/**
 * validityGate — ET-vaste kehtivus:
 *   (a) mitte tühi / ≥2 tähte; (b) mitte EN-koopia (identne EN-iga, väiketähtedes); (c) cluster kehtiv;
 *   (d) pole turundus-fluff. Transliteratsiooni (nt "distiller"→"distiller") püüab (b).
 */
export function validityGate({ en, et, cluster }) {
  const e = (et || "").trim();
  if (e.length < 2) return { pass: false, note: "ET-vaste tühi/liiga lühike" };
  if (normEn(e) === normEn(en)) return { pass: false, note: `ET-vaste = EN-koopia ('${e}') → pole tõlgitud` };
  if (!CLUSTERS.has(cluster)) return { pass: false, note: `cluster '${cluster}' kehtetu (lubatud: ${[...CLUSTERS].join("/")})` };
  if (FLUFF.test(e)) return { pass: false, note: `ET-vaste sisaldab turundus-fluff'i ('${e}')` };
  return { pass: true, note: `kehtiv ET-vaste '${e}' (${cluster})` };
}

/** freqGate — freq ≥1 → locked (kasutuses); 0 → defer (fantoom-kaitse). Tagastab {pass:true, status}. */
export function freqGate({ freq }) {
  const f = freq | 0;
  return { pass: true, status: f >= 1 ? "locked" : "defer", note: f >= 1 ? `freq=${f} → locked` : "freq=0 → defer (aktiveerub feed-tootel)" };
}

/**
 * matchSafetyGate — EMPIIRILINE: uue termini lisamine EI tohi KAOTADA olemas-terminite matche valimil.
 * Skänn enne (entries) vs pärast (entries + newEntry); iga enne-hit (olemas-EN, pos) PEAB pärast alles olema.
 * Uus termin tohib ainult LISADA katvust (ennem-maskimata vahemikud) VÕI võita pikema matchiga oma uut vahemikku.
 */
export function matchSafetyGate({ newEntry, entries, sampleEnTexts = [] }) {
  const before = buildMatchList(entries);
  const after = buildMatchList([...entries, newEntry]);
  const newForms = new Set([newEntry.en, ...(newEntry.aliases || [])].map(normEn));
  for (const text of sampleEnTexts) {
    const hb = scanEnLongest(text, before);
    const ha = scanEnLongest(text, after);
    // ehita pärast-skänni olemas-terminite hulk (välja arvatud UUS termin ise)
    const afterExisting = new Set(ha.filter((h) => !newForms.has(normEn(h.en))).map((h) => `${normEn(h.en)}@${h.at}`));
    for (const h of hb) {
      const key = `${normEn(h.en)}@${h.at}`;
      if (!afterExisting.has(key)) {
        // enne-hit kadus — lubatud AINULT kui uus termin võttis SAMA alguspositsiooni (pikem fraas → legit longest-win)
        const takenByNew = ha.some((x) => newForms.has(normEn(x.en)) && x.at <= h.at && (x.at + normEn(x.en).length) >= (h.at + normEn(h.en).length));
        if (!takenByNew) return { pass: false, note: `uus termin '${newEntry.en}' varjaks olemas-matchi '${h.en}' (pos ${h.at}) → longest-match rike` };
      }
    }
  }
  return { pass: true, note: `match-ohutu (${sampleEnTexts.length} valim-teksti kontrollitud, 0 kadu)` };
}

/**
 * runAllGates — kõik väravad järjest (DUP → kehtivus → match-ohutus → freq). Esimene kukkumine peatab.
 * Tagastab { allPass, status, gates:{dup,validity,matchSafety,freq}, blocking:[note] }.
 */
export function runAllGates({ en, et, cluster, freq, aliases = [] }, { entries, sampleEnTexts = [] }) {
  const newEntry = { en, et, cluster, aliases, status: "locked" };
  const gates = {};
  gates.dup = dupGate({ en }, entries);
  if (!gates.dup.pass) return { allPass: false, status: null, gates, blocking: [`DUP: ${gates.dup.note}`] };
  gates.validity = validityGate({ en, et, cluster });
  if (!gates.validity.pass) return { allPass: false, status: null, gates, blocking: [`KEHTIVUS: ${gates.validity.note}`] };
  gates.matchSafety = matchSafetyGate({ newEntry, entries, sampleEnTexts });
  if (!gates.matchSafety.pass) return { allPass: false, status: null, gates, blocking: [`MATCH-OHUTUS: ${gates.matchSafety.note}`] };
  gates.freq = freqGate({ freq });
  return { allPass: true, status: gates.freq.status, gates, blocking: [] };
}
