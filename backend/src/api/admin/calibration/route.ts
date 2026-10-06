/**
 * /admin/calibration — AUTO-JUDGE kalibreerimise inimhinnangute salvestus (plaan §5).
 *
 * Tarmo hindab dry-run valimi (sünonüümid + klassifikaatorid) PIMESI. Hinnangud
 * salvestatakse DB-sse (`calibration_rating`), et kalibratsiooni saaks HILJEM
 * KORRATA/AUDITEERIDA — localStorage on ainult sama-brauseri mugavus.
 *
 * GET  /admin/calibration?kind=synonym&seed=xlm  → selle hindaja varem-salvestatud hinnangud
 * POST /admin/calibration                        → salvesta ÜKS hinnang (upsert)
 *
 * Tabel tuleb AINULT migratsioonist scripts/migrations/008-calibration-rating.sql.
 * Route EI loo tabelit vaikselt (assertTable) — puuduv tabel = SELGE viga (deploy-lünk).
 */

import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Client } from "pg"

// ── pg helpers (sama muster kui review-bucket route) ────────────────

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

// calibration_rating peab tulema migratsioonist 008. Puudub → SELGE viga.
async function assertTable(c: Client): Promise<void> {
  const r = await c.query(`SELECT to_regclass('public.calibration_rating') IS NOT NULL AS ok`)
  if (!r.rows[0]?.ok) {
    throw new Error(
      "calibration_rating tabel puudub — jooksuta migratsioon scripts/migrations/008-calibration-rating.sql"
    )
  }
}

const KINDS = new Set(["synonym", "classify"])

// ── GET — taasta selle hindaja hinnangud (kind + seed) ──────────────

export const GET = async (req: MedusaRequest, res: MedusaResponse) => {
  const actor = requireAdmin(req, res)
  if (!actor) return
  const kind = String((req.query as any)?.kind || "")
  const seed = String((req.query as any)?.seed || "xlm")
  if (!KINDS.has(kind)) return res.status(400).json({ message: "kind peab olema synonym|classify" })

  try {
    const data = await withPg(async (c) => {
      await assertTable(c)
      const r = await c.query(
        `SELECT item_id, tarmo_verdict, judge_verdict, agreed, updated_at
           FROM calibration_rating
          WHERE kind=$1 AND sample_seed=$2 AND actor=$3`,
        [kind, seed, actor]
      )
      // kaardista item_id → hinnang (kliendile lihtne restore)
      const ratings: Record<string, string> = {}
      for (const row of r.rows) ratings[row.item_id] = row.tarmo_verdict
      return { kind, seed, actor, count: r.rows.length, ratings, rows: r.rows }
    })
    return res.json(data)
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}

// ── POST — salvesta ÜKS hinnang (upsert) ────────────────────────────

export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const actor = requireAdmin(req, res)
  if (!actor) return
  const body = (req.body || {}) as any
  const { kind, seed = "xlm", item_id, tarmo_verdict, judge_verdict } = body
  if (!KINDS.has(kind)) return res.status(400).json({ message: "kind peab olema synonym|classify" })
  if (!item_id || !tarmo_verdict) {
    return res.status(400).json({ message: "item_id ja tarmo_verdict nõutud" })
  }

  try {
    const out = await withPg(async (c) => {
      await assertTable(c)
      const agreed = judge_verdict != null ? tarmo_verdict === judge_verdict : null
      const r = await c.query(
        `INSERT INTO calibration_rating
           (actor, kind, sample_seed, item_id, tarmo_verdict, judge_verdict, agreed)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (kind, sample_seed, item_id, actor)
         DO UPDATE SET tarmo_verdict=EXCLUDED.tarmo_verdict,
                       judge_verdict=EXCLUDED.judge_verdict,
                       agreed=EXCLUDED.agreed,
                       updated_at=now()
         RETURNING id`,
        [actor, kind, seed, String(item_id), String(tarmo_verdict),
         judge_verdict != null ? String(judge_verdict) : null, agreed]
      )
      return { id: r.rows[0].id, agreed }
    })
    return res.json({ ok: true, ...out })
  } catch (err: any) {
    res.status(500).json({ message: err.message })
  }
}
