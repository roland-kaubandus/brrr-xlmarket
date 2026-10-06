#!/usr/bin/env node
/**
 * search-check.mjs — otsingu tervisekontroll (A5, fail-loud). Küsib Meili products-indeksit
 * iga termini kohta → nbHits + kirillitsa-lipp + top-1 pealkiri. Enne/pärast võrdluseks.
 *
 * Kasutus:
 *   node scripts/search-check.mjs --terms '["tankur","rollaator",...]' --out reports/search-before.json
 *   node scripts/search-check.mjs --terms-file /tmp/terms.json --out reports/search-after.json
 * Meili-päring käib medusa-konteineri kaudu (seal on MEILISEARCH_HOST + võti).
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const val = (f, d) => { const i = process.argv.indexOf(f); return i > 0 ? process.argv[i + 1] : d; };
const OUT = val("--out", "");
let terms;
if (val("--terms-file")) terms = JSON.parse(fs.readFileSync(val("--terms-file"), "utf8"));
else terms = JSON.parse(val("--terms", "[]"));
if (!terms.length) { console.error("Termineid pole (--terms või --terms-file)."); process.exit(2); }

// peamine medusa-konteiner (mitte -worker — seal pole võrku/võtit samamoodi)
const MED = execSync("docker ps --format '{{.Names}}' | grep -i medusa | grep -v worker | head -1", { encoding: "utf8" }).trim();
const CYR = /[Ѐ-ӿ]/;

function search(q) {
  const body = JSON.stringify({ q, limit: 5, attributesToRetrieve: ["title", "title_et"] });
  // node fetch medusa SEEST (curl puudub konteineris); host+võti env-is; query base64 arg (väldib shell-escape'i)
  const b64 = Buffer.from(body).toString("base64");
  const prog = `const b=Buffer.from(process.argv[1],'base64').toString();fetch(process.env.MEILISEARCH_HOST+'/indexes/products/search',{method:'POST',headers:{Authorization:'Bearer '+process.env.MEILISEARCH_API_KEY,'Content-Type':'application/json'},body:b}).then(r=>r.text()).then(t=>{process.stdout.write(t)}).catch(e=>{process.stdout.write(JSON.stringify({error:String(e)}))})`;
  const out = execSync(`docker exec -i ${MED} node -e ${JSON.stringify(prog)} ${b64}`, { encoding: "utf8", maxBuffer: 1 << 26 });
  const j = JSON.parse(out);
  if (j.error) throw new Error(`Meili-päring kukkus: ${j.error}`);
  const hits = j.hits || [];
  const titles = hits.map((h) => h.title_et || h.title || "");
  return { term: q, nbHits: j.estimatedTotalHits ?? j.nbHits ?? hits.length, cyrillic: titles.some((t) => CYR.test(t)), top: titles.slice(0, 3) };
}

const results = terms.map(search);
for (const r of results) console.log(`${r.cyrillic ? "⚠️КИР" : "  "} ${String(r.nbHits).padStart(5)}  "${r.term}"  → ${r.top[0] || "(0)"}`);
if (OUT) { fs.writeFileSync(OUT, JSON.stringify({ at: new Date().toISOString(), results }, null, 2)); console.log(`💾 ${OUT}`); }
