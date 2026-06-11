"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.makePgClient = makePgClient;
exports.getPage = getPage;
exports.listPages = listPages;
exports.upsertPage = upsertPage;
exports.getRevisions = getRevisions;
exports.rollbackToRevision = rollbackToRevision;
const pg_1 = require("pg");
function makePgClient() {
    return new pg_1.Client({
        host: process.env.PGHOST || "localhost",
        port: Number(process.env.PGPORT) || 5435,
        user: process.env.PGUSER || "xlmarket",
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE || "xlmarket",
    });
}
async function getPage(pageKey, locale = "en") {
    const client = makePgClient();
    try {
        await client.connect();
        const r = await client.query("SELECT * FROM cms_page WHERE page_key = $1 AND locale = $2", [pageKey, locale]);
        if (r.rows[0])
            return r.rows[0];
        if (locale !== "en") {
            const fb = await client.query("SELECT * FROM cms_page WHERE page_key = $1 AND locale = 'en'", [pageKey]);
            return fb.rows[0] ?? null;
        }
        return null;
    }
    finally {
        await client.end();
    }
}
async function listPages(locale = "en") {
    const client = makePgClient();
    try {
        await client.connect();
        const r = await client.query("SELECT * FROM cms_page WHERE locale = $1 ORDER BY page_key", [locale]);
        return r.rows;
    }
    finally {
        await client.end();
    }
}
async function upsertPage(pageKey, title, content, updatedBy, locale = "en") {
    const client = makePgClient();
    try {
        await client.connect();
        await client.query("BEGIN");
        const rowId = locale === "en" ? pageKey : `${pageKey}-${locale}`;
        const r = await client.query(`INSERT INTO cms_page (id, page_key, locale, title, content, updated_at, updated_by)
       VALUES ($1, $2, $3, $4, $5, NOW(), $6)
       ON CONFLICT (page_key, locale) DO UPDATE SET
         title = EXCLUDED.title,
         content = EXCLUDED.content,
         updated_at = NOW(),
         updated_by = EXCLUDED.updated_by
       RETURNING *`, [rowId, pageKey, locale, title, JSON.stringify(content), updatedBy]);
        const page = r.rows[0];
        await client.query(`INSERT INTO cms_page_revision (page_id, locale, content, created_by)
       VALUES ($1, $2, $3, $4)`, [page.id, locale, JSON.stringify(content), updatedBy]);
        await client.query("COMMIT");
        return page;
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        await client.end();
    }
}
async function getRevisions(pageKey, limit = 20, locale = "en") {
    const client = makePgClient();
    try {
        await client.connect();
        const r = await client.query(`SELECT rev.*
       FROM cms_page_revision rev
       JOIN cms_page p ON p.id = rev.page_id
       WHERE p.page_key = $1 AND rev.locale = $2
       ORDER BY rev.created_at DESC LIMIT $3`, [pageKey, locale, limit]);
        return r.rows;
    }
    finally {
        await client.end();
    }
}
async function rollbackToRevision(pageKey, revisionId, rolledBackBy, locale = "en") {
    const client = makePgClient();
    try {
        await client.connect();
        await client.query("BEGIN");
        const rev = await client.query(`SELECT rev.*
       FROM cms_page_revision rev
       JOIN cms_page p ON p.id = rev.page_id
       WHERE rev.id = $1 AND p.page_key = $2 AND rev.locale = $3`, [revisionId, pageKey, locale]);
        if (!rev.rows[0]) {
            await client.query("ROLLBACK");
            return null;
        }
        const content = rev.rows[0].content;
        const r = await client.query(`UPDATE cms_page SET content = $1, updated_at = NOW(), updated_by = $2
       WHERE page_key = $3 AND locale = $4 RETURNING *`, [JSON.stringify(content), rolledBackBy, pageKey, locale]);
        if (r.rows[0]) {
            await client.query(`INSERT INTO cms_page_revision (page_id, locale, content, created_by, note)
         VALUES ($1, $2, $3, $4, $5)`, [r.rows[0].id, locale, JSON.stringify(content), rolledBackBy, `Rolled back to revision #${revisionId}`]);
        }
        await client.query("COMMIT");
        return r.rows[0] ?? null;
    }
    catch (err) {
        await client.query("ROLLBACK");
        throw err;
    }
    finally {
        await client.end();
    }
}
//# sourceMappingURL=db.js.map