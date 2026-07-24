/**
 * /admin/categorization-queue — Resolver v2 review queue (spec §F3.5)
 *
 * GET  /admin/categorization-queue              → list open items (needs_review=true)
 * GET  /admin/categorization-queue?view=paths   → top unmapped VEVOR paths
 * POST /admin/categorization-queue              → resolve one item or create a rule
 *
 * Body shapes for POST:
 *   { action: "assign", audit_id, l1_slug, l2_slug?, l3_slug? }
 *     → moves product to chosen category, marks audit row resolved.
 *   { action: "create_rule", vevor_l1, vevor_l2, target_slug }
 *     → appends an l1-l2-overrides.json entry, flips matching open items to
 *       needs_review=false so they drain.
 *   { action: "dismiss", audit_id }
 *     → marks the audit row resolved without moving the product (keeps current).
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Client } from "pg"
import fs from "fs"
import path from "path"

const RULES_DIR = path.resolve(process.cwd(), "src/taxonomy/rules")
const L1L2_PATH = path.join(RULES_DIR, "l1-l2-overrides.json")

// ── helpers ────────────────────────────────────────────────────────

// DATABASE_URL = üks tõeallikas (prod/staging: db:5432, B-cutover: pgbouncer:5432).
// PG*-fallback ainult lokaalseks dev'iks (vana default localhost:5435 → prod'is
// ECONNREFUSED, vt scaling-doc §15/§16 B3).
function makeCatQueueClient(): Client {
  if (process.env.DATABASE_URL) {
    return new Client({ connectionString: process.env.DATABASE_URL })
  }
  return new Client({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT) || 5435,
    user: process.env.PGUSER || "xlmarket",
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || "xlmarket",
  })
}

async function withPg<T>(fn: (c: Client) => Promise<T>): Promise<T> {
  const c = makeCatQueueClient()
  await c.connect()
  try { return await fn(c) } finally { await c.end() }
}

function requireAdmin(req: MedusaRequest, res: MedusaResponse): boolean {
  if (!(req as any).auth_context?.actor_id) {
    res.status(401).json({ message: "Authentication required" })
    return false
  }
  return true
}

async function resolveCategoryId(c: Client, handle: string): Promise<string | null> {
  const r = await c.query(
    `SELECT id FROM product_category
     WHERE handle = $1 AND deleted_at IS NULL AND is_active = true
     LIMIT 1`,
    [handle]
  )
  return r.rows[0]?.id || null
}

async function movProductToCategory(c: Client, productId: string, targetCategoryId: string): Promise<void> {
  // Replace the product's primary category link
  await c.query(
    `DELETE FROM product_category_product WHERE product_id = $1`,
    [productId]
  )
  await c.query(
    `INSERT INTO product_category_product (product_category_id, product_id)
     VALUES ($1, $2)
     ON CONFLICT DO NOTHING`,
    [targetCategoryId, productId]
  )
  // Flip status back to published (if it was draft because of the bucket)
  await c.query(
    `UPDATE product SET status = 'published', updated_at = NOW()
     WHERE id = $1 AND status = 'draft'`,
    [productId]
  )
}

// ── GET ────────────────────────────────────────────────────────────

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!requireAdmin(req, res)) return

  const view = (req.query.view as string) || "queue"
  const limit = Math.min(Number(req.query.limit) || 50, 500)

  try {
    if (view === "paths") {
      const rows = await withPg(c =>
        c.query(
          `SELECT raw_path, product_count, first_seen, last_seen
           FROM v_review_queue_top_paths LIMIT $1`,
          [limit]
        ).then(r => r.rows)
      )
      return res.json({ paths: rows })
    }

    if (view === "stats") {
      const stats = await withPg(async c => {
        const open = await c.query(
          `SELECT COUNT(*)::int AS n FROM v_review_queue`
        )
        const byMethod = await c.query(
          `SELECT method, COUNT(*)::int AS n
           FROM category_classification_audit
           WHERE needs_review = true AND resolved_at IS NULL
           GROUP BY method ORDER BY n DESC`
        )
        const agedOut = await c.query(
          `SELECT COUNT(*)::int AS n FROM v_review_queue
           WHERE created_at < NOW() - INTERVAL '14 days'`
        )
        return {
          open: open.rows[0]?.n ?? 0,
          aged_over_14d: agedOut.rows[0]?.n ?? 0,
          by_method: byMethod.rows,
        }
      })
      return res.json({ stats })
    }

    // view=clusters — UUS feed-pipeline review-bucket (classification_review),
    // KLASTRITE kaupa (tüüp · arv · lähim-L3). Propose-not-create: cron paigutas
    // AINULT olemas-L3-desse; review/new_l3/quarantine ootavad INIMEST siin.
    // Tabel tekib alles klassifikaatori --execute'il → guard tühja seisu vastu.
    if (view === "clusters") {
      const data = await withPg(async c => {
        const ex = await c.query(
          `SELECT to_regclass('public.classification_review') IS NOT NULL AS ok`
        )
        if (!ex.rows[0]?.ok) {
          return { table_exists: false, total: 0, by_bucket: [], clusters: [] }
        }
        // Klaster = (bucket, tüüp-silt). Silt = suggest_name (uus tüüp) VÕI
        // proposed_l3 (lähim olemas). suggest_l2 = kuhu L2 alla; nearest_l3 = DUP-värav.
        const clusters = await c.query(
          `SELECT bucket,
                  COALESCE(NULLIF(suggest_name,''), NULLIF(proposed_l3,''), '(määramata)') AS label,
                  max(NULLIF(suggest_l2,''))  AS suggest_l2,
                  max(NULLIF(proposed_l3,'')) AS nearest_l3,
                  count(*)::int               AS n,
                  round(avg(confidence)::numeric, 2)::float AS avg_conf,
                  (array_agg(title ORDER BY confidence DESC NULLS LAST))[1:6] AS samples,
                  (array_agg(NULLIF(sku,'') ORDER BY confidence DESC NULLS LAST))[1:6] AS skus
             FROM classification_review
            WHERE status = 'pending'
            GROUP BY bucket, label
            ORDER BY (bucket='new_l3') DESC, (bucket='quarantine') DESC, (bucket='review') DESC, n DESC
            LIMIT $1`,
          [limit]
        )
        const byBucket = await c.query(
          `SELECT bucket, count(*)::int AS n
             FROM classification_review WHERE status='pending'
            GROUP BY bucket ORDER BY n DESC`
        )
        const total = byBucket.rows.reduce((s, r) => s + r.n, 0)
        return { table_exists: true, total, by_bucket: byBucket.rows, clusters: clusters.rows }
      })
      return res.json(data)
    }

    // default: list open items (joined with product title)
    const rows = await withPg(c =>
      c.query(
        `SELECT q.id, q.product_id, q.method, q.confidence, q.l1_slug, q.l2_slug,
                q.l3_slug, q.raw_path, q.reason, q.created_at,
                p.title, p.handle, p.status
         FROM v_review_queue q
         LEFT JOIN product p ON p.id = q.product_id AND p.deleted_at IS NULL
         ORDER BY q.created_at DESC LIMIT $1`,
        [limit]
      ).then(r => r.rows)
    )
    return res.json({ items: rows, count: rows.length })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

// ── POST ───────────────────────────────────────────────────────────

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!requireAdmin(req, res)) return

  const body = (req.body || {}) as any
  const action = body.action

  try {
    if (action === "assign") {
      const { audit_id, l1_slug, l2_slug, l3_slug } = body
      if (!audit_id || !l1_slug) {
        return res.status(400).json({ message: "audit_id and l1_slug required" })
      }
      // Pick deepest existing target handle
      const targetHandle = l3_slug || l2_slug || l1_slug
      const { productId, categoryId } = await withPg(async c => {
        const catId = await resolveCategoryId(c, targetHandle)
        if (!catId) throw new Error(`Category not found: ${targetHandle}`)
        const audit = await c.query(
          `SELECT product_id FROM category_classification_audit WHERE id = $1`,
          [audit_id]
        )
        const pid = audit.rows[0]?.product_id
        if (!pid) throw new Error(`audit row ${audit_id} has no product_id`)
        await movProductToCategory(c, pid, catId)
        await c.query(
          `UPDATE category_classification_audit
           SET needs_review = false, resolved_at = NOW()
           WHERE id = $1`,
          [audit_id]
        )
        await c.query(
          `INSERT INTO category_classification_audit
             (product_id, action, method, confidence, l1_slug, l2_slug, l3_slug,
              raw_path, needs_review, reason)
           VALUES ($1, 'review_resolved', 'manual_admin', 1.00, $2, $3, $4, $5, false, 'manual assign')`,
          [pid, l1_slug, l2_slug || null, l3_slug || null, null]
        )
        return { productId: pid, categoryId: catId }
      })
      return res.json({ ok: true, product_id: productId, category_id: categoryId })
    }

    if (action === "dismiss") {
      const { audit_id } = body
      if (!audit_id) return res.status(400).json({ message: "audit_id required" })
      await withPg(c =>
        c.query(
          `UPDATE category_classification_audit
           SET needs_review = false, resolved_at = NOW()
           WHERE id = $1`,
          [audit_id]
        )
      )
      return res.json({ ok: true })
    }

    if (action === "create_rule") {
      const { vevor_l1, vevor_l2, target_slug } = body
      if (!vevor_l1 || !vevor_l2 || !target_slug) {
        return res.status(400).json({ message: "vevor_l1, vevor_l2, target_slug required" })
      }
      const key = `${vevor_l1}|${vevor_l2}`
      const json = JSON.parse(fs.readFileSync(L1L2_PATH, "utf-8"))
      json.overrides = json.overrides || {}
      json.overrides[key] = target_slug
      json._updated = new Date().toISOString().slice(0, 10)
      fs.writeFileSync(L1L2_PATH, JSON.stringify(json, null, 2) + "\n")

      // Best-effort: drain matching open items by flipping their review flag.
      // Leaves product in current category; next feed sync re-applies the rule.
      const prefix = `${vevor_l1} > ${vevor_l2}`
      const drained = await withPg(c =>
        c.query(
          `UPDATE category_classification_audit
           SET needs_review = false, resolved_at = NOW()
           WHERE needs_review = true AND resolved_at IS NULL
             AND raw_path LIKE $1
           RETURNING id`,
          [`${prefix}%`]
        ).then(r => r.rows.length)
      )
      return res.json({ ok: true, rule_added: key, drained })
    }

    return res.status(400).json({ message: `Unknown action: ${action}` })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}
