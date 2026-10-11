/**
 * parent-l2-vote.mjs — Shadow-ettepaneku VANEM-L2 KÕIKUMISE auto-lahendus (HARD RULE #5 + #6).
 *
 * Probleem (Tarmo 2026-10-11, «Lavavalgustid» 3 ööd): sama uue-L3 ettepanek saab eri öödel ERI vanem-L2
 *   (09: peoinventar, 10: muusika-DJ-lavatehnika, 11: peoinventar) → mittestabiilne. Vale koju EI tohi luua,
 *   AGA inimese otsuseks EI tohi jätta (HARD RULE #6 — masin lahendab ise).
 *
 * Lahendus: kui ettepaneku vanem-L2 KÕIGUB ajaloos (shadow-ledger: ≥2 eri parent_l2 sama nime/võtme kohta) →
 *   Fable 3× hääletus AINULT vanem-L2 küsimuses → stabiilne enamus (≥2/3) → see ONGI vanem → loo.
 *   Enamust pole → EI loo (defer + signaal); tooted jäävad olemas-koju/review (ohutu vaikimisi).
 *
 * §2c asümmeetriline kindlus: vanem-L2 = STRUKTUURI-otsus → nõuab stabiilsust (3× hääletus), erinevalt
 *   toote-paigutusest (1 kutse). Üks mittedeterministlik Fable-kutse EI ole tõe-allikas struktuurile.
 *
 * ÜKS transform, kõik kutsujad (HARD RULE #5): öine hook kutsub resolveStableParent iga shadow-new_l3 kohal;
 *   iga tulevane auto-create kutsuja SAMA funktsiooni. Kõigub-detekt loeb ledgerit, hääletus on puhas (I/O-vaba
 *   peale injekteeritud fableRaw) → testitav.
 *
 * q = psql-helper (sql[, tuplesOnly=true]) → raw string. fableRaw = makeFable(apiKey, usage) (classify-chain.mjs).
 */

const esc = (s) => String(s ?? "").replace(/'/g, "''");

/**
 * detectParentWaver — kas ettepaneku vanem-L2 on ajaloos kõikunud?
 * Loeb shadow-ledgerist DISTINCT parent_l2_handle sama cluster_key VÕI sama proposed_name kohta
 * (nimi robustsem — cluster_key võib SPU-grupeeringu muutudes öödest erineda). currentParentL2 lisatakse hulka.
 * Wavering = ≥2 eri vanemat (ajalugu + praegune). Ledger puudub/viga → ei kõigu (ohutu, ei blokeeri alust).
 * Tagastab { wavering, distinctParents:[handle], history:[handle] }.
 */
export function detectParentWaver(q, { cluster_key, proposed_name, currentParentL2 } = {}) {
  let hist = [];
  try {
    const rows = q(`SELECT DISTINCT coalesce(parent_l2_handle,'') FROM classifier_shadow_ledger
                    WHERE parent_l2_handle IS NOT NULL AND parent_l2_handle <> ''
                      AND (cluster_key = '${esc(cluster_key)}' OR lower(proposed_name) = lower('${esc(proposed_name)}'))`).trim();
    hist = rows ? rows.split("\n").map((l) => l.trim()).filter(Boolean) : [];
  } catch { hist = []; }
  const set = new Set(hist);
  if (currentParentL2) set.add(currentParentL2);
  const distinctParents = [...set];
  return { wavering: distinctParents.length >= 2, distinctParents, history: hist };
}

/**
 * voteParentL2Only — Fable `rounds`× hääletus AINULT vanem-L2 küsimuses (candidates = vaidlusalused L2-d).
 * Küsib iga kord: kuhu L2-sse uus L3 «name» kuulub (kus OSTJA otsib). Häälte-tabel → enamus ≥ ceil(2/3·rounds).
 * fableRaw võib visata/tagastada JSON ilma handle'ita → see hääl = null (ei loe). Tagastab
 * { winner|null, tally, votes, rounds, need, stable }.
 */
export async function voteParentL2Only({ fableRaw, proposedName, sampleTitles = [], candidates = [], l2NameOf = (h) => h, rounds = 3 } = {}) {
  const opts = candidates.map((h) => `- ${h}  («${l2NameOf(h)}»)`).join("\n");
  const titles = sampleTitles.slice(0, 12).map((t) => `· ${t}`).join("\n");
  const system = `Sa oled XL e-poe taksonoomia-viigimurdja (VEVOR-tooted). Ülesanne: vali uuele L3-kategooriale ÕIGE vanem-L2 — kus OSTJA seda tootetüüpi otsib (funktsionaalne domeen), MITTE tootja-kategooria. Vasta AINULT JSON-iga:
{"parent_l2_handle":"<täpselt üks handle allolevast nimekirjast>","reason":"<1 lause>"}`;
  const user = `Uus L3: «${proposedName}»

Tooted (näidised):
${titles || "(pole)"}

Vaidlusalused vanem-L2 (vali TÄPSELT ÜKS allolevast):
${opts}

Kumba L2-sse see L3 primaarselt kuulub?`;
  const tally = {}; const votes = [];
  for (let i = 0; i < rounds; i++) {
    let pick = null;
    try { const v = await fableRaw(system, user); pick = (v && v.parent_l2_handle) || null; } catch { pick = null; }
    if (pick && candidates.includes(pick)) { tally[pick] = (tally[pick] || 0) + 1; votes.push(pick); }
    else votes.push(null);
  }
  const top = Object.entries(tally).sort((a, b) => b[1] - a[1])[0] || null;
  const need = Math.ceil((2 * rounds) / 3);   // 3 → 2
  const stable = !!(top && top[1] >= need);
  return { winner: stable ? top[0] : null, tally, votes, rounds, need, stable };
}

/**
 * resolveStableParent — orkestraator (ÜKS sissepääs kutsujatele):
 *   ei kõigu → { parent: currentParentL2, stable:true, voted:false }   (jäta nagu on)
 *   kõigub + enamus → { parent: winner, stable:true, voted:true, tally } (vanem lukus → loo)
 *   kõigub + enamust pole → { parent:null, stable:false, voted:true, tally, reason } (defer + signaal → EI loo)
 */
export async function resolveStableParent(q, fableRaw, { cluster_key, proposed_name, currentParentL2, sampleTitles = [], l2NameOf = (h) => h, rounds = 3 } = {}) {
  const waver = detectParentWaver(q, { cluster_key, proposed_name, currentParentL2 });
  if (!waver.wavering) {
    return { parent: currentParentL2 || null, stable: true, voted: false, wavering: false, distinctParents: waver.distinctParents };
  }
  const vote = await voteParentL2Only({ fableRaw, proposedName: proposed_name, sampleTitles, candidates: waver.distinctParents, l2NameOf, rounds });
  if (vote.stable) {
    return { parent: vote.winner, stable: true, voted: true, wavering: true, distinctParents: waver.distinctParents, tally: vote.tally, votes: vote.votes };
  }
  return {
    parent: null, stable: false, voted: true, wavering: true, distinctParents: waver.distinctParents, tally: vote.tally, votes: vote.votes,
    reason: `vanem-L2 kõigub (${waver.distinctParents.join(" vs ")}) + Fable ${vote.rounds}× ei andnud enamust (${JSON.stringify(vote.tally)}) → EI loo, tooted olemas-koju/review`,
  };
}
