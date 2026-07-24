#!/usr/bin/env node
// pipeline-classify.mjs — feed-cron KLASSIFIKATSIOONI-samm (Opus, PROPOSE-NOT-CREATE).
//
// REEGEL (CLAUDE.md "AUTO-KLASSIFIKAATOR — PROPOSE-NOT-CREATE"):
//   - Cron paigutab AINULT olemas-L3-desse (conf ≥ AUTO). Uut L3 EI LOO.
//   - Uus tüüp / madal kindlus → review-bucket (classification_review) → INIMENE otsustab L3-loomise.
//   - Ei kirjuta hindu/tõlkeid/specs/staatust peale "draft→published õnnestunud paigutusel".
//
// Sisend (--source):
//   homeless   (vaikimisi) — live tooted ILMA kategooriata (product_category_product puudub)
//   new-drafts — status='draft' tooted (värske import, kategooriata)
//   unhomed    — KÕIK kodutud (draft VÕI published, kategooriata) — pipeline kasutab seda ([3] draftid + backlog)
//   skus <fail>— SKU-list failist (üks rea kohta)
//
// DB: docker exec db-k33g psql (host-run; konteineri-nimi re-resolve iga write'i juures).
// LLM: ANTHROPIC_API_KEY hostist (set -a; . /opt/eumotors-tasks/.env; set +a).
//
// Kasutus:
//   set -a; . /opt/eumotors-tasks/.env; set +a
//   node scripts/pipeline-classify.mjs [--source homeless] [--limit N] [--dry|--execute] [--concurrency 5]
//   Vaikimisi = --dry (loeb + klassifitseerib + raport, EI kirjuta DB-sse).
import { execSync } from "node:child_process";
import fs from "node:fs";

const KEY = process.env.ANTHROPIC_API_KEY;
if (!KEY) { console.error("ANTHROPIC_API_KEY puudub (set -a; . /opt/eumotors-tasks/.env; set +a)"); process.exit(2); }
const OPUS = "claude-opus-4-8";
const PRICE = [5, 25];                          // Opus $/1M in,out

const argv = process.argv;
const argVal = (n, d) => { const i = argv.indexOf(n); return i > 0 ? argv[i + 1] : d; };
const EXECUTE = argv.includes("--execute");
const DRY = !EXECUTE;                            // vaikimisi dry
const SOURCE = argVal("--source", "homeless");
const SKUS_FILE = argVal("--skus");
const LIMIT = parseInt(argVal("--limit", "0")) || 0;
const CONC = parseInt(argVal("--concurrency", "5"));
const CONF_AUTO = parseFloat(argVal("--conf-auto", "0.85"));   // ≥ → auto-paigutus olemas-L3-sse
const CONF_REVIEW = parseFloat(argVal("--conf-review", "0.60")); // ≥ → review, alla → quarantine
const OUT = argVal("--out", "/tmp/pipeline-classify-results.json");

// --- DB helper (spec-extract-skus.mjs muster: re-resolve konteiner-nimi) -----
const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
let DB = getDB();
if (!DB) { console.error("db-k33g konteinerit ei leitud"); process.exit(2); }
const q = (sql, tuplesOnly = true) => {
  DB = getDB();
  const flags = tuplesOnly ? "-tA" : "-A";
  return execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket ${flags} -v ON_ERROR_STOP=1 -f -`,
    { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
};

// --- L3-PUU DB-st (kogu taksonoomia, prompt-cache system'is) -----------------
// L3 = mpath 2 punktiga (L1.L2.L3). Path-nimed mpath-segmentidest id→nimi kaardiga.
function buildTree() {
  const cats = q(`SELECT id||E'\\t'||coalesce(name,'')||E'\\t'||coalesce(handle,'')||E'\\t'||mpath
                  FROM product_category WHERE deleted_at IS NULL`);
  const nameById = {}, rowById = {};
  for (const line of cats.trim().split("\n")) {
    const [id, name, handle, mpath] = line.split("\t");
    if (!id) continue;
    nameById[id] = name; rowById[id] = { id, name, handle, mpath };
  }
  // samplid: kuni 3 tootenime L3 kohta
  const samp = q(`SELECT t.product_category_id||E'\\t'||string_agg(t.title,' / ')
      FROM (SELECT pcp.product_category_id, left(p.title,42) title,
             row_number() OVER (PARTITION BY pcp.product_category_id ORDER BY p.created_at) rn
      FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
      WHERE p.deleted_at IS NULL) t
      WHERE t.rn<=3 GROUP BY t.product_category_id`);
  const samplesById = {};
  for (const line of samp.trim().split("\n")) { const [id, s] = line.split("\t"); if (id) samplesById[id] = s; }

  const lines = [], byHandle = {};
  for (const r of Object.values(rowById)) {
    const segs = (r.mpath || "").split(".");
    if (segs.length !== 3) continue;              // ainult L3
    const l1 = nameById[segs[0]] || "?", l2 = nameById[segs[1]] || "?";
    const path = `${l1} > ${l2} > ${r.name}`;
    const ex = samplesById[r.id] ? ` :: ${samplesById[r.id]}` : "";
    const line = `[${r.handle}] ${path}${ex}`;
    lines.push(line);
    byHandle[r.handle] = { path, name: r.name };
  }
  return { text: lines.join("\n"), byHandle, count: lines.length };
}

// --- SIHT-TOOTED -------------------------------------------------------------
function loadTargets() {
  let where;
  if (SOURCE === "skus") {
    if (!SKUS_FILE || !fs.existsSync(SKUS_FILE)) { console.error("--skus <fail> puudub"); process.exit(2); }
    const skus = fs.readFileSync(SKUS_FILE, "utf8").split("\n").map(s => s.trim()).filter(Boolean);
    fs.writeFileSync("/tmp/classify-skus.txt", skus.join("\n"));
    execSync(`docker cp /tmp/classify-skus.txt ${DB}:/tmp/classify-skus.txt`);
    where = `p.metadata->>'vevor_sku' IN (SELECT trim(x) FROM regexp_split_to_table(pg_read_file('/tmp/classify-skus.txt'),E'\\n') x WHERE trim(x)<>'')`;
  } else if (SOURCE === "new-drafts") {
    where = `p.status='draft' AND NOT EXISTS (SELECT 1 FROM product_category_product pcp WHERE pcp.product_id=p.id)`;
  } else if (SOURCE === "unhomed") {
    // KÕIK kodutud (draft VÕI published, kategooriata) — kata värsked draftid [3] + olemas-backlog ühes jooksus.
    where = `p.status IN ('draft','published') AND NOT EXISTS (SELECT 1 FROM product_category_product pcp WHERE pcp.product_id=p.id)`;
  } else { // homeless
    where = `p.status='published' AND NOT EXISTS (SELECT 1 FROM product_category_product pcp WHERE pcp.product_id=p.id)`;
  }
  const lim = LIMIT ? `LIMIT ${LIMIT}` : "";
  const rows = q(`SELECT jsonb_build_object(
      'id',p.id,'sku',p.metadata->>'vevor_sku','status',p.status,
      'title',p.title,'type',coalesce(p.metadata->>'vevor_type',''),
      'desc',left(regexp_replace(coalesce(p.description,''),E'[\\n\\r]+',' ','g'),320),
      'sp',left(coalesce(p.metadata->>'selling_point_1','')||' '||coalesce(p.metadata->>'selling_point_2',''),200)
    )::text FROM product p WHERE p.deleted_at IS NULL AND (${where}) ORDER BY p.created_at ${lim}`);
  const out = [];
  for (const line of rows.trim().split("\n")) { if (line.startsWith("{")) { try { out.push(JSON.parse(line)); } catch {} } }
  return out;
}

// --- LLM ---------------------------------------------------------------------
let cIn = 0, cOut = 0, cCacheW = 0, cCacheR = 0;
async function call(system, user, maxTok) {
  for (let a = 0; a < 4; a++) {
    try {
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "x-api-key": KEY, "anthropic-version": "2023-06-01", "content-type": "application/json" },
        body: JSON.stringify({ model: OPUS, max_tokens: maxTok,
          system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: user }] }),
      });
      if (r.status === 429 || r.status >= 500) { await new Promise(x => setTimeout(x, 2000 * (a + 1))); continue; }
      const j = await r.json();
      if (j.error) { console.error("API err:", JSON.stringify(j.error).slice(0, 160)); await new Promise(x => setTimeout(x, 2000 * (a + 1))); continue; }
      const u = j.usage || {};
      cIn += (u.input_tokens || 0) * PRICE[0] / 1e6; cOut += (u.output_tokens || 0) * PRICE[1] / 1e6;
      cCacheW += (u.cache_creation_input_tokens || 0) * PRICE[0] * 1.25 / 1e6;
      cCacheR += (u.cache_read_input_tokens || 0) * PRICE[0] * 0.1 / 1e6;
      return j.content?.[0]?.text || "";
    } catch { await new Promise(x => setTimeout(x, 2000 * (a + 1))); }
  }
  return "";
}
const parseArr = (t) => { const s = t.indexOf("["), e = t.lastIndexOf("]"); if (s < 0) return null; try { return JSON.parse(t.slice(s, e + 1)); } catch { return null; } };

// --- MAIN --------------------------------------------------------------------
const tree = buildTree();
const targets = loadTargets();
console.log(`=== KLASSIFIKATSIOON (${DRY ? "DRY-RUN" : "EXECUTE"}) — source=${SOURCE} ===`);
console.log(`L3 puus: ${tree.count} | sihtmärke: ${targets.length}`);
if (!targets.length) { console.log("Midagi klassifitseerida — 0 sihtmärki."); process.exit(0); }

const SYS = `Sa oled XLMarket e-poe tooteklassifikaator. Sul on ALL KOGU taksonoomia: ${tree.count} L3-kategooriat (formaat: [handle] L1 > L2 > L3 :: näidistooted).

Vali IGALE tootele PARIM L3-kategooria KOGU puust. REEGLID (pingerida, kõrgem võidab):
1. EKSKLUSIIVSUS-VÄRAV: kui toode on AINULT ühe segmendi oma (ainult laps/kodu/kommerts) → segment-kodu. Signaal: vanus "Ages 3-8"/disain=TUGEV; kandevõime=NÕRK.
2. TÜÜP + DOMEEN: kodu = tegelik tüüp + kus ostja OTSIB (mitte ostja-segment, mitte tootja-nimi).
3. DUP-VÄRAV (KRIITILINE): sul on KOGU puu — enne kui pakud new_l3, KONTROLLI et ÜKSKI olemasolev L3 ei kata seda tootetüüpi. Semantiline vaste, MITTE täpne nimi (nt "Stock Pot"→"Potid"; "Kaubaalus"→"Alused"). Kui semantiliselt sobiv L3 on olemas → KASUTA seda, ÄRA loo uut.
4. LAIUSE: eelista laia sobivat L3 (mahutab variante).
Loe SISU semantiliselt (masintõlge/tootja-nimi eksitab — kinnita tehnilisest spetsist).
new_l3=true AINULT kui TÕESTATUD, et kogu puus pole ühtki sobivat tüüpi.

KOGU L3-PUU:
${tree.text}`;

const BATCH = 6, batches = [];
for (let i = 0; i < targets.length; i += BATCH) batches.push(targets.slice(i, i + BATCH));

const results = [];
async function doBatch(bi) {
  const b = batches[bi];
  const plist = b.map((p, i) => `--- TOODE ${i + 1} (sku=${p.sku}) ---\nPealkiri: ${p.title}\nTootja-tüüp: ${p.type}\nKirjeldus: ${(p.desc || "").slice(0, 300)}\nMüügipunktid: ${(p.sp || "").slice(0, 200)}`).join("\n\n");
  const user = `Klassifitseeri need ${b.length} toodet. Iga toote kohta tagasta JSON-objekt massiivis:\n{"sku":"...","l3":"handle VÕI null","confidence":0.0-1.0,"reason":"lühi eesti","new_l3":false,"suggest_name":"","suggest_l2":"handle"}\nTagasta AINULT JSON-massiiv ${b.length} objektiga.\n\n${plist}`;
  const r = await call(SYS, user, 2500);
  const arr = parseArr(r) || [];
  for (const p of b) {
    const o = arr.find(x => x.sku === p.sku) || {};
    const conf = +o.confidence || 0;
    const l3ok = o.l3 && tree.byHandle[o.l3];          // pakutud handle PEAB puus olemas olema
    // PROPOSE-NOT-CREATE: auto AINULT kui olemas-L3 + kõrge kindlus + !new_l3.
    // "l3 pole puus" (mudel pakkus kodu mida ei eksisteeri VÕI null) = kodu puudub → INIMENE,
    //   MITTE vaikne quarantine — nimeta klaster reason/suggest_name järgi (nt "Anemomeetrid").
    let bucket;
    if (o.new_l3) bucket = "new_l3";
    else if (l3ok && conf >= CONF_AUTO) bucket = "auto";
    else if (l3ok && conf >= CONF_REVIEW) bucket = "review";      // olemas-L3, madal kindlus
    else if (!l3ok && conf >= CONF_REVIEW) bucket = "new_l3";     // kindel tüüp, kodu puudub → uue-L3 kandidaat
    else bucket = "quarantine";                                   // ei tea (madal kindlus + kodu puudub)
    // proposedType = klastri nimi inimese-vaates
    const proposedType = bucket === "auto" ? tree.byHandle[o.l3].path
      : (o.suggest_name || (l3ok ? tree.byHandle[o.l3].name : "") || (o.reason || "").slice(0, 60) || "?");
    results.push({
      id: p.id, sku: p.sku, status: p.status, title: (p.title || "").slice(0, 70),
      l3: l3ok ? o.l3 : null, l3path: l3ok ? tree.byHandle[o.l3].path : null,
      confidence: conf, reason: (o.reason || "").slice(0, 120),
      new_l3: !!o.new_l3, suggest_name: o.suggest_name || "", suggest_l2: o.suggest_l2 || "",
      proposedType, bucket,
    });
  }
  console.error(`batch ${bi + 1}/${batches.length} ok`);
}
let idx = 0;
async function worker() { while (idx < batches.length) { const i = idx++; await doBatch(i); } }
// Cache-soojendus: 1. batch üksi (kirjutab prompt-cache), siis paralleel loeb cache'ist (~10× odavam).
if (batches.length > 1) { await doBatch(0); idx = 1; }
await Promise.all(Array.from({ length: CONC }, worker));

results.sort((a, b) => targets.findIndex(p => p.id === a.id) - targets.findIndex(p => p.id === b.id));
fs.writeFileSync(OUT, JSON.stringify(results, null, 1));

// --- KOKKUVÕTE ---------------------------------------------------------------
const bk = results.reduce((a, r) => { a[r.bucket] = (a[r.bucket] || 0) + 1; return a; }, {});
const cost = cIn + cOut + cCacheW + cCacheR;
console.log(`\n=== BUCKETS === auto:${bk.auto || 0}  review:${bk.review || 0}  new_l3:${bk.new_l3 || 0}  quarantine:${bk.quarantine || 0}`);
console.log(`=== KULU === $${cost.toFixed(3)} (${targets.length} toodet, $${(cost / targets.length).toFixed(4)}/toode)`);

// review + new_l3 klastritena (suggest_l2 + suggest_name järgi) — INIMESE vaade
const reviewItems = results.filter(r => r.bucket === "review" || r.bucket === "new_l3");
if (reviewItems.length) {
  const clusters = {};
  for (const r of reviewItems) {
    const norm = (r.proposedType || "?").toLowerCase().replace(/[^a-zäöüõ0-9]+/g, " ").trim();
    const key = `${r.bucket}:${norm}`;
    (clusters[key] ||= { key, kind: r.bucket, name: r.proposedType, l2: r.suggest_l2 || null, items: [] }).items.push(r);
  }
  console.log(`\n=== REVIEW-BUCKET (${reviewItems.length} toodet, ${Object.keys(clusters).length} klastrit) ===`);
  for (const c of Object.values(clusters).sort((a, b) => b.items.length - a.items.length)) {
    console.log(`  [${c.kind}] "${c.name}"${c.l2 ? ` (@${c.l2})` : ""} — ${c.items.length} toodet`);
    for (const it of c.items.slice(0, 3)) console.log(`       · ${it.title}  (conf ${it.confidence})`);
  }
}

if (DRY) { console.log(`\n[DRY-RUN] EI kirjutatud. Tulemused: ${OUT}`); process.exit(0); }

// ============================ EXECUTE ========================================
// classification_review tabel (idempotentne)
q(`CREATE TABLE IF NOT EXISTS classification_review (
    product_id text PRIMARY KEY,
    sku text, title text, bucket text NOT NULL,
    proposed_l3 text, suggest_name text, suggest_l2 text,
    confidence numeric, reason text,
    status text NOT NULL DEFAULT 'pending',
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now());
  CREATE INDEX IF NOT EXISTS idx_clsrev_status ON classification_review(status, bucket);`);

const esc = (s) => (s == null ? "" : String(s).replace(/'/g, "''"));
const autos = results.filter(r => r.bucket === "auto");
const reviews = results.filter(r => r.bucket !== "auto");

// AUTO → paiguta olemas-L3-sse (INSERT link) + draft→published
if (autos.length) {
  const sql = ["BEGIN;"];
  for (const r of autos) {
    sql.push(`INSERT INTO product_category_product(product_id,product_category_id)
      SELECT '${esc(r.id)}', c.id FROM product_category c WHERE c.handle='${esc(r.l3)}' AND c.deleted_at IS NULL
      ON CONFLICT DO NOTHING;`);
    if (r.status === "draft")
      sql.push(`UPDATE product SET status='published',updated_at=now() WHERE id='${esc(r.id)}' AND status='draft';`);
    // paigutatud → eemalda võimalik varasem review-kirje
    sql.push(`DELETE FROM classification_review WHERE product_id='${esc(r.id)}';`);
  }
  sql.push("COMMIT;");
  q(sql.join("\n"), false);
  console.log(`\n✅ AUTO-PAIGUTATUD: ${autos.length} toodet olemas-L3-desse (draft→published kus vaja).`);
}
// REVIEW/NEW_L3/QUARANTINE → review-bucket (upsert), EI paiguta, EI publitseeri
if (reviews.length) {
  const sql = ["BEGIN;"];
  for (const r of reviews) {
    sql.push(`INSERT INTO classification_review(product_id,sku,title,bucket,proposed_l3,suggest_name,suggest_l2,confidence,reason)
      VALUES ('${esc(r.id)}','${esc(r.sku)}','${esc(r.title)}','${esc(r.bucket)}','${esc(r.l3)}','${esc(r.suggest_name)}','${esc(r.suggest_l2)}',${r.confidence || 0},'${esc(r.reason)}')
      ON CONFLICT (product_id) DO UPDATE SET bucket=EXCLUDED.bucket,proposed_l3=EXCLUDED.proposed_l3,
        suggest_name=EXCLUDED.suggest_name,suggest_l2=EXCLUDED.suggest_l2,confidence=EXCLUDED.confidence,
        reason=EXCLUDED.reason,updated_at=now() WHERE classification_review.status='pending';`);
  }
  sql.push("COMMIT;");
  q(sql.join("\n"), false);
  console.log(`✅ REVIEW-BUCKETISSE: ${reviews.length} toodet (INIMENE otsustab; EI paigutatud, EI publitseeritud).`);
}
console.log(`\nTulemused: ${OUT}`);
