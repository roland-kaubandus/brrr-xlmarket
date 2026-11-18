#!/usr/bin/env node
/**
 * a2-revise.mjs — A2 jagamis-ettepanekute KITSENDAMINE (Tarmo reeglid).
 *
 * SISEND: reports/a2-grabbag-dry.md (LLM-ettepanekud + est_n + verdikt).
 * REEGLID (Tarmo):
 *   1. KARMIM SUHTELINE lävi: uus L3 peab olema mõistlik võrreldes õde-L3-de suurusega samas L2-s.
 *      THR = max(5, round(0.4 × õdede mediaan)). Alla selle = EI saa oma L3, jääb vanemasse.
 *   2. VARUOSAD/TARVIKUD seadme juurde: kui tüki nimi on varuosa/tarvik JA väike → sulata
 *      sama jagamise PÕHI-seadme L3-sse (mitte oma L3). Suur tarvik-L3 (nt pillikohvrid) jääb.
 *   3. Teosta ainult kõrge kindlus: jagamine kehtib vaid kui ≥2 tükki jäävad mõistliku-suurusena.
 *
 * Väljund: reports/a2-grabbag-REVIDEERITUD.md (execute-kandidaadid + kõrvale-jäetud + põhjused).
 * READ-ONLY (ainult SELECT õdede suurusteks). EI muuda midagi.
 */
import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const MD = path.join(ROOT, "reports", "a2-grabbag-dry.md");
const OUT = path.join(ROOT, "reports", "a2-grabbag-REVIDEERITUD.md");
const DB = execSync("docker ps --format '{{.Names}}' | grep '^db-k33g' | head -1", { encoding: "utf8" }).trim();
const q = (sql) => execSync(`docker exec -i ${DB} psql -U xlmarket -d xlmarket -At -F '\t' -f -`, { input: sql, encoding: "utf8" }).trim();

const ACC_RE = /(varuos|varukl|toorik|rull\b|rullid|dispenser|adapter\b|kinnitus|lisaosa|tagavaraosa|täiteosa)/i;

function parseMd() {
  const lines = fs.readFileSync(MD, "utf8").split("\n");
  const blocks = []; let cur = null;
  for (const line of lines) {
    const h = line.match(/^\*\*(.+?)\*\*\s*`([^`]+)`\s*·\s*(\d+)\s*toodet/);
    if (h) { if (cur) blocks.push(cur); cur = { name: h[1], id: h[2], n: +h[3], rows: [] }; continue; }
    if (cur) {
      const r = line.match(/^\|(.+)\|(.+)\|(.+)\|(.+)\|(.+)\|$/);
      if (r) {
        const sub = r[1].trim(), newl3 = r[2].trim(), est = r[3].trim(), verd = r[5].trim();
        if (sub === "alamtüüp" || sub.startsWith("---")) continue;
        const m = est.match(/~?(\d+)/); const est_n = m ? +m[1] : 0;
        cur.rows.push({ sub, newl3, est_n, pass: /LÄBIS/.test(verd) });
      }
    }
  }
  if (cur) blocks.push(cur);
  return blocks;
}

function median(a) { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : Math.round((s[m - 1] + s[m]) / 2); }

function main() {
  const blocks = parseMd();
  // leia iga grab-L3 L2-vanem + õdede suurused
  const ids = blocks.map(b => `'${b.id}'`).join(",");
  const rows = q(`
    WITH grab AS (SELECT id, mpath, split_part(mpath,'.',2) AS l2id FROM product_category WHERE id IN (${ids}))
    SELECT g.id, g.l2id,
      (SELECT string_agg(cnt::text, ',') FROM (
         SELECT (SELECT count(*) FROM product p JOIN product_category_product pcp ON pcp.product_category_id=sib.id AND pcp.product_id=p.id WHERE p.status='published' AND p.deleted_at IS NULL) AS cnt
         FROM product_category sib
         WHERE sib.deleted_at IS NULL AND split_part(sib.mpath,'.',2)=g.l2id
           AND (length(sib.mpath)-length(replace(sib.mpath,'.','')))=2
       ) s) AS sib_counts
    FROM grab g;
  `).split("\n").filter(Boolean);
  const sibMap = new Map();
  for (const line of rows) { const [id, l2id, counts] = line.split("\t"); sibMap.set(id, (counts || "").split(",").filter(Boolean).map(Number)); }

  const exec = [], dropped = [];
  for (const b of blocks) {
    const sibs = sibMap.get(b.id) || [];
    const med = median(sibs);
    const THR = Math.max(5, Math.round(0.4 * med));
    const kept = [], folded = [], tooSmall = [];
    // põhi-seade = suurim mitte-tarvik tükk
    const nonAcc = b.rows.filter(r => !ACC_RE.test(r.newl3));
    const device = nonAcc.sort((a, c) => c.est_n - a.est_n)[0];
    for (const r of b.rows) {
      const isAcc = ACC_RE.test(r.newl3);
      if (isAcc && r.est_n < Math.max(8, Math.round(0.5 * med))) { folded.push(r); continue; }
      if (r.est_n >= THR) kept.push(r); else tooSmall.push(r);
    }
    const rec = { ...b, med, THR, kept, folded, tooSmall, device: device?.newl3 };
    if (kept.length >= 2) exec.push(rec); else dropped.push(rec);
  }

  const L = [`# A2 GRAB-BAG — REVIDEERITUD (Tarmo karmim lävi)\n`,
    `**${new Date().toISOString().slice(0, 10)} · DRY · ettepanekute kitsendamine, EI teostatud**\n`,
    `> Lävi per L2: **THR = max(5, 0.4 × õdede-mediaan)**. Alla läve → jääb vanemasse L3-sse.`,
    `> Varuosad/tarvikud (väikesed) → sulatatakse põhi-seadme L3-sse. Jagamine kehtib vaid kui **≥2** tükki jäävad.`,
    `> Allikas: a2-grabbag-dry.md. Õdede suurused: live DB (db-k33g).\n`,
    `## ✅ EXECUTE-KANDIDAADID: ${exec.length} L3 (≥2 mõistlikku tükki)\n`];
  exec.sort((a, b) => b.n - a.n);
  for (const r of exec) {
    L.push(`### ${r.name} \`${r.id}\` · ${r.n} toodet  _(L2 õdede-mediaan ${r.med} → lävi ${r.THR})_`);
    L.push(`- **Uued L3 (jäävad):** ${r.kept.map(k => `${k.newl3} (~${k.est_n})`).join(" + ")}`);
    if (r.folded.length) L.push(`- **Sulatatud seadme juurde** (väike tarvik/varuosa): ${r.folded.map(f => `${f.newl3} (~${f.est_n}) → ${r.device}`).join(", ")}`);
    if (r.tooSmall.length) L.push(`- **Jääb vanemasse** (alla läve ${r.THR}): ${r.tooSmall.map(t => `${t.newl3} (~${t.est_n})`).join(", ")}`);
    L.push("");
  }
  L.push(`\n## ⏸️ EI JAGATA: ${dropped.length} L3 (alla 2 mõistliku tüki → jääb terveks)\n`);
  for (const r of dropped) {
    const reason = r.kept.length === 1 ? `ainult 1 tükk läbib läve ${r.THR} (${r.kept[0]?.newl3})` : `ükski tükk ei ületa läve ${r.THR}`;
    L.push(`- **${r.name}** (${r.n}t, mediaan ${r.med}): ${reason}${r.folded.length ? ` · tarvikud sulatatud` : ""}`);
  }
  fs.writeFileSync(OUT, L.join("\n"));
  console.error(`✅ A2-revize: EXECUTE ${exec.length} · EI JAGATA ${dropped.length} → ${OUT}`);
  console.log(JSON.stringify({ exec: exec.length, dropped: dropped.length }));
}
main();
