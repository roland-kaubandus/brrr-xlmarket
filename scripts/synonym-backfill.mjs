#!/usr/bin/env node
/**
 * synonym-backfill.mjs — SÜNONÜÜMI KONSENSUS-BACKFILL (A, Tarmo 2026-10-06, HARD RULE #5+#6).
 *
 * TOOTMISREEGEL (A1): sünonüüm → product_synonym AINULT kui Sonnet-kohtunik OK JA Opus-referents OK.
 *   Muu (lahkheli / EBAKINDEL / VALE) → EI kirjutata (ohutu vaikimisi / rejected), MITTE inimese järjekord.
 *
 * KAKS MUDELIT igale pending synonym_review kirjele:
 *   - kohtunik  = Sonnet (judgeSynonyms, SYN_JUDGE_MODEL)
 *   - referents = Opus   (judgeSynonyms, REF_MODEL_SYN) — kohtunikust SÕLTUMATU teine arvamus
 *   → synConsensus(judge, ref) → bucket: consensus_ok | disagreement | vale
 *
 * DRY vaikimisi: arvutab JAOTUSE + KULUHINNANGU + salvestab matchlist JSON-i. EI kirjuta DB-sse.
 *   --execute → consensus_ok → product_synonym (+ review_decision_log actor_detail='auto-judge',
 *   channel='pipeline', batch_id) · vale → synonym_review.status='rejected' · disagreement → 'safe_default'.
 *   TÄIELIKULT TAGASIVÕETAV partiina: synonym-backfill-undo.mjs <batch_id>.
 *
 * SAMA TRANSFORM backfill + hook (HARD RULE #5): öine hook kutsub SAMA skripti → pending on siis
 *   ainult öine delta (~uued kirjed), mitte kogu korpus. Delta tuleb loomulikult (backfill resolvib vanad).
 *
 * Kasutus:
 *   set -a; . /opt/eumotors-tasks/.env; set +a
 *   node scripts/synonym-backfill.mjs --dry   --limit 0 --out reports/syn-backfill-dry.json   # kogu 3854
 *   node scripts/synonym-backfill.mjs --execute --out reports/syn-backfill-exec.json          # alles kinnitusel
 */
import { execSync } from "node:child_process";
import fs from "node:fs";

const argv = process.argv;
const val = (f, d) => { const i = argv.indexOf(f); return i > 0 ? argv[i + 1] : d; };
const EXECUTE = argv.includes("--execute");
const LIMIT = parseInt(val("--limit", "0"), 10);       // 0 = kõik pending
const BATCH = parseInt(val("--batch", "10"), 10);
const CONC = parseInt(val("--conc", "8"), 10);         // paralleelsed API-kutsed (töö-aeg: 772 järjest = timeout)
const SKUS_FILE = val("--skus", "");                   // HARD RULE #5 delta: ainult need product_id-d (öine hook)
const FROM = val("--from", "");                        // rakenda OLEMAS DRY-matchlist JSON-ist, ILMA API-kutseta (Tarmo tingimus #1)
const OUT = val("--out", `reports/syn-backfill-${EXECUTE ? "exec" : "dry"}.json`);
const BATCH_ID = val("--batch-id", `synbf-${new Date().toISOString().replace(/[:.]/g, "-")}`);

const API_KEY = process.env.ANTHROPIC_API_KEY;
if (!API_KEY && !FROM) { console.error("ANTHROPIC_API_KEY puudub — set -a; . /opt/eumotors-tasks/.env; set +a"); process.exit(2); }

let _db;
const db = () => (_db ||= execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim());
const q = (sql) => execSync(`docker exec -i ${db()} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
const jsonRows = (sql) => q(sql).trim().split("\n").filter((l) => l.startsWith("{")).map((l) => JSON.parse(l));
const chunk = (a, n) => { const o = []; for (let i = 0; i < a.length; i += n) o.push(a.slice(i, i + n)); return o; };
// bounded concurrency: jooksuta thunk'id (() => Promise) kuni N korraga (väldib 772-järjest-timeout'i)
async function runPool(thunks, n) {
  const out = new Array(thunks.length); let i = 0;
  await Promise.all(Array.from({ length: Math.min(n, thunks.length) }, async () => {
    while (i < thunks.length) { const idx = i++; out[idx] = await thunks[idx](); }
  }));
  return out;
}
const sqlLit = (s) => "'" + String(s == null ? "" : s).replace(/'/g, "''") + "'";
const arrLit = (a) => `ARRAY[${(a || []).map(sqlLit).join(",")}]::text[]`;

// Opus-hinnad (per 1M): input $5, output $25. Batch API = 50% → input $2.5, output $12.5.
// Sonnet-5 (per 1M): input $3 ($2 intro), output $15 ($10 intro). Batch API = 50%.
const PRICE = { "claude-opus-4-8": { in: 5, out: 25 }, "claude-sonnet-5": { in: 3, out: 15 } };

async function main() {
  const { judgeSynonyms, synConsensus, SYN_JUDGE_MODEL, REF_MODEL_SYN } = await import("./lib/judge.mjs");

  // --from: rakenda OLEMAS DRY-tulemused (matchlist JSON), ILMA mudeli-kutseta. Verdiktid on JSON-is juba.
  if (FROM) {
    const p = JSON.parse(fs.readFileSync(FROM, "utf8"));
    const rows = p.rows || [];
    const dist = { consensus_ok: 0, disagreement: 0, vale: 0 };
    for (const r of rows) dist[r.bucket] = (dist[r.bucket] || 0) + 1;
    console.log(`[FROM matchlist] ${EXECUTE ? "🔴 EXECUTE" : "DRY-vaade"} · ${FROM} · ridu=${rows.length} · batch_id=${BATCH_ID}`);
    console.log(`   consensus_ok ${dist.consensus_ok} · disagreement ${dist.disagreement} · vale ${dist.vale} · (API EI kutsutud — DRY taaskasutus)\n`);
    if (!EXECUTE) { console.log("(DRY-vaade — DB puutumata. Lisa --execute rakendamiseks.)"); return; }
    applyBatch(rows, BATCH_ID, { judgeModel: p.judge_model, refModel: p.ref_model, source: `from:${FROM}` });
    return;
  }

  // HARD RULE #5 delta: öine hook annab --skus (tonight's touched SKUs) → judge AINULT nende review-ridu,
  // MITTE kogu pending-backlogi. Ilma --skus (backfill) → kõik pending.
  let skuFilter = "";
  if (SKUS_FILE) {
    const skus = fs.readFileSync(SKUS_FILE, "utf8").split("\n").map((s) => s.trim()).filter(Boolean);
    if (!skus.length) { console.log("--skus fail tühi → 0 kirjet (delta puudub, OK)."); return; }
    skuFilter = `AND sr.product_id IN (${skus.map(sqlLit).join(",")})`;
  }

  // pending synonym_review + toote EN/ET + ÜKS v4-kategooria (DISTINCT ON → dedup, väldib JOIN-plahvatust)
  const lim = LIMIT > 0 ? `LIMIT ${LIMIT}` : "";
  const data = jsonRows(`
    SELECT jsonb_build_object(
      'id', sr.id::text, 'product_id', sr.product_id, 'word', sr.word,
      'synonyms', coalesce(sr.synonyms,'{}'), 'variants', coalesce(sr.variants,'{}'),
      'confidence', sr.confidence, 'gen_reason', coalesce(sr.reason,''),
      'title_en', p.title, 'title_et', coalesce(p.metadata->>'title_et',''),
      'category', coalesce((
        SELECT pc.name FROM product_category_product pcp
        JOIN product_category pc ON pc.id = pcp.product_category_id AND pc.handle LIKE 'v4-%'
        WHERE pcp.product_id = sr.product_id LIMIT 1), '')
    )::text
    FROM synonym_review sr
    JOIN product p ON p.id = sr.product_id
    WHERE sr.status='pending'
    ${skuFilter}
    ORDER BY sr.id
    ${lim}`);

  console.log(`[SÜNONÜÜM KONSENSUS-BACKFILL] ${EXECUTE ? "🔴 EXECUTE" : "DRY"} · pending=${data.length} · kohtunik=${SYN_JUDGE_MODEL} referents=${REF_MODEL_SYN} · batch=${BATCH} · batch_id=${BATCH_ID}\n`);
  if (!data.length) { console.log("Pending kirjeid pole."); return; }

  const usage = { judge: { in: 0, out: 0, calls: 0 }, ref: { in: 0, out: 0, calls: 0 } };
  const addUsage = (slot, u) => { if (!u) return; usage[slot].in += u.input_tokens || 0; usage[slot].out += u.output_tokens || 0; usage[slot].calls++; };

  const batches = chunk(data, BATCH);
  const judgeById = {}, refById = {};
  let done = 0; const total = batches.length * 2;
  const tick = () => { if (++done % 20 === 0 || done === total) console.log(`  … ${done}/${total} batch tehtud`); };

  // KOHTUNIK (Sonnet) + REFERENTS (Opus) paralleelselt, bounded pool (CONC) — referents PIME (gen_reason tühi, EI näe verdikti)
  const thunks = [];
  for (const b of batches) thunks.push(async () => {
    const res = await judgeSynonyms(b, { apiKey: API_KEY, model: SYN_JUDGE_MODEL });
    tick();
    if (!res.ok) { console.error(`  ⚠️ kohtunik-batch kukkus: ${res.error} (kirjed → EBAKINDEL, fail-loud)`); return; }
    addUsage("judge", res.usage); for (const r of res.results) judgeById[r.id] = r;
  });
  for (const b of batches) thunks.push(async () => {
    const batch = b.map((r) => ({ ...r, gen_reason: "" }));
    const res = await judgeSynonyms(batch, { apiKey: API_KEY, model: REF_MODEL_SYN });
    tick();
    if (!res.ok) { console.error(`  ⚠️ referents-batch kukkus: ${res.error} (kirjed → EBAKINDEL, fail-loud)`); return; }
    addUsage("ref", res.usage); for (const r of res.results) refById[r.id] = r;
  });
  await runPool(thunks, CONC);

  // 3) KONSENSUS igale kirjele
  const rows = [];
  const dist = { consensus_ok: 0, disagreement: 0, vale: 0 };
  for (const d of data) {
    const jv = (judgeById[d.id] || {}).verdict || "EBAKINDEL";
    const rv = (refById[d.id] || {}).verdict || "EBAKINDEL";
    const c = synConsensus(jv, rv);
    dist[c.bucket]++;
    rows.push({ id: d.id, product_id: d.product_id, word: d.word, synonyms: d.synonyms, variants: d.variants,
      confidence: d.confidence, title_et: d.title_et, title_en: d.title_en, category: d.category,
      judge: jv, reference: rv, bucket: c.bucket, status: c.status, write: c.write });
  }

  // 4) JAOTUS + agreement
  const agree = rows.filter((r) => r.judge === r.reference).length;
  const pct = (x) => rows.length ? ((x / rows.length) * 100).toFixed(1) : "0.0";
  console.log(`📊 JAOTUS (${rows.length} kirjet):`);
  console.log(`   ✅ consensus_ok (mõlemad OK → KIRJUTA)    ${dist.consensus_ok} (${pct(dist.consensus_ok)}%)`);
  console.log(`   🟡 disagreement (lahkheli/EBAKINDEL → ohutu vaikimisi) ${dist.disagreement} (${pct(dist.disagreement)}%)`);
  console.log(`   ❌ vale (kumbki VALE → rejected)          ${dist.vale} (${pct(dist.vale)}%)`);
  console.log(`   mudelite kokkulangevus: ${agree}/${rows.length} (${pct(agree)}%)\n`);

  // 5) KULUHINNANG (tegelik usage sellest jooksust → ekstrapoleeri öisele hookile)
  const cost = (slot, model) => {
    const u = usage[slot]; const p = PRICE[model] || { in: 0, out: 0 };
    const sync = (u.in / 1e6) * p.in + (u.out / 1e6) * p.out;
    return { tokIn: u.in, tokOut: u.out, calls: u.calls, sync, batch: sync * 0.5 };
  };
  const cj = cost("judge", SYN_JUDGE_MODEL), cr = cost("ref", REF_MODEL_SYN);
  const perItem = rows.length ? (cj.sync + cr.sync) / rows.length : 0;
  console.log(`💰 KULU (see jooks, ${rows.length} kirjet):`);
  console.log(`   kohtunik ${SYN_JUDGE_MODEL}: ${cj.calls} kutset, in=${cj.tokIn} out=${cj.tokOut} → sync $${cj.sync.toFixed(2)} (batch $${cj.batch.toFixed(2)})`);
  console.log(`   referents ${REF_MODEL_SYN}: ${cr.calls} kutset, in=${cr.tokIn} out=${cr.tokOut} → sync $${cr.sync.toFixed(2)} (batch $${cr.batch.toFixed(2)})`);
  console.log(`   KOKKU sync $${(cj.sync + cr.sync).toFixed(2)} · batch API $${((cj.sync + cr.sync) * 0.5).toFixed(2)} · ~$${perItem.toFixed(4)}/kirje`);
  console.log(`   öine hook (~100 uut/öö): sync ~$${(perItem * 100).toFixed(2)} · batch ~$${(perItem * 100 * 0.5).toFixed(2)}\n`);

  // 6) matchlist JSON (DRY = ülevaade + execute sisend; EXECUTE = mis tehti)
  const payload = { generated_at: new Date().toISOString(), execute: EXECUTE, batch_id: BATCH_ID,
    judge_model: SYN_JUDGE_MODEL, ref_model: REF_MODEL_SYN, n: rows.length, distribution: dist,
    agreement: { n: agree, pct: pct(agree) },
    cost: { judge: cj, ref: cr, per_item: perItem, total_sync: cj.sync + cr.sync, total_batch: (cj.sync + cr.sync) * 0.5 },
    rows };
  fs.mkdirSync("reports", { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
  console.log(`💾 matchlist → ${OUT}`);

  if (!EXECUTE) { console.log("\n(DRY — DB puutumata. --execute alles Tarmo kinnitusel.)"); return; }

  // 7) EXECUTE — consensus_ok → product_synonym (NOT EXISTS guard, lisav mitte asendav) + log; vale→rejected; disagreement→safe_default
  await applyBatch(rows, BATCH_ID, { judgeModel: SYN_JUDGE_MODEL, refModel: REF_MODEL_SYN });
}

/** applyBatch — kirjuta konsensus-tulemus DB-sse ühe transaktsioonina (tagasivõetav batch_id järgi). */
function applyBatch(rows, batchId, meta) {
  const ok = rows.filter((r) => r.bucket === "consensus_ok");
  const vale = rows.filter((r) => r.bucket === "vale");
  const dis = rows.filter((r) => r.bucket === "disagreement");

  // product_synonym INSERT ainult kui sama (product_id, word, lang) veel puudub (lisav, ei dubleeri)
  const inserts = ok.map((r) =>
    `INSERT INTO product_synonym (product_id, word, synonyms, variants, lang, gen_version, confidence)
     SELECT ${sqlLit(r.product_id)}, ${sqlLit(r.word)}, ${arrLit(r.synonyms)}, ${arrLit(r.variants)}, 'et', 'auto-judge-consensus', ${r.confidence == null ? "NULL" : r.confidence}
     WHERE NOT EXISTS (SELECT 1 FROM product_synonym ps WHERE ps.product_id=${sqlLit(r.product_id)} AND ps.word=${sqlLit(r.word)} AND ps.lang='et');`
  ).join("\n");

  const okIds = ok.map((r) => r.id);
  const valeIds = vale.map((r) => r.id);
  const disIds = dis.map((r) => r.id);
  const setStatus = (ids, st) => ids.length ? `UPDATE synonym_review SET status=${sqlLit(st)} WHERE id IN (${ids.map(sqlLit).join(",")});` : "";

  // review_decision_log: ÜKS koond-rida partii kohta (affected = kõik kirjutatud sõnad → undo-sisend)
  const affected = JSON.stringify({ batch_id: batchId, consensus_ok: ok.map((r) => ({ synonym_review_id: r.id, product_id: r.product_id, word: r.word })),
    rejected: valeIds, safe_default: disIds });
  const logRow = `INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, concept_key, status, affected, meta)
    VALUES ('auto-judge', 'auto-judge', 'pipeline', 'synonym', 'synonym_consensus_apply', ${sqlLit(batchId)}, 'applied',
            ${sqlLit(affected)}::jsonb, ${sqlLit(JSON.stringify({ ...meta, consensus_ok: ok.length, rejected: vale.length, safe_default: dis.length }))}::jsonb);`;

  const sql = `BEGIN;\n${inserts || "-- (consensus_ok ridu pole)"}\n${setStatus(okIds, "resolved")}\n${setStatus(valeIds, "rejected")}\n${setStatus(disIds, "safe_default")}\n${logRow}\nCOMMIT;`;
  q(sql);
  console.log(`\n🔴 EXECUTE tehtud (batch_id=${batchId}): product_synonym +${ok.length} · rejected ${vale.length} · safe_default ${dis.length}`);
  console.log(`   tagasivõtt: node scripts/synonym-backfill-undo.mjs ${batchId}`);
  console.log(`   ⚠️ pärast execute: sync-synonyms (Meili) + otsingu-kontroll (vt A5).`);
}

await main();
