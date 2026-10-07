#!/usr/bin/env node
/**
 * measure-l3desc-impact.mjs — LAINE 2 MÕÕTMINE (Tarmo DIRECTIVE punkt 4, 2026-10-07).
 *
 * EESMÄRK: mõõda L3-kirjelduste backfilli MÕJU klassifikaatori-otsustele.
 *   KOHTUNIK (Opus) saab kandidaat-L3-d KOOS LIVE `product_category.description`-ga (production-like:
 *     pipeline-classify-chain buildib candidateL3s'i samamoodi otse DB-st → kirjeldus jõuab candLine'i).
 *   REFERENTS (Sonnet) saab kandidaadid AINULT NIMEGA (pime — nagu kalibreerimine alati).
 *   → kokkulangevus (judge↔ref) ENNE backfilli (kirjeldused tühjad) vs PÄRAST (kirjeldused täis).
 *
 * Backfill muudab AINULT DB-seisu (product_category.description). Harness loeb LIVE → ENNE/PÄRAST
 * vahe tuleb DB-seisust, mitte lipust. `--label before|after` ainult sildistab väljundi.
 *
 * VALIM: deterministlik (ORDER BY md5(product_id||seed)) classification_review seast. Kui 0 pending,
 *   kasutame KÕIKI ridu (status-agnostiline) → korratav fikseeritud valim mõlemal jooksul.
 *
 * Kasutus:
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/measure-l3desc-impact.mjs --label before --sample 150 --json /opt/eumotors-tasks/reports/l3desc-measure-before.json
 *   # ... jooksuta backfill ...
 *   node scripts/measure-l3desc-impact.mjs --label after  --sample 150 --json /opt/eumotors-tasks/reports/l3desc-measure-after.json
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const argv = process.argv;
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i > 0 ? argv[i + 1] : d; };
const LABEL = val("--label", "run");
const SAMPLE = parseInt(val("--sample", "150"), 10);
const SEED = val("--seed", "xlm");
const BATCH = parseInt(val("--batch", "6"), 10);
const JSON_OUT = val("--json");

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("ANTHROPIC_API_KEY puudub — set -a; . /opt/eumotors-tasks/.env; set +a"); process.exit(2); }

// hinnad $/1M (claude-api skill, cache 2026-06-24): Opus $5/$25, Sonnet-5 $3/$15
const PRICE = { "claude-opus-4-8": [5, 25], "claude-sonnet-5": [3, 15] };
let cost = 0;
const addCost = (model, usage) => {
  if (!usage) return;
  const [pi, po] = PRICE[model] || [0, 0];
  const cin = (usage.input_tokens || 0) + (usage.cache_read_input_tokens || 0) * 0.1 + (usage.cache_creation_input_tokens || 0) * 1.25;
  cost += (cin * pi + (usage.output_tokens || 0) * po) / 1e6;
};

let _db;
const db = () => (_db ||= execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim());
const q = (sql) => execSync(`docker exec -i ${db()} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
const jsonRows = (sql) => q(sql).trim().split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };

const { judgeClassifyClusters, rateClassifyReferenceClusters, clusterize, CLSF_JUDGE_MODEL, REF_MODEL_CLSF } = await import("./lib/judge.mjs");

// ── 1) kandidaat-L3-d: leht-L3-d + LIVE nimi + description DB-st ──
const tree = JSON.parse(fs.readFileSync(new URL("../storefront/lib/category-tree.generated.json", import.meta.url)));
const leafHandles = new Set(Object.values(tree.nodes).filter((n) => !(n.child_handles && n.child_handles.length)).map((n) => n.handle));
const catRows = jsonRows(`SELECT jsonb_build_object('h',handle,'n',name,'d',coalesce(description,''))::text FROM product_category WHERE handle LIKE 'v4-%'`);
const candWithDesc = [];   // KOHTUNIK: nimi + kirjeldus (production-like)
const candNameOnly = [];   // REFERENTS: ainult nimi (pime)
let withDescN = 0;
for (const r of catRows) {
  if (!leafHandles.has(r.h)) continue;
  candWithDesc.push({ handle: r.h, name: r.n, description: r.d });
  candNameOnly.push({ handle: r.h, name: r.n });
  if (r.d && r.d.trim()) withDescN++;
}
console.log(`[MÕÕTMINE · ${LABEL}] kohtunik=${CLSF_JUDGE_MODEL} referents=${REF_MODEL_CLSF}`);
console.log(`kandidaate(leht-L3)=${candWithDesc.length} · neist kirjeldusega=${withDescN} (${(withDescN / candWithDesc.length * 100).toFixed(1)}%)`);

// ── 2) fikseeritud valim classification_review seast (deterministlik) ──
const pendingN = +q(`SELECT count(*) FROM classification_review WHERE status='pending'`).trim();
const statusFilter = pendingN > 0 ? `WHERE cr.status='pending'` : ``; // 0 pending → kõik read (fikseeritud)
const data = jsonRows(`
  SELECT jsonb_build_object(
    'id', cr.product_id, 'title', coalesce(nullif(trim(cr.title),''),p.title,''),
    'title_et', coalesce(p.metadata->>'title_et',''), 'description', left(coalesce(p.description,''),400),
    'bucket', cr.bucket, 'proposed_l3', coalesce(cr.proposed_l3,''),
    'meta', jsonb_build_object('vevor_spu', p.metadata->>'vevor_spu', 'vevor_product_type', p.metadata->>'vevor_product_type')
  )::text
  FROM classification_review cr
  LEFT JOIN product p ON p.id = cr.product_id
  ${statusFilter}
  ORDER BY md5(cr.product_id || '${SEED}')
  LIMIT ${SAMPLE}`);
const clusters = clusterize(data);
console.log(`valim=${data.length} toodet (pending=${pendingN}${pendingN === 0 ? " → kõik read, fikseeritud" : ""}) → ${clusters.length} klastrit\n`);

// ── 3) KOHTUNIK (kirjeldustega) ──
const clVerdicts = [];
for (const b of chunk(clusters, BATCH)) {
  const res = await judgeClassifyClusters(b, candWithDesc, { apiKey: API_KEY });
  if (!res.ok) { console.error(`  ⚠️ kohtuniku-batch kukkus: ${res.error}`); continue; }
  clVerdicts.push(...res.results);
  addCost(CLSF_JUDGE_MODEL, res.usage);
}
// ── 4) REFERENTS (ainult nimed, pime) ──
const refVerdicts = [];
for (const b of chunk(clusters, BATCH)) {
  const res = await rateClassifyReferenceClusters(b, candNameOnly, { apiKey: API_KEY });
  if (!res.ok) { console.error(`  ⚠️ referentsi-batch kukkus: ${res.error}`); continue; }
  refVerdicts.push(...res.results);
  addCost(REF_MODEL_CLSF, res.usage);
}

// ── 5) kokkulangevus klastri-tasandil ──
const jBy = Object.fromEntries(clVerdicts.map((v) => [v.cluster_key, v]));
const rBy = Object.fromEntries(refVerdicts.map((v) => [v.cluster_key, v]));
const keys = clusters.map((c) => c.cluster_key).filter((k) => jBy[k] && rBy[k]);
let agree = 0, assignBoth = 0, sameTarget = 0, valeAssign = 0;
const disagreements = [];
for (const k of keys) {
  const j = jBy[k], r = rBy[k];
  const sameAction = j.action === r.action;
  if (sameAction) agree++;
  if (j.action === "assign_existing" && r.action === "assign_existing") {
    assignBoth++;
    if (j.target_handle === r.target_handle) sameTarget++;
    else { valeAssign++; disagreements.push({ cluster_key: k, type: "vale_assign", judge: j.target_handle, ref: r.target_handle }); }
  } else if (!sameAction) {
    disagreements.push({ cluster_key: k, type: "action_diff", judge: j.action, ref: r.action });
  }
}
const pct = (n, d) => d ? (n / d * 100).toFixed(1) : "0.0";
const jDist = clVerdicts.reduce((a, v) => (a[v.action] = (a[v.action] || 0) + 1, a), {});
const rDist = refVerdicts.reduce((a, v) => (a[v.action] = (a[v.action] || 0) + 1, a), {});

console.log(`════ KOKKULANGEVUS (${LABEL}) ════`);
console.log(`hinnatud klastrid (mõlemal otsus): ${keys.length}/${clusters.length}`);
console.log(`tegevus-kokkulangevus (sama action): ${agree}/${keys.length} = ${pct(agree, keys.length)}%`);
console.log(`mõlemad assign_existing: ${assignBoth} · sama target: ${sameTarget} (${pct(sameTarget, assignBoth)}%) · vale_assign: ${valeAssign} (${pct(valeAssign, keys.length)}% kõigist)`);
console.log(`kohtunik jaotus: assign ${jDist.assign_existing || 0} · group ${jDist.group || 0} · new_l3 ${jDist.new_l3 || 0} · keep ${jDist.keep || 0}`);
console.log(`referents jaotus: assign ${rDist.assign_existing || 0} · group ${rDist.group || 0} · new_l3 ${rDist.new_l3 || 0} · keep ${rDist.keep || 0}`);
console.log(`\n💰 kulu ≈ $${cost.toFixed(4)}`);

if (JSON_OUT) {
  const payload = {
    label: LABEL, generated_at: new Date().toISOString(), seed: SEED, sample: data.length, pending: pendingN,
    candidates: { total: candWithDesc.length, with_description: withDescN, with_description_pct: +(withDescN / candWithDesc.length * 100).toFixed(1) },
    clusters: clusters.length, rated: keys.length,
    agreement_pct: +pct(agree, keys.length), agree, assign_both: assignBoth, same_target: sameTarget,
    same_target_pct: +pct(sameTarget, assignBoth), vale_assign: valeAssign, vale_assign_pct: +pct(valeAssign, keys.length),
    judge_distribution: jDist, ref_distribution: rDist, disagreements, cost_usd: +cost.toFixed(4),
  };
  fs.writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2));
  console.log(`💾 → ${JSON_OUT}`);
}
