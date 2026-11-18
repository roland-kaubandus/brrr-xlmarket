#!/usr/bin/env node
/**
 * kiht2-regress-sim.mjs — SIMULATSIOON (mitte live): kui KIHT 2 folk-terminid lisada
 * sünonüümidena, mitu otsingusõna PARANEKS? 0 LLM-kulu, ainult Meili-päringud (read-only).
 *
 * LOOGIKA (aus lähend, EI muuda Meili't):
 *   Termin "paraneks", kui PRAEGU Meili annab talle vähe tulemusi (< lävi), AGA tema siht-L3-l
 *   ON tooteid (≥3). Siis folk→product_synonym→L3-tooted lisaks selle termini leitavuse.
 *   (Kui termin juba leiab palju → KIHT 1/pärand katab, KIHT 2 ei lisa katvust.)
 *
 * KAKS mõõtu:
 *   [A] Regressioon-korpus (reports/otsing-regress-sonad.txt): mitu praegu kukub, mitu KIHT 2 kataks.
 *   [B] Net-uus katvus: valim konsensus-termineid → mitu praegu <3 tulemust annab kuid L3-l ≥3 toodet.
 *
 * Kasutus: node scripts/kiht2-regress-sim.mjs [--sample 400] [--low 3]
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const SAMPLE = parseInt(arg("--sample", "400"), 10);
const LOW = parseInt(arg("--low", "3"), 10);
const VJSON = path.join(ROOT, "reports", "kiht2-sonavara-dry.json");
const REGRESS = path.join(ROOT, "reports", "otsing-regress-sonad.txt");
const OUT = path.join(ROOT, "reports", "kiht2-regress-sim.md");
const MED = execSync("docker ps --format '{{.Names}}' | grep -E '^medusa-k33g' | grep -v worker | head -1", { encoding: "utf8" }).trim();

// ÜKS container-kutse: päri Meili hits KÕIGILE terminitele. Skript + terminid base64-env'ina
// (väldib shell/`\n`-escape-probleemi `node -e` juures). stdout = JSON map.
function meiliHitsBulk(terms) {
  const script = `
const H=process.env.MEILISEARCH_HOST||"http://127.0.0.1:7700",K=process.env.MEILISEARCH_KEY;
(async()=>{
  const terms=JSON.parse(Buffer.from(process.env.TERMS_B64,"base64").toString("utf8"));const out={};
  for(const t of terms){try{
    const r=await fetch(H+"/indexes/products/search",{method:"POST",headers:{Authorization:"Bearer "+K,"Content-Type":"application/json"},body:JSON.stringify({q:t,limit:0})});
    const j=await r.json();out[t]=j.estimatedTotalHits||0;
  }catch(e){out[t]=-1;}}
  process.stdout.write(JSON.stringify(out));
})();`;
  const scB64 = Buffer.from(script, "utf8").toString("base64");
  const tB64 = Buffer.from(JSON.stringify(terms), "utf8").toString("base64");
  const res = execSync(
    `docker exec -e TERMS_B64=${tB64} -e SC_B64=${scB64} ${MED} sh -c 'printf %s "$SC_B64" | base64 -d > /tmp/mh.cjs && node /tmp/mh.cjs'`,
    { encoding: "utf8", maxBuffer: 1 << 26 });
  return JSON.parse(res);
}

function parseRegress() {
  const out = [];
  for (const raw of fs.readFileSync(REGRESS, "utf8").split("\n")) {
    const t = raw.replace(/\r$/, "").trim(); if (!t || t.startsWith("#")) continue;
    const m = t.split("\t"); const word = m[0].trim(); const min = m[1] ? parseInt(m[1].trim(), 10) || 1 : 1;
    if (word) out.push({ word, min });
  }
  return out;
}

function main() {
  const V = JSON.parse(fs.readFileSync(VJSON, "utf8"));
  // termin → siht-L3-de max tootearv (folk-termin "kuulub" kõigile L3-dele kus esineb)
  const termL3n = new Map();
  for (const r of V.l3) {
    for (const e of [...(r.folk_consensus || []), ...(r.folk_candidate || [])]) {
      const prev = termL3n.get(e.term) || 0; termL3n.set(e.term, Math.max(prev, r.n));
    }
  }
  const consensusTerms = [];
  for (const r of V.l3) for (const e of (r.folk_consensus || [])) if (r.n >= 3) consensusTerms.push(e.term);
  const uniqCons = [...new Set(consensusTerms)];

  // valim net-uue katvuse mõõtmiseks
  const sample = uniqCons.length <= SAMPLE ? uniqCons : (() => { const a = [...uniqCons]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a.slice(0, SAMPLE); })();

  const regress = parseRegress();
  const allQ = [...new Set([...regress.map(r => r.word), ...sample])];
  console.error(`[sim] ${regress.length} regress-sõna + ${sample.length} konsensus-valim = ${allQ.length} Meili-päringut (medusa=${MED})`);
  const hits = meiliHitsBulk(allQ);

  // [A] regressioon-korpus
  const regFail = regress.filter(r => (hits[r.word] ?? 0) < r.min);
  const regFixable = regFail.filter(r => (termL3n.get(r.word) || 0) >= 3);

  // [B] net-uus katvus valimis
  const netNew = sample.filter(t => (hits[t] ?? 0) < LOW && (termL3n.get(t) || 0) >= 3);
  const rate = sample.length ? netNew.length / sample.length : 0;
  const estTotal = Math.round(rate * uniqCons.length);

  const L = [`# KIHT 2 — regressioon + katvuse SIMULATSIOON (DRY)\n`,
    `**${new Date().toISOString().slice(0, 10)} · simulatsioon Meili vastu, EI muudetud indeksit · 0 LLM-kulu**\n`,
    `> "Paraneks" = termin annab praegu <lävi tulemust, AGA tema siht-L3-l on tooteid → sünonüüm-lisa tõstaks leitavuse.\n`,
    `## [A] Regressioon-korpus (otsing-regress-sonad.txt)`,
    `- Sõnu korpuses: **${regress.length}**`,
    `- Praegu kukub (<min): **${regFail.length}** ${regFail.length ? "(" + regFail.map(r => `${r.word}=${hits[r.word]}`).join(", ") + ")" : ""}`,
    `- Neist KIHT 2 kataks (termin on mõne L3 folk-sõna, L3-l ≥3 toodet): **${regFixable.length}** ${regFixable.length ? "(" + regFixable.map(r => r.word).join(", ") + ")" : ""}`,
    `- Järeldus: KIHT 1 juba katab enamiku korpusest; KIHT 2 väärtus on KORPUSE-VÄLINE (uued rahvaterminid).\n`,
    `## [B] Net-uus katvus (konsensus-terminite valim)`,
    `- Unikaalseid konsensus-termineid (L3 ≥3 toodet): **${uniqCons.length}**`,
    `- Valim mõõdetud: **${sample.length}**`,
    `- Valimis "net-uus" (praegu <${LOW} tulemust, kuid L3-l ≥3 toodet): **${netNew.length}** (${(rate * 100).toFixed(1)}%)`,
    `- **Ekstrapoleeritud net-uus katvus kogu konsensusele: ~${estTotal} terminit**, mida KIHT 2 teeks leitavaks.`,
    `\n### Näiteid net-uutest (praegu leidmatud → KIHT 2 kataks)`,
    ...netNew.slice(0, 25).map(t => `- \`${t}\` (praegu ${hits[t]} tulemust)`),
    `\n_NB: ekstrapolatsioon valimist; täpne arv selgub live-sünkimisel. Simulatsioon ≠ live._`];
  fs.writeFileSync(OUT, L.join("\n"));
  console.error(`✅ SIM: regress ${regFixable.length}/${regFail.length} kaetav · net-uus valimis ${netNew.length}/${sample.length} → ~${estTotal} kokku\n   → ${OUT}`);
  console.log(JSON.stringify({ regress_total: regress.length, regress_fail: regFail.length, regress_fixable: regFixable.length, consensus_uniq: uniqCons.length, sample: sample.length, netnew_sample: netNew.length, netnew_est: estTotal }));
}
main();
