"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.POST = exports.GET = void 0;
const db_1 = require("../../../../../modules/cms/db");
const schemas_1 = require("../../../../../modules/cms/schemas");
function readLocale(req) {
    const fromQuery = req.query.locale;
    const fromBody = req.body?.locale;
    const candidate = typeof fromQuery === "string" ? fromQuery : fromBody;
    return typeof candidate === "string" && /^[a-z]{2}$/.test(candidate) ? candidate : "en";
}
// GET /admin/cms/:key/revisions?locale= — list last 20 revisions for a locale
const GET = async (req, res) => {
    const key = req.params.key;
    if (!schemas_1.PAGE_REGISTRY[key]) {
        res.status(404).json({ message: `Unknown page key: ${key}` });
        return;
    }
    const locale = readLocale(req);
    const revisions = await (0, db_1.getRevisions)(key, 20, locale);
    res.json({ revisions, locale });
};
exports.GET = GET;
// POST /admin/cms/:key/revisions — rollback a locale row to a specific revision
const POST = async (req, res) => {
    const actorId = req.auth_context?.actor_id;
    if (!actorId) {
        res.status(401).json({ message: "Authentication required" });
        return;
    }
    const key = req.params.key;
    if (!schemas_1.PAGE_REGISTRY[key]) {
        res.status(404).json({ message: `Unknown page key: ${key}` });
        return;
    }
    const body = req.body;
    if (!body?.revision_id) {
        res.status(400).json({ message: "Missing revision_id" });
        return;
    }
    const locale = readLocale(req);
    const page = await (0, db_1.rollbackToRevision)(key, body.revision_id, actorId, locale);
    if (!page) {
        res.status(404).json({ message: `Revision ${body.revision_id} not found for page "${key}" (locale=${locale})` });
        return;
    }
    res.json({
        key,
        locale: page.locale,
        content: page.content,
        updated_at: page.updated_at,
        updated_by: page.updated_by,
    });
};
exports.POST = POST;
//# sourceMappingURL=route.js.map