import { makePgClient } from "../modules/cms/db.js"

// D3 — ARVE-NUMBER XL-AAAA-NNNNN (järjestikune, lünkadeta, per-aasta).
// Väljastatakse makse kinnitamisel (order.placed subscriber). Prefiks + luba seadistatav.
//
// LÜNKADETA + IDEMPOTENT (seaduse nõue — Eesti raamatupidamises arve-numbrid järjestikused):
//   - `invoice_number` tabel (order_id → number) = TÕE-ALLIKAS. order.placed kordub → SAMA number
//     (SELECT enne allokeerimist), EI topelt-allokeeri, EI jäta lünka.
//   - `invoice_number_counter` (per-aasta last_seq) kasvab atomaarselt ON CONFLICT ... +1 →
//     rea-lukk serialiseerib samaaegsed allokeerimised → lünkadeta.
//   - Loendur-samm + mapping-insert ÜHES transaktsioonis: kui saatmine/metadata-update kukub
//     PÄRAST commit'i, number on juba kinnistatud → retry tagastab sama → ei lünka, ei dubleeri.
//
// LIPP `INVOICE_SERIES_ENABLED` juhib (vaikimisi VÄLJAS — ohutu vaikimisi, HARD RULE #6):
//   VÄLJAS → arve kasutab tellimuse nr-i `#N` (invoice-view.ts resolveInvoiceNumber fallback).
//   SEES   → seeria-number allokeeritakse ja kuvatakse arvel.
// Tarmo lülitab SEES peale raamatupidaja kinnitust (D3 "Tarmo kinnitab raamatupidajaga").

const PAD = 5

function prefix(): string {
  return (process.env.INVOICE_SERIES_PREFIX || "XL").trim()
}

export function invoiceSeriesEnabled(): boolean {
  return (process.env.INVOICE_SERIES_ENABLED || "").trim().toLowerCase() === "true"
}

function fmt(year: number, seq: number): string {
  return `${prefix()}-${year}-${String(seq).padStart(PAD, "0")}`
}

type PgClient = ReturnType<typeof makePgClient>

let schemaReady = false
async function ensureSchema(client: PgClient): Promise<void> {
  if (schemaReady) return
  await client.query(`
    CREATE TABLE IF NOT EXISTS invoice_number_counter (
      series_year int PRIMARY KEY,
      last_seq    int NOT NULL
    )`)
  await client.query(`
    CREATE TABLE IF NOT EXISTS invoice_number (
      order_id    text PRIMARY KEY,
      number      text NOT NULL UNIQUE,
      series_year int NOT NULL,
      seq         int NOT NULL,
      issued_at   timestamptz NOT NULL DEFAULT NOW()
    )`)
  schemaReady = true
}

/**
 * Allokeeri (või tagasta olemasolev) arve-number tellimusele. Idempotent + lünkadeta.
 * `issuedAt` määrab aasta-seeria (vaikimisi praegu). Kutsutakse AINULT kui invoiceSeriesEnabled().
 */
export async function allocateInvoiceNumber(orderId: string, issuedAt?: Date): Promise<string> {
  const year = (issuedAt || new Date()).getUTCFullYear()
  const client = makePgClient()
  try {
    await client.connect()
    await ensureSchema(client)
    await client.query("BEGIN")

    // Idempotent: juba allokeeritud? → tagasta sama (ei topelt-allokeeri).
    const existing = await client.query<{ number: string }>(
      "SELECT number FROM invoice_number WHERE order_id = $1",
      [orderId]
    )
    if (existing.rows[0]) {
      await client.query("COMMIT")
      return existing.rows[0].number
    }

    // Atomaarne per-aasta loendur (+1 rea-luku all → lünkadeta ka samaaegsel order.placed'il).
    const seqRes = await client.query<{ last_seq: number }>(
      `INSERT INTO invoice_number_counter (series_year, last_seq)
       VALUES ($1, 1)
       ON CONFLICT (series_year) DO UPDATE SET last_seq = invoice_number_counter.last_seq + 1
       RETURNING last_seq`,
      [year]
    )
    const seq = seqRes.rows[0].last_seq
    const number = fmt(year, seq)

    await client.query(
      "INSERT INTO invoice_number (order_id, number, series_year, seq) VALUES ($1, $2, $3, $4)",
      [orderId, number, year, seq]
    )

    await client.query("COMMIT")
    return number
  } catch (err) {
    try {
      await client.query("ROLLBACK")
    } catch {
      /* ignore */
    }
    throw err
  } finally {
    await client.end()
  }
}
