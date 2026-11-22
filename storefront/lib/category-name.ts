/**
 * category-name.ts — SSoT locale-aware category-name derivation.
 *
 * The ONE place that decides which name field to show per locale. Pure and
 * dependency-free (no message JSON, no category-tree) so it is client-safe and
 * unit-testable in isolation, and so EVERY consumer routes through it:
 *   - SubcategoryCarousel, MegaMenu, HomepageShell (client)
 *   - haru-leht, category-tree.nodeName (server)
 *
 * Prefer name_et only when locale=et AND a translation exists; otherwise fall
 * back to name_en. Guards against EN category names leaking onto ET pages
 * (regression 8291d480, 2026-04-20 "EN-only cleanup" hardcoded name_en).
 *
 * Re-exported from "@/lib/i18n" for import ergonomics.
 */
export function categoryName(
  node: { name_en: string; name_et?: string | null },
  locale: string,
): string {
  if (locale === "et" && node.name_et) return node.name_et
  return node.name_en
}
