"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const db_1 = require("../../../../modules/cms/db");
const schemas_1 = require("../../../../modules/cms/schemas");
// GET /store/cms/:key — public read, no auth, cache-friendly
const GET = async (req, res) => {
    const key = req.params.key;
    if (!schemas_1.PAGE_REGISTRY[key]) {
        res.status(404).json({ message: `Unknown page key: ${key}` });
        return;
    }
    const localeRaw = req.query.locale;
    const locale = typeof localeRaw === "string" && /^[a-z]{2}$/.test(localeRaw)
        ? localeRaw
        : "en";
    const page = await (0, db_1.getPage)(key, locale);
    if (!page) {
        res.status(404).json({ message: `Page "${key}" not found` });
        return;
    }
    res.setHeader("Cache-Control", "public, s-maxage=60, stale-while-revalidate=300");
    res.json({
        key,
        locale: page.locale,
        content: page.content,
        updated_at: page.updated_at,
    });
};
exports.GET = GET;
//# sourceMappingURL=route.js.map