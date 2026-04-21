/**
 * Shared content types. Mirror of backend/src/modules/cms/schemas.ts (inferred)
 * and storefront/lib/cms.ts — kept in sync by hand.
 */

export type Slide = {
  badge: string
  title: string
  text: string
  cta: string
  ctaHref: string
  bg: string
}

export type TagTone = "amber" | "red" | "green" | "navy"

export type Promo = {
  tag: string
  tagTone: TagTone
  title: string
  sub: string
  image?: string
  bg?: string
  href: string
}

export type HomepageContent = {
  slides: Slide[]
  promos: Promo[]
  nav_short_names: Record<string, string>
}

export type Kit = {
  slug: string
  name: string
  priceFrom: number
  icon: string
  tagline: string
  includes: string[]
  image: string
}

export type StarterKitsContent = {
  kits: Kit[]
}

export type LegalPageContent = {
  title: string
  effective_date: string
  body_md: string
}

export type PlainPageContent = {
  title: string
  body_md: string
}

export type GlobalContent = {
  company_name: string
  reg_number: string
  vat_number: string
  email_info: string
  email_b2b: string
  phone: string
  address: string
  domain: string
  slogan: string
}

export const TAG_TONES: TagTone[] = ["amber", "red", "green", "navy"]

export const KIT_ICONS = ["Coffee", "Wrench", "Scissors", "Printer", "UtensilsCrossed", "Sparkles"] as const
