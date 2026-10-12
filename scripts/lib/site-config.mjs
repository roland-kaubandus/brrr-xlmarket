/**
 * Saidi domeeni / URL-i / e-posti SSoT — ÜKS SEADISTUS (HARD RULE #5).
 *
 * Kõik feed-skriptid (sitemap, Facebook, osta.ee) loevad domeeni/STORE_URL-i SIIT,
 * mitte igasse faili kõvasti kirjutatuna. Env muutuja kirjutab vaikeväärtuse üle;
 * vaikeväärtus = .ee (domeen migreeriti .eu → .ee).
 *
 * Domeeni-cutover või tulevane domeen → muuda SIIN (või sea env), MITTE igas failis.
 * Storefront kasutab sama rolli jaoks CMS global SSoT-d (lib/cms-fallback/global.json).
 */
export const SITE_DOMAIN = process.env.SITE_DOMAIN || "xlmarket.ee"
export const STORE_URL = process.env.STORE_URL || `https://${SITE_DOMAIN}`
export const EMAIL_INFO = process.env.EMAIL_INFO || `info@${SITE_DOMAIN}`
export const EMAIL_B2B = process.env.EMAIL_B2B || `b2b@${SITE_DOMAIN}`
export const COMPANY_NAME = process.env.COMPANY_NAME || "Roland Kaubandus OÜ"
