#!/usr/bin/env node
/**
 * newsletter-logic.test.mjs — PUHAS loogika-test (DB-vaba). Impordib logic.ts OTSE
 * (Node 22 type-stripping). Käivita: node backend/scripts/newsletter-logic.test.mjs
 * Väljub koodiga 1 kui mõni test kukub (CI/eel-commit värav).
 */
import assert from "node:assert/strict"
import {
  CONSENT_TEXT_VERSION,
  CONSENT_SOURCES,
  CONSENT_STATUSES,
  normalizeEmail,
  isValidEmail,
  normalizeLocale,
  genToken,
  genId,
  normalizeIp,
  normalizeUa,
  buildListUnsubscribeHeaders,
} from "../src/modules/newsletter/logic.ts"

let pass = 0
let fail = 0
function t(name, fn) {
  try {
    fn()
    pass++
  } catch (e) {
    fail++
    console.error(`❌ ${name}\n   ${e.message}`)
  }
}

// --- Konstandid ---
t("CONSENT_TEXT_VERSION on mittetühi string", () => {
  assert.equal(typeof CONSENT_TEXT_VERSION, "string")
  assert.ok(CONSENT_TEXT_VERSION.length > 0)
})
t("allikad + staatused sisaldavad oodatuid", () => {
  assert.ok(CONSENT_SOURCES.includes("footer"))
  assert.ok(CONSENT_SOURCES.includes("checkout"))
  assert.ok(CONSENT_STATUSES.includes("pending"))
  assert.ok(CONSENT_STATUSES.includes("confirmed"))
  assert.ok(CONSENT_STATUSES.includes("unsubscribed"))
})

// --- normalizeEmail ---
t("normalizeEmail trim + lowercase", () => {
  assert.equal(normalizeEmail("  Tarmo@Naissaar.EU "), "tarmo@naissaar.eu")
})
t("normalizeEmail käsitleb null/undefined", () => {
  assert.equal(normalizeEmail(null), "")
  assert.equal(normalizeEmail(undefined), "")
})

// --- isValidEmail ---
t("isValidEmail aktsepteerib korrektse", () => {
  assert.equal(isValidEmail("a@b.ee"), true)
})
t("isValidEmail keeldub vigastest", () => {
  assert.equal(isValidEmail(""), false)
  assert.equal(isValidEmail("ab.ee"), false)
  assert.equal(isValidEmail("a@b"), false)
  assert.equal(isValidEmail("a @b.ee"), false)
  assert.equal(isValidEmail(null), false)
  assert.equal(isValidEmail(123), false)
})
t("isValidEmail keeldub liiga pikast (>254)", () => {
  assert.equal(isValidEmail("a".repeat(250) + "@b.ee"), false)
})

// --- normalizeLocale ---
t("normalizeLocale 2-täheline, muidu et", () => {
  assert.equal(normalizeLocale("EN"), "en")
  assert.equal(normalizeLocale("et"), "et")
  assert.equal(normalizeLocale("xyz"), "et")
  assert.equal(normalizeLocale(""), "et")
  assert.equal(normalizeLocale(null), "et")
})

// --- genToken / genId ---
t("genToken URL-ohutu + unikaalne", () => {
  const a = genToken()
  const b = genToken()
  assert.notEqual(a, b)
  assert.match(a, /^[A-Za-z0-9_-]+$/) // base64url
  assert.ok(a.length >= 40)
})
t("genId prefiksiga + unikaalne", () => {
  const a = genId()
  const b = genId()
  assert.notEqual(a, b)
  assert.match(a, /^nlc_[0-9a-f]{32}$/)
})

// --- normalizeIp ---
t("normalizeIp võtab XFF esimese aadressi", () => {
  assert.equal(normalizeIp("1.2.3.4, 5.6.7.8"), "1.2.3.4")
})
t("normalizeIp fallback kui XFF puudub", () => {
  assert.equal(normalizeIp(null, "9.9.9.9"), "9.9.9.9")
})
t("normalizeIp null kui kõik tühi", () => {
  assert.equal(normalizeIp(null, null), null)
  assert.equal(normalizeIp("", ""), null)
})
t("normalizeIp cap 64 märki", () => {
  const long = "a".repeat(100)
  assert.equal(normalizeIp(long).length, 64)
})

// --- normalizeUa ---
t("normalizeUa cap 512 + null tühjale", () => {
  assert.equal(normalizeUa(null), null)
  assert.equal(normalizeUa("  "), null)
  assert.equal(normalizeUa("Mozilla/5.0"), "Mozilla/5.0")
  assert.equal(normalizeUa("x".repeat(1000)).length, 512)
})

// --- buildListUnsubscribeHeaders (RFC 2369 + 8058) ---
t("päised tühjad kui URL puudub", () => {
  assert.deepEqual(buildListUnsubscribeHeaders(null), {})
  assert.deepEqual(buildListUnsubscribeHeaders(""), {})
})
t("päised URL-iga (ilma mailto)", () => {
  const h = buildListUnsubscribeHeaders("https://xlmarket.ee/api/newsletter/unsubscribe?token=x")
  assert.equal(h["List-Unsubscribe"], "<https://xlmarket.ee/api/newsletter/unsubscribe?token=x>")
  assert.equal(h["List-Unsubscribe-Post"], "List-Unsubscribe=One-Click")
})
t("päised URL + mailto (mailto esimesena)", () => {
  const h = buildListUnsubscribeHeaders("https://xlmarket.ee/u?token=x", "loobu@xlmarket.ee")
  assert.equal(
    h["List-Unsubscribe"],
    "<mailto:loobu@xlmarket.ee?subject=unsubscribe>, <https://xlmarket.ee/u?token=x>"
  )
})

console.log(`\n${fail === 0 ? "✅" : "🔴"} newsletter-logic: ${pass} õnnestus, ${fail} kukkus`)
process.exit(fail === 0 ? 0 : 1)
