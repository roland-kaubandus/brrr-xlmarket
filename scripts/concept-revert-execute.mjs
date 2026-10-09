#!/usr/bin/env node
/**
 * concept-revert-execute.mjs — TAGASIULATUV kontseptsiooni-väravaga REVERT (Tarmo 2026-10-09).
 *
 * TAUST: naabrite-execute (nbr-2026-10-09T125959) jooksis ILMA kontseptsiooniväravata (c lisati hiljem).
 * Tarmo: "kontrolli KÕIK klastrid uue kontseptsiooniväravaga. 'Ei ole sama kliendikontseptsioon' → revert
 * algsesse koju. DRY → raporteeri → execute. Stack-luku all, undo + Telegram."
 *
 * ÜLDISTATUD (HARD RULE #5 — üks transform, mitu kutsujat): sama tööriist iga naabrite-partii retro-kontrolliks.
 * See skript LOEB retro-skänni verdiktid (scripts/lib/concept-gate.mjs conceptMoveJudge väljund, --verdicts <path>) ja:
 *   - TAGASI_ALLIKAS (korge+kesk)  → KOGU klaster tagasi fromId-koju (WHERE pcat=toId → kaitseb kui juba mujal)
 *   - OSALINE (dušitrapid pcat_10lin→pcat_9drenrenn) → AINULT Shower Drain tagasi (title-põhine, Trench jääb)
 *   - OSALINE tühja back_idx-ga → SIGNAL, EI revert
 *   - VALIKULINE --del-l3 <id>: soft-delete tühi dup-L3 (batch 2 = pcat_f4_13x1_12) → STRUKTUURI-MUUTUS.
 *
 * DEPLOY-NÜANSS: --del-l3 antud = struktuur muutub → TÄIS 4-sammu deploy (genyM → gen-category-tree → push → coolify).
 * --del-l3 PUUDU = moves-only (ainult toote-lingid) → struktuur ei muutu → AINULT Meili reindeks, deploy VAHELE.
 * Stack-lukk (HARD RULE #9): DB-transaktsioon + Meili luku ALL; lukk VABASTATAKSE ENNE coolify-deploy.sh-d
 * (bash võtab oma luku; node-lukk peab enne vabanema, muidu 1200s deadlock — ei ole protsessi-ülest re-entry).
 *
 * Käivita:  set -a; . /opt/eumotors-tasks/.env; set +a; node scripts/concept-revert-execute.mjs --dry [--verdicts <path>]
 *           ... node scripts/concept-revert-execute.mjs --deploy [--del-l3 <id>]   (päris: DB + Meili [+ 4-sammu deploy])
 * Undo:     node scripts/concept-revert-execute.mjs --undo reports/backups/concept-revert-undo-<batch>.json [--deploy]
 */
import fs from "node:fs";
import { execSync } from "node:child_process";
import { acquireStackLock } from "./lib/stack-lock.mjs";

const REPO = "/opt/xlmarket-github";
const SP = process.env.SP || "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const DEPLOY = argv.includes("--deploy");
const UNDO = argv.includes("--undo") ? argv[argv.indexOf("--undo") + 1] : null;
const VERDICTS = argv.includes("--verdicts") ? argv[argv.indexOf("--verdicts") + 1] : `${SP}/retro-verdicts.json`;
const BATCH_ID = process.env.BATCH_ID || ("cr-" + new Date().toISOString().replace(/[:.]/g, "").replace(/(T\d{6}).*/, "$1"));
// --del-l3 <id> (valikuline): soft-delete tühi dup-L3 (batch 2 = pcat_f4_13x1_12). Puudu → L3-kustutust EI tehta
// → moves-only (struktuur ei muutu) → AINULT Meili reindeks, 4-sammu deploy VAHELE (CLAUDE.md deploy-nüanss).
const DEL_L3 = argv.includes("--del-l3") ? argv[argv.indexOf("--del-l3") + 1] : null;
const DEL_L3_NAME = process.env.DEL_L3_NAME || (DEL_L3 === "pcat_f4_13x1_12" ? "Paindvõlliga lihvimismasinad" : DEL_L3 || "");
const STRUCT_CHANGE = !!DEL_L3; // ainult L3-kustutus = struktuuri-muutus; muidu moves-only

const sh = (cmd) => execSync(cmd, { encoding: "utf8", stdio: "inherit" });
const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const MEDUSA = execSync("docker ps --format '{{.Names}}' | grep '^medusa-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB) { console.error("🔴 db-k33g puudub"); process.exit(2); }
const S = (s) => `'${String(s).replace(/'/g, "''")}'`;
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
const psqlTx = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });

// ─────────────────────────────────────────────────────────────────────────────
// UNDO-REŽIIM: loe sidecar, pööra kõik tagasi (revert → algne dest; L3 → deleted_at NULL).
// ─────────────────────────────────────────────────────────────────────────────
function runUndo() {
  if (!fs.existsSync(UNDO)) { console.error(`🔴 undo-fail puudub: ${UNDO}`); process.exit(1); }
  const u = JSON.parse(fs.readFileSync(UNDO, "utf8"));
  console.log(`🧯 UNDO batch=${u.batch_id} · ${u.reverts.length} klastrit · L3-taaste=${u.deleted_l3 ? "jah" : "ei"}${DRY ? " [DRY]" : ""}`);
  let sql = "BEGIN;\n";
  for (const r of u.reverts) // pööra: pid tagasi algsesse dest-i (toId)
    sql += `UPDATE product_category_product SET product_category_id=${S(r.toId)} WHERE product_id IN (${r.pids.map(S).join(",")}) AND product_category_id=${S(r.fromId)};\n`;
  if (u.deleted_l3) sql += `UPDATE product_category SET deleted_at=NULL, updated_at=now() WHERE id=${S(u.deleted_l3)};\n`;
  sql += `INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, status, affected, meta)
    VALUES ('claude-code-test','claude-code-test','api','neighbor-concept-retro','undo','applied',
      ${S(JSON.stringify(u.reverts.flatMap(r => r.pids)))}::jsonb, ${S(JSON.stringify({ batch_id: u.batch_id, restored_l3: u.deleted_l3 || null }))}::jsonb);\n`;
  sql += "COMMIT;\n";
  if (DRY) { console.log(sql); process.exit(0); }
  let rel = null;
  try { rel = acquireStackLock({ holder: "concept-revert-undo", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 60_000 }); }
  catch (e) { console.error(`🔴 ${e.message}\n   → deploy käib? proovi uuesti.`); process.exit(3); }
  psqlTx(sql);
  console.log("✓ UNDO DB taastatud");
  reindex();
  if (rel) { rel(); rel = null; }
  if (DEPLOY) deploy(`revert(taxonomy): UNDO kontseptsiooni-revert ${u.batch_id}`);
  console.log(`\n✅ UNDO valmis — ${u.batch_id}`);
  process.exit(0);
}

function reindex() {
  if (!MEDUSA) { console.error("⚠️ medusa-k33g puudub → Meili reindeks VAHELE"); return false; }
  try { sh(`docker exec ${MEDUSA} sh -c 'cd /app && node scripts/index-meilisearch.mjs'`); }
  catch { console.error("⚠️ Meili reindeks FAIL"); return false; }
  // #0 reegel: reindeks ilma sünonüüm-sync'ita jätab otsingu ilma sünonüümideta → FAIL-LOUD.
  try { sh(`docker exec ${MEDUSA} sh -c 'cd /app && node scripts/sync-synonyms.mjs'`); }
  catch (e) { console.error("🛑 sync-synonyms KUKKUS reindeksi järel: " + String(e.message).slice(0, 160)); process.exit(1); }
  return true;
}

function deploy(commitMsg) {
  sh(`node ${REPO}/scripts/genyM.mjs`);
  sh(`cp /opt/eumotors-tasks/v4-staging/taxonomy-music.yaml ${REPO}/backend/src/data/taxonomy.yaml`);
  sh(`node ${REPO}/scripts/gen-category-tree.mjs`);
  try {
    sh(`cd ${REPO} && git add -A && git commit -m ${JSON.stringify(commitMsg + "\n\nCo-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>")}`);
    sh(`cd ${REPO} && git push origin taxonomy-v4`); // Coolify build-allikas
    try { // HARD RULE #4 — sama commit MÕLEMALE harule
      const sha = execSync(`cd ${REPO} && git rev-parse HEAD`, { encoding: "utf8" }).trim();
      const wt = `/tmp/xl-cr-main-${BATCH_ID}`;
      sh(`cd ${REPO} && git fetch -q origin main`);
      sh(`cd ${REPO} && git worktree add --force ${wt} origin/main 2>&1 | tail -1 || true`);
      try { sh(`cd ${wt} && git cherry-pick -x ${sha} && git push origin HEAD:main`); console.log("  main-sünk: ✓"); }
      catch { try { sh(`cd ${wt} && git cherry-pick --abort`); } catch {} console.log("  main-sünk: ⚠️ konflikt — käsitsi"); }
      try { sh(`cd ${REPO} && git worktree remove --force ${wt}`); } catch {}
    } catch (e) { console.log("  main-sünk: ⚠️ " + String(e.message).slice(0, 100)); }
  } catch (e) { console.log("ℹ️ git: " + String(e.message).slice(0, 140)); }
  sh(`bash ${REPO}/scripts/coolify-deploy.sh`); // võtab OMA bash-luku (node-lukk juba vabastatud)
  console.log("✓ 4-sammu deploy: genyM + gen-tree + push mõlemad + coolify");
}

if (UNDO) runUndo();

// ─────────────────────────────────────────────────────────────────────────────
// 1. Ehita revert-komplekt verdiktidest.
// ─────────────────────────────────────────────────────────────────────────────
if (!fs.existsSync(VERDICTS)) { console.error(`🔴 verdiktid puuduvad: ${VERDICTS}`); process.exit(1); }
const V = JSON.parse(fs.readFileSync(VERDICTS, "utf8"));

const reverts = []; // {fromId,toId,sourceName,targetName,sourceMain,targetMain,kindlus,verdict,pids[],note?}
const signals = []; // mitte-rakendatavad OSALINE → ülevaatus

for (const r of V) {
  if (r.verdict === "OK_SIHT") continue;
  const base = { fromId: r.fromId, toId: r.toId, sourceName: r.sourceName, targetName: r.targetName, sourceMain: r.sourceMain, targetMain: r.targetMain, kindlus: r.kindlus, verdict: r.verdict, pohjus: r.pohjus };
  if (r.verdict === "TAGASI_ALLIKAS" && (r.kindlus === "korge" || r.kindlus === "kesk")) {
    reverts.push({ ...base, pids: r.pids });
  } else if (r.verdict === "OSALINE" && r.fromId === "pcat_10lin" && r.toId === "pcat_9drenrenn") {
    // dušitrapid: title-põhine (back_idx EI ole pid-järjega garanteeritud). Shower Drain tagasi, Trench jääb.
    const backPids = q(`SELECT pcp.product_id FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
      WHERE pcp.product_id IN (${r.pids.map(S).join(",")}) AND pcp.product_category_id=${S(r.toId)} AND p.title ILIKE '%Shower Drain%'`)
      .trim().split("\n").filter(Boolean);
    reverts.push({ ...base, pids: backPids, note: "OSALINE title-põhine: Shower Drain tagasi, Trench jääb" });
  } else {
    signals.push({ ...base, n: r.pids.length }); // OSALINE tühja/ebakindla back_idx-ga → signal
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. MIGRATE SQL (üks transaktsioon): revert + L3 soft-delete + review_decision_log.
// ─────────────────────────────────────────────────────────────────────────────
let sql = "BEGIN;\n";
for (const r of reverts)
  sql += `UPDATE product_category_product SET product_category_id=${S(r.fromId)} WHERE product_id IN (${r.pids.map(S).join(",")}) AND product_category_id=${S(r.toId)};\n`;
if (DEL_L3)
  sql += `UPDATE product_category SET deleted_at=now(), updated_at=now() WHERE id=${S(DEL_L3)} AND deleted_at IS NULL AND NOT EXISTS (SELECT 1 FROM product_category_product x WHERE x.product_category_id=${S(DEL_L3)});\n`;
for (const r of reverts) {
  const meta = { batch_id: BATCH_ID, from: r.sourceName, to: r.targetName, kindlus: r.kindlus, verdict: r.verdict, note: r.note || null, resolved_by: "concept-gate-retro", reverted: r.pids.length };
  sql += `INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, concept_key, target_handle, status, affected, meta)
    VALUES ('claude-code-test','claude-code-test','api','neighbor-concept-retro','revert',${S(r.toId)},${S(r.fromId)},'applied',${S(JSON.stringify(r.pids))}::jsonb,${S(JSON.stringify(meta))}::jsonb);\n`;
}
if (DEL_L3)
  sql += `INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, concept_key, status, affected, meta)
  VALUES ('claude-code-test','claude-code-test','api','neighbor-concept-retro','delete',${S(DEL_L3)},'applied','[]'::jsonb,${S(JSON.stringify({ batch_id: BATCH_ID, reason: "tühi dup-L3, L3=" + DEL_L3_NAME }))}::jsonb);\n`;
sql += "COMMIT;\n";
fs.writeFileSync(`${SP}/concept-revert-migrate.sql`, sql);

// ─────────────────────────────────────────────────────────────────────────────
// 3. RAPORT.
// ─────────────────────────────────────────────────────────────────────────────
const totalProducts = reverts.reduce((s, r) => s + r.pids.length, 0);
const byConf = (k) => reverts.filter(r => r.kindlus === k);
console.log(`\n═══ KONTSEPTSIOONI-REVERT ${DRY ? "(DRY)" : ""} | batch=${BATCH_ID} ═══`);
console.log(`Revert: ${reverts.length} klastrit / ${totalProducts} toodet  (korge ${byConf("korge").length} · kesk ${byConf("kesk").length})`);
console.log(DEL_L3 ? `L3 kustutus: ${DEL_L3} «${DEL_L3_NAME}» (tühi dup) → STRUKTUURI-MUUTUS → 4-sammu deploy` : `L3 kustutus: — (moves-only → ainult Meili reindeks)`);
console.log(`Signal (EI revert): ${signals.length} OSALINE ilma rakendatava indeksita`);
const order = { korge: 0, kesk: 1, madal: 2 };
for (const r of [...reverts].sort((a, b) => order[a.kindlus] - order[b.kindlus])) {
  console.log(`\n  [${r.verdict}·${r.kindlus}] «${r.targetName}» → «${r.sourceName}»  (${r.pids.length} tagasi)`);
  console.log(`    ${r.targetMain}  →  ${r.sourceMain}${r.note ? "   ⟨" + r.note + "⟩" : ""}`);
  console.log(`    põhjus: ${(r.pohjus || "").slice(0, 150)}`);
}
for (const s of signals) console.log(`\n  ⊘ SIGNAL [${s.verdict}·${s.kindlus}] «${s.sourceName}»→«${s.targetName}» (${s.n}) — ${(s.pohjus || "").slice(0, 110)}`);

if (DRY) { console.log(`\n(DRY — SQL: ${SP}/concept-revert-migrate.sql. DB-d EI muudetud.)`); process.exit(0); }

// ─────────────────────────────────────────────────────────────────────────────
// 4. EXECUTE — stack-lukk → baseline → undo-sidecar → transaktsioon → Meili → VABASTA lukk → deploy → Telegram.
// ─────────────────────────────────────────────────────────────────────────────
let releaseLock = null;
try { releaseLock = acquireStackLock({ holder: "concept-revert", waitMs: Number(process.env.XL_DBWRITE_WAIT_MS) || 60_000 }); }
catch (e) { console.error(`🔴 ${e.message}\n   → deploy käib? proovi uuesti kui stack healthy.`); process.exit(3); }

const distinct = () => +q(`SELECT count(DISTINCT product_id) FROM product_category_product;`).trim();
const l3count = () => +q(`SELECT count(*) FROM product_category WHERE mpath LIKE 'pcat_v4_l%' AND deleted_at IS NULL AND (char_length(mpath)-char_length(replace(mpath,'.','')))=2;`).trim();
const baseDistinct = distinct(), baseL3 = l3count();
try { execSync(`node ${REPO}/scripts/check-taxonomy-invariants.mjs --ci`, { stdio: "pipe" }); }
catch { console.error("🔴 PRE inv-taxonomy FAIL → EI rakenda (baseline katki). Lahenda enne."); if (releaseLock) releaseLock(); process.exit(3); }
console.log(`baseline: inv 0 FAIL · distinct=${baseDistinct} · l3=${baseL3}`);

// undo-sidecar ENNE kirjutamist
fs.mkdirSync(`${REPO}/reports/backups`, { recursive: true });
const undoFile = `${REPO}/reports/backups/concept-revert-undo-${BATCH_ID}.json`;
fs.writeFileSync(undoFile, JSON.stringify({ batch_id: BATCH_ID, generated_at: new Date().toISOString(),
  reverts: reverts.map(r => ({ fromId: r.fromId, toId: r.toId, pids: r.pids })), deleted_l3: DEL_L3,
  signals: signals.map(s => ({ fromId: s.fromId, toId: s.toId, n: s.n })) }, null, 1));
console.log(`💾 undo: node scripts/concept-revert-execute.mjs --undo ${undoFile.replace(REPO + "/", "")} --deploy`);

console.log("⏳ transaktsioon…");
psqlTx(sql);
const newDistinct = distinct(), newL3 = l3count();
const expL3 = DEL_L3 ? baseL3 - 1 : baseL3;
console.log(`✅ RAKENDATUD: ${totalProducts} toodet / ${reverts.length} klastrit tagasi${DEL_L3 ? ` + L3 ${DEL_L3} kustutatud` : " (moves-only)"}.`);
console.log(`post: distinct=${newDistinct} (baseline ${baseDistinct}, säilinud=${newDistinct === baseDistinct ? "✓" : "⚠️"}) · l3=${newL3} (baseline ${baseL3}, ${DEL_L3 ? "-1" : "0"} oodatud=${newL3 === expL3 ? "✓" : "⚠️"})`);

console.log("⏳ Meili reindeks + sünonüüm-sync…");
const meiliOk = reindex();

// POST inv (struktuur muutus → kontrolli)
let invOk = true;
try { execSync(`node ${REPO}/scripts/check-taxonomy-invariants.mjs --ci`, { stdio: "pipe" }); }
catch { invOk = false; console.error("⚠️ POST inv-taxonomy FAIL — vaata üle (undo saadaval)."); }

// VABASTA node-lukk ENNE deploy'd (coolify-deploy.sh võtab oma bash-luku; node-lukk peab vabanema)
if (releaseLock) { releaseLock(); releaseLock = null; }

// STRUKTUUR MUUTUB (L3 kustutus) → 4-sammu deploy. MOVES-ONLY → ainult Meili (juba tehtud), deploy VAHELE.
if (STRUCT_CHANGE && DEPLOY) deploy(`revert(taxonomy): kontseptsiooni-värav tagasiulatuv — ${reverts.length} klastrit/${totalProducts} toodet algkoju + kustuta tühi dup-L3 ${DEL_L3}`);
else if (STRUCT_CHANGE && !DEPLOY) console.log("ℹ️ --deploy puudus (struktuur muutus): DB + Meili tehtud, AGA SSoT/nav/push/redeploy VAHELE (L3 jääb navi kuni deploy). Lisa --deploy.");
else console.log("ℹ️ moves-only (0 struktuuri-muutust) → AINULT Meili reindeks (tehtud). 4-sammu deploy VAHELE (CLAUDE.md deploy-nüanss — leht loeb arve Meili'st).");

// Telegram
const tg = [`🧭 KONTSEPTSIOONI-REVERT (tagasiulatuv · ${BATCH_ID})`,
  `Tagasi algkoju: ${totalProducts} toodet / ${reverts.length} klastrit (korge ${byConf("korge").length} · kesk ${byConf("kesk").length})`,
  DEL_L3 ? `L3 kustutatud: «${DEL_L3_NAME}» (tühi dup)` : `L3 kustutus: — (moves-only)`,
  `Väravad: distinct ${newDistinct === baseDistinct ? "säilinud ✓" : "⚠️"} · inv ${invOk ? "0 FAIL ✓" : "⚠️ vaata"} · Meili ${meiliOk ? "✓" : "⚠️"} · deploy ${STRUCT_CHANGE ? (DEPLOY ? "4-sammu ✓" : "VAHELE") : "moves-only: Meili ✓"}`,
  signals.length ? `⊘ ${signals.length} OSALINE signal (ülevaatuseks, ei reverditud)` : "",
  `Undo: node scripts/concept-revert-execute.mjs --undo reports/backups/concept-revert-undo-${BATCH_ID}.json${STRUCT_CHANGE ? " --deploy" : ""}`].filter(Boolean).join("\n");
try { execSync(`bash ${REPO}/scripts/lib/notify-telegram.sh`, { input: tg, encoding: "utf8", stdio: ["pipe", "ignore", "ignore"] }); console.log("📨 Telegram saadetud"); }
catch { console.log("ℹ️ Telegram vahele (token/skript puudu)"); }

fs.writeFileSync(`${SP}/concept-revert-done.json`, JSON.stringify({ batch_id: BATCH_ID, reverts: reverts.length, products: totalProducts, deleted_l3: DEL_L3, signals: signals.length, meiliOk, invOk, deployed: DEPLOY, baseDistinct, newDistinct, baseL3, newL3 }, null, 1));
console.log(`\n✅ EXECUTE valmis — batch ${BATCH_ID}`);
