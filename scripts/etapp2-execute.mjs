#!/usr/bin/env node
/**
 * etapp2-execute.mjs — AUDITI PARANDUS ETAPP 2: piirireeglid (l3meta) + konsensus-liigutused.
 *
 * KINNITATUD muudatustega (Tarmo 2026-10-07):
 *  1. ÜKSKI L3 EI KUSTUTATA. Tühi L3 = auto-peidetud (count>0), kahjutu. "Duplikaadid" jäävad struktuuri.
 *  2. PIIRIREEGLID l3meta `description`-sse: 13 konsensuse paari + stabiilsed Fable-viigi paarid
 *     (3× Fable hääletus, paaris-jooks-ühtivus ≥0.8 → kirjuta; muidu signaal). 2 kõik-eri = puutumata.
 *  3. LIIGUTUSED: ainult konsensuse paarid (range enamus, praegune kodu = hääl). ~65 toodet.
 *     (Fable-viigi paarid = reegel-ainult, EI liiguta — struktuurne otsus = stabiilsus, nagu new_l3.)
 *  6. VÄRAVAD: backup (pcp + l3meta kirjeldused) → batch_id → logi → undo (ka kirjeldused!) →
 *     INV + lock-harness (eraldi samm) → Meili reindeks (eraldi) → Telegram (eraldi).
 *
 * Käivita:  node scripts/etapp2-execute.mjs [--dry]
 * Tagasi:   node scripts/etapp2-undo.mjs <batch_id>
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const REPO = "/opt/xlmarket-github";
const SP = "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const DRY = process.argv.includes("--dry");

const R = JSON.parse(fs.readFileSync(`${SP}/etapp2-results.json`, "utf8"));
const P = JSON.parse(fs.readFileSync(`${SP}/etapp2-pairs.json`, "utf8"));
const revoteFile = `${SP}/etapp2-fable-revote.json`;
const REV = fs.existsSync(revoteFile) ? JSON.parse(fs.readFileSync(revoteFile, "utf8")) : { pairs: [] };

const cats = fs.readFileSync(`${SP}/etapp2-cats.tsv`, "utf8").trim().split("\n").map((l) => l.split("\t"));
const h2id = new Map(cats.map(([id, h]) => [h, id]));

const BATCH_ID = process.env.BATCH_ID || ("e2-" + new Date().toISOString().replace(/[:.]/g, "").replace(/(T\d{6}).*/, "$1"));
const getDB = () => execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const DB = getDB();
if (!DB) { console.error("🔴 db-k33g puudub"); process.exit(2); }
const S = (s) => `'${String(s).replace(/'/g, "''")}'`;
const q = (sql, tA = true) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket ${tA ? "-tA" : "-A"} -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 });
const psqlTx = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -q -v ON_ERROR_STOP=1 -f -`, { input: sql, encoding: "utf8", stdio: ["pipe", "inherit", "inherit"] });

const allPairsRes = [...R.mainRes, ...R.l3Res];
const clObjFor = (p) => (p.kind === "main" ? P.mainPairs : P.l3Pairs)[p.key] || [];
const revByKey = new Map(REV.pairs.map((r) => [r.key, r]));

// ── 1. PIIRIREEGLID → l3meta description (konsensus + stabiilne fable-viik) ──
// Iga kirjutatav paar → reegel läheb KÕIGILE osalevatele L3-käepidemetele (from/to klastrites).
const RULE_TAG = "PIIRIREEGEL (ETAPP 2, 2026-10-07)";
const descByHandle = new Map(); // handle → Set(rule_et)
const writtenPairs = [];
for (const p of allPairsRes) {
  let rule = null, why = null;
  if (p.status === "konsensus") { rule = p.ruleJudge || p.rule; why = "konsensus"; }
  else if (p.status === "fable-viik") {
    const rv = revByKey.get(p.key);
    if (rv && rv.stable && rv.rule) { rule = rv.rule; why = `fable-stabiilne (stab=${rv.stability})`; }
    else { continue; } // signaal — EI kirjuta
  } else { continue; } // koik-eri-signaal / muu — puutumata
  if (!rule) continue;
  const handles = new Set();
  for (const c of clObjFor(p)) { handles.add(c.from); handles.add(c.to); }
  for (const h of handles) {
    if (!h2id.has(h)) continue; // olematu handle → jäta vahele (fail-loud logi allpool)
    if (!descByHandle.has(h)) descByHandle.set(h, new Set());
    descByHandle.get(h).add(rule.trim());
  }
  writtenPairs.push({ key: p.key, aName: p.aName, bName: p.bName, status: p.status, why, rule: rule.trim(), handles: [...handles].filter((h) => h2id.has(h)).length });
}

// ── 2. BACKUP l3meta description (enne) + ehita UPDATE-id ──
const affectedHandles = [...descByHandle.keys()];
const descBackup = [];
if (affectedHandles.length) {
  const rows = q(`SELECT id, handle, coalesce(description,'') FROM product_category WHERE handle IN (${affectedHandles.map(S).join(",")})`);
  for (const line of rows.trim().split("\n")) { if (!line) continue; const a = line.split("|"); descBackup.push({ id: a[0], handle: a[1], oldDescription: a.slice(2).join("|") }); }
}
const oldByHandle = new Map(descBackup.map((b) => [b.handle, b.oldDescription || ""]));
const descWrites = affectedHandles.map((h) => {
  const rules = [...descByHandle.get(h)];
  const ruleText = `${RULE_TAG}: ` + rules.join("  ||  ");
  const old = (oldByHandle.get(h) || "").trim();
  // Olemas-sisu (SEO/varasem piirireegel) SÄILIB: reegel ETTE (öine kohtunik loeb esimesed 400 tähemärki),
  // olemas-tekst järele. product_category.description EI ole kliendile-nähtav (storefront loeb YAML-snapshotist).
  // Idempotentne: kui olemas-tekst juba sama reegli, ära dubleeri.
  const text = !old ? ruleText : old.startsWith(ruleText) ? old : `${ruleText}\n\n${old}`;
  return { handle: h, id: h2id.get(h), text, preserved: !!old };
});

// ── 3. MOVESET (ainult konsensus-paarid; skip olematu handle) ──
const kons = allPairsRes.filter((p) => p.status === "konsensus");
const moveset = []; const skipped = [];
for (const p of kons) {
  const byCk = new Map(clObjFor(p).map((c) => [c.ck, c]));
  for (const m of p.moves) {
    const c = byCk.get(m.ck);
    if (!c) { skipped.push({ ck: m.ck, n: m.n, reason: "ck puudub pairs.json-is", pair: p.key }); continue; }
    if (!h2id.has(c.from) || !h2id.has(c.to)) { skipped.push({ ck: m.ck, n: m.n, from: c.from, to: c.to, reason: "handle olematu DB-s", pair: p.key }); continue; }
    const spu = c.ck.startsWith("spu:") ? c.ck.slice(4) : null;
    const vpt = c.ck.startsWith("vpt:") ? c.ck.slice(4) : null;
    moveset.push({ ck: c.ck, spu, vpt, fromId: h2id.get(c.from), toId: h2id.get(c.to), from: c.from, to: c.to,
      n: c.n, crossMain: (c.fromMain || "") !== (c.toMain || ""), pair: p.key, rule: p.ruleJudge || p.rule });
  }
}

// product_id lahendus (spu → pcp from-kategoorias) + undo-backup
const moveRows = []; const undoMoves = [];
for (const mv of moveset) {
  let where;
  if (mv.spu) where = `p.metadata->>'vevor_spu'=${S(mv.spu)}`;
  else if (mv.vpt) where = `p.metadata->>'vevor_product_type'=${S(mv.vpt)}`;
  else { skipped.push({ ck: mv.ck, n: mv.n, reason: "ck pole spu:/vpt:", pair: mv.pair }); continue; }
  const pids = q(`SELECT pcp.product_id FROM product_category_product pcp JOIN product p ON p.id=pcp.product_id
    WHERE ${where} AND pcp.product_category_id=${S(mv.fromId)} AND p.deleted_at IS NULL`).trim().split("\n").filter(Boolean);
  if (!pids.length) { skipped.push({ ck: mv.ck, n: mv.n, reason: "0 toodet from-kategoorias (juba liigutatud?)", pair: mv.pair }); continue; }
  mv.pids = pids;
  for (const pid of pids) undoMoves.push({ pid, fromId: mv.fromId, toId: mv.toId });
  moveRows.push(mv);
}
const movedProducts = undoMoves.length;

// ── 4. MIGRATE SQL (üks transaktsioon) — ehitatud ENNE DRY/real haru (evidence-gate jaoks) ──
const allPids = undoMoves.map((m) => m.pid);
let sql = "BEGIN;\n";
for (const d of descWrites) sql += `UPDATE product_category SET description=${S(d.text)} WHERE id=${S(d.id)};\n`;
for (const mv of moveRows) sql += `UPDATE product_category_product SET product_category_id=${S(mv.toId)} WHERE product_id IN (${mv.pids.map(S).join(",")}) AND product_category_id=${S(mv.fromId)};\n`;
for (const mv of moveRows) {
  const meta = { batch_id: BATCH_ID, ck: mv.ck, from_handle: mv.from, to_handle: mv.to, rule: mv.rule, cross_main: mv.crossMain, resolved_by: "etapp2-konsensus", moved: mv.pids.length };
  sql += `INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, concept_key, target_handle, status, affected, meta)
    VALUES ('claude-code-test','auto-judge-audit','pipeline','audit-move','move',${S(mv.ck)},${S(mv.to)},'applied',${S(JSON.stringify(mv.pids))}::jsonb,${S(JSON.stringify(meta))}::jsonb);\n`;
}
const descMeta = { batch_id: BATCH_ID, handles: descWrites.length, pairs: writtenPairs.length, skipped: skipped.length };
sql += `INSERT INTO review_decision_log (actor, actor_detail, channel, bucket_type, action, concept_key, target_handle, status, affected, meta)
  VALUES ('claude-code-test','auto-judge-audit','pipeline','audit-boundary-rule','desc-write',${S(BATCH_ID)},'','applied',${S(JSON.stringify(descWrites.map((d) => d.id)))}::jsonb,${S(JSON.stringify(descMeta))}::jsonb);\n`;
sql += "COMMIT;\n";

// ── KOKKUVÕTE ──
console.log(`\n═══ ETAPP 2 EXECUTE ${DRY ? "(DRY)" : ""} | batch=${BATCH_ID} ═══`);
console.log(`Piirireeglid → l3meta: ${writtenPairs.length} paari (${writtenPairs.filter((w) => w.status === "konsensus").length} konsensus + ${writtenPairs.filter((w) => w.status === "fable-viik").length} fable-stabiilne) → ${descWrites.length} L3-käepidet (${descWrites.filter((d) => d.preserved).length} olemas-sisu SÄILIB, reegel ette)`);
console.log(`Liigutused: ${moveRows.length} klastrit / ${movedProducts} toodet (konsensus). Skipitud: ${skipped.length} (${skipped.reduce((s, x) => s + x.n, 0)} toodet)`);
if (skipped.length) for (const sk of skipped.slice(0, 10)) console.log(`  ⊘ skip ck=${sk.ck} n=${sk.n}: ${sk.reason}`);

fs.writeFileSync(`${SP}/etapp2-migrate.sql`, sql);
fs.writeFileSync(`${SP}/etapp2-pids.txt`, allPids.join("\n") + "\n");

if (DRY) {
  fs.writeFileSync(`${SP}/etapp2-execute-plan.json`, JSON.stringify({ batch_id: BATCH_ID, writtenPairs, descWrites, moveRows: moveRows.map(({ pids, ...r }) => ({ ...r, nResolved: pids?.length || 0, pids })), skipped, allPids }, null, 1));
  console.log(`\n(DRY — plaan: scratchpad/etapp2-execute-plan.json, migrate.sql + pids.txt kirjutatud eelvaateks. DB-d EI muudetud.)`);
  process.exit(0);
}

// ── 5. UNDO-FAIL (enne kirjutamist) ──
fs.mkdirSync(`${REPO}/reports/backups`, { recursive: true });
const undoFile = `${REPO}/reports/backups/etapp2-undo-${BATCH_ID}.json`;
fs.writeFileSync(undoFile, JSON.stringify({ batch_id: BATCH_ID, generated_at: new Date().toISOString(),
  descriptions: descBackup, moves: undoMoves,
  counts: { descHandles: descWrites.length, moveClusters: moveRows.length, moveProducts: movedProducts, skipped: skipped.length } }, null, 1));
console.log(`💾 undo: ${undoFile}`);

// ── 7. RAKENDA ──
console.log("⏳ transaktsioon…");
psqlTx(sql);
console.log(`✅ RAKENDATUD. l3meta: ${descWrites.length} | liigutatud: ${movedProducts} toodet / ${moveRows.length} klastrit | skip: ${skipped.length}`);
console.log(`migrate.sql: ${SP}/etapp2-migrate.sql | undo: node scripts/etapp2-undo.mjs ${BATCH_ID}`);
fs.writeFileSync(`${SP}/etapp2-execute-done.json`, JSON.stringify({ batch_id: BATCH_ID, descWrites: descWrites.length, moveClusters: moveRows.length, moveProducts: movedProducts, skipped, writtenPairs }, null, 1));
