/**
 * /admin/review-bucket — feed-pipeline klassifikaatori review-bucket (SAMM 2c).
 *
 * Allikas: `classification_review`, mille öine [4] classify jätab INIMESE otsuseks
 * (propose-not-create): uus tüüp / madal kindlus / kodutu.
 *
 * GET  /admin/review-bucket            → KONTSEPTI-klastrid + DUP + pending_build + logi
 * GET  /admin/review-bucket?search=... → L3-kategooria otsing ("muu olemas-L3" valija, 2a)
 * POST /admin/review-bucket            → otsus (assign_existing | create_l3 | quarantine | reject | undo)
 *
 * VÄLJADE SEMANTIKA (classify kirjutab; UI näitab ERALDI — Tarmo 2b):
 *   proposed_l3  = LÄHIM OLEMAS-L3 (mudeli `l3`, puus olemas). review-ämbris = määra-siht;
 *                  new_l3-ämbris = DUP-HOIATUS (lähim, mis EI KATA → uus vajalik).
 *   suggest_name = pakutud UUE L3 nimi (new_l3-ämber).
 *   suggest_l2   = pakutud vanem-L2 (EBAUSALDUSVÄÄRNE: vahel handle, vahel label
 *                  "Ladu > Riiulid ja restid") → resolveerime handle'iks kui saab, muidu
 *                  inimene valib L2 käsitsi. EI usalda pimesi.
 *
 * DUP-VÄRAV: sama kontsept mitmes ämbris / mitme koduga → ÜKS plokk, sunnib ÜHE sihi.
 *
 * PROPOSE-NOT-CREATE: `create_l3` EI lisa kategooriat live-puusse (rikuks SSoT-regen +
 * 4-sammu deploy). Klõps: (a) märgib tooted `classification_review.status='approved_build'`
 * (LAHKUVAD otsustamata-klastritest, EI ilmu uuesti) + (b) logib `approved_pending_build`.
 * Tegelik loomine + toodete määramine käib struktuuri-buildil (genyM/lock-harness + 4-sammu).
 * `pending_build` sektsioon (GET) hoiab need NÄHTAVAL — ei ole vaikne ämber.
 *
 * Otsuste-logi (`review_decision_log`, append-only) = tagasivõtmise alus. Tabel tuleb
 * migratsioonist `scripts/migrations/007-review-decision-log.sql`; ensureLogTable siin =
 * turvavõrk (idempotentne), et funktsioon töötaks ka enne migratsiooni jooksu.
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Client } from "pg"

// ── pg helpers (sama muster kui categorization-queue route) ─────────

function makeClient(): Client {
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
  const c = makeClient()
  await c.connect()
  try { return await fn(c) } finally { await c.end() }
}

function requireAdmin(req: MedusaRequest, res: MedusaResponse): string | null {
  const actor = (req as any).auth_context?.actor_id
  if (!actor) {
    res.status(401).json({ message: "Authentication required" })
    return null
  }
  return String(actor)
}

// review_decision_log — turvavõrk (migratsioon 007 loob prod-is; siin idempotentne).
async function ensureLogTable(c: Client): Promise<void> {
  await c.query(`
    CREATE TABLE IF NOT EXISTS review_decision_log (
      id            bigserial PRIMARY KEY,
      created_at    timestamptz NOT NULL DEFAULT now(),
      actor         text NOT NULL,
      bucket_type   text NOT NULL,              -- 'classification' | 'synonym'
      action        text NOT NULL,              -- assign_existing | create_l3 | quarantine | reject
      concept_key   text,
      target_handle text,
      target_l2     text,
      new_l3_name   text,
      status        text NOT NULL DEFAULT 'applied',  -- applied | approved_pending_build | undone
      affected      jsonb NOT NULL DEFAULT '[]',
      meta          jsonb,
      undone_at     timestamptz,
      undone_by     text
    )
  `)
}

// ── kontsepti-võti (title → normaliseeritud tüübi-signatuur) ─────────
// Nimi = nõrgim signaal; AINULT klastri-grupeerimiseks (DUP-tuvastus), mitte paigutuseks.
const STOP = new Set([
  "with", "and", "for", "the", "set", "kit", "pack", "tier", "pcs", "pc",
  "pro", "per", "mm", "cm", "inch", "steel", "carbon",
])
function conceptKey(row: { title?: string; suggest_name?: string; proposed_l3?: string }): string {
  const base = (row.title || row.suggest_name || row.proposed_l3 || "").toLowerCase()
  const toks = base
    .replace(/[^a-zäöüõ]+/gi, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
  return toks.slice(0, 2).join(" ") || "(määramata)"
}

type CatMeta = { handle: string; name: string; parent_name: string | null; parent_handle: string | null }

// resolveeri handle → nimi + vanem (olemas-L3 kuvamiseks + suggest_l2 handle-kontrolliks)
async function resolveNames(c: Client, handles: string[]): Promise<Map<string, CatMeta>> {
  const uniq = [...new Set(handles.filter(Boolean))]
  const out = new Map<string, CatMeta>()
  if (uniq.length === 0) return out
  const r = await c.query(
    `SELECT pc.handle, pc.name, par.name AS parent_name, par.handle AS parent_handle
       FROM product_category pc
       LEFT JOIN product_category par ON par.id = pc.parent_category_id
      WHERE pc.handle = ANY($1) AND pc.deleted_at IS NULL`,
    [uniq]
  )
  for (const row of r.rows) out.set(row.handle, row)
  return out
}

// ── GET ─────────────────────────────────────────────────────────────

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  if (!requireAdmin(req, res)) return

  // 2a — "muu olemas-L3" otsing: leht-kategooriad (L3 = ilma lasteta) nime/handle järgi
  const search = String((req.query as any)?.search || "").trim()
  if (search) {
    try {
      const results = await withPg(async (c) => {
        const like = `%${search}%`
        const r = await c.query(
          `SELECT pc.handle, pc.name, par.name AS parent_name
             FROM product_category pc
             LEFT JOIN product_category par ON par.id = pc.parent_category_id
            WHERE pc.deleted_at IS NULL
              AND (pc.name ILIKE $1 OR pc.handle ILIKE $1)
              AND NOT EXISTS (
                SELECT 1 FROM product_category ch
                 WHERE ch.parent_category_id = pc.id AND ch.deleted_at IS NULL)
            ORDER BY (pc.name ILIKE $2) DESC, length(pc.name) ASC
            LIMIT 25`,
          [like, `${search}%`]
        )
        return r.rows
      })
      return res.json({ search_results: results })
    } catch (err: any) {
      return res.status(500).json({ message: err.message })
    }
  }

  try {
    const data = await withPg(async (c) => {
      const ex = await c.query(
        `SELECT to_regclass('public.classification_review') IS NOT NULL AS ok`
      )
      if (!ex.rows[0]?.ok) {
        return { table_exists: false, total: 0, by_bucket: [], clusters: [], pending_build: [], recent_decisions: [] }
      }
      const { rows } = await c.query(
        `SELECT product_id, sku, title, bucket,
                NULLIF(proposed_l3,'')  AS proposed_l3,
                NULLIF(suggest_name,'') AS suggest_name,
                NULLIF(suggest_l2,'')   AS suggest_l2,
                confidence::float       AS confidence
           FROM classification_review
          WHERE status = 'pending'`
      )

      // resolveeri kõik viidatud handle'id (proposed_l3 = olemas-L3; suggest_l2 = ehk handle)
      const names = await resolveNames(c, [
        ...rows.map((r: any) => r.proposed_l3).filter(Boolean),
        ...rows.map((r: any) => r.suggest_l2).filter(Boolean),
      ])

      // klastrid kontsepti-võtme järgi
      const byKey = new Map<string, any[]>()
      for (const r of rows) {
        const k = conceptKey(r)
        if (!byKey.has(k)) byKey.set(k, [])
        byKey.get(k)!.push(r)
      }

      const clusters = [...byKey.entries()].map(([concept_key, members]) => {
        const buckets = [...new Set(members.map((m) => m.bucket))]

        // KANDIDAAT-KODUD — üks member võib anda MÕLEMAD (Tarmo 2b):
        //   proposed_l3 → OLEMAS-L3 kodu (new_l3-ämbris = DUP-hoiatus, mitte esmavalik)
        //   suggest_name → UUE-L3 ettepanek (vanem-L2 eraldi)
        const homeMap = new Map<string, any>()
        for (const m of members) {
          if (m.proposed_l3) {
            const key = "existing:" + m.proposed_l3
            const meta = names.get(m.proposed_l3)
            const e = homeMap.get(key) || {
              kind: "existing", handle: m.proposed_l3,
              name: meta?.name || m.proposed_l3,
              parent_name: meta?.parent_name || null,
              exists: !!meta,
              dup_hint: false, from_buckets: new Set<string>(), n: 0,
            }
            e.from_buckets.add(m.bucket); e.n++
            if (m.bucket === "new_l3") e.dup_hint = true  // "lähim olemas, aga ei kata" = DUP-hoiatus
            homeMap.set(key, e)
          }
          if (m.suggest_name) {
            const key = "new:" + m.suggest_name + "@" + (m.suggest_l2 || "")
            const l2meta = m.suggest_l2 ? names.get(m.suggest_l2) : undefined
            const e = homeMap.get(key) || {
              kind: "new", name: m.suggest_name,
              l2_raw: m.suggest_l2 || null,          // toorik (handle VÕI label)
              l2_handle: l2meta ? m.suggest_l2 : null, // resolveeritud handle (null → vali käsitsi)
              l2_label: l2meta ? l2meta.name : (m.suggest_l2 || null),
              from_buckets: new Set<string>(), n: 0,
            }
            e.from_buckets.add(m.bucket); e.n++
            homeMap.set(key, e)
          }
        }
        const candidate_homes = [...homeMap.values()]
          .map((e) => ({ ...e, from_buckets: [...e.from_buckets] }))
          .sort((a, b) => b.n - a.n)

        // DUP = mitu ämbrit VÕI mitu eristuvat kodu (new + existing loevad eraldi)
        const is_dup = buckets.length > 1 || candidate_homes.length > 1

        const confs = members.map((m) => m.confidence).filter((x) => x != null)
        return {
          concept_key, is_dup, buckets, n: members.length,
          avg_conf: confs.length ? Math.round((confs.reduce((s, x) => s + x, 0) / confs.length) * 100) / 100 : null,
          candidate_homes,
          members: members
            .sort((a, b) => (b.confidence || 0) - (a.confidence || 0))
            .map((m) => ({
              product_id: m.product_id, sku: m.sku, title: m.title, bucket: m.bucket,
              confidence: m.confidence, proposed_l3: m.proposed_l3,
              suggest_name: m.suggest_name, suggest_l2: m.suggest_l2,
            })),
        }
      })
      clusters.sort((a, b) => Number(b.is_dup) - Number(a.is_dup) || b.n - a.n)

      const byBucketRows = await c.query(
        `SELECT bucket, count(*)::int AS n FROM classification_review
          WHERE status='pending' GROUP BY bucket ORDER BY n DESC`
      )
      const total = byBucketRows.rows.reduce((s: number, r: any) => s + r.n, 0)

      // pending_build + otsuste-logi (kui logi-tabel olemas)
      let pending_build: any[] = []
      let recent: any[] = []
      const logEx = await c.query(`SELECT to_regclass('public.review_decision_log') IS NOT NULL AS ok`)
      if (logEx.rows[0]?.ok) {
        // KINNITATUD, OOTAB STRUKTUURI-BUILDI (approved_pending_build, mitte tagasi võetud)
        pending_build = (await c.query(
          `SELECT id AS log_id, created_at, new_l3_name, target_l2, concept_key,
                  jsonb_array_length(affected) AS n,
                  (SELECT string_agg(x, ' · ') FROM (
                     SELECT p.title AS x
                       FROM jsonb_array_elements(l.affected) a
                       JOIN product p ON p.id = (a->>'product_id')
                      LIMIT 3) s) AS sample_titles,
                  EXTRACT(EPOCH FROM (now() - created_at))::bigint AS age_seconds
             FROM review_decision_log l
            WHERE bucket_type='classification' AND action='create_l3'
              AND status='approved_pending_build' AND undone_at IS NULL
            ORDER BY created_at ASC`
        )).rows
        recent = (await c.query(
          `SELECT id, created_at, actor, action, concept_key, target_handle, new_l3_name,
                  status, jsonb_array_length(affected) AS n_affected, undone_at
             FROM review_decision_log
            WHERE bucket_type='classification'
            ORDER BY id DESC LIMIT 20`
        )).rows
      }

      return { table_exists: true, total, by_bucket: byBucketRows.rows, clusters, pending_build, recent_decisions: recent }
    })
    return res.json(data)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

// ── POST ─────────────────────────────────────────────────────────────

async function resolveCategoryId(c: Client, handle: string): Promise<string | null> {
  const r = await c.query(
    `SELECT id FROM product_category WHERE handle=$1 AND deleted_at IS NULL LIMIT 1`,
    [handle]
  )
  return r.rows[0]?.id || null
}

// jäädvusta toote praegused kategooria-seosed (undo jaoks)
async function capturePrev(c: Client, productIds: string[]): Promise<Record<string, string[]>> {
  const r = await c.query(
    `SELECT product_id, array_agg(product_category_id) AS cats
       FROM product_category_product WHERE product_id = ANY($1) GROUP BY product_id`,
    [productIds]
  )
  const out: Record<string, string[]> = {}
  for (const row of r.rows) out[row.product_id] = row.cats
  return out
}

// jäädvusta classification_review staatus (undo jaoks)
async function captureCrStatus(c: Client, productIds: string[]): Promise<Record<string, string>> {
  const r = await c.query(
    `SELECT product_id, status FROM classification_review WHERE product_id=ANY($1)`, [productIds]
  )
  const out: Record<string, string> = {}
  for (const row of r.rows) out[row.product_id] = row.status
  return out
}

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const actor = requireAdmin(req, res)
  if (!actor) return
  const body = (req.body || {}) as any
  const action = body.action

  try {
    // ── UNDO ──────────────────────────────────────────────────────
    if (action === "undo") {
      const { log_id } = body
      if (!log_id) return res.status(400).json({ message: "log_id required" })
      const result = await withPg(async (c) => {
        await ensureLogTable(c)
        const lr = await c.query(`SELECT * FROM review_decision_log WHERE id=$1`, [log_id])
        const log = lr.rows[0]
        if (!log) throw new Error(`log ${log_id} not found`)
        if (log.undone_at) throw new Error(`otsus ${log_id} on juba tagasi võetud`)
        const affected: any[] = log.affected || []

        for (const a of affected) {
          // taasta toote eelmised kategooria-seosed (create_l3 puhul prev=[] → jääb kodutuks, õige)
          await c.query(`DELETE FROM product_category_product WHERE product_id=$1`, [a.product_id])
          for (const cid of a.prev_category_ids || []) {
            await c.query(
              `INSERT INTO product_category_product (product_category_id, product_id)
               VALUES ($1,$2) ON CONFLICT DO NOTHING`, [cid, a.product_id]
            )
          }
          // taasta classification_review staatus (approved_build/resolved/… → tagasi)
          await c.query(
            `UPDATE classification_review SET status=$2, updated_at=now() WHERE product_id=$1`,
            [a.product_id, a.prev_status || "pending"]
          )
        }
        await c.query(
          `UPDATE review_decision_log SET status='undone', undone_at=now(), undone_by=$2 WHERE id=$1`,
          [log_id, actor]
        )
        return { undone: affected.length }
      })
      return res.json({ ok: true, ...result })
    }

    // ── otsused ───────────────────────────────────────────────────
    const productIds: string[] = Array.isArray(body.product_ids) ? body.product_ids : []
    if (productIds.length === 0) return res.status(400).json({ message: "product_ids required" })
    const conceptKey_ = body.concept_key || null

    if (action === "assign_existing") {
      const target = body.target_handle
      if (!target) return res.status(400).json({ message: "target_handle required" })
      const out = await withPg(async (c) => {
        await ensureLogTable(c)
        const catId = await resolveCategoryId(c, target)
        if (!catId) throw new Error(`Kategooriat ei leitud: ${target}`)
        const prev = await capturePrev(c, productIds)
        const crStatus = await captureCrStatus(c, productIds)

        const affected: any[] = []
        for (const pid of productIds) {
          await c.query(`DELETE FROM product_category_product WHERE product_id=$1`, [pid])
          await c.query(
            `INSERT INTO product_category_product (product_category_id, product_id)
             VALUES ($1,$2) ON CONFLICT DO NOTHING`, [catId, pid]
          )
          await c.query(`UPDATE product SET status='published', updated_at=now() WHERE id=$1 AND status='draft'`, [pid])
          await c.query(
            `UPDATE classification_review SET status='resolved', updated_at=now() WHERE product_id=$1`, [pid]
          )
          affected.push({ product_id: pid, prev_category_ids: prev[pid] || [], prev_status: crStatus[pid] || "pending" })
        }
        const log = await c.query(
          `INSERT INTO review_decision_log (actor, bucket_type, action, concept_key, target_handle, status, affected)
           VALUES ($1,'classification','assign_existing',$2,$3,'applied',$4) RETURNING id`,
          [actor, conceptKey_, target, JSON.stringify(affected)]
        )
        return { log_id: log.rows[0].id, moved: affected.length, target_category_id: catId }
      })
      return res.json({ ok: true, ...out })
    }

    if (action === "create_l3") {
      // PROPOSE-NOT-CREATE: EI lisa kategooriat live-puusse (SSoT-regen + 4-sammu deploy reegel).
      // (a) märgi tooted 'approved_build' → LAHKUVAD otsustamata-klastritest, EI ilmu uuesti.
      // (b) logi 'approved_pending_build' → pending_build sektsioon hoiab NÄHTAVAL.
      // Tegelik loomine + toodete määramine käib struktuuri-buildil.
      const { l2_handle, new_l3_name } = body
      if (!l2_handle || !new_l3_name) {
        return res.status(400).json({ message: "l2_handle ja new_l3_name nõutud" })
      }
      const out = await withPg(async (c) => {
        await ensureLogTable(c)
        const l2 = await resolveCategoryId(c, l2_handle)
        if (!l2) throw new Error(`L2 kodu ei leitud: ${l2_handle}`)
        const crStatus = await captureCrStatus(c, productIds)
        // märgi tooted approved_build (lahkuvad pending-klastritest)
        await c.query(
          `UPDATE classification_review SET status='approved_build', updated_at=now() WHERE product_id=ANY($1)`,
          [productIds]
        )
        const affected = productIds.map((pid) => ({
          product_id: pid, prev_category_ids: [], prev_status: crStatus[pid] || "pending",
        }))
        const log = await c.query(
          `INSERT INTO review_decision_log
             (actor, bucket_type, action, concept_key, target_l2, new_l3_name, status, affected, meta)
           VALUES ($1,'classification','create_l3',$2,$3,$4,'approved_pending_build',$5,$6) RETURNING id`,
          [actor, conceptKey_, l2_handle, new_l3_name, JSON.stringify(affected),
           JSON.stringify({ note: "L3 luuakse struktuuri-buildil (genyM + 4-sammu deploy); tooted määratakse siis" })]
        )
        return { log_id: log.rows[0].id, approved: affected.length, pending_build: true }
      })
      return res.json({ ok: true, ...out })
    }

    if (action === "quarantine" || action === "reject") {
      const newStatus = action === "quarantine" ? "quarantined" : "rejected"
      const out = await withPg(async (c) => {
        await ensureLogTable(c)
        const crStatus = await captureCrStatus(c, productIds)
        const affected = productIds.map((pid) => ({ product_id: pid, prev_category_ids: [], prev_status: crStatus[pid] || "pending" }))
        await c.query(
          `UPDATE classification_review SET status=$2, updated_at=now() WHERE product_id=ANY($1)`,
          [productIds, newStatus]
        )
        const log = await c.query(
          `INSERT INTO review_decision_log (actor, bucket_type, action, concept_key, status, affected)
           VALUES ($1,'classification',$2,$3,'applied',$4) RETURNING id`,
          [actor, action, conceptKey_, JSON.stringify(affected)]
        )
        return { log_id: log.rows[0].id, updated: affected.length }
      })
      return res.json({ ok: true, ...out })
    }

    return res.status(400).json({ message: `Tundmatu action: ${action}` })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}
