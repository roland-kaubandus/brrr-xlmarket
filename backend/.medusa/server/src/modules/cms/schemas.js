"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAGE_REGISTRY = exports.globalSchema = exports.plainPageSchema = exports.legalPageSchema = exports.starterKitsSchema = exports.kitSchema = exports.homepageSchema = exports.promoSchema = exports.slideSchema = void 0;
exports.validateContent = validateContent;
const zod_1 = require("zod");
// ── Slide (homepage hero carousel) ──────────────────────────────────────────
exports.slideSchema = zod_1.z.object({
    badge: zod_1.z.string().max(40),
    title: zod_1.z.string().max(100),
    text: zod_1.z.string().max(300),
    cta: zod_1.z.string().max(60),
    ctaHref: zod_1.z.string().max(200),
    bg: zod_1.z.string().max(200),
});
// ── Promo card (homepage grid) ───────────────────────────────────────────────
exports.promoSchema = zod_1.z.object({
    tag: zod_1.z.string().max(30),
    tagTone: zod_1.z.enum(["amber", "red", "green", "navy"]),
    title: zod_1.z.string().max(80),
    sub: zod_1.z.string().max(200),
    image: zod_1.z.string().max(200).optional(),
    bg: zod_1.z.string().max(300).optional(),
    href: zod_1.z.string().max(200),
});
// ── Homepage ─────────────────────────────────────────────────────────────────
exports.homepageSchema = zod_1.z.object({
    slides: zod_1.z.array(exports.slideSchema).min(1).max(6),
    promos: zod_1.z.array(exports.promoSchema).min(1).max(12),
    nav_short_names: zod_1.z.record(zod_1.z.string(), zod_1.z.string()),
});
// ── Starter kit ──────────────────────────────────────────────────────────────
exports.kitSchema = zod_1.z.object({
    slug: zod_1.z.string().max(40),
    name: zod_1.z.string().max(80),
    priceFrom: zod_1.z.number().int().positive(),
    icon: zod_1.z.string().max(40), // Lucide icon name, e.g. "Coffee"
    tagline: zod_1.z.string().max(200),
    includes: zod_1.z.array(zod_1.z.string().max(120)).min(1).max(20),
    image: zod_1.z.string().max(200),
});
exports.starterKitsSchema = zod_1.z.object({
    kits: zod_1.z.array(exports.kitSchema).min(1).max(20),
});
// ── Legal / rich-text page (markdown) ────────────────────────────────────────
exports.legalPageSchema = zod_1.z.object({
    title: zod_1.z.string().max(120),
    effective_date: zod_1.z.string().max(40),
    body_md: zod_1.z.string().max(50_000),
});
// ── Plain page (about, contact) ───────────────────────────────────────────────
exports.plainPageSchema = zod_1.z.object({
    title: zod_1.z.string().max(120),
    body_md: zod_1.z.string().max(50_000),
});
// ── Global settings ──────────────────────────────────────────────────────────
exports.globalSchema = zod_1.z.object({
    company_name: zod_1.z.string().max(120),
    reg_number: zod_1.z.string().max(40),
    vat_number: zod_1.z.string().max(40),
    email_info: zod_1.z.string().email(),
    email_b2b: zod_1.z.string().email(),
    phone: zod_1.z.string().max(30),
    address: zod_1.z.string().max(200),
    domain: zod_1.z.string().max(100),
    slogan: zod_1.z.string().max(160),
});
// ── Registry: maps page_key → schema ─────────────────────────────────────────
exports.PAGE_REGISTRY = {
    homepage: { title: "Homepage", schema: exports.homepageSchema },
    "starter-kits": { title: "Starter Kits", schema: exports.starterKitsSchema },
    "legal-terms": { title: "Terms & Conditions", schema: exports.legalPageSchema },
    "legal-privacy": { title: "Privacy Policy", schema: exports.legalPageSchema },
    "legal-shipping": { title: "Shipping Info", schema: exports.legalPageSchema },
    "legal-returns": { title: "Returns Policy", schema: exports.legalPageSchema },
    "legal-cookies": { title: "Cookie Policy", schema: exports.legalPageSchema },
    about: { title: "About Us", schema: exports.plainPageSchema },
    contact: { title: "Contact", schema: exports.plainPageSchema },
    global: { title: "Global Settings", schema: exports.globalSchema },
};
function validateContent(pageKey, content) {
    const entry = exports.PAGE_REGISTRY[pageKey];
    if (!entry)
        return { ok: false, error: `Unknown page key: ${pageKey}` };
    const result = entry.schema.safeParse(content);
    if (!result.success)
        return { ok: false, error: result.error.message };
    return { ok: true };
}
//# sourceMappingURL=schemas.js.map