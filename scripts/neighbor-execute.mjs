#!/usr/bin/env node
/**
 * neighbor-execute.mjs — NAABRITE ÜLEHINDAMISE liigutuste RAKENDAJA (spets §4).
 *
 * Loeb scratchpad/neighbor-reeval.json (neighbor-reeval.mjs DRY väljund: report[].pull + report[].other)
 * ja rakendab liigutused LIVE ühe transaktsioonina + KÕIK väravad (HARD RULE #6):
 *   transaktsioon + undo nbr-<ts> + range-enamus (praegune kodu = hääl, juba DRY-s) +
 *   INV (check-taxonomy-invariants --ci) + lock-harness post + merge-WARN + Meili reindeks + Telegram.
 *
 * Liigutused = AINULT toote-lingid (struktuur muutumatu) → kerge tee: AINULT Meili reindeks
 * (CLAUDE.md deploy-nüanss; EI vaja SSoT-regen/push/redeploy).
 *
 * Käivita:  set -a; . /opt/eumotors-tasks/.env; set +a; node scripts/neighbor-execute.mjs [--dry] [--from <json>]
 * Tagasi:   node scripts/neighbor-undo.mjs <batch_id>
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { acquireStackLock } from "./lib/stack-lock.mjs";
import { conceptMoveJudge } from "./lib/concept-gate.mjs";

const REPO = "/opt/xlmarket-github";
const SP = process.env.SP || "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const FROM = argv.includes("--from") ? argv[argv.indexOf("--from") + 1] : `${SP}/neighbor-reeval.json`;

if (!fs.existsSync(FROM)) { console.error(`🔴 sisend puudub: ${FROM}`); process.exit(1); }
const R = JSON.parse(fs.readFileSync(FROM, "utf8"));

// ── STACK-LUKK (Tarmo 2026-10-09 item 1): DB-write EI tohi käia keset deploy-recreate'i.
// Ainult execute'il (--dry on read-only). Keeldub kiirelt kui deploy käib (ei alusta transaktsiooni, mis tapetakse). ──
if (!DRY) {
  try { acquireStackLock({ holder: "neighbor-execute", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 60_000 }); }
  catch (e) { console.error(`🔴 ${e.message}\n   → deploy käib? proovi uuesti kui stack healthy.`); process.exit(3); }
}

const BATCH_ID = process.env.BATCH_ID || ("nbr-" + new Date().toISOString().replace(/[:.]/g, "").replace(/(T\d{6}).*/, "$1"));
const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const MEDUSA = execSync("docker ps --format '{{.Names}}' | grep '^medusa-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB) { console.error("🔴 db-k33g puudub"); process.exit(2); }
const S = (s) => `'${String(s).replace(/'/g, "''")}'`;
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
const psqlTx = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });

// ── 1. handle → category_id ──
const cats = q(`SELECT id, handle FROM product_category WHERE deleted_at IS NULL`).trim().split("\n").filter(Boolean).map((l) => l.split("|"));
const h2id = new Map(cats.map(([id, h]) => [h, id]));

// ── 2. MOVESET: pull (→ tühi H) + other (→ kolmas naaber). Range-enamus juba DRY-s (ainult selged otsused). ──
const rawMoves = [];
for (const r of R.report || []) {
  for (const p of (r.pull || [])) rawMoves.push({ ck: p.ck, n: p.n, from: p.from, to: r.handle, title: p.title, path: p.path, kind: "pull" });
  for (const o of (r.other || [])) rawMoves.push({ ck: o.ck, n: o.n, from: o.from, to: o.to, title: o.title, path: o.path, kind: "other" });
}

// ── 3. product_id lahendus (spu/vpt → pcp from-kategoorias) + undo-backup ──
const moveRows = []; const skipped = []; const undoMoves = [];
for (const mv of rawMoves) {
  const fromId = h2id.get(mv.from), toId = h2id.get(mv.to);
  if (!fromId || !toId) { skipped.push({ ...mv, reason: "handle olematu DB-s" }); continue; }
  if (fromId === toId) { skipped.push({ ...mv, reason: "from==to" }); continue; }
  const spu = mv.ck.startsWith("spu:") ? mv.ck.slice(4) : null;
  const vpt = mv.ck.startsWith("vpt:") ? mv.ck.slice(4) : null;
  let where;
  if (spu) where = `p.metadata->>'vevor_spu'=${S(spu)}`;
  else if (vpt) where = `p.metadata->>'vevor_product_type'=${S(vpt)}`;
  else { skipped.push({ ...mv, reason: "ck pole spu:/vpt:" }); continue; }
  const pids = q(`SELECT pcp.product_id FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
    WHERE ${where} AND pcp.product_category_id=${S(fromId)} AND p.deleted_at IS NULL`).trim().split("\n").filter(Boolean);
  if (!pids.length) { skipped.push({ ...mv, reason: "0 toodet from-kategoorias (juba liigutatud / stale?)" }); continue; }
  for (const pid of pids) undoMoves.push({ pid, fromId, toId });
  moveRows.push({ ...mv, fromId, toId, pids });
}
let movedProducts = undoMoves.length;

// ── 3.5 KONTSEPTSIOONI-VÄRAV (c) — Tarmo 2026-10-09 DUP-fix: iga liigutuse eel-kontroll ──
// Semantiline kohtunik (a): kas liigutatud tooted KUULUVAD sihti (sama kliendikontseptsioon)?
// TAGASI_ALLIKAS / OSALINE(back) + kindlus korge|kesk → EI liiguta neid tooteid (eemalda move'ist + signal).
// Madal kindlus → ei blokeeri (range-enamus otsustas juba), AGA signaal inimese-ülevaatuseks (turvavõrk).
// (b) morfoloogia-eelfilter pole siin vajalik — kõik liigutused lähevad niikuinii kohtunikku (kõik on
//     juba "kandidaat-liigutused"); eelfilter säästab kutseid classify-chain broaden-DUP juures.
// API-võti puudub → värav VAHELE (fail-open AINULT võtme puudumisel, nagu grab-bag) + selge LOG.
const conceptSignals = [];
if (!DRY && moveRows.length) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error("⚠️ ANTHROPIC_API_KEY puudub → kontseptsiooni-värav (c) VAHELE (liigutused lähevad kontrollimata).");
  } else {
    const idName = new Map(q(`SELECT id, COALESCE(name,'') FROM product_category WHERE id IN (${[...new Set(moveRows.flatMap((m) => [m.fromId, m.toId]))].map(S).join(",")})`).trim().split("\n").filter(Boolean).map((l) => l.split("|")));
    const titlesFor = (pids) => pids.length ? q(`SELECT COALESCE(title,'') FROM product WHERE id IN (${pids.slice(0, 12).map(S).join(",")}) AND deleted_at IS NULL`).trim().split("\n").filter(Boolean) : [];
    const destExist = (toId, excl) => { const ex = new Set(excl); return q(`SELECT p.id, COALESCE(p.title,'') FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id WHERE pcp.product_category_id=${S(toId)} AND p.deleted_at IS NULL LIMIT 120`).trim().split("\n").filter(Boolean).map((l) => l.split("|")).filter(([id]) => !ex.has(id)).slice(0, 6).map(([, t]) => t); };
    const pairs = moveRows.map((mv, i) => ({ pair_id: `mv${i}`, _row: mv, sourceName: idName.get(mv.fromId) || mv.from, targetName: idName.get(mv.toId) || mv.to, movedTitles: titlesFor(mv.pids), targetExistingTitles: destExist(mv.toId, mv.pids) }));
    console.log(`\n⚖️ kontseptsiooni-värav (c): hindan ${pairs.length} liigutust semantiliselt (Opus)…`);
    let verdicts = new Map();
    try { const { conceptMoveJudge } = await import("./lib/concept-gate.mjs"); for (let i = 0; i < pairs.length; i += 8) verdicts = new Map([...verdicts, ...(await conceptMoveJudge({ pairs: pairs.slice(i, i + 8).map(({ _row, ...p }) => p), apiKey }))]); }
    catch (e) { console.error(`🔴 kontseptsiooni-värav kukkus (süsteemne): ${e.message}\n   → HARD RULE #5 fail-loud: EI rakenda. Lahenda enne.`); process.exit(4); }
    const kept = [];
    for (let i = 0; i < pairs.length; i++) {
      const p = pairs[i]; const mv = p._row; const v = verdicts.get(`mv${i}`);
      if (!v) { kept.push(mv); continue; }
      const conf = v.kindlus === "korge" || v.kindlus === "kesk";
      if (v.verdict === "OK_SIHT" || !conf) {
        if (v.verdict !== "OK_SIHT" && conf === false) conceptSignals.push({ ck: mv.ck, from: mv.from, to: mv.to, verdict: v.verdict, kindlus: v.kindlus, note: "madal kindlus → liigutati, AGA märgitud ülevaatuseks", pohjus: v.pohjus });
        kept.push(mv); continue;
      }
      // confident misfile
      if (v.verdict === "TAGASI_ALLIKAS") {
        conceptSignals.push({ ck: mv.ck, from: mv.from, to: mv.to, verdict: v.verdict, kindlus: v.kindlus, blocked: mv.pids.length, pohjus: v.pohjus });
        console.log(`  ⛔ EI liiguta «${p.sourceName}»→«${p.targetName}» (${mv.pids.length}) — ${v.kindlus}: ${v.pohjus}`);
        continue; // drop whole move
      }
      if (v.verdict === "OSALINE") {
        const backSet = new Set(v.back_idx); const stayPids = mv.pids.filter((_, idx) => !backSet.has(idx)); const blockedPids = mv.pids.filter((_, idx) => backSet.has(idx));
        conceptSignals.push({ ck: mv.ck, from: mv.from, to: mv.to, verdict: v.verdict, kindlus: v.kindlus, blocked: blockedPids.length, pohjus: v.pohjus });
        console.log(`  ◐ OSALINE «${p.sourceName}»→«${p.targetName}»: ${blockedPids.length} jääb allikasse, ${stayPids.length} liigub — ${v.pohjus}`);
        if (stayPids.length) kept.push({ ...mv, pids: stayPids });
      }
    }
    // rebuild moveRows + undoMoves from kept
    moveRows.length = 0; undoMoves.length = 0;
    for (const mv of kept) { moveRows.push(mv); for (const pid of mv.pids) undoMoves.push({ pid, fromId: mv.fromId, toId: mv.toId }); }
    movedProducts = undoMoves.length;
    const blockedTotal = conceptSignals.reduce((s, x) => s + (x.blocked || 0), 0);
    console.log(`⚖️ värav: ${moveRows.length} klastrit / ${movedProducts} toodet LÄBIS · ${blockedTotal} toodet BLOKEERITUD (jääb allikasse) · ${conceptSignals.filter((x) => x.note).length} madal-kindlus signaali`);
    fs.writeFileSync(`${SP}/neighbor-concept-signals.json`, JSON.stringify(conceptSignals, null, 1));
    if (!moveRows.length) { console.log("ℹ️ kontseptsiooni-värav blokeeris KÕIK liigutused — ei tee midagi."); process.exit(0); }
  }
}

// ── 4. MIGRATE SQL (üks transaktsioon) ──
let sql = "BEGIN;\n";
for (const mv of moveRows) sql += `UPDATE product_category_product SET product_category_id=${S(mv.toId)} WHERE product_id IN (${mv.pids.map(S).join(",")}) AND product_category_id=${S(mv.fromId)};\n`;
for (const mv of moveRows) {
  const meta = { batch_id: BATCH_ID, ck: mv.ck, from_handle: mv.from, to_handle: mv.to, kind: mv.kind, path: mv.path, resolved_by: "neighbor-reeval", moved: mv.pids.length };
  sql += `INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, concept_key, target_handle, status, affected, meta)
    VALUES ('claude-code-test','auto-judge-audit','pipeline','neighbor-reeval','move',${S(mv.ck)},${S(mv.to)},'applied',${S(JSON.stringify(mv.pids))}::jsonb,${S(JSON.stringify(meta))}::jsonb);\n`;
}
sql += "COMMIT;\n";
fs.writeFileSync(`${SP}/neighbor-migrate.sql`, sql);

console.log(`\n═══ NAABRITE ÜLEHINDAMINE EXECUTE ${DRY ? "(DRY)" : ""} | batch=${BATCH_ID} ═══`);
console.log(`Liigutusi: ${moveRows.length} klastrit / ${movedProducts} toodet (${moveRows.filter((m) => m.kind === "pull").length} pull → tühi L3 + ${moveRows.filter((m) => m.kind === "other").length} other). Skip: ${skipped.length}`);
for (const sk of skipped.slice(0, 10)) console.log(`  ⊘ skip ck=${sk.ck} n=${sk.n} (${sk.from}→${sk.to}): ${sk.reason}`);
if (!moveRows.length) { console.log("ℹ️ 0 rakendatavat liigutust — ei tee midagi."); process.exit(0); }

if (DRY) {
  console.log(`\n(DRY — migrate.sql kirjutatud: ${SP}/neighbor-migrate.sql. DB-d EI muudetud.)`);
  process.exit(0);
}

// ── 5. BASELINE (lock-harness pre ekvivalent: inv 0 FAIL + distinct + l3count) ──
const distinct = () => +q(`SELECT count(DISTINCT product_id) FROM product_category_product;`).trim();
const l3count = () => +q(`SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;`).trim();
const runInv = () => { try { execSync(`node ${REPO}/scripts/check-taxonomy-invariants.mjs --ci`, { stdio: "pipe" }); return true; } catch { return false; } };
const baseDistinct = distinct(), baseL3 = l3count();
if (!runInv()) { console.error("🔴 PRE inv-taxonomy FAIL → EI rakenda (baseline katki). Lahenda enne."); process.exit(3); }
console.log(`baseline: inv 0 FAIL · distinct=${baseDistinct} · l3=${baseL3}`);

// ── 6. UNDO-FAIL (enne kirjutamist) ──
fs.mkdirSync(`${REPO}/reports/backups`, { recursive: true });
const undoFile = `${REPO}/reports/backups/neighbor-undo-${BATCH_ID}.json`;
fs.writeFileSync(undoFile, JSON.stringify({ batch_id: BATCH_ID, generated_at: new Date().toISOString(), kind: "moves",
  moves: undoMoves, counts: { moveClusters: moveRows.length, moveProducts: movedProducts, skipped: skipped.length } }, null, 1));
console.log(`💾 undo: node scripts/neighbor-undo.mjs ${BATCH_ID}`);

// ── 7. RAKENDA (transaktsioon) ──
console.log("⏳ transaktsioon…");
psqlTx(sql);
console.log(`✅ RAKENDATUD: ${movedProducts} toodet / ${moveRows.length} klastrit.`);

// ── 7b. MEILI REINDEKS (moves-only deploy-nüanss: category_handles facet peab uuenema) ──
// Struktuur muutumatu → EI vaja SSoT-regen/push/redeploy, AINULT Meili (CLAUDE.md).
let meiliOk = true;
if (MEDUSA) {
  console.log("⏳ Meili reindeks…");
  try { execSync(`docker exec ${MEDUSA} sh -c 'cd /app && node scripts/index-meilisearch.mjs'`, { stdio: "inherit" }); }
  catch { meiliOk = false; console.error("⚠️ Meili reindeks FAIL — kategooria-arvud jäävad vanaks kuni järgmise reindeksini (undo saadaval)."); }
} else { meiliOk = false; console.error("⚠️ medusa-k33g puudub → Meili reindeks VAHELE (arvud vananevad)."); }

// ── 8. POST-VÄRAVAD: lock-harness post (inv + distinct + l3 + meili VÄRSKUS-kontroll) ──
let lockOk = true;
try { execSync(`node ${REPO}/scripts/lock-harness.mjs post ${SP}/neighbor-migrate.sql ${baseDistinct} ${baseL3}`, { stdio: "inherit" }); }
catch { lockOk = false; console.error("⚠️ lock-harness post andis FAIL — vaata üle (undo saadaval)."); }

// ── 9. MERGE-WARN (deterministlik; merge-judge.mjs puudub → tühjaks-jäänud naaber + H↔naaber üle-sarnasus) ──
const warns = [];
const fromCounts = q(`SELECT pc.handle, count(pcp.product_id) FROM product_category pc
  LEFT JOIN product_category_product pcp ON pcp.product_category_id=pc.id
  WHERE pc.handle IN (${[...new Set(moveRows.map((m) => m.from))].map(S).join(",")}) GROUP BY pc.handle`).trim().split("\n").filter(Boolean);
for (const line of fromCounts) { const [h, c] = line.split("|"); if (+c === 0) warns.push(`naaber «${h}» tühjaks liigutatud (count=0) → kontrolli kas see L3 on nüüd üleliigne (merge?)`); }
if (warns.length) { console.log("⚠️ MERGE-WARN:"); for (const w of warns) console.log(`   · ${w}`); }
else console.log("✓ merge-WARN: ükski naaber ei jäänud tühjaks");

// ── 10. Telegram ──
const tg = [`🧭 NAABRITE ÜLEHINDAMINE (${BATCH_ID})`,
  `Liigutatud: ${movedProducts} toodet / ${moveRows.length} klastrit`,
  `  ↳ ${moveRows.filter((m) => m.kind === "pull").length} pull (lõksus-tooted → tühi L3) + ${moveRows.filter((m) => m.kind === "other").length} other`,
  `Väravad: inv ${lockOk ? "0 FAIL ✓" : "⚠️ vaata"} · distinct säilinud · Meili ${meiliOk ? "reindekseeritud ✓" : "⚠️ reindeks FAIL"}`,
  warns.length ? `⚠️ ${warns.length} merge-WARN (tühjaks-jäänud naaber)` : "✓ 0 merge-WARN",
  (() => { const b = conceptSignals.reduce((s, x) => s + (x.blocked || 0), 0); const low = conceptSignals.filter((x) => x.note).length; return `⚖️ kontseptsiooni-värav (c): ${b} toodet blokeeritud${low ? ` · ${low} madal-kindlus ülevaatuseks` : ""}`; })(),
  `Undo: node scripts/neighbor-undo.mjs ${BATCH_ID}`].join("\n");
try { execSync(`bash ${REPO}/scripts/lib/notify-telegram.sh`, { input: tg, encoding: "utf8", stdio: ["pipe", "ignore", "ignore"] }); console.log("📨 Telegram saadetud"); }
catch { console.log("ℹ️ Telegram vahele (token/skript puudu)"); }

fs.writeFileSync(`${SP}/neighbor-execute-done.json`, JSON.stringify({ batch_id: BATCH_ID, moveClusters: moveRows.length, moveProducts: movedProducts, skipped: skipped.length, conceptBlocked: conceptSignals.reduce((s, x) => s + (x.blocked || 0), 0), conceptSignals: conceptSignals.length, warns, lockOk, meiliOk }, null, 1));
console.log(`\n✅ EXECUTE valmis — batch ${BATCH_ID}`);
