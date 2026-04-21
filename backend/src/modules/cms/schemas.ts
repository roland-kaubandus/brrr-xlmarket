import { z } from "zod"

// ── Slide (homepage hero carousel) ──────────────────────────────────────────
export const slideSchema = z.object({
  badge: z.string().max(40),
  title: z.string().max(100),
  text: z.string().max(300),
  cta: z.string().max(60),
  ctaHref: z.string().max(200),
  bg: z.string().max(200),
})

// ── Promo card (homepage grid) ───────────────────────────────────────────────
export const promoSchema = z.object({
  tag: z.string().max(30),
  tagTone: z.enum(["amber", "red", "green", "navy"]),
  title: z.string().max(80),
  sub: z.string().max(200),
  image: z.string().max(200).optional(),
  bg: z.string().max(300).optional(),
  href: z.string().max(200),
})

// ── Homepage ─────────────────────────────────────────────────────────────────
export const homepageSchema = z.object({
  slides: z.array(slideSchema).min(1).max(6),
  promos: z.array(promoSchema).min(1).max(12),
  nav_short_names: z.record(z.string(), z.string()),
})
export type HomepageContent = z.infer<typeof homepageSchema>

// ── Starter kit ──────────────────────────────────────────────────────────────
export const kitSchema = z.object({
  slug: z.string().max(40),
  name: z.string().max(80),
  priceFrom: z.number().int().positive(),
  icon: z.string().max(40),       // Lucide icon name, e.g. "Coffee"
  tagline: z.string().max(200),
  includes: z.array(z.string().max(120)).min(1).max(20),
  image: z.string().max(200),
})

export const starterKitsSchema = z.object({
  kits: z.array(kitSchema).min(1).max(20),
})
export type StarterKitsContent = z.infer<typeof starterKitsSchema>

// ── Legal / rich-text page (markdown) ────────────────────────────────────────
export const legalPageSchema = z.object({
  title: z.string().max(120),
  effective_date: z.string().max(40),
  body_md: z.string().max(50_000),
})
export type LegalPageContent = z.infer<typeof legalPageSchema>

// ── Plain page (about, contact) ───────────────────────────────────────────────
export const plainPageSchema = z.object({
  title: z.string().max(120),
  body_md: z.string().max(50_000),
})
export type PlainPageContent = z.infer<typeof plainPageSchema>

// ── Global settings ──────────────────────────────────────────────────────────
export const globalSchema = z.object({
  company_name: z.string().max(120),
  reg_number: z.string().max(40),
  vat_number: z.string().max(40),
  email_info: z.string().email(),
  email_b2b: z.string().email(),
  phone: z.string().max(30),
  address: z.string().max(200),
  domain: z.string().max(100),
  slogan: z.string().max(160),
})
export type GlobalContent = z.infer<typeof globalSchema>

// ── Registry: maps page_key → schema ─────────────────────────────────────────
export const PAGE_REGISTRY: Record<string, { title: string; schema: z.ZodTypeAny }> = {
  homepage:          { title: "Homepage",          schema: homepageSchema },
  "starter-kits":   { title: "Starter Kits",      schema: starterKitsSchema },
  "legal-terms":    { title: "Terms & Conditions", schema: legalPageSchema },
  "legal-privacy":  { title: "Privacy Policy",     schema: legalPageSchema },
  "legal-shipping": { title: "Shipping Info",      schema: legalPageSchema },
  "legal-returns":  { title: "Returns Policy",     schema: legalPageSchema },
  "legal-cookies":  { title: "Cookie Policy",      schema: legalPageSchema },
  about:            { title: "About Us",           schema: plainPageSchema },
  contact:          { title: "Contact",            schema: plainPageSchema },
  global:           { title: "Global Settings",    schema: globalSchema },
}

export function validateContent(pageKey: string, content: unknown): { ok: boolean; error?: string } {
  const entry = PAGE_REGISTRY[pageKey]
  if (!entry) return { ok: false, error: `Unknown page key: ${pageKey}` }
  const result = entry.schema.safeParse(content)
  if (!result.success) return { ok: false, error: result.error.message }
  return { ok: true }
}
