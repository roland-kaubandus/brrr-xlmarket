/**
 * glossary-gates.mjs — glossary uue-termini VÄRAVAD (SSoT §3, jagatud backfill + hook, HARD RULE #5).
 *
 * Kõik väravad PUHTAD (I/O-vabad) → testitavad. Värav kukub → termin EI lähe glossary'sse (jääb review/defer).
 * Väravad (jrk runAllGates-is):
 *   1. DUP           — termin (en + aliased, normaliseeritud) ei tohi juba olla; longest-match-ohutu.
 *   2. ERIALATERMIN  — (Tarmo 2026-10-11) AINULT eriala/tehniline termin (vaste-ühtlustamist vajav), MITTE
 *                      üldsõnavara (door/table/base/plastic/aluminum/inches); mitmetähenduslik → defer.
 *   3. ALGVORM       — (Tarmo 2026-10-11) salvesta lemma (toll, mitte tolli; inch, mitte inches); käände-/
 *                      mitmuse-aliased → adherence lubab käändevorme, mitte ei nõua täpset vormi.
 *   4. KEHTIVUS      — ET-vaste on päris eesti (mitte EN-koopia/translit), mitte tühi, cluster kehtiv, pole fluff.
 *   5. MÕJURAADIUS   — (Tarmo 2026-10-11) kui termin puudutaks SUURT osa kataloogist (SUHTELINE lävi) → DEFER
 *                      + signaal (ära auto-regenereeri suurt osa); regen-kulu hinnang kaasas.
 *   6. MATCH-OHUTUS  — uue termini lisamine EI kaota olemas-adherence-matche (empiiriline enne/pärast skänn valimil).
 *   7. FREQ          — freq ≥1 → locked; 0 → defer (aktiveerub kui feed toob). Väldib fantoom-termineid.
 */

export const CLUSTERS = new Set(["tööriistad", "tehniline", "materjalid", "ühikud", "turundus"]);

/**
 * COMMON_VOCAB — ilmne üldsõnavara (Tarmo 2026-10-11 näited + ümbrus). AINULT paljas üksiksõna blokitakse
 * deterministlikult; liitfraasid ("steel cable", "pallet jack") läbivad siit → LLM-kohtunik otsustab.
 * Põhjus: door/table/base/plastic/aluminum/inches EI vaja glossary-ühtlustamist (iga eestlane teab vaste).
 */
export const COMMON_VOCAB = new Set([
  "door", "table", "base", "plastic", "aluminum", "aluminium", "inch", "inches", "steel", "metal", "iron",
  "wood", "wooden", "glass", "water", "rubber", "fabric", "leather", "paper", "stone", "concrete", "ceramic",
  "color", "colour", "size", "weight", "height", "width", "length", "depth", "diameter",
  "black", "white", "red", "blue", "green", "yellow", "grey", "gray", "silver", "gold", "brown", "orange",
  "cover", "box", "bag", "case", "handle", "wheel", "part", "piece", "surface", "material", "frame",
  "button", "switch", "cable", "cord", "wire", "pipe", "tube", "plate", "sheet", "rod", "bar",
  "small", "large", "medium", "big", "mini", "heavy", "light", "round", "square", "foot", "feet", "meter", "metre",
]);

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
 * specialistGate — (Tarmo 2026-10-11) AINULT erialaterminid (vaste-ühtlustamist vajavad), MITTE üldsõnavara.
 *   - COMMON_VOCAB paljas üksiksõna (door/table/base/plastic/aluminum/inches) → defer.
 *   - isAmbiguous=true (mitu kataloogi-tähendust, nt table=laud/tabel)      → defer.
 *   - isSpecialist=false (LLM-kohtunik)                                      → defer.
 * isSpecialist/isAmbiguous = LLM-verdikt (chain arvutab). undefined = kohtunik vaikis → EI blokeeri üksi
 * (ohutu: COMMON_VOCAB kirjutab ikka üle; päris erialatermin pääseb edasi). Kukkumisel defer=true (mitte skip).
 */
export function specialistGate({ en, isSpecialist, isAmbiguous }) {
  const n = normEn(en);
  if (!n) return { pass: false, defer: true, note: "tühi EN-termin" };
  if (!/\s/.test(n) && COMMON_VOCAB.has(n)) return { pass: false, defer: true, note: `üldsõnavara '${en}' — ei vaja glossary-ühtlustamist (defer)` };
  if (isAmbiguous === true) return { pass: false, defer: true, note: `mitmetähenduslik '${en}' (mitu kataloogi-tähendust) → defer` };
  if (isSpecialist === false) return { pass: false, defer: true, note: `'${en}' pole erialatermin (LLM-kohtunik) → defer` };
  return { pass: true, note: `erialatermin '${en}' (ühtlustamist vääriv)` };
}

/**
 * baseFormGate — (Tarmo 2026-10-11) glossary salvestab ALGVORMI (lemma): toll, mitte tolli; inch, mitte inches.
 * enBase/etBase = LLM-lemmad (chain arvutab). Normaliseerib salvestatava vormi algvormiks + lisab EN
 * käände-/mitmuse-aliased (originaal-vorm + lihtne mitmus) → adherence MATCHIB käändevorme (ei nõua täpset).
 * Tagastab {pass, canonicalEn, canonicalEt, aliases, note}.
 */
export function baseFormGate({ en, et, enBase, etBase }) {
  const canonicalEn = (enBase && String(enBase).trim()) ? String(enBase).trim() : en;
  const canonicalEt = (etBase && String(etBase).trim()) ? String(etBase).trim() : et;
  if ((canonicalEt || "").trim().length < 2) return { pass: false, note: "ET algvorm tühi/lühike" };
  const aliases = new Set();
  // originaal EN-vorm (kui erineb algvormist, nt "inches" → alias algvormile "inch")
  if (normEn(en) !== normEn(canonicalEn)) aliases.add(normEn(en));
  // lihtne inglise mitmus algvormile (üksiksõna) → adherence leiab ka mitmuse
  const be = normEn(canonicalEn);
  if (be && !/\s/.test(be)) {
    if (/(s|x|z|ch|sh)$/.test(be)) aliases.add(be + "es");
    else if (/[^aeiou]y$/.test(be)) aliases.add(be.slice(0, -1) + "ies");
    else aliases.add(be + "s");
  }
  aliases.delete(be);
  return { pass: true, canonicalEn, canonicalEt, aliases: [...aliases], note: `algvorm EN='${canonicalEn}' ET='${canonicalEt}'${aliases.size ? ` (+aliased: ${[...aliases].join(",")})` : ""}` };
}

/**
 * impactRadiusGate — (Tarmo 2026-10-11) MÕJURAADIUS: kui termin puudutaks SUURT osa kataloogist (SUHTELINE
 * lävi, MITTE fikseeritud arv) → DEFER + signaal (ära auto-regenereeri suurt osa). Mõõdab osakaalu valimis
 * (en + aliased sisaldumine), ekstrapoleerib korpuseni + annab regen-kulu hinnangu (spend-guard'i jaoks).
 */
export function impactRadiusGate({ en, aliases = [] }, { sampleEnTexts = [], corpusSize = 0, threshold = 0.20, costPerDoc = 0.004 } = {}) {
  if (!sampleEnTexts.length) return { pass: true, note: "valim puudub → raadius-kontroll vahele (ei blokeeri)" };
  const forms = [normEn(en), ...aliases.map(normEn)].filter((f) => f && f.length >= 3);
  let hit = 0;
  for (const t of sampleEnTexts) { const s = normEn(t); if (forms.some((f) => s.includes(f))) hit++; }
  const frac = hit / sampleEnTexts.length;
  const estDocs = corpusSize ? Math.round(frac * corpusSize) : hit;
  const estCost = estDocs * costPerDoc;
  const base = { frac, estDocs, estCost };
  if (frac > threshold) return { pass: false, defer: true, signal: true, ...base, note: `mõjuraadius ${(frac * 100).toFixed(0)}% > lävi ${(threshold * 100).toFixed(0)}% (≈${estDocs} toodet, regen ≈$${estCost.toFixed(2)}) → DEFER+signaal (ära auto-regen)` };
  return { pass: true, ...base, note: `mõjuraadius ${(frac * 100).toFixed(0)}% ≤ ${(threshold * 100).toFixed(0)}% (≈${estDocs} toodet, regen ≈$${estCost.toFixed(2)})` };
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
 * runAllGates — kõik väravad järjest (DUP → ERIALATERMIN → ALGVORM → KEHTIVUS → MÕJURAADIUS → MATCH-OHUTUS
 * → FREQ). Esimene kukkumine peatab. ALGVORM normaliseerib EN/ET lemmaks + lisab aliased → edasised väravad
 * kasutavad algvorme. Tagastab { allPass, status, gates, blocking, defer?, signal?, canonicalEn, canonicalEt, aliases }.
 */
export function runAllGates({ en, et, cluster, freq, aliases = [], isSpecialist, isAmbiguous, enBase, etBase, corpusSize = 0 }, { entries, sampleEnTexts = [] }) {
  const gates = {};
  gates.dup = dupGate({ en }, entries);
  if (!gates.dup.pass) return { allPass: false, status: null, gates, blocking: [`DUP: ${gates.dup.note}`] };

  gates.specialist = specialistGate({ en, isSpecialist, isAmbiguous });
  if (!gates.specialist.pass) return { allPass: false, status: null, gates, defer: true, blocking: [`ERIALATERMIN: ${gates.specialist.note}`] };

  gates.baseForm = baseFormGate({ en, et, enBase, etBase });
  if (!gates.baseForm.pass) return { allPass: false, status: null, gates, blocking: [`ALGVORM: ${gates.baseForm.note}`] };
  const canonicalEn = gates.baseForm.canonicalEn;
  const canonicalEt = gates.baseForm.canonicalEt;
  const allAliases = [...new Set([...(aliases || []), ...gates.baseForm.aliases].map(normEn).filter(Boolean))];

  gates.validity = validityGate({ en: canonicalEn, et: canonicalEt, cluster });
  if (!gates.validity.pass) return { allPass: false, status: null, gates, blocking: [`KEHTIVUS: ${gates.validity.note}`] };

  gates.impact = impactRadiusGate({ en: canonicalEn, aliases: allAliases }, { sampleEnTexts, corpusSize });
  if (!gates.impact.pass) return { allPass: false, status: null, gates, defer: true, signal: true, blocking: [`MÕJURAADIUS: ${gates.impact.note}`] };

  const newEntry = { en: canonicalEn, et: canonicalEt, cluster, aliases: allAliases, status: "locked" };
  gates.matchSafety = matchSafetyGate({ newEntry, entries, sampleEnTexts });
  if (!gates.matchSafety.pass) return { allPass: false, status: null, gates, blocking: [`MATCH-OHUTUS: ${gates.matchSafety.note}`] };

  gates.freq = freqGate({ freq });
  return { allPass: true, status: gates.freq.status, gates, blocking: [], canonicalEn, canonicalEt, aliases: allAliases };
}
