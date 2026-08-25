#!/usr/bin/env node
// glossary-adherence.mjs — ADHERENCE MÕÕTJA (SAMM 3a). EI ASENDA, EI LIPUTA — ainult mõõdab.
//
// Loeb generaatori piloot-tulemused (content-pilot-*.ndjson) + match-nimekirja (longest-match-first)
// ja raporteerib: kui palju glossary-termineid ESINES EN-lähtes, kui paljul on kanooniline ET-vaste
// väljundis olemas, kui palju VIOLATION'e (EN esines, ET-vaste puudub), + potentsiaalsed vale-positiivid.
//
// Kasuta: node scripts/glossary-adherence.mjs reports/content-pilot-<ts>.ndjson
//   (match-nimekiri: sama basename + .matchlist.json)

import fs from 'node:fs';
import path from 'node:path';

const ndjsonPath = process.argv[2];
if (!ndjsonPath) { console.error('Kasuta: node scripts/glossary-adherence.mjs <content-pilot-*.ndjson>'); process.exit(1); }
const matchPath = ndjsonPath.replace(/\.ndjson$/, '.matchlist.json');
// OUT = adherence-<basename>.md kõrvale (EI tohi kunagi = ndjsonPath — muidu klobberdaks andmed)
const OUT = path.join(path.dirname(ndjsonPath), 'adherence-' + path.basename(ndjsonPath).replace(/\.ndjson$/, '') + '.md');
if (OUT === ndjsonPath) { console.error('FATAL: OUT == ndjsonPath'); process.exit(1); }

const records = fs.readFileSync(ndjsonPath, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse);
const matchList = JSON.parse(fs.readFileSync(matchPath, 'utf8')); // [{en, et, status}], sorted len desc

const norm = (s) => (s || '').toLowerCase();

// EN-lähte tekst (mille vastu adherence't mõõdame): title + description + bullets + rich
function enSource(p) {
  return norm([p.title, p.description, p.sanitized_description, p.sanitized_rich_description].filter(Boolean).join('\n'));
}
// ET-väljund (kõik 4 välja koos)
function etOutput(c) {
  if (!c) return '';
  return norm([c.title_et, c.description_et, (c.selling_points_et || []).join('\n'), c.sanitized_rich_description_et].filter(Boolean).join('\n'));
}

// ET stem-match (eesti käänded): kas väljund sisaldab ET-terminit (viimane sõna tüve-tasemel)?
function etPresent(output, etTerm) {
  const t = norm(etTerm);
  if (output.includes(t)) return true;
  const words = t.split(/\s+/);
  const last = words[words.length - 1];
  const stemLen = Math.max(4, last.length - 3);
  const stem = last.slice(0, stemLen);
  const lead = words.slice(0, -1).join(' ');
  // kõik eesõnad täpselt + viimase sõna tüvi substringina
  if (lead && !output.includes(lead)) return false;
  return output.includes(stem);
}

// longest-match-first skänn: maski juba-matchitud EN-vahemikud, et lühem termin ei topeltmatchiks
function scanEn(source, terms) {
  const masked = source.split('');
  const hits = [];
  for (const term of terms) {
    const en = norm(term.en);
    if (en.length < 3) continue;
    let from = 0;
    while (true) {
      const idx = source.indexOf(en, from);
      if (idx < 0) break;
      // kas vahemik juba maskitud (pikem termin võttis)?
      let free = true;
      for (let k = idx; k < idx + en.length; k++) if (masked[k] === null) { free = false; break; }
      if (free) {
        for (let k = idx; k < idx + en.length; k++) masked[k] = null;
        hits.push({ en: term.en, et: term.et, status: term.status, at: idx });
      }
      from = idx + en.length;
    }
  }
  return hits;
}

const perTermViolations = new Map(); // en -> count
const perTermMatches = new Map();
let totalMatched = 0, totalAdhered = 0, totalViolations = 0;
const productReports = [];

for (const rec of records) {
  if (!rec.ok || !rec.content) { productReports.push({ p: rec.product, skipped: true }); continue; }
  const src = enSource(rec.product);
  const out = etOutput(rec.content);
  const hits = scanEn(src, matchList);
  // unikaalsed terminid per toode (ühe termini korduv esinemine = üks adherence-nõue)
  const uniq = new Map();
  for (const h of hits) if (!uniq.has(h.en)) uniq.set(h.en, h);
  const vios = [];
  for (const [en, h] of uniq) {
    totalMatched++;
    perTermMatches.set(en, (perTermMatches.get(en) || 0) + 1);
    if (etPresent(out, h.et)) { totalAdhered++; }
    else {
      totalViolations++;
      perTermViolations.set(en, (perTermViolations.get(en) || 0) + 1);
      vios.push(h);
    }
  }
  productReports.push({ p: rec.product, mode: rec.mode, matched: uniq.size, violations: vios });
}

// ---- Raport ----
const L = [];
L.push(`# Glossary-adherence MÕÕTJA — piloot\n`);
L.push(`Allikas: \`${path.basename(ndjsonPath)}\` · ${records.length} toodet (${records.filter(r => r.ok).length} ok)\n`);
const rate = totalMatched ? (100 * totalAdhered / totalMatched) : 100;
L.push(`## Kokkuvõte`);
L.push(`- Glossary-termineid ESINES EN-lähtes (unik/toode): **${totalMatched}**`);
L.push(`- Kanooniline ET-vaste väljundis OLEMAS: **${totalAdhered}**`);
L.push(`- **VIOLATION** (EN esines, ET-vaste puudu): **${totalViolations}**`);
L.push(`- **Adherence-määr: ${rate.toFixed(1)}%**\n`);

if (perTermViolations.size) {
  L.push(`## Enim-rikutud terminid (EN → ET · rikutud/esines)`);
  const rows = [...perTermViolations.entries()].sort((a, b) => b[1] - a[1]);
  for (const [en, cnt] of rows) {
    const et = matchList.find(m => m.en === en)?.et || '?';
    L.push(`- \`${en}\` → \`${et}\` · **${cnt}** rikutud / ${perTermMatches.get(en)} esines`);
  }
  L.push('');
  L.push(`> ⚠️ **Vale-positiivi kontroll (inimene):** kas mõni ülal on konteksti-vale — st EN-sõna esines,`);
  L.push(`> aga MITTE glossary-mõttes (nt "foam" pärismerena vs materjalina)? Need EI ole päris violation'id.`);
  L.push('');
}

L.push(`## Per-toode`);
for (const pr of productReports) {
  if (pr.skipped) { L.push(`- ⛔ ${pr.p.sku || pr.p.id} — genereerimine ebaõnnestus (vahele)`); continue; }
  const tag = pr.violations.length ? `⚠️ ${pr.violations.length} violation` : `✅ clean`;
  L.push(`- ${tag} · \`${pr.p.sku || pr.p.id}\` (${pr.mode}) · matched ${pr.matched}` +
    (pr.violations.length ? ` → ${pr.violations.map(v => `${v.en}→${v.et}`).join(', ')}` : ''));
}

fs.writeFileSync(OUT, L.join('\n'));
console.log(`✅ Adherence-mõõt valmis: ${OUT}`);
console.log(`   Adherence: ${rate.toFixed(1)}% · matched=${totalMatched} adhered=${totalAdhered} violations=${totalViolations}`);
