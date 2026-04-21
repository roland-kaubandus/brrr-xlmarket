import { Client } from "pg"

export function makePgClient() {
  return new Client({
    host: process.env.PGHOST || "localhost",
    port: Number(process.env.PGPORT) || 5435,
    user: process.env.PGUSER || "xlmarket",
    password: process.env.PGPASSWORD,
    database: process.env.PGDATABASE || "xlmarket",
  })
}

export interface CmsPage {
  id: string
  page_key: string
  title: string
  schema_ver: number
  content: Record<string, unknown>
  updated_at: string | null
  updated_by: string | null
}

export interface CmsPageRevision {
  id: number
  page_id: string
  content: Record<string, unknown>
  created_at: string
  created_by: string | null
  note: string | null
}

export async function getPage(pageKey: string): Promise<CmsPage | null> {
  const client = makePgClient()
  try {
    await client.connect()
    const r = await client.query<CmsPage>(
      "SELECT * FROM cms_page WHERE page_key = $1",
      [pageKey]
    )
    return r.rows[0] ?? null
  } finally {
    await client.end()
  }
}

export async function listPages(): Promise<CmsPage[]> {
  const client = makePgClient()
  try {
    await client.connect()
    const r = await client.query<CmsPage>(
      "SELECT * FROM cms_page ORDER BY page_key"
    )
    return r.rows
  } finally {
    await client.end()
  }
}

export async function upsertPage(
  pageKey: string,
  title: string,
  content: Record<string, unknown>,
  updatedBy: string
): Promise<CmsPage> {
  const client = makePgClient()
  try {
    await client.connect()
    await client.query("BEGIN")

    // Upsert the page
    const r = await client.query<CmsPage>(
      `INSERT INTO cms_page (id, page_key, title, content, updated_at, updated_by)
       VALUES ($1, $1, $2, $3, NOW(), $4)
       ON CONFLICT (page_key) DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         updated_at = NOW(),
         updated_by = EXCLUDED.updated_by
       RETURNING *`,
      [pageKey, title, JSON.stringify(content), updatedBy]
    )
    const page = r.rows[0]

    // Write revision
    await client.query(
      `INSERT INTO cms_page_revision (page_id, content, created_by)
       VALUES ($1, $2, $3)`,
      [pageKey, JSON.stringify(content), updatedBy]
    )

    await client.query("COMMIT")
    return page
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    await client.end()
  }
}

export async function getRevisions(pageKey: string, limit = 20): Promise<CmsPageRevision[]> {
  const client = makePgClient()
  try {
    await client.connect()
    const r = await client.query<CmsPageRevision>(
      `SELECT * FROM cms_page_revision WHERE page_id = $1
       ORDER BY created_at DESC LIMIT $2`,
      [pageKey, limit]
    )
    return r.rows
  } finally {
    await client.end()
  }
}

export async function rollbackToRevision(
  pageKey: string,
  revisionId: number,
  rolledBackBy: string
): Promise<CmsPage | null> {
  const client = makePgClient()
  try {
    await client.connect()
    await client.query("BEGIN")

    const rev = await client.query<CmsPageRevision>(
      "SELECT * FROM cms_page_revision WHERE id = $1 AND page_id = $2",
      [revisionId, pageKey]
    )
    if (!rev.rows[0]) {
      await client.query("ROLLBACK")
      return null
    }

    const content = rev.rows[0].content
    const r = await client.query<CmsPage>(
      `UPDATE cms_page SET content = $1, updated_at = NOW(), updated_by = $2
       WHERE page_key = $3 RETURNING *`,
      [JSON.stringify(content), rolledBackBy, pageKey]
    )

    await client.query(
      `INSERT INTO cms_page_revision (page_id, content, created_by, note)
       VALUES ($1, $2, $3, $4)`,
      [pageKey, JSON.stringify(content), rolledBackBy, `Rolled back to revision #${revisionId}`]
    )

    await client.query("COMMIT")
    return r.rows[0] ?? null
  } catch (err) {
    await client.query("ROLLBACK")
    throw err
  } finally {
    await client.end()
  }
}
