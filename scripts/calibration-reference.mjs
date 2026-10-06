#!/usr/bin/env node
/**
 * calibration-reference.mjs — AUTOMAATNE KALIBREERIMINE Opus-referentsiga (HARD RULE #6).
 *
 * Point 1 (Tarmo 2026-10-06): kalibreerimine tehakse MASINAGA, mitte Tarmo käsitsi.
 *   Opus-REFERENTS-HINDAJA hindab SAMA kalibreerimisvalimi (100 sünonüümi seed=xlm +
 *   klassifikaatori pending) SÕLTUMATULT ja PIMESI (ei näe Sonneti/kohtuniku vastuseid),
 *   mängides inimese rolli. Salvestab calibration_rating-tabelisse actor='opus-reference'.
 *
 * Point 2: võrdlus samade lävenditega — sünonüüm VALE-OK ≤5%, klassifikaator VALE-assign ≤2,5%.
 *   Kus mudelid EI NÕUSTU → OHUTU VAIKIMISI (sünonüüm EI lähe otsingusse; toode jääb ootele),
 *   MITTE inimese järjekorda. Skript loeb kohtuniku valimi JSON-ist, referentsi hindab ise.
 *
 * ⚠️ See skript KIRJUTAB AINULT calibration_rating-tabelisse (kalibreerimise mehhanism) —
 *    EI rakenda ühtki kohtuniku-otsust päriselt (sünonüüme/assign'e ei kirjutata). Point 6.
 *
 * Kasutus:
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/calibration-reference.mjs --kind synonym  --json reports/calib-ref-synonym.md
 *   node scripts/calibration-reference.mjs --kind classify --json reports/calib-ref-classify.md
 *   node scripts/calibration-reference.mjs --kind both
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const argv = process.argv;
const val = (f, d) => { const i = argv.indexOf(f); return i > 0 ? argv[i + 1] : d; };
const KIND = val("--kind", "both");
const DRY_RATING = argv.includes("--no-write"); // vaikimisi KIRJUTAB calibration_rating (mitte kohtuniku-otsust!)

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("ANTHROPIC_API_KEY puudub — set -a; . /opt/eumotors-tasks/.env; set +a"); process.exit(2); }

const ROOT = new URL("..", import.meta.url).pathname;
let _db;
const db = () => (_db ||= execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim());
const q = (sql) => execSync(`docker exec -i ${db()} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
const jsonRows = (sql) => q(sql).trim().split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
const sqlLit = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const readCalib = (kind) => JSON.parse(fs.readFileSync(`${ROOT}/storefront/public/xl-admin/calib-${kind}.json`, "utf8"));

/** Kirjuta referentsi hinnang calibration_rating-tabelisse (actor='opus-reference'). */
function saveRating({ kind, seed, item_id, reference_verdict, judge_verdict, agreed, meta }) {
  if (DRY_RATING) return;
  const sql = `
    INSERT INTO calibration_rating (actor, kind, sample_seed, item_id, tarmo_verdict, judge_verdict, agreed, meta, updated_at)
    VALUES ('opus-reference', ${sqlLit(kind)}, ${sqlLit(seed)}, ${sqlLit(item_id)},
            ${sqlLit(reference_verdict)}, ${sqlLit(judge_verdict)}, ${agreed ? "true" : "false"},
            ${sqlLit(JSON.stringify(meta || {}))}::jsonb, now())
    ON CONFLICT (kind, sample_seed, item_id, actor)
    DO UPDATE SET tarmo_verdict=EXCLUDED.tarmo_verdict, judge_verdict=EXCLUDED.judge_verdict,
                  agreed=EXCLUDED.agreed, meta=EXCLUDED.meta, updated_at=now();`;
  q(sql);
}

// ───────────────────────── SÜNONÜÜM ─────────────────────────
async function refSynonym() {
  const { judgeSynonyms, REF_MODEL } = await import("./lib/judge.mjs");
  const calib = readCalib("synonym");
  const seed = calib.seed || "xlm";
  const items = calib.decisions;
  console.log(`\n🔤 SÜNONÜÜM-REFERENTS (PIME, Opus ${REF_MODEL}) — valim=${items.length} seed=${seed}`);
  // PIME sisend: referents näeb AINULT generaatori-inputit (sõna/sünonüümid/toode/kategooria),
  // MITTE Sonneti verdikti ega põhjust. judgeSynonyms Opus-mudeliga = sõltumatu teine arvamus.
  const refById = {};
  for (const b of chunk(items, 10)) {
    const batch = b.map((d) => ({ id: d.id, word: d.word, synonyms: d.synonyms, title_en: d.title_en, title_et: d.title_et, category: d.category, confidence: d.gen_confidence, gen_reason: "" }));
    const res = await judgeSynonyms(batch, { apiKey: API_KEY, model: REF_MODEL });
    if (!res.ok) { console.error(`  ⚠️ referents-batch kukkus: ${res.error}`); continue; }
    for (const r of res.results) refById[r.id] = r;
  }
  // võrdlus: judge_verdict = Sonneti verdikt (calib JSON-ist), reference = Opus.
  let agree = 0, valeOk = 0, safeDefault = 0, rated = 0;
  const rows = [];
  for (const d of items) {
    const ref = refById[d.id];
    if (!ref) continue;
    rated++;
    const judge = d.verdict;           // Sonnet OK/VALE/EBAKINDEL
    const reference = ref.verdict;      // Opus OK/VALE/EBAKINDEL
    const agreed = judge === reference;
    if (agreed) agree++;
    // VALE-OK (KRIITILINE): kohtunik OK, referents MITTE-OK → kohtunik oleks kirjutanud vigase sünonüümi.
    const isValeOk = judge === "OK" && reference !== "OK";
    if (isValeOk) valeOk++;
    // OHUTU VAIKIMISI: mudelid ei nõustu → sünonüüm EI lähe otsingusse (ei kirjutata). Mitte inimese järjekord.
    const safe = !agreed;
    if (safe) safeDefault++;
    saveRating({ kind: "synonym", seed, item_id: d.id, reference_verdict: reference, judge_verdict: judge, agreed, meta: { word: d.word, reference_reason: ref.reason, vale_ok: isValeOk, safe_default: safe } });
    rows.push({ word: d.word, judge, reference, agreed, isValeOk, safe, reason: ref.reason });
  }
  const pct = (x) => rated ? ((x / rated) * 100).toFixed(1) : "0.0";
  const verdict = { kind: "synonym", seed, n: rated, agree, agreePct: pct(agree), valeOk, valeOkPct: pct(valeOk), threshold: 5, pass: rated ? (valeOk / rated) * 100 <= 5 : false, safeDefault, rows };
  console.log(`   kokkulangevus ${agree}/${rated} (${pct(agree)}%) · VALE-OK ${valeOk}/${rated} (${pct(valeOk)}%) lävi ≤5% → ${verdict.pass ? "✅ LÄBITUD" : "🔴 ÜLETATUD"} · ohutu vaikimisi ${safeDefault}`);
  return verdict;
}

// ───────────────────────── KLASSIFIKAATOR ─────────────────────────
async function refClassify() {
  const { rateClassifyReference, REF_MODEL } = await import("./lib/judge.mjs");
  const calib = readCalib("classify");
  const seed = calib.seed || "xlm";
  const items = calib.decisions;
  console.log(`\n🏷 KLASSIFIKAATOR-REFERENTS (PIME, Opus ${REF_MODEL}) — valim=${items.length} seed=${seed}`);

  // kandidaadid = v4 LEHT-L3-d (sama nimekiri mis kohtunikul)
  const tree = JSON.parse(fs.readFileSync(`${ROOT}/storefront/lib/category-tree.generated.json`, "utf8"));
  const leaf = Object.values(tree.nodes).filter((n) => !(n.child_handles && n.child_handles.length)).map((n) => n.handle);
  const nameMap = {};
  for (const nr of jsonRows(`SELECT jsonb_build_object('h',handle,'n',name)::text FROM product_category WHERE handle LIKE 'v4-%'`)) nameMap[nr.h] = nr.n;
  const candidateL3s = leaf.map((h) => ({ handle: h, name: nameMap[h] || "" }));

  // PIME sisend vajab toote title_et + kirjeldust — need EI ole calib JSON-is → too DB-st.
  const ids = items.map((d) => d.id);
  const prodRows = jsonRows(`
    SELECT jsonb_build_object('id', p.id, 'title', coalesce(p.title,''),
      'title_et', coalesce(p.metadata->>'title_et',''), 'description', left(coalesce(p.description,''),400))::text
    FROM product p WHERE p.id IN (${ids.map(sqlLit).join(",")})`);
  const prodById = Object.fromEntries(prodRows.map((r) => [r.id, r]));

  const refById = {};
  for (const b of chunk(items, 6)) {
    const batch = b.map((d) => ({ id: d.id, title: prodById[d.id]?.title || d.title, title_et: prodById[d.id]?.title_et || "", description: prodById[d.id]?.description || "" }));
    const res = await rateClassifyReference(batch, candidateL3s, { apiKey: API_KEY, model: REF_MODEL });
    if (!res.ok) { console.error(`  ⚠️ referents-batch kukkus: ${res.error}`); continue; }
    for (const r of res.results) refById[r.id] = r;
  }

  let agree = 0, valeAssign = 0, safeDefault = 0, rated = 0;
  const rows = [];
  for (const d of items) {
    const ref = refById[d.id];
    if (!ref) continue;
    rated++;
    const judgeAction = d.judge.action;              // assign_existing/new_l3/group/keep
    const judgeTarget = d.judge.target_handle || null;
    const refAction = ref.action;                    // assign_existing/new_l3/keep
    const refTarget = ref.target_handle || null;
    const agreed = judgeAction === refAction;        // sama vocab mis kalibreerimisleht
    if (agreed) agree++;
    // VALE-assign (KRIITILINE): kohtunik paigutas (assign_existing), aga referents EI oleks samasse
    // kodusse paigutanud (eri tegevus VÕI eri target_handle) → kohtunik oleks kirjutanud vale kodu.
    const sameAssign = judgeAction === "assign_existing" && refAction === "assign_existing" && judgeTarget === refTarget;
    const isValeAssign = judgeAction === "assign_existing" && !sameAssign;
    if (isValeAssign) valeAssign++;
    saveRating({ kind: "classify", seed, item_id: d.id, reference_verdict: refAction, judge_verdict: judgeAction, agreed, meta: { title: d.title, judge_target: judgeTarget, reference_target: refTarget, vale_assign: isValeAssign, reference_reason: ref.reason, cluster_key: d.cluster_key } });
    rows.push({ title: d.title, judgeAction, judgeTarget, refAction, refTarget, agreed, isValeAssign, reason: ref.reason });
  }
  // OHUTU VAIKIMISI = assign-otsused, kus referents EI kinnita → EI paigutata (jääb ootele), mitte inimese järjekord.
  safeDefault = rows.filter((r) => r.judgeAction === "assign_existing" && r.isValeAssign).length;
  const pct = (x) => rated ? ((x / rated) * 100).toFixed(1) : "0.0";
  const verdict = { kind: "classify", seed, n: rated, agree, agreePct: pct(agree), valeAssign, valeAssignPct: pct(valeAssign), threshold: 2.5, pass: rated ? (valeAssign / rated) * 100 <= 2.5 : false, safeDefault, rows };
  console.log(`   kokkulangevus ${agree}/${rated} (${pct(agree)}%) · VALE-assign ${valeAssign}/${rated} (${pct(valeAssign)}%) lävi ≤2,5% → ${verdict.pass ? "✅ LÄBITUD" : "🔴 ÜLETATUD"} · ohutu vaikimisi ${safeDefault}`);
  return verdict;
}

// ───────────────────────── RAPORT ─────────────────────────
function writeReport(verdicts) {
  const ts = new Date().toISOString();
  let md = `# AUTO-JUDGE kalibreerimine — Opus-REFERENTS (automaatne, HARD RULE #6)\n\n`;
  md += `> Genereeritud ${ts}. actor='opus-reference' calibration_rating-tabelis. Kohtunik DRY (ei rakendatud).\n`;
  md += `> Referents hindas PIMESI (ei näinud kohtuniku vastuseid). Kriteerium identne kohtuniku omaga.\n\n`;
  for (const v of verdicts) {
    if (v.kind === "synonym") {
      md += `## 🔤 Sünonüüm — kohtunik (Sonnet) vs referents (Opus)\n\n`;
      md += `| mõõdik | väärtus | lävi | verdikt |\n|---|---|---|---|\n`;
      md += `| Kokkulangevus | ${v.agree}/${v.n} (${v.agreePct}%) | — | — |\n`;
      md += `| **VALE-OK** (kohtunik OK, referents mitte) | ${v.valeOk}/${v.n} (${v.valeOkPct}%) | ≤5% | ${v.pass ? "✅ LÄBITUD" : "🔴 ÜLETATUD"} |\n`;
      md += `| Ohutu vaikimisi (ei lähe otsingusse) | ${v.safeDefault} | — | mitte inimese järjekord |\n\n`;
      const dis = v.rows.filter((r) => !r.agreed);
      if (dis.length) {
        md += `### Lahknevused (→ ohutu vaikimisi)\n\n| sõna | kohtunik | referents | VALE-OK? | referentsi põhjus |\n|---|---|---|---|---|\n`;
        for (const r of dis) md += `| ${r.word} | ${r.judge} | ${r.reference} | ${r.isValeOk ? "⚠️ jah" : "ei"} | ${r.reason} |\n`;
        md += `\n`;
      }
    } else {
      md += `## 🏷 Klassifikaator — kohtunik (klastri-tasand, Opus) vs referents (Opus, pime)\n\n`;
      md += `| mõõdik | väärtus | lävi | verdikt |\n|---|---|---|---|\n`;
      md += `| Kokkulangevus (tegevus) | ${v.agree}/${v.n} (${v.agreePct}%) | — | — |\n`;
      md += `| **VALE-assign** (kohtunik paigutas, referents mitte samasse) | ${v.valeAssign}/${v.n} (${v.valeAssignPct}%) | ≤2,5% | ${v.pass ? "✅ LÄBITUD" : "🔴 ÜLETATUD"} |\n`;
      md += `| Ohutu vaikimisi (jääb ootele) | ${v.safeDefault} | — | mitte inimese järjekord |\n\n`;
      const dis = v.rows.filter((r) => !r.agreed || r.isValeAssign);
      if (dis.length) {
        md += `### Lahknevused (→ ohutu vaikimisi)\n\n| toode | kohtunik | referents | VALE-assign? | referentsi põhjus |\n|---|---|---|---|---|\n`;
        for (const r of dis) {
          const j = r.judgeAction + (r.judgeTarget ? ` → ${r.judgeTarget}` : "");
          const rf = r.refAction + (r.refTarget ? ` → ${r.refTarget}` : "");
          md += `| ${(r.title || "").slice(0, 50)} | ${j} | ${rf} | ${r.isValeAssign ? "⚠️ jah" : "ei"} | ${r.reason} |\n`;
        }
        md += `\n`;
      }
    }
  }
  return md;
}

const verdicts = [];
if (KIND === "synonym" || KIND === "both") verdicts.push(await refSynonym());
if (KIND === "classify" || KIND === "both") verdicts.push(await refClassify());

const md = writeReport(verdicts);
const out = val("--json", `${ROOT}/reports/calib-reference-${KIND}.md`);
fs.writeFileSync(out, md);
console.log(`\n💾 Raport → ${out}`);
console.log(DRY_RATING ? "⚠️ --no-write: calibration_rating EI kirjutatud" : "✓ calibration_rating uuendatud (actor='opus-reference')");
