#!/usr/bin/env node
/**
 * en-master-review.mjs — SÕLTUMATU Opus-kontroll EN-master puhastusele (Tarmo GO 2026-11-19).
 *
 * MIKS: generaator+kohtunik olid MÕLEMAD Sonnet. Sõltumatu teine silm (Opus, EI näinud genereerimist)
 *   kontrollib N juhuslikku puhastatud toodet ALLIKA vastu. Opus näeb AINULT (allikas → puhas tekst),
 *   MITTE generaatori/kohtuniku arutlust → tõeline sõltumatu audit.
 *
 * HINDAB (Tarmo nõue): täpsus vs allikas · väljamõeldud väited · ühikud · loetavus (kordused "70 kg ... 70 kg").
 *
 * READ-ONLY: ei kirjuta DB-sse, ei võta stack-lukku. Batch API (Opus −50%). Raport → reports/.
 *
 * Käsk:
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/en-master-review.mjs            # 50 juhuslikku (vaikimisi)
 *   node scripts/en-master-review.mjs --n 80     # N juhuslikku
 *   node scripts/en-master-review.mjs --seed foo # korratav valim (md5(id||seed) järjestus)
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { sourceCorpus, addMetric, metricGate } from "./lib/en-master-clean.mjs";
import { runChunk } from "./lib/content-batch.mjs";

const REPO = "/opt/xlmarket-github";
const argv = process.argv.slice(2);
const val = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : null; };
const N = Number(val("--n")) || 50;
const SEED = val("--seed") || "";
const IDS_FILE = val("--ids") || ""; // kureeritud valim: reavahega toote-ID-d (nt A+B+dup) — asendab juhuvaliku
// --remetric (Tarmo 2026-11-21 Samm 3): hinda remetric-i PAKUTUD uut clean'i = addMetric(base), MITTE
//   praegust DB clean'i. Vajalik, sest 1680 sihtmärgil on clean NULL (base-only Pass) või aegunud. Audit
//   kontrollib TÄPSELT seda, mis kirjutataks (kirjutus-GO eeltingimus: 0 fail / 0 fabrikatsiooni).
const REMETRIC = argv.includes("--remetric");
const M_REVIEW = "claude-opus-4-8";   // SÕLTUMATU: Opus (generaator/kohtunik olid Sonnet)

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY) { console.error("🔴 ANTHROPIC_API_KEY puudub"); process.exit(2); }

// ── DB (en-pack muster) ──
function resolveDB() {
  const n = execSync("docker ps --format '{{.Names}}' | grep -E '^db-k33g' | head -1", { encoding: "utf8" }).trim();
  if (!n) { console.error("🔴 db-k33g konteiner ei leitud"); process.exit(2); }
  return n;
}
let DB = resolveDB();
function psqlJson(sql) {
  const out = execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At`, { input: sql, encoding: "utf8", maxBuffer: 512 * 1024 * 1024 }).trim();
  return out ? JSON.parse(out) : [];
}

// valim: kas kureeritud (--ids FILE, täpselt need) VÕI juhuslik N (--seed → korratav md5(id||seed))
const OBJ = `json_build_object(
    'id', p.id,
    'title', p.title, 'description', p.description,
    'selling_points', p.metadata->'selling_points', 'specs', p.metadata->'specs',
    'dimensions', p.metadata->'dimensions', 'vptype', p.metadata->>'vevor_product_type',
    'clean_title', p.metadata->>'title_en_clean',
    'clean_desc', p.metadata->>'description_en_clean',
    'base_title', p.metadata->>'title_en_base',
    'base_desc', p.metadata->>'description_en_base'
  )`;
// remetric-režiim: sihtmärk = base olemas (clean võib olla NULL); muidu = clean olemas.
const HAVE_COND = REMETRIC
  ? `(p.metadata->>'title_en_base' IS NOT NULL OR p.metadata->>'description_en_base' IS NOT NULL)`
  : `(p.metadata->>'title_en_clean') IS NOT NULL`;
let rows;
if (IDS_FILE) {
  const ids = fs.readFileSync(IDS_FILE, "utf8").split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  const inList = ids.map((i) => `'${i.replace(/'/g, "''")}'`).join(",");
  rows = psqlJson(`SELECT coalesce(json_agg(obj),'[]') FROM (
    SELECT ${OBJ} AS obj FROM product p
    WHERE ${HAVE_COND} AND p.id IN (${inList})
  ) s;`);
} else {
  const orderExpr = SEED ? `md5(p.id || '${SEED.replace(/'/g, "''")}')` : `md5(p.id)`;
  rows = psqlJson(`SELECT coalesce(json_agg(obj),'[]') FROM (
    SELECT ${OBJ} AS obj FROM product p
    WHERE p.status='published' AND p.deleted_at IS NULL
      AND ${HAVE_COND}
    ORDER BY ${orderExpr} LIMIT ${N}
  ) s;`);
}

if (!rows.length) { console.error(`🔴 ei leidnud ühtki ${REMETRIC ? "base-kandidaati (title_en_base)" : "puhastatud toodet (title_en_clean)"} — kas backfill jooksis?`); process.exit(1); }

// ── remetric-režiim: arvuta PAKUTUD clean = addMetric(base), rakenda VÄRAV, jäta ainult muudetud+läbinud ──
if (REMETRIC) {
  const kept = [];
  for (const p of rows) {
    const nc = {
      title_en_clean: p.base_title != null ? addMetric(p.base_title, new Set()) : p.clean_title,
      description_en_clean: p.base_desc != null ? addMetric(p.base_desc, new Set()) : p.clean_desc,
    };
    const g = metricGate(nc);
    if (!g.pass) continue; // VÄRAV skip → ei kirjutataks, ei auditeeri
    const tCh = p.base_title != null && nc.title_en_clean !== (p.clean_title ?? "");
    const dCh = p.base_desc != null && nc.description_en_clean !== (p.clean_desc ?? "");
    if (!tCh && !dCh) continue; // juba ajakohane → ei kirjutataks
    p.clean_title = nc.title_en_clean;   // AUDITEERI pakutud uut väljundit
    p.clean_desc = nc.description_en_clean;
    kept.push(p);
  }
  rows = kept;
  if (!rows.length) { console.error("🔴 remetric: ükski valimi toode ei muutuks (kõik juba ajakohased / väravas) — vali teised id-d"); process.exit(1); }
}
console.log(`🔎 SÕLTUMATU Opus-kontroll${REMETRIC ? " [REMETRIC — pakutud uus clean]" : ""} · ${rows.length} ${IDS_FILE ? "kureeritud" : "juhuslikku"} toodet · mudel=${M_REVIEW}${SEED ? ` · seed=${SEED}` : ""}${IDS_FILE ? ` · ids=${IDS_FILE}` : ""}`);

// ── Opus prompt (sõltumatu audiitor) ──
const SYS = `You are an INDEPENDENT quality-assurance reviewer for e-commerce product copy.
You did NOT write this copy and have no stake in it. You are given a product's raw SOURCE material
(original supplier title, description, selling points, specs) and a CLEANED English title + description
that another system produced. Judge the cleaned copy STRICTLY against the source only.

Rules:
- ACCURACY: every concrete claim (feature, part, set contents, count, material, function) in the cleaned
  copy MUST be supported by the source. Flag any claim NOT found in the source as an invented claim.
- UNITS: the store targets EU markets (metric preferred). A number+unit in the cleaned copy must match the
  source. Flag wrong conversions, numbers that disagree with the source, or fabricated measurements.
- READABILITY: flag awkward duplication (e.g. "70 kg ... 70 kg"), stutters, truncation, or broken grammar.
- BRAND/HTML: the cleaned copy should contain NO supplier brand names and NO HTML tags/entities. Flag if present.

Return ONLY a JSON object, no prose:
{"accuracy":1-5,"invented_claims":["..."],"unit_issues":["..."],"readability":1-5,"repeats":["..."],
 "brand_html_issues":["..."],"verdict":"pass|minor|fail","note":"one short sentence"}
accuracy 5 = every claim supported; 1 = multiple fabrications. readability 5 = clean; 1 = badly broken.
verdict "fail" = any invented claim or wrong unit or broken readability; "minor" = small style nits only; "pass" = clean.`;

function userMsg(p) {
  const src = sourceCorpus(p); // SAMA allikas mida generaator nägi (võrdlusalus) — EI sisalda generaatori arutlust
  return `SOURCE MATERIAL:\n${src}\n\n` +
    `CLEANED TITLE:\n${p.clean_title || "(tühi)"}\n\n` +
    `CLEANED DESCRIPTION:\n${p.clean_desc || "(tühi)"}\n`;
}

const textOf = (m) => (m?.content || []).filter((b) => b.type === "text").map((b) => b.text).join("\n");
function parseJson(raw) {
  const m = String(raw).match(/\{[\s\S]*\}/);
  if (!m) return null;
  try { return JSON.parse(m[0]); } catch { return null; }
}

const requests = rows.map((p, i) => ({
  custom_id: `rev_${i}`,
  params: { model: M_REVIEW, max_tokens: 2500, thinking: { type: "adaptive" },
    system: [{ type: "text", text: SYS, cache_control: { type: "ephemeral" } }],
    messages: [{ role: "user", content: userMsg(p) }] },
}));

(async () => {
  console.log(`📤 Batch esitatud (Opus −50%) · ${requests.length} päringut — ootan…`);
  const { batchId, counts, results } = await runChunk(requests, API_KEY, {
    onTick: (s) => process.stdout.write(`\r  poll: ${JSON.stringify(s.request_counts)}   `),
    label: "en-master-review",
  });
  process.stdout.write("\n");
  console.log(`✓ batch ${batchId} valmis: ${JSON.stringify(counts)}`);

  const byId = new Map(results.map((r) => [r.custom_id, r]));
  const reviews = [];
  for (let i = 0; i < rows.length; i++) {
    const r = byId.get(`rev_${i}`);
    const p = rows[i];
    if (!r || !r.ok) { reviews.push({ id: p.id, error: r?.error || "puudub", clean_title: p.clean_title }); continue; }
    const j = parseJson(textOf(r.message));
    if (!j) { reviews.push({ id: p.id, error: "parse-viga", raw: textOf(r.message).slice(0, 200), clean_title: p.clean_title }); continue; }
    reviews.push({ id: p.id, clean_title: p.clean_title, clean_desc: p.clean_desc, ...j });
  }

  // ── agregaat ──
  const ok = reviews.filter((r) => !r.error);
  const errs = reviews.filter((r) => r.error);
  const avg = (arr, k) => arr.length ? (arr.reduce((s, r) => s + (Number(r[k]) || 0), 0) / arr.length) : 0;
  const verdicts = { pass: 0, minor: 0, fail: 0 };
  for (const r of ok) verdicts[r.verdict] = (verdicts[r.verdict] || 0) + 1;
  const fails = ok.filter((r) => r.verdict === "fail");
  const withInvented = ok.filter((r) => (r.invented_claims || []).length);
  const withUnit = ok.filter((r) => (r.unit_issues || []).length);
  const withRepeats = ok.filter((r) => (r.repeats || []).length);
  const withBrandHtml = ok.filter((r) => (r.brand_html_issues || []).length);

  const summary = {
    generated_at: new Date().toISOString(),
    model: M_REVIEW, n: rows.length, seed: SEED || null,
    parsed_ok: ok.length, errors: errs.length,
    avg_accuracy: Number(avg(ok, "accuracy").toFixed(2)),
    avg_readability: Number(avg(ok, "readability").toFixed(2)),
    verdicts,
    counts: {
      invented_claims_products: withInvented.length,
      unit_issue_products: withUnit.length,
      repeat_products: withRepeats.length,
      brand_html_products: withBrandHtml.length,
    },
  };

  const outPath = `${REPO}/reports/en-master-review-${new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19)}.json`;
  fs.writeFileSync(outPath, JSON.stringify({ summary, reviews }, null, 2));

  console.log("\n════════ KOKKUVÕTE ════════");
  console.log(JSON.stringify(summary, null, 2));
  if (fails.length) {
    console.log(`\n🔴 FAIL-verdiktid (${fails.length}):`);
    for (const f of fails.slice(0, 20)) {
      console.log(`  • ${f.id} "${(f.clean_title || "").slice(0, 50)}"`);
      if ((f.invented_claims || []).length) console.log(`    väljamõeldud: ${f.invented_claims.join(" | ")}`);
      if ((f.unit_issues || []).length) console.log(`    ühik: ${f.unit_issues.join(" | ")}`);
      if ((f.repeats || []).length) console.log(`    kordus: ${f.repeats.join(" | ")}`);
      if ((f.brand_html_issues || []).length) console.log(`    bränd/HTML: ${f.brand_html_issues.join(" | ")}`);
      if (f.note) console.log(`    märkus: ${f.note}`);
    }
  }
  if (errs.length) console.log(`\n⚠️ parse/batch-vead: ${errs.length} (vt raport)`);
  console.log(`\n📄 täisraport: ${outPath}`);
})().catch((e) => { console.error(`🔴 ${e.stack || e.message}`); process.exit(1); });
