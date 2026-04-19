export const locales = ['et', 'en'] as const
export type Locale = (typeof locales)[number]
export const defaultLocale: Locale = 'et'

export function isValidLocale(locale: string): locale is Locale {
  return locales.includes(locale as Locale)
}

import etMessages from '@/messages/et.json'
import enMessages from '@/messages/en.json'

const dictionaries: Record<Locale, Record<string, any>> = {
  et: etMessages,
  en: enMessages,
}

export function getTranslations(locale: Locale): Record<string, any> {
  return dictionaries[locale] || dictionaries[defaultLocale]
}

// Helper to get nested translation by dot path
export function t(translations: Record<string, any>, key: string): string {
  const parts = key.split('.')
  let current: any = translations
  for (const part of parts) {
    if (current == null) return key
    current = current[part]
  }
  return typeof current === 'string' ? current : key
}

// Build localized href - prepends /{locale} to path
export function localePath(locale: Locale, path: string): string {
  const clean = translateLocalePath(path, locale)
  return clean
}

// Route segment for category pages. Both locales use the Estonian segment
// `kategooriad` — the storefront ships English UI text but EE routing slugs
// (matches /toode, /ostukorv, /tellimus). The English plural `categories` is
// kept ONLY as a legacy 308 redirect in next.config.ts to honour external
// inbound links. Generating `/en/categories/...` from internal links would
// force every clicked link through that redirect hop and inflate redirect
// chains in crawlers, so we always emit `/kategooriad/`.
const CATEGORY_SEGMENT: Record<Locale, string> = {
  et: "kategooriad",
  en: "kategooriad",
}

export function categoryPath(locale: Locale, handle?: string): string {
  return `/${locale}/${CATEGORY_SEGMENT[locale]}${handle ? `/${handle}` : ""}`
}

export function branchPath(locale: Locale, slug: string): string {
  return `/${locale}/haru/${slug}`
}

export function translateLocalePath(path: string, locale: Locale): string {
  const withoutLocale = path.replace(/^\/(et|en)(?=\/|$)/, "")
  const translated = withoutLocale
    .replace(/^\/categories(?=\/|$)/, `/${CATEGORY_SEGMENT[locale]}`)
    .replace(/^\/kategooriad(?=\/|$)/, `/${CATEGORY_SEGMENT[locale]}`)
  return `/${locale}${translated || ""}`
}
