#!/usr/bin/env node
/**
 * auto-judge-run.mjs — AUTO-JUDGE dry-run runner + kalibreerimis-valimi generaator.
 *
 * DRY-FIRST (vaikimisi): kutsub kohtuniku (judge.mjs), prindib OTSUSED, EI kirjuta DB-sse.
 *   Päris-kirjutus (product_synonym / review-bucket API) lisandub ALLES pärast kalibreerimise-väravat.
 *
 * Kasutus:
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/auto-judge-run.mjs --kind synonym  --sample 10 --dry
 *   node scripts/auto-judge-run.mjs --kind classify --sample 32 --dry
 *   node scripts/auto-judge-run.mjs --kind synonym  --sample 100 --dry --json reports/calib-syn.json   # kalibreerimis-valim
 *
 * Lipud:
 *   --kind synonym|classify   kumba kohtunikku (kohustuslik)
 *   --sample N                mitu kirjet valimisse (juhuslik pending seast; vaikimisi 10)
 *   --dry                     EI kirjuta DB-sse (vaikimisi TRUE — päris-kirjutus tuleb hiljem)
 *   --json <fail>             salvesta otsused JSON-i (kalibreerimislehe sisend)
 *   --batch N                 mitu kirjet LLM-päringu kohta (synonym 10, classify 6)
 *   --seed S                  ORDER BY md5(id||seed) → korratav valim (kalibreerimiseks)
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const argv = process.argv;
const has = (f) => argv.includes(f);
const val = (f, d) => { const i = argv.indexOf(f); return i > 0 ? argv[i + 1] : d; };
const KIND = val("--kind");
const SAMPLE = parseInt(val("--sample", "10"), 10);
const JSON_OUT = val("--json");
const SEED = val("--seed", "xlm");
const BATCH = parseInt(val("--batch", KIND === "classify" ? "6" : "10"), 10);
const DRY = true; // dry-first: päris-kirjutus lisandub eraldi pärast kalibreerimist

if (!["synonym", "classify"].includes(KIND)) {
  console.error("Kasuta: --kind synonym|classify [--sample N] [--json fail] [--seed S]");
  process.exit(2);
}
const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("ANTHROPIC_API_KEY puudub — set -a; . /opt/eumotors-tasks/.env; set +a"); process.exit(2); }

let _db;
const db = () => (_db ||= execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim());
const q = (sql) => execSync(`docker exec -i ${db()} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
// jsonRows: iga DB-rida = ÜKS jsonb_build_object → ÜKS väljund-rida (reavahetus-kindel; description sisaldab \n).
const jsonRows = (sql) => q(sql).trim().split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
let classifyClusterMeta = null; // klastri-tasandi dry-run meta (RAPORT + JSON)

async function runSynonym() {
  const { judgeSynonyms, synActionOf, SYN_JUDGE_MODEL } = await import("./lib/judge.mjs");
  // pending synonym_review + toote EN/ET pealkiri + L3 nimi (JSON-rida → reavahetus-kindel)
  const data = jsonRows(`
    SELECT jsonb_build_object(
      'id', sr.id::text, 'word', sr.word, 'synonyms', coalesce(sr.synonyms,'{}'),
      'confidence', sr.confidence, 'gen_reason', coalesce(sr.reason,''),
      'title_en', p.title, 'title_et', coalesce(p.metadata->>'title_et',''), 'category', coalesce(pc.name,'')
    )::text
    FROM synonym_review sr
    JOIN product p ON p.id = sr.product_id
    LEFT JOIN product_category_product pcp ON pcp.product_id = sr.product_id
    LEFT JOIN product_category pc ON pc.id = pcp.product_category_id AND pc.handle LIKE 'v4-%'
    WHERE sr.status='pending'
    ORDER BY md5(sr.id::text || '${SEED}')
    LIMIT ${SAMPLE}`);
  console.log(`[SÜNONÜÜMI-KOHTUNIK dry-run] mudel=${SYN_JUDGE_MODEL} valim=${data.length} batch=${BATCH}\n`);
  const decisions = [];
  for (const b of chunk(data, BATCH)) {
    const res = await judgeSynonyms(b, { apiKey: API_KEY });
    if (!res.ok) { console.error(`  ⚠️ batch kukkus: ${res.error} (kirjed jäävad pending — fail-loud)`); continue; }
    const byId = Object.fromEntries(res.results.map((r) => [r.id, r]));
    for (const row of b) {
      const v = byId[row.id] || { verdict: "EBAKINDEL", reason: "kohtunik ei tagastanud" };
      const act = synActionOf(v.verdict);
      decisions.push({ id: row.id, word: row.word, synonyms: row.synonyms, title_en: row.title_en, title_et: row.title_et, category: row.category, gen_confidence: row.confidence, verdict: v.verdict, reason: v.reason, action: act });
    }
  }
  return decisions;
}

async function runClassify() {
  // Point 3 (Tarmo 2026-10-06): KLASSIFIKAATORI-KOHTUNIK töötab KLASTRI tasandil —
  // üks otsus klastri kohta (clusterKeyOf), laotatud kõigile liikmetele → vastuolu ehituslikult võimatu.
  const { judgeClassifyClusters, clusterize, fanoutClusterDecisions, CLSF_JUDGE_MODEL, enforceClassifyConsistency } = await import("./lib/judge.mjs");
  // kandidaadid = v4 LEHT-L3-d (tree nodes ilma lasteta) + nimi DB-st
  const tree = JSON.parse(fs.readFileSync(new URL("../storefront/lib/category-tree.generated.json", import.meta.url)));
  const leafHandles = Object.values(tree.nodes).filter((n) => !(n.child_handles && n.child_handles.length)).map((n) => n.handle);
  const nameMap = {};
  for (const nr of jsonRows(`SELECT jsonb_build_object('h',handle,'n',name)::text FROM product_category WHERE handle LIKE 'v4-%'`)) nameMap[nr.h] = nr.n;
  const candidateL3s = leafHandles.map((h) => ({ handle: h, name: nameMap[h] || "" }));
  console.log(`[KLASSIFIKAATORI-KOHTUNIK dry-run · KLASTRI-TASAND] mudel=${CLSF_JUDGE_MODEL} kandidaate(L3)=${candidateL3s.length}`);

  const data = jsonRows(`
    SELECT jsonb_build_object(
      'id', cr.product_id, 'title', coalesce(nullif(trim(cr.title),''),p.title,''),
      'title_et', coalesce(p.metadata->>'title_et',''), 'description', left(coalesce(p.description,''),400),
      'bucket', cr.bucket, 'proposed_l3', coalesce(cr.proposed_l3,''), 'suggest_name', coalesce(cr.suggest_name,''),
      'suggest_l2', coalesce(cr.suggest_l2,''), 'confidence', cr.confidence, 'reason', coalesce(cr.reason,''),
      'meta', jsonb_build_object('vevor_spu', p.metadata->>'vevor_spu', 'vevor_product_type', p.metadata->>'vevor_product_type')
    )::text
    FROM classification_review cr
    LEFT JOIN product p ON p.id = cr.product_id
    WHERE cr.status='pending'
    ORDER BY md5(cr.product_id || '${SEED}')
    LIMIT ${SAMPLE}`);

  // 1) deterministlik klasterdus (LLM-vaba) — enne kohtunikku
  const clusters = clusterize(data);
  console.log(`valim=${data.length} tooted → ${clusters.length} klastrit (batch ${BATCH} klastrit/päring)\n`);

  // 2) kohtunik otsustab KLASTRI kohta (üks otsus / klaster)
  const clVerdicts = [];
  for (const b of chunk(clusters, BATCH)) {
    const res = await judgeClassifyClusters(b, candidateL3s, { apiKey: API_KEY });
    if (!res.ok) { console.error(`  ⚠️ klastri-batch kukkus: ${res.error} (klastrid jäävad pending — fail-loud)`); continue; }
    clVerdicts.push(...res.results);
  }

  // 3) laota klastri-otsus kõigile liikmetele → per-toode otsused (vastuolu võimatu)
  const decisions = fanoutClusterDecisions(clusters, clVerdicts).map((d) => ({
    ...d, proposed: (data.find((r) => r.id === d.id) || {}).proposed_l3 || (data.find((r) => r.id === d.id) || {}).suggest_name || "",
  }));

  // 4) KOOSKÕLAVÄRAV = TURVAVÕRK: pärast klastri-fan-out'i on iga klaster ühe-signatuuriga
  //    → see EI tohi enam vallanduda. Kui vallandub, on fan-out katki → fail-loud.
  const { flaggedClusters } = enforceClassifyConsistency(decisions);
  if (flaggedClusters.length) {
    console.error(`\n🔴 OOTAMATU: kooskõlavärav vallandus KLASTRI-tasandil (${flaggedClusters.length}) — fan-out katki?`);
    for (const fc of flaggedClusters) console.error(`   ${fc.cluster_key}  (${fc.count} toodet) otsused: ${fc.signatures.join(" | ")}`);
  } else {
    console.log(`⚖️  Kooskõlavärav (turvavõrk): 0 vallandumist — klastri-tasand tagab järjekindluse ehituslikult. ✓\n`);
  }

  // klastri-tasandi dry-run kokkuvõte (RAPORT: klastrite arv + otsuste jaotus)
  const clDist = clVerdicts.reduce((a, v) => (a[v.action] = (a[v.action] || 0) + 1, a), {});
  console.log(`📦 KLASTRI-TASANDI OTSUSED: ${clVerdicts.length}/${clusters.length} klastrit otsustatud`);
  console.log(`   jaotus: assign ${clDist.assign_existing || 0} · group ${clDist.group || 0} · new_l3 ${clDist.new_l3 || 0} · keep ${clDist.keep || 0}`);
  const sizes = clusters.map((c) => c.items.length);
  console.log(`   klastri-suurused: 1-toote ${sizes.filter((s) => s === 1).length} · 2+ ${sizes.filter((s) => s >= 2).length} (suurim ${Math.max(...sizes)})\n`);
  classifyClusterMeta = {
    clusters: clusters.length, verdicts: clVerdicts.length, distribution: clDist,
    cluster_sizes: { singletons: sizes.filter((s) => s === 1).length, multi: sizes.filter((s) => s >= 2).length, largest: Math.max(...sizes) },
  };
  return decisions;
}

const decisions = KIND === "synonym" ? await runSynonym() : await runClassify();

// ── Kokkuvõte stdout-i (inimloetav) ──
if (KIND === "synonym") {
  const t = decisions.reduce((a, d) => (a[d.verdict] = (a[d.verdict] || 0) + 1, a), {});
  console.log(`KOKKUVÕTE: OK ${t.OK || 0} · VALE ${t.VALE || 0} · EBAKINDEL ${t.EBAKINDEL || 0}  ${DRY ? "(DRY — DB puutumata)" : ""}\n`);
  for (const d of decisions) {
    const tag = d.verdict === "OK" ? "✅" : d.verdict === "VALE" ? "❌" : "❓";
    console.log(`${tag} "${d.word}"  [${d.category || "kategooriata"}]`);
    console.log(`   toode: ${(d.title_et || d.title_en || "").slice(0, 70)}`);
    if (d.synonyms.length) console.log(`   sünonüümid: ${d.synonyms.join(", ")}`);
    console.log(`   → ${d.verdict}: ${d.reason}`);
    console.log("");
  }
} else {
  const t = decisions.reduce((a, d) => (a[d.judge.action] = (a[d.judge.action] || 0) + 1, a), {});
  console.log(`KOKKUVÕTE: assign ${t.assign_existing || 0} · group ${t.group || 0} · new_l3 ${t.new_l3 || 0} · keep ${t.keep || 0}  ${DRY ? "(DRY — DB puutumata)" : ""}\n`);
  for (const d of decisions) {
    const j = d.judge;
    const tag = j.action === "assign_existing" ? "✅" : j.action === "new_l3" ? "🆕" : j.action === "group" ? "🔗" : "❓";
    console.log(`${tag} ${(d.title || "").slice(0, 70)}  [${d.bucket}]`);
    console.log(`   klassifikaator pakkus: ${d.proposed || "-"}`);
    const detail = j.action === "assign_existing" ? `→ ${j.target_handle}` : j.action === "new_l3" ? `→ UUS "${j.new_l3_name}" @${j.parent_l2_handle}` : j.action === "group" ? `→ grupp "${j.group_key}"` : "jääb";
    console.log(`   → ${j.action} ${detail} (kindlus ${j.confidence})${j.quarantine_cause && j.quarantine_cause !== "n/a" ? ` [quarantine: ${j.quarantine_cause}]` : ""}`);
    console.log(`   põhjus: ${j.reason}`);
    console.log("");
  }
}

if (JSON_OUT) {
  const payload = { kind: KIND, generated_at: new Date().toISOString(), seed: SEED, dry: DRY, decisions };
  if (classifyClusterMeta) payload.cluster_meta = classifyClusterMeta;
  fs.writeFileSync(JSON_OUT, JSON.stringify(payload, null, 2));
  console.log(`💾 ${decisions.length} otsust → ${JSON_OUT} (kalibreerimislehe sisend)`);
}
