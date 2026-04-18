#!/usr/bin/env node
/**
 * drain-review-queue.mjs — Nightly cron (F3.6 + F3.7)
 *
 * Spec: docs/superpowers/specs/2026-04-18-taxonomy-final-design.md §5.4, §F3.6, §F3.7
 *
 * Does three jobs in one pass:
 *   1. Digest: count open queue, top-N unmapped VEVOR paths, method breakdown.
 *      → posts a short summary to Slack #brrka (until dedicated #xl exists).
 *   2. 14-day timeout: any audit row open >14 days → flip product to status='draft',
 *      mark audit row resolved_at=NOW() and append a 'review_timeout_drafted' row.
 *   3. Huly handoff: write /tmp/xl-review-queue-huly.json containing aged-out
 *      product ids so a follow-up XL session can create Huly issues via MCP
 *      (there's no stable Huly CLI so we don't block the cron on that).
 *
 * Usage:
 *   node scripts/drain-review-queue.mjs               # run (writes everything)
 *   node scripts/drain-review-queue.mjs --dry-run     # report only, no writes
 *   node scripts/drain-review-queue.mjs --no-slack    # skip Slack post
 *
 * Suggested cron:
 *   30 4 * * *  node /home/brrr/brrr-xlmarket/scripts/drain-review-queue.mjs
 */

import pg from "pg"
import fs from "fs"
import { spawnSync } from "child_process"

const CONN = {
  host: process.env.PGHOST || "localhost",
  port: Number(process.env.PGPORT) || 5435,
  user: process.env.PGUSER || "xlmarket",
  password: process.env.PGPASSWORD || "xlmarket_pg_2026_secure",
  database: process.env.PGDATABASE || "xlmarket",
}

const TIMEOUT_DAYS = 14
const TOP_N_PATHS = 10
const SLACK_BOT = "brrka"        // XL does not have a dedicated bot yet
const SLACK_CHANNEL = "brrka"    // CLAUDE.md: #brrka is the general XL/brrr channel
const HULY_HANDOFF_FILE = "/tmp/xl-review-queue-huly.json"

const args = process.argv.slice(2)
const DRY_RUN = args.includes("--dry-run")
const NO_SLACK = args.includes("--no-slack")

function log(msg) { console.log(`[${new Date().toISOString().slice(11, 19)}] ${msg}`) }

async function main() {
  const client = new pg.Client(CONN)
  await client.connect()
  try {
    // ── 1. Snapshot ─────────────────────────────────────────────
    const openRows = await client.query(`SELECT COUNT(*)::int AS n FROM v_review_queue`)
    const open = openRows.rows[0]?.n ?? 0

    const agedOut = await client.query(
      `SELECT product_id, id AS audit_id, raw_path, created_at
       FROM v_review_queue
       WHERE created_at < NOW() - ($1 || ' days')::interval`,
      [String(TIMEOUT_DAYS)]
    )

    const methodRows = await client.query(
      `SELECT method, COUNT(*)::int AS n
       FROM category_classification_audit
       WHERE needs_review = true AND resolved_at IS NULL
       GROUP BY method ORDER BY n DESC`
    )

    const topPaths = await client.query(
      `SELECT raw_path, product_count FROM v_review_queue_top_paths LIMIT $1`,
      [TOP_N_PATHS]
    )

    // INV-18 thresholds (spec §8.2)
    const inv18 = open < 500 ? "OK" : open < 2000 ? "WARN" : "ALERT"

    log(`open=${open}, aged>${TIMEOUT_DAYS}d=${agedOut.rows.length}, inv18=${inv18}`)

    // ── 2. 14-day timeout ───────────────────────────────────────
    let draftedCount = 0
    if (agedOut.rows.length > 0 && !DRY_RUN) {
      const productIds = agedOut.rows.map(r => r.product_id).filter(Boolean)
      const auditIds = agedOut.rows.map(r => r.audit_id)
      // Flip products to draft
      if (productIds.length > 0) {
        const u = await client.query(
          `UPDATE product SET status = 'draft', updated_at = NOW()
           WHERE id = ANY($1::text[]) AND status <> 'draft'
           RETURNING id`,
          [productIds]
        )
        draftedCount = u.rows.length
      }
      // Mark audit rows resolved + append timeout row
      await client.query(
        `UPDATE category_classification_audit
         SET needs_review = false, resolved_at = NOW()
         WHERE id = ANY($1::bigint[])`,
        [auditIds]
      )
      for (const r of agedOut.rows) {
        await client.query(
          `INSERT INTO category_classification_audit
             (product_id, action, method, confidence, raw_path, needs_review, reason)
           VALUES ($1, 'review_timeout_drafted', 'cron_timeout', 0, $2, false, $3)`,
          [r.product_id, r.raw_path, `${TIMEOUT_DAYS}-day timeout: was created_at ${r.created_at.toISOString()}`]
        )
      }
      log(`  drafted ${draftedCount} product(s), wrote ${agedOut.rows.length} timeout audit rows`)

      // Huly handoff file
      fs.writeFileSync(
        HULY_HANDOFF_FILE,
        JSON.stringify({
          generated_at: new Date().toISOString(),
          timeout_days: TIMEOUT_DAYS,
          products: agedOut.rows.map(r => ({
            product_id: r.product_id,
            audit_id: r.audit_id,
            raw_path: r.raw_path,
            created_at: r.created_at,
          })),
        }, null, 2)
      )
      log(`  Huly handoff → ${HULY_HANDOFF_FILE}`)
    } else if (DRY_RUN && agedOut.rows.length > 0) {
      log(`  [dry-run] would draft ${agedOut.rows.length} product(s)`)
    }

    // ── 3. Slack digest ─────────────────────────────────────────
    if (!NO_SLACK && (open > 0 || draftedCount > 0)) {
      const lines = [
        `*XL taxonomy review queue — ${new Date().toISOString().slice(0, 10)}*`,
        `open: ${open}  ·  aged>14d drafted: ${draftedCount}  ·  INV-18: ${inv18}`,
      ]
      if (methodRows.rows.length > 0) {
        lines.push("by method: " + methodRows.rows.map(r => `${r.method}=${r.n}`).join(", "))
      }
      if (topPaths.rows.length > 0) {
        lines.push("top unmapped paths:")
        for (const p of topPaths.rows) {
          lines.push(`  • [${p.product_count}] ${p.raw_path}`)
        }
      }
      lines.push("admin: https://xlmarket.store/app/routes/categorization-queue")
      const msg = lines.join("\n")
      if (DRY_RUN) {
        log(`  [dry-run] Slack msg:\n${msg}`)
      } else {
        const r = spawnSync("python3", ["/home/brrr/bin/slack-send.py", SLACK_BOT, SLACK_CHANNEL, msg], { encoding: "utf-8" })
        if (r.status === 0) log(`  Slack posted to #${SLACK_CHANNEL} (${r.stdout.trim()})`)
        else log(`  WARN: Slack post failed (${r.stderr.trim() || r.stdout.trim()})`)
      }
    }

    // Final stdout summary (useful for cron logs)
    console.log(JSON.stringify({
      open,
      aged_out: agedOut.rows.length,
      drafted: draftedCount,
      inv18,
      top_paths: topPaths.rows,
      by_method: methodRows.rows,
    }, null, 2))
  } finally {
    await client.end()
  }
}

main().catch(err => {
  console.error("drain-review-queue failed:", err.message)
  console.error(err.stack)
  process.exit(1)
})
