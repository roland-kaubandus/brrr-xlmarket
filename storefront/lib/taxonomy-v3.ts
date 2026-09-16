// XLMarket taxonomy L1 → Lucide icon map.
// Authority for L1 list: backend/src/data/taxonomy.yaml (18 slugs).
// Tree shape + metadata: storefront/lib/category-tree.generated.json.
//
// This file ONLY maps L1 slug → icon. Any other consumer that needs
// the taxonomy list, names, or metadata must read category-tree.generated.json.
//
// Audit 2026-04-20 C8 removed the legacy TAXONOMY_V3 array (22 entries,
// stale since 2026-04-19 when we migrated to 18 L1).

import {
  Hammer, Wrench, ChefHat, WashingMachine, Sofa, Trees, Tent, Car,
  Dumbbell, Construction, Lightbulb, Droplets, Warehouse, Paperclip,
  Printer, MonitorSmartphone, Music, PartyPopper, Palette, Baby,
  PawPrint, Tractor, Heart, Stethoscope, HardHat, BadgePercent,
  type LucideIcon,
} from "lucide-react"

// v4-L1 ikoon-kaardistus (25 L1, v4-handle võtmega — kood teeb V3_ICONS[handle]).
// Kaardistus kinnitatud Tarmo poolt 2026-09-16 (glossary-stiilis eelvaade).
// Outlet = soodus-osakond (eraldi, ei kuulu 25 sekka).
export const V3_ICONS: Record<string, LucideIcon> = {
  "v4-outlet": BadgePercent,
  "v4-tooriistad-ja-tarvikud": Hammer,
  "v4-garaaziseadmed-ja-autoremont": Wrench,
  "v4-suurkoogiseadmed": ChefHat,
  "v4-kodumasinad-ja-kodutehnika": WashingMachine,
  "v4-moobel-ja-sisustus": Sofa,
  "v4-aed-ja-aiatehnika": Trees,
  "v4-telgid-varjualused-ja-kasvuhooned": Tent,
  "v4-autovaruosad-ja-tarvikud": Car,
  "v4-sport-ja-vaba-aeg": Dumbbell,
  "v4-ehitus-ja-remont": Construction,
  "v4-elektritarvikud-ja-valgustus": Lightbulb,
  "v4-santehnika-kute-ja-ventilatsioon": Droplets,
  "v4-ladu-hoiustamine-ja-pakendamine": Warehouse,
  "v4-buroo-ja-kontoritarvikud": Paperclip,
  "v4-reklaami-truki-ja-graveerimisseadmed": Printer,
  "v4-elektroonika-ja-multimeedia": MonitorSmartphone,
  "v4-muusika-ja-helitehnika": Music,
  "v4-peoinventar-ja-dekoratsioonid": PartyPopper,
  "v4-hobi-ja-kasitoo": Palette,
  "v4-lastekaubad-ja-manguasjad": Baby,
  "v4-lemmikloomatarbed": PawPrint,
  "v4-pollumajandus-ja-loomakasvatus": Tractor,
  "v4-tervis-hooldus-ja-ilu": Heart,
  "v4-meditsiin-labor-ja-teadus": Stethoscope,
  "v4-tooriied-ja-isikukaitse": HardHat,
}
