"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PUT = exports.GET = void 0;
const db_1 = require("../../../../modules/cms/db");
const schemas_1 = require("../../../../modules/cms/schemas");
function readLocale(req) {
    const fromQuery = req.query.locale;
    const fromBody = req.body?.locale;
    const candidate = typeof fromQuery === "string" ? fromQuery : fromBody;
    return typeof candidate === "string" && /^[a-z]{2}$/.test(candidate) ? candidate : "en";
}
// GET /admin/cms/:key?locale=en|et|... — fetch current content for a locale
const GET = async (req, res) => {
    const key = req.params.key;
    if (!schemas_1.PAGE_REGISTRY[key]) {
        res.status(404).json({ message: `Unknown page key: ${key}` });
        return;
    }
    const locale = readLocale(req);
    const page = await (0, db_1.getPage)(key, locale);
    if (!page) {
        res.status(404).json({ message: `Page "${key}" not seeded yet` });
        return;
    }
    res.json({
        key,
        locale: page.locale,
        title: page.title,
        content: page.content,
        updated_at: page.updated_at,
        updated_by: page.updated_by,
    });
};
exports.GET = GET;
// PUT /admin/cms/:key — save content (validates schema, writes revision).
// Body or ?locale= selects which locale row to upsert. Defaults to 'en'.
const PUT = async (req, res) => {
    const actorId = req.auth_context?.actor_id;
    if (!actorId) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }
    const key = req.params.key;
    const reg = schemas_1.PAGE_REGISTRY[key];
    if (!reg) {
        res.status(404).json({ message: `Unknown page key: ${key}` });
        return;
    }
    const body = req.body;
    if (!body?.content) {
        res.status(400).json({ message: "Missing content in request body" });
        return;
    }
    const validation = (0, schemas_1.validateContent)(key, body.content);
    if (!validation.ok) {
        res.status(400).json({ message: `Schema validation failed: ${validation.error}` });
        return;
    }
    const locale = readLocale(req);
    const page = await (0, db_1.upsertPage)(key, reg.title, body.content, actorId, locale);
    res.json({
        key,
        locale: page.locale,
        content: page.content,
        updated_at: page.updated_at,
        updated_by: page.updated_by,
    });
};
exports.PUT = PUT;
//# sourceMappingURL=route.js.map