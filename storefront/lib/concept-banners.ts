/**
 * CONCEPT_CATEGORY_IMAGES — atmosphere-pildid concept_only kategooriatele.
 *
 * Outlet ja selle L2-d on taxonomy.yaml-is concept_only=true → gen-tree sunnib
 * image_source=none (image_path=null), et vältida eksitavat päritud toote-pilti
 * ("Outlet = turbiinid?"). Vaikimisi renderdub Outleti Lucide-ikoon (BadgePercent).
 *
 * See map annab neile dedicated AI atmosphere-stseeni (Osa 58). Ükski väärtus ei
 * tohi olla toote-pilt — ainult käsitsi tehtud kontseptuaalne stseen. Väike
 * literaal, EI impordi category-tree.generated.json-i (PERF-C1, CategoryThumb ohutu).
 *
 * Kasutus (fallback image_path ette):
 *   const img = CONCEPT_CATEGORY_IMAGES[handle] ?? node.image_path
 */
export const CONCEPT_CATEGORY_IMAGES: Record<string, string> = {
  "v4-outlet": "/images/cat-atmosphere/outlet-open-box.webp", // üld-soodus (L1)
  "v4-outlet-rikutud-pakend": "/images/cat-atmosphere/outlet-damaged-pkg.webp", // Kahjustatud pakend
  "v4-outlet-defektiga-toode": "/images/cat-atmosphere/outlet-defect.webp", // Defektiga toode
  "v4-outlet-leiunurk": "/images/cat-atmosphere/outlet-finds.webp", // Leiunurk
}
