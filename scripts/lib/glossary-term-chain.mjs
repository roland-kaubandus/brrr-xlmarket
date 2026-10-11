/**
 * glossary-term-chain.mjs — glossary UUE-TERMINI otsustusahel (SSoT §2, HARD RULE #5 + #6).
 *
 * ÜKS transform, kaks kutsujat: backfill (kogu korpus, ühekordne) + öine hook [6.4] (delta). Sama ahel mõlemal.
 *
 * Ahel (plaan §2):
 *   1. DETEKT      — leia EN-sisust katmata tehnilised terminid (Sonnet-ekstraktor, olemas-terminid välistatud).
 *   2. DUP-värav   — kas termin juba glossarys? (glossary-gates.dupGate) → skip.
 *   3. ETTEPANEK   — Opus JA Sonnet pakuvad ET-vaste SÕLTUMATULT (pime, teineteist ei näe).
 *   4. OTSUS (§2c asümmeetriline kindlus — glossary-termin = sisu-otsus, EI ole struktuur, aga ikka kindlus-põhine):
 *        konsensus (mõlemad sama ET, normaliseeritud) → 1× Fable KINNITUS → vastu → konservatiivne defer.
 *        lahkheli (eri ET)                             → Fable 3× hääletus ≥2/3 → võitja locked; enamust pole → defer.
 *        mõlemad tühjad/vigased                        → defer.
 *   5. VÄRAVAD     — valitud ET läbib runAllGates (DUP/kehtivus/match-ohutus/freq) → locked | defer.
 *
 * Kõik mudeli-kutsed INJEKTEERITUD ({opusCall, sonnetCall, fableCall}) → ahel on puhas (testitav mock-idega).
 * Päris kutsujad: makeAnthropicCall(apiKey, model, usage). Võti EI logita KUNAGI (väärtust ei prindi).
 */

import { runAllGates, specialistGate, fragmentGate, normEn, buildMatchList, scanEnLongest } from "./glossary-gates.mjs";

const API_URL = "https://api.anthropic.com/v1/messages";

// ——— SAMM 1: DETEKT (leia EN-sisust katmata tehnilised terminid) ———

const STOP = new Set(("the a an and or of for with to in on at by from is are be this that your you our we it its as well very more most all new high quality premium best great"
  + " x cm mm kg w v hz pcs set pack size color colour black white red blue green large small medium"
  // kataloogi-boilerplate (mitte tehnilised terminid, ei moodusta kasulikke bigramme)
  + " vevor model item number product package packaging warranty feature features include includes"
  + " description specification specifications detail details name type brand version").split(/\s+/));

/**
 * harvestCandidates — PUHAS: korja EN-tekstidest katmata (glossary'ga mitte-matchitud) sõna-fraasid 1–3 sõna.
 * Maski abil eemalda juba-kaetud vahemikud → ülejäänud tekstist n-gramm-kandidaadid + freq (dok-arv).
 * Tagastab [{en, freq}] kahanevalt. maxCand piirab LLM-filtri kulu.
 */
export function harvestCandidates(enTexts, entries, { maxCand = 120, minFreq = 2 } = {}) {
  const matchList = buildMatchList(entries);
  const freq = new Map();     // normaliseeritud fraas → {en, docs:Set}
  enTexts.forEach((text, di) => {
    const src = (text || "").toLowerCase();
    const masked = new Array(src.length).fill(false);
    for (const h of scanEnLongest(src, matchList)) for (let k = h.at; k < h.at + h.en.length; k++) if (k < masked.length) masked[k] = true;
    // tükelda maskimata segmentideks, korja sõnad
    let seg = "";
    const flush = () => {
      const words = seg.split(/[^a-z0-9-]+/).filter((w) => w.length >= 3 && !STOP.has(w) && !/^\d/.test(w));
      for (let n = 1; n <= 3; n++) for (let i = 0; i + n <= words.length; i++) {
        const gram = words.slice(i, i + n).join(" ");
        if (gram.length < 4) continue;
        const key = gram;
        if (!freq.has(key)) freq.set(key, { en: gram, docs: new Set() });
        freq.get(key).docs.add(di);
      }
      seg = "";
    };
    for (let k = 0; k < src.length; k++) { if (masked[k]) flush(); else seg += src[k]; }
    flush();
  });
  return [...freq.values()].map((v) => ({ en: v.en, freq: v.docs.size })).filter((c) => c.freq >= minFreq)
    .sort((a, b) => b.freq - a.freq).slice(0, maxCand);
}

const FILTER_SYS = `Sa oled XL e-poe (VEVOR tööriistad/kodu/aed) terminoloogia-kuraator. Sulle antakse inglise fraaside loend tootetekstidest. Vali AINULT need, mis on PÄRIS TEHNILISED/DOMEENI terminid, mis vajaksid järjepidevat eesti vastet kataloogis (seadme-tüübid, materjalid, tehnilised osad, ühikud). JÄTA VÄLJA: üldsõnad, turundus, omadussõnad, katkised fraasid, brändinimed. Vasta AINULT JSON:
{"terms":["<kanooniline inglise termin>", ...]}`;

/** filterGlossaryWorthy — Sonnet filtreerib kandidaatidest glossary-väärt terminid (batch). */
export async function filterGlossaryWorthy(sonnetCall, candidates, { batch = 40 } = {}) {
  const kept = [];
  for (let i = 0; i < candidates.length; i += batch) {
    const slice = candidates.slice(i, i + batch);
    const user = `Fraasid (freq = mitmes tootes esineb):\n${slice.map((c) => `- "${c.en}" (${c.freq})`).join("\n")}\n\nVali glossary-väärt tehnilised terminid.`;
    try {
      const r = await sonnetCall(FILTER_SYS, user, { maxTokens: 700 });
      const terms = (r && Array.isArray(r.terms)) ? r.terms : [];
      const freqOf = new Map(slice.map((c) => [normEn(c.en), c.freq]));
      for (const t of terms) { const en = String(t).trim(); if (en) kept.push({ en, freq: freqOf.get(normEn(en)) || 1 }); }
    } catch { /* batch viga → jäta vahele, fail-loud toimub kutsuja tasandil */ }
  }
  return kept;
}

/** makeAnthropicCall — tagastab async (system,user)→parsed-JSON. usage = {in,out} akumulaator (valikuline). */
export function makeAnthropicCall(apiKey, model, usage = null) {
  return async function call(system, user, { maxTokens = 400 } = {}) {
    const body = {
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: "user", content: user }],
    };
    // Fable 5: thinking alati sees → ära saada budget_tokens; madal effort mitte-reasoning ülesandele.
    const resp = await fetch(API_URL, {
      method: "POST",
      headers: { "content-type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify(body),
    });
    if (!resp.ok) throw new Error(`API ${resp.status} (${model})`);
    const j = await resp.json();
    if (usage && j.usage) { usage.in = (usage.in || 0) + (j.usage.input_tokens || 0); usage.out = (usage.out || 0) + (j.usage.output_tokens || 0); }
    const text = (j.content || []).filter((c) => c.type === "text").map((c) => c.text).join("");
    return extractJson(text);
  };
}

export function extractJson(text) {
  if (!text) return null;
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { /* leebe taaste allpool */ }
  // LEEBE TAASTE: mudel paneb vahel vabateksti-väljale (reason) jutumärke (sh tüpograafilised „...")
  // → JSON.parse kukub. Korja tuntud väljad regex'iga (agree/et/cluster/parent_l2_handle/reason).
  const raw = m[0];
  const obj = {};
  const b = raw.match(/"agree"\s*:\s*(true|false)/i); if (b) obj.agree = b[1].toLowerCase() === "true";
  const et = raw.match(/"et"\s*:\s*"([^"]*)"/); if (et) obj.et = et[1];
  const cl = raw.match(/"cluster"\s*:\s*"([^"]*)"/); if (cl) obj.cluster = cl[1];
  const ph = raw.match(/"parent_l2_handle"\s*:\s*"([^"]*)"/); if (ph) obj.parent_l2_handle = ph[1];
  const rs = raw.match(/"reason"\s*:\s*"([^"]*)/); if (rs) obj.reason = rs[1];
  const sp = raw.match(/"specialist"\s*:\s*(true|false)/i); if (sp) obj.specialist = sp[1].toLowerCase() === "true";
  const am = raw.match(/"ambiguous"\s*:\s*(true|false)/i); if (am) obj.ambiguous = am[1].toLowerCase() === "true";
  const eb = raw.match(/"en_base"\s*:\s*"([^"]*)"/); if (eb) obj.en_base = eb[1];
  const tb = raw.match(/"et_base"\s*:\s*"([^"]*)"/); if (tb) obj.et_base = tb[1];
  return Object.keys(obj).length ? obj : null;
}

const PROPOSE_SYS = `Sa oled XL e-poe (VEVOR tööriistad/kodu/aed) EN→ET terminoloog. Anna ÜHELE inglise tehnilisele terminile parim EESTI vaste e-poe kataloogi jaoks. Reeglid: päris eestikeelne (mitte inglise koopia/translit), lühike nimisõnafraas, väikese algustähega, EI turundus-hinnanguid. Vasta AINULT JSON:
{"et":"<eesti vaste>","cluster":"<tööriistad|tehniline|materjalid|ühikud|turundus>","confidence":"<high|med|low>"}`;

/** proposeEt — üks mudel pakub ET-vaste terminile (koos paari näidis-kontekstiga). Pime (ei näe teise pakkumist). */
export async function proposeEt(call, { en, contexts = [] }) {
  const ctx = contexts.slice(0, 4).map((c) => `· ${c}`).join("\n");
  const user = `Inglise termin: "${en}"
Esinemis-kontekstid (tootetekstidest):
${ctx || "(pole)"}

Anna parim eesti vaste.`;
  try { const r = await call(PROPOSE_SYS, user); return r && r.et ? { et: String(r.et).trim(), cluster: r.cluster || "tehniline", confidence: r.confidence || "med" } : null; }
  catch { return null; }
}

const CONFIRM_SYS = `Sa oled XL e-poe EN→ET terminoloogia-KINNITAJA. Kaks sõltumatut tõlkijat pakkusid SAMA eesti vaste ühele inglise terminile. Kas vaste on õige ja kataloogi-kõlbulik? Vasta AINULT JSON:
{"agree":true|false,"reason":"<1 lause>"}`;

/** confirmEt — Fable kinnitab konsensus-vaste (1 kutse). agree=false → konservatiivne defer. */
export async function confirmEt(fableCall, { en, et }) {
  const user = `Inglise termin: "${en}"\nPakutud eesti vaste (mõlemad tõlkijad nõus): "${et}"\nKas kinnitad?`;
  // Fable 5 thinking-always-on → vaja ruumi mõtlemisele + JSON-vastusele (400 liiga vähe → tekst tühi)
  try { const r = await fableCall(CONFIRM_SYS, user, { maxTokens: 1500 }); return r && typeof r.agree === "boolean" ? r : { agree: false, reason: "kinnitaja ei vastanud selgelt" }; }
  catch { return { agree: false, reason: "kinnitaja viga" }; }
}

const VOTE_SYS = `Sa oled XL e-poe EN→ET terminoloogia-VIIGIMURDJA. Kaks tõlkijat andsid ERINEVAD eesti vasted ühele inglise terminile. Vali PARIM (täpselt üks pakutuist) VÕI paku parem, kui mõlemad valed. Vasta AINULT JSON:
{"et":"<valitud või parem eesti vaste>","cluster":"<tööriistad|tehniline|materjalid|ühikud|turundus>"}`;

/** voteEt — Fable rounds× hääletus lahkheli korral; normaliseeritud ET-häälte enamus ≥ ceil(2/3·rounds). */
export async function voteEt(fableCall, { en, candidates = [], contexts = [], rounds = 3 }) {
  const opts = candidates.map((c) => `- "${c.et}" (${c.cluster})`).join("\n");
  const ctx = contexts.slice(0, 4).map((c) => `· ${c}`).join("\n");
  const user = `Inglise termin: "${en}"
Kontekstid:
${ctx || "(pole)"}
Tõlkijate pakkumised:
${opts}

Vali parim eesti vaste.`;
  const tally = {}; const picks = [];
  for (let i = 0; i < rounds; i++) {
    let et = null, cluster = "tehniline";
    try { const r = await fableCall(VOTE_SYS, user, { maxTokens: 1500 }); if (r && r.et) { et = String(r.et).trim(); cluster = r.cluster || cluster; } } catch { et = null; }
    if (et) { const key = normEn(et); tally[key] = tally[key] || { et, cluster, n: 0 }; tally[key].n++; picks.push(et); } else picks.push(null);
  }
  const top = Object.values(tally).sort((a, b) => b.n - a.n)[0] || null;
  const need = Math.ceil((2 * rounds) / 3);
  const stable = !!(top && top.n >= need);
  return { winner: stable ? { et: top.et, cluster: top.cluster } : null, tally, picks, rounds, need, stable };
}

const CLASSIFY_SYS = `Sa oled XL e-poe (VEVOR tööriistad/kodu/aed) terminoloogia-kohtunik. Otsusta ÜHE inglise fraasi kohta:
1. ERIALATERMIN? Kas see on eriala/tehniline termin, mille eesti vaste vajab kataloogis ÜHTLUSTAMIST (nt "pallet jack", "torque wrench", "angle grinder", "ratchet strap")? VÕI üldsõnavara, mida iga eestlane oskab tõlkida (door=uks, table=laud, base=alus, plastic=plast, aluminum=alumiinium, inches=tollid, steel=teras)? ÜLDSÕNAVARA EI vaja glossaryt → specialist=false.
2. MITMETÄHENDUSLIK? Kas fraasil on selles kataloogis mitu ERINEVAT eesti tähendust, mis sõltuvad kontekstist? → ambiguous=true. NÄITED (need PEAVAD olema ambiguous=true):
   - "load" = koormus (mehaaniline) VÕI last (veos) VÕI laadimine (tegevus)
   - "construction" = konstruktsioon (ehitis-struktuur) VÕI ehitus (ehitamine)
   - "duty" = vastupidavus (heavy duty) VÕI kohustus VÕI tollimaks
   - "table" = laud VÕI tabel · "spring" = vedru VÕI kevad · "plant" = taim VÕI tehas
   Kui sõna eesti vaste MUUTUB sõltuvalt sellest, mis tootega tegu → ambiguous=true (ühtne glossary-vaste eksitaks).
Vasta AINULT JSON: {"specialist":true|false,"ambiguous":true|false,"reason":"<1 lause eesti keeles>"}`;

/** classifyTerm — LLM-kohtunik: kas erialatermin (ühtlustamist vajav) + kas mitmetähenduslik. Odav eel-värav (1 kutse). */
export async function classifyTerm(call, { en, contexts = [] }) {
  const ctx = contexts.slice(0, 4).map((c) => `· ${c}`).join("\n");
  const user = `Inglise fraas: "${en}"\nEsinemis-kontekstid:\n${ctx || "(pole)"}\n\nKas erialatermin (vajab ühtlustamist)? Kas mitmetähenduslik?`;
  try { const r = await call(CLASSIFY_SYS, user, { maxTokens: 400 }); if (!r) return null; return { specialist: r.specialist === true, ambiguous: r.ambiguous === true, reason: r.reason || "" }; }
  catch { return null; }
}

/**
 * classifyTermVoted — (Tarmo 2026-10-11 p2) SPECIALIST-KOHTUNIK 3× hääletus (§2c asümmeetriline kindlus).
 * Glossary-termin on STRUKTUURNE (mõjutab kogu kataloogi tekste) → LUKUSTAMINE (permissiivne suund) nõuab
 * STABIILSUST, mitte üksikut mündiviset. "net weight" kõikumine (defer↔lock) tõestas vajadust.
 *   - specialist=true AINULT kui KÕIK vastanud ringid ühehäälselt specialist=true (ühehäälne, mitte 2/3).
 *   - ambiguous=true kui VÄHEMALT ÜKS ring lipistab mitmetähenduslikkuse (restriktiivne suund → ohutu vaikimisi).
 * Ebastabiilne specialist (kõik ringid ei nõustu) → specialist=false → DEFER (konservatiivne).
 * Tagastab { specialist, ambiguous, votes:{sT,sF,aT,answered,rounds}, stable, reason }.
 */
export async function classifyTermVoted(call, { en, contexts = [] }, { rounds = 3 } = {}) {
  let sT = 0, sF = 0, aT = 0, answered = 0; const reasons = [];
  for (let i = 0; i < rounds; i++) {
    const r = await classifyTerm(call, { en, contexts });
    if (!r) continue;
    answered++;
    if (r.specialist) sT++; else sF++;
    if (r.ambiguous) aT++;
    if (r.reason) reasons.push(r.reason);
  }
  // LUKUSTAMINE nõuab ühehäälset specialist=true üle KÕIGI ringide (answered === rounds + sT === rounds).
  const specialist = answered === rounds && sT === rounds;
  // MITMETÄHENDUSLIKKUS: ükski lipp → ambiguous (ohutu vaikimisi, restriktiivne suund).
  const ambiguous = aT >= 1;
  const stable = answered === rounds && (sT === rounds || sF === rounds);
  return { specialist, ambiguous, votes: { sT, sF, aT, answered, rounds }, stable, reason: reasons[0] || "" };
}

const BASEFORM_SYS = `Anna inglise termini ja selle eesti vaste ALGVORMID (lemma). EN: nimetav ainsus (inch, mitte inches; wheel, mitte wheels). ET: nimetav ainsus (toll, mitte tolli; plaat, mitte plaadid; alus, mitte alused). Kui on juba algvormis, korda. Vasta AINULT JSON: {"en_base":"<en lemma>","et_base":"<et lemma>"}`;

/** toBaseForm — LLM lemmatiseerib EN + ET algvormi (toll, mitte tolli). Viga → tagasta originaalid. */
export async function toBaseForm(call, { en, et }) {
  const user = `EN: "${en}"\nET: "${et}"\nAnna mõlema algvorm (lemma, nimetav ainsus).`;
  try { const r = await call(BASEFORM_SYS, user, { maxTokens: 300 }); if (!r) return { enBase: en, etBase: et }; return { enBase: (r.en_base || en).trim(), etBase: (r.et_base || et).trim() }; }
  catch { return { enBase: en, etBase: et }; }
}

/**
 * resolveGlossaryTerm — ORKESTRAATOR (üks sissepääs). Tagastab otsuse + tee (audit/DRY-näit).
 *   { en, decision:'locked'|'defer'|'skip', et|null, cluster|null, aliases, path:[sammud], origin, gates?, signal? }
 * entries = olemas glossary (gate'ideks); sampleEnTexts = match-ohutuse + mõjuraadiuse valim; corpusSize = elus-toodete arv.
 */
export async function resolveGlossaryTerm({ en, contexts = [], opusCall, sonnetCall, fableCall, entries = [], sampleEnTexts = [], freq = 1, corpusSize = 0, phraseEns = [] }) {
  const path = [];
  // 2. DUP (kiire, mudeli-eelne)
  const dupEntry = entries.find((e) => [e.en, ...(e.aliases || [])].some((f) => normEn(f) === normEn(en)));
  if (dupEntry) return { en, decision: "skip", et: dupEntry.et, cluster: dupEntry.cluster, path: ["DUP: juba glossarys"], origin: "dup-skip" };

  // 2.4 FRAGMENT eel-värav (Tarmo 2026-10-11 p1): ühesõnaline tükk mitmesõnalisest ("duty" ⊂ "heavy duty")
  //     → defer ENNE kallist classify/propose't. phraseEns = kogu partii + glossary EN-vormid.
  const fg = fragmentGate({ en }, { phraseEns });
  if (!fg.pass) return { en, decision: "defer", et: null, cluster: null, path: [`FRAGMENT värav: ${fg.note}`], origin: "fragment" };

  // 2.5 ERIALATERMIN eel-värav (Tarmo 2026-10-11 p2/p3): 3× hääletus (struktuurne otsus → stabiilsus).
  //     üldsõnavara / ebastabiilne specialist / mitmetähenduslik → defer ENNE kallist propose't.
  const cls = await classifyTermVoted(sonnetCall, { en, contexts }, { rounds: 3 });
  const isSpecialist = cls.specialist;
  const isAmbiguous = cls.ambiguous;
  path.push(`erialatermin-hääletus ${cls.votes.sT}/${cls.votes.answered} (ühehäälne vaja) → ${isSpecialist} · mitmetähenduslik-lipud ${cls.votes.aT}/${cls.votes.answered} → ${isAmbiguous}${cls.reason ? ` (${cls.reason})` : ""}`);
  const sg = specialistGate({ en, isSpecialist, isAmbiguous });
  if (!sg.pass) return { en, decision: "defer", et: null, cluster: null, path: [...path, `ERIALATERMIN värav: ${sg.note}`], origin: "not-specialist" };

  // 3. sõltumatud ettepanekud (pime, paralleelselt)
  const [opus, sonnet] = await Promise.all([proposeEt(opusCall, { en, contexts }), proposeEt(sonnetCall, { en, contexts })]);
  path.push(`Opus→${opus ? `'${opus.et}'` : "(tühi)"}, Sonnet→${sonnet ? `'${sonnet.et}'` : "(tühi)"}`);

  let chosen = null, origin = null;
  if (!opus && !sonnet) {
    return { en, decision: "defer", et: null, cluster: null, path: [...path, "mõlemad tühjad → defer"], origin: "both-empty" };
  }

  const agree = opus && sonnet && normEn(opus.et) === normEn(sonnet.et);
  if (agree) {
    // 4a. konsensus → 1× Fable kinnitus
    const conf = await confirmEt(fableCall, { en, et: opus.et });
    path.push(`konsensus '${opus.et}' → Fable kinnitus: ${conf.agree ? "JAH" : "EI"} (${conf.reason || ""})`);
    if (conf.agree) { chosen = { et: opus.et, cluster: opus.cluster }; origin = "consensus+confirm"; }
    else return { en, decision: "defer", et: null, cluster: null, path, origin: "confirm-rejected" };
  } else if (opus && sonnet) {
    // 4b. lahkheli → Fable 3× hääletus
    const vote = await voteEt(fableCall, { en, candidates: [opus, sonnet], contexts, rounds: 3 });
    path.push(`lahkheli → Fable ${vote.rounds}× (vaja ${vote.need}): ${JSON.stringify(Object.fromEntries(Object.values(vote.tally).map((t) => [t.et, t.n])))} → ${vote.stable ? `'${vote.winner.et}'` : "enamust pole"}`);
    if (vote.stable) { chosen = vote.winner; origin = "disagree+vote"; }
    else return { en, decision: "defer", et: null, cluster: null, path, origin: "vote-no-majority" };
  } else {
    // ainult üks mudel pakkus → kohtle lahkhelina, 1 kandidaat → Fable kinnitab
    const only = opus || sonnet;
    const conf = await confirmEt(fableCall, { en, et: only.et });
    path.push(`ainult üks pakkus '${only.et}' → Fable kinnitus: ${conf.agree ? "JAH" : "EI"}`);
    if (conf.agree) { chosen = { et: only.et, cluster: only.cluster }; origin = "single+confirm"; }
    else return { en, decision: "defer", et: null, cluster: null, path, origin: "single-rejected" };
  }

  // 4.5 ALGVORM (Tarmo 2026-10-11): lemmatiseeri EN + ET enne väravaid (salvesta algvorm).
  const bf = await toBaseForm(sonnetCall, { en, et: chosen.et });
  path.push(`algvorm: EN='${bf.enBase}' ET='${bf.etBase}'`);

  // 5. väravad (DUP → erialatermin → algvorm → kehtivus → mõjuraadius → match-ohutus → freq)
  const g = runAllGates(
    { en, et: chosen.et, cluster: chosen.cluster, freq, aliases: [], isSpecialist, isAmbiguous, enBase: bf.enBase, etBase: bf.etBase, corpusSize },
    { entries, sampleEnTexts, phraseEns }
  );
  path.push(g.allPass ? `väravad OK → ${g.status}` : `värav kukkus: ${g.blocking.join("; ")}`);
  if (!g.allPass) return { en, decision: "defer", et: g.canonicalEt || chosen.et, cluster: chosen.cluster, path, origin: `${origin}+gate-fail`, gates: g.gates, signal: g.signal === true };
  return { en: g.canonicalEn || en, decision: g.status, et: g.canonicalEt || chosen.et, cluster: chosen.cluster, aliases: g.aliases || [], path, origin, gates: g.gates };
}
