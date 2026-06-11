"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const db_1 = require("../../../modules/cms/db");
const schemas_1 = require("../../../modules/cms/schemas");
// GET /admin/cms?locale= — list all manageable pages with seeded status per locale
const GET = async (req, res) => {
    const localeRaw = req.query.locale;
    const locale = typeof localeRaw === "string" && /^[a-z]{2}$/.test(localeRaw) ? localeRaw : "en";
    const rows = await (0, db_1.listPages)(locale);
    const pages = Object.entries(schemas_1.PAGE_REGISTRY).map(([key, reg]) => {
        const row = rows.find((p) => p.page_key === key);
        return {
            key,
            title: reg.title,
            locale,
            seeded: !!row,
            updated_at: row?.updated_at ?? null,
            updated_by: row?.updated_by ?? null,
        };
    });
    res.json({ locale, pages });
};
exports.GET = GET;
//# sourceMappingURL=route.js.map