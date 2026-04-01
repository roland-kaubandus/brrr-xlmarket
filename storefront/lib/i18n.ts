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
  // Strip any existing locale prefix
  const clean = path.replace(/^\/(et|en)(\/|$)/, '/')
  return '/' + locale + (clean === '/' ? '' : clean)
}
