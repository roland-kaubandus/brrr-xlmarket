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
  UtensilsCrossed, Building2, Wrench, Sparkles, ShieldCheck, Armchair,
  Scissors, Dumbbell, Ship, HeartPulse, Music, Battery, Palette,
  PawPrint, Baby, Trees, Car, Warehouse,
  type LucideIcon,
} from "lucide-react"

export const V3_ICONS: Record<string, LucideIcon> = {
  "horeca-food-service": UtensilsCrossed,
  "construction-building": Building2,
  "hand-power-tools": Wrench,
  "cleaning-janitorial": Sparkles,
  "safety-security-workwear": ShieldCheck,
  "office-commercial-interiors": Armchair,
  "salon-spa-wellness": Scissors,
  "fitness-sports-games": Dumbbell,
  "boating-camping-outdoor": Ship,
  "health-medical-supply": HeartPulse,
  "music-entertainment": Music,
  "renewable-energy-batteries": Battery,
  "crafts-sewing-printing": Palette,
  "pets-wildlife-clinic": PawPrint,
  "kids-playgrounds": Baby,
  "backyard-landscaping-farm": Trees,
  "automotive-workshop": Car,
  "warehousing-material-handling": Warehouse,
}
