#!/usr/bin/env node
/**
 * kiht2-naidised.mjs — 30 näidist KIHT 2 sõnavarast, eri peakategooriatest, Tarmole loetavalt.
 * Loeb reports/kiht2-sonavara-dry.json → reports/kiht2-naidised.md. 0 kulu.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const V = JSON.parse(fs.readFileSync(path.join(ROOT, "reports", "kiht2-sonavara-dry.json"), "utf8"));
const OUT = path.join(ROOT, "reports", "kiht2-naidised.md");

// grupeeri L1 kaupa, eelista n>=5 + konsensus olemas, round-robin L1-mitmekesisuse jaoks
const byL1 = new Map();
for (const r of V.l3) { if (!byL1.has(r.l1)) byL1.set(r.l1, []); byL1.get(r.l1).push(r); }
for (const [, rs] of byL1) rs.sort((a, b) => (b.folk_consensus.length + (b.n >= 5 ? 5 : 0)) - (a.folk_consensus.length + (a.n >= 5 ? 5 : 0)));
const picks = [];
const l1s = [...byL1.keys()].sort();
let round = 0;
while (picks.length < 30 && round < 20) {
  for (const l1 of l1s) { const rs = byL1.get(l1); if (rs[round] && picks.length < 30) picks.push(rs[round]); }
  round++;
}

const fmt = (arr) => arr.map(e => e.term + (e.variants && e.variants.length > 1 ? ` _(${e.variants.filter(v => v !== e.term).join(", ")})_` : "")).join(" · ");
const L = [`# KIHT 2 sõnavara — 30 NÄIDIST (DRY, Tarmole)\n`,
  `**${V.generated.slice(0, 10)} · ${V.l3_done}/${V.l3_total} L3 genereeritud · konsensus ${V.folk_consensus_total} · kandidaat ${V.folk_candidate_total} · kulu $${V.spend_usd}**\n`,
  `> DRY: miski ei ole Meili't/DB-d puudutanud. Konsensus = MÕLEMAD mudelid (Sonnet-5 + Opus-4.8) pakkusid.`,
  `> Kandidaat = ainult üks mudel → vajab pilku (siin näha, et hinnata müra-taset).`,
  `> _(sulgudes)_ = sama termini kokku/lahku-variandid. SEO = Opus-lause.\n`,
  `Näidised katavad **${new Set(picks.map(p => p.l1)).size} peakategooriat**.\n`, `---\n`];
let i = 0;
for (const r of picks) {
  i++;
  L.push(`### ${i}. ${r.l1} › ${r.l2} › **${r.name}**  _(${r.n} toodet)_`);
  L.push(`- **Konsensus:** ${r.folk_consensus.length ? fmt(r.folk_consensus) : "_(pole)_"}`);
  L.push(`- **Kandidaat:** ${r.folk_candidate.length ? fmt(r.folk_candidate.slice(0, 10)) : "_(pole)_"}`);
  L.push(`- **SEO:** ${r.seo_opus || r.seo_sonnet || "_(pole)_"}\n`);
}
fs.writeFileSync(OUT, L.join("\n"));
console.error(`✅ ${picks.length} näidist, ${new Set(picks.map(p => p.l1)).size} peakategooriat → ${OUT}`);
