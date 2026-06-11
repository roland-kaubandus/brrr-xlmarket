"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.GET = void 0;
const db_1 = require("../../../modules/cms/db");
// GET /store/cms — list all published page keys + update timestamps (no content)
const GET = async (_req, res) => {
    const pages = await (0, db_1.listPages)();
    res.json({
        pages: pages.map((p) => ({ key: p.page_key, updated_at: p.updated_at })),
    });
};
exports.GET = GET;
//# sourceMappingURL=route.js.map