#!/usr/bin/env node
/**
 * etapp3-neighbor-from-ledger.mjs — rekonstrueeri NAABRITE "oleks liigutanud" shadow-otsused ledgerist
 * neighbor-execute.mjs sisend-JSON-iks (Tarmo 2026-10-09 task 2: "otsused ledgerist, 0 API, range-enamus,
 * AINULT ellujäänud-L3 jaoks").
 *
 * ETAPP3 create 4 batchi (+ öine) logisid igaüks naabri-chaini shadow'i (bucket_type='neighbor-shadow',
 * status='shadow'). Sama klaster (ck) võis eri batchides saada ERI sihi/kind → topelt-liigutuse oht.
 *
 * RANGE-ENAMUSE DEDUP (0 API — otsused ledgeris juba olemas):
 *   ck kohta → hääleta (new_l3, to_handle, kind) üle KÕIGI batchide → ENAMUS võidab; viik → VIIMANE batch
 *   (hilisem re-eval, rohkem õdesid olemas → paremini informeeritud). Üks otsus ck kohta → 0 konflikti.
 *
 * ELLUJÄÄNUD-FILTER: hoia AINULT moved, mille new_l3 ∈ (39 loodud − granularity-undo kukkujad). Punkt-1-s
 * eemaldatud L3 (nt Jalamassöörid) → tema naabri-liigutused KUKUVAD välja (siht kadus).
 *
 * Väljund: scratchpad/etapp3-neighbor-reeval.json  → `node scripts/neighbor-execute.mjs --from <see> [--dry]`
 * EI muuda DB-d (ainult loen-päring + JSON).
 */
import fs from "node:fs";
import { execSync } from "node:child_process";

const REPO = "/opt/xlmarket-github";
const SP = process.env.SP || "/tmp/claude-0/-opt-xlmarket-github/8966820c-cfb5-4418-ab04-7e331739a85c/scratchpad";
const OUT = `${SP}/etapp3-neighbor-reeval.json`;
const BATCHES = ["b1-2026-10-09T0706", "b2-2026-10-09T0805", "b3-2026-10-09T0907", "b4-2026-10-09T1018"];

const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
if (!DB) { console.error("🔴 db-k33g puudub"); process.exit(2); }
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -tA -f -`, { input: sql, encoding: "utf8", maxBuffer: 1 << 30 }).trim();

// ── 1) ellujäänud loodud-L3 handled = 39 loodud − granularity-undo kukkujad ──
const created = new Set();
for (const b of BATCHES) {
  const u = JSON.parse(fs.readFileSync(`${REPO}/reports/etapp2-undo-e3-${b}.json`, "utf8"));
  for (const l of u.new_l3) created.add(l.handle);
}
let failing = new Set();
const failPath = `${REPO}/reports/etapp3-regranularity-fail.json`;
if (fs.existsSync(failPath)) failing = new Set((JSON.parse(fs.readFileSync(failPath, "utf8")).rows || []).map((r) => r.handle));
const surviving = new Set([...created].filter((h) => !failing.has(h)));
console.log(`loodud L3: ${created.size} · granularity-undo kukkujad: ${failing.size} · ellujäänud: ${surviving.size}`);

// ── 2) loe shadow-read ledgerist ──
const rows = q(`SELECT meta->>'ck', meta->>'new_l3', meta->>'from_handle', meta->>'to_handle', meta->>'kind',
  coalesce(meta->>'path',''), coalesce(meta->>'n','0'), meta->>'batch_id', created_at
  FROM review_decision_log WHERE bucket_type='neighbor-shadow' AND status='shadow' ORDER BY created_at`)
  .split("\n").filter(Boolean).map((l) => {
    const [ck, new_l3, from, to, kind, path, n, batch_id, created_at] = l.split("|");
    return { ck, new_l3, from, to, kind, path, n: +n || 0, batch_id, created_at };
  });
console.log(`shadow-ridu ledgeris: ${rows.length} · distinct ck: ${new Set(rows.map((r) => r.ck)).size}`);

// ── 3) RANGE-ENAMUSE DEDUP ck kohta (viik → viimane) ──
const byCk = new Map();
for (const r of rows) { if (!byCk.has(r.ck)) byCk.set(r.ck, []); byCk.get(r.ck).push(r); }
const winners = [];
for (const [ck, rs] of byCk) {
  const tally = new Map(); // key new_l3|to|kind → {count, last}
  for (const r of rs) {
    const key = `${r.new_l3}|${r.to}|${r.kind}`;
    const t = tally.get(key) || { count: 0, last: r, rep: r };
    t.count++; if (r.created_at > t.last.created_at) t.last = r;
    tally.set(key, t);
  }
  // enamus; viik → hilisem created_at
  let best = null;
  for (const [, t] of tally) {
    if (!best || t.count > best.count || (t.count === best.count && t.last.created_at > best.last.created_at)) best = t;
  }
  winners.push({ ...best.rep, _votes: rs.length, _win: best.count });
}
console.log(`dedup (range-enamus) → ${winners.length} unikaalset otsust`);

// ── 4) ELLUJÄÄNUD-FILTER (new_l3 ∈ surviving) ──
const kept = []; const dropped = [];
for (const w of winners) {
  if (surviving.has(w.new_l3)) kept.push(w);
  else dropped.push(w);
}
console.log(`ellujäänud-filter: ${kept.length} jääb · ${dropped.length} kukub (new_l3 eemaldatud/pole loodu)`);
for (const d of dropped.slice(0, 10)) console.log(`  ⊘ drop ck=${d.ck} new_l3=${d.new_l3} (${d.kind})`);

// ── 5) ehita report-JSON (grupeeri new_l3 → pull/other) ──
const byL3 = new Map();
for (const w of kept) {
  if (!byL3.has(w.new_l3)) byL3.set(w.new_l3, { handle: w.new_l3, pull: [], other: [] });
  const item = byL3.get(w.new_l3);
  if (w.kind === "pull") item.pull.push({ ck: w.ck, n: w.n, from: w.from, path: w.path });
  else item.other.push({ ck: w.ck, n: w.n, from: w.from, to: w.to, path: w.path });
}
const report = [...byL3.values()];
const totPull = kept.filter((w) => w.kind === "pull").length;
const totOther = kept.filter((w) => w.kind === "other").length;
fs.mkdirSync(SP, { recursive: true });
fs.writeFileSync(OUT, JSON.stringify({ generated_at: new Date().toISOString(), source: "neighbor-shadow ledger (range-enamus dedup)", report }, null, 1));
console.log(`\n✅ ${kept.length} liigutust (${totPull} pull + ${totOther} other) üle ${report.length} ellujäänud-L3 → ${OUT.replace(SP + "/", "scratchpad/")}`);
console.log(`→ DRY:     node scripts/neighbor-execute.mjs --from ${OUT} --dry`);
console.log(`→ EXECUTE: node scripts/neighbor-execute.mjs --from ${OUT}`);
