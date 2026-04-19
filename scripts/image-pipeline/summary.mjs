#!/usr/bin/env node
/**
 * Generate summary.md from pipeline state.json + rejections.jsonl.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const REPORTS = '/home/brrr/brrr-xlmarket/reports/image-gen-2026-04-19';
const state = JSON.parse(readFileSync(`${REPORTS}/state.json`, 'utf8'));
const missing = JSON.parse(readFileSync(`${REPORTS}/missing-handles.json`, 'utf8'));

const bySource = { vevor: 0, 'nano-banana': 0 };
const byStrike = { 1: 0, 2: 0, 3: 0, 4: 0 };
const byLevel = { 1: { done: 0, fail: 0 }, 2: { done: 0, fail: 0 }, 3: { done: 0, fail: 0 }, 4: { done: 0, fail: 0 }, 5: { done: 0, fail: 0 }, 6: { done: 0, fail: 0 }, 7: { done: 0, fail: 0 } };
const missingByHandle = Object.fromEntries(missing.map(m => [m.handle, m]));

for (const [h, v] of Object.entries(state.done)) {
  bySource[v.source] = (bySource[v.source] || 0) + 1;
  byStrike[v.strike] = (byStrike[v.strike] || 0) + 1;
  const lvl = missingByHandle[h]?.level;
  if (lvl && byLevel[lvl]) byLevel[lvl].done++;
}
for (const [h] of Object.entries(state.failed)) {
  const lvl = missingByHandle[h]?.level;
  if (lvl && byLevel[lvl]) byLevel[lvl].fail++;
}

const doneCount = Object.keys(state.done).length;
const failCount = Object.keys(state.failed).length;
const totalTouched = doneCount + failCount;
const missingTotal = missing.length;

const md = `# Category Image Pipeline — Summary

**Run:** 2026-04-19
**Spec:** docs/superpowers/specs/2026-04-19-category-image-pipeline-design.md

## Numbers

| Metric | Value |
|---|---|
| Total missing (pipeline input) | ${missingTotal} |
| Touched this run | ${totalTouched} |
| PASS (image written) | ${doneCount} |
| Review queue | ${failCount} |
| Pass rate | ${totalTouched ? ((doneCount / totalTouched) * 100).toFixed(1) + '%' : 'n/a'} |

## By source

| Source | Count |
|---|---|
| VEVOR CDN (existing product photo) | ${bySource.vevor || 0} |
| nano-banana pro (generated) | ${bySource['nano-banana'] || 0} |

## By strike

| Strike | Count | Description |
|---|---|---|
| 1 | ${byStrike[1] || 0} | VEVOR candidate #1 |
| 2 | ${byStrike[2] || 0} | VEVOR candidate #2 |
| 3 | ${byStrike[3] || 0} | nano-banana pro #1 |
| 4 | ${byStrike[4] || 0} | nano-banana pro #2 (reason-adjusted) |

## By level

| Level | Done | Review-queue |
|---|---|---|
${[1, 2, 3, 4, 5, 6, 7].map(l => `| L${l} | ${byLevel[l].done} | ${byLevel[l].fail} |`).join('\n')}

## Review-queue handles (need manual attention)

${failCount === 0 ? '_None — all handles passed within 4 strikes._' :
  Object.entries(state.failed).slice(0, 50).map(([h, v]) =>
    `- \`${h}\` — ${(v.reason || 'unknown').slice(0, 140)}`
  ).join('\n') + (failCount > 50 ? `\n\n_...and ${failCount - 50} more; see review-queue.json_` : '')
}

## Files produced

- \`storefront/public/cat-thumbs/<handle>.webp\` — 150×150 final thumbnails
- \`reports/image-gen-2026-04-19/accepted/<handle>.png\` — 2K originals (nano-banana only)
- \`reports/image-gen-2026-04-19/candidates/<handle>/try-{1..4}.png\` — all attempts
- \`reports/image-gen-2026-04-19/rejections.jsonl\` — gatekeeper FAIL log
- \`reports/image-gen-2026-04-19/review-queue.json\` — handles needing manual attention
`;

writeFileSync(`${REPORTS}/summary.md`, md);
console.log(`wrote ${REPORTS}/summary.md`);
console.log(`done=${doneCount} failed=${failCount} pass_rate=${totalTouched ? ((doneCount / totalTouched) * 100).toFixed(1) + '%' : 'n/a'}`);
