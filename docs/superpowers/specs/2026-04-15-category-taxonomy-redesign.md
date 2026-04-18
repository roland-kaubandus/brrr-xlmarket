# Category Taxonomy Redesign — XLMarket.eu

**Date:** 2026-04-15
**Status:** Approved
**Mockup:** https://xlmarket.store/mockups/category-taxonomy-v2.html

---

## Problem

Current category tree has 31 L1 categories, 250 L2, 942 L3 (3413 total). Many L1s are too small (Paint: 1 L2, Smart Home: 1 L2, Holiday Decorations: 2 L2). Others overlap (Outdoors vs Sports & Outdoors). No B2B-oriented grouping despite B2B being the primary audience.

## Solution

Consolidate to **24 L1 categories** organized by B2B buyer persona and industry sector. All ~16,000 products must be remapped.

## The 24 L1 Categories

| # | L1 Category | Absorbs From | Primary B2B Buyer |
|---|-------------|-------------|-------------------|
| 1 | Kitchen & Catering Equipment | Kitchen, Appliances[kitchen] | Restaurant/hotel owner |
| 2 | Hand & Power Tools | Tools | Contractor, tradesperson |
| 3 | Automotive & Workshop | Automotive | Auto mechanic, fleet mgr |
| 4 | Welding & Metalworking | Tools[welding] | Metal fabricator |
| 5 | Laser, CNC & Digital Fabrication | Appliances[crafts], Industrial[cutting] | Maker, sign shop |
| 6 | Printing, Packaging & Production | Industrial[subset], Storage[office] | Small manufacturer |
| 7 | Building & Construction | Building Materials, Hardware, Lumber, Doors & Windows, Paint, Flooring | Builder, renovator |
| 8 | Electrical, Lighting & Solar | Electrical, Lighting, Smart Home | Electrician, installer |
| 9 | Plumbing, Pumps & Water Systems | Plumbing, Bath | Plumber |
| 10 | HVAC & Climate Control | Heating, Venting & Cooling | HVAC tech, facility mgr |
| 11 | Material Handling & Lifting | Building Materials[handling] | Warehouse ops |
| 12 | Storage & Warehouse | Storage & Organization | Warehouse, retail |
| 13 | Safety, PPE & Security | Safety Equipment, Workwear | Safety officer |
| 14 | Outdoor Power & Agriculture | Outdoors[power] | Landscaper, farmer |
| 15 | Cleaning & Janitorial | Cleaning, Appliances[floor care] | Cleaning company |
| 16 | Salon, Spa & Wellness | Health & Wellness, Furniture[salon] | Salon/gym owner |
| 17 | Furniture & Home | Furniture, Home Decor, Window Treatments, Holiday Decorations | Property mgr, interior |
| 18 | Sports, Fitness & Recreation | Sports & Outdoors[fitness], Playground Sets | Gym, school, sports club |
| 19 | Outdoor Living & Patio | Outdoors[patio, pools, cooking] | Hospitality, landscape |
| 20 | Pet Supplies & Animal Care | Outdoors[pets] | Pet shop, farm |
| 21 | Boating & Marine | Sports & Outdoors[boating], Building Materials[docks] | Marina, boat owner |
| 22 | Camping & Outdoor Recreation | Sports & Outdoors[camping, fishing, hunting] | Outdoor retailer |
| 23 | Musical Instruments & Entertainment | Musical Instruments, Sports[games] | Music school, venue |
| 24 | Generators & Portable Power | HVAC[generators], Electrical[solar] | Construction, off-grid |

## L2 Structure Summary

~118 L2 subcategories total. Full breakdown in mockup HTML. Key L2 counts per L1:

- Kitchen & Catering: 6 L2
- Hand & Power Tools: 7 L2
- Building & Construction: 8 L2 (largest — absorbed 6 old L1s)
- Automotive & Workshop: 6 L2
- Electrical, Lighting & Solar: 6 L2
- All others: 3-6 L2 each

## Eliminated L1s (merged)

| Old L1 | Products | Merged Into | Reason |
|--------|----------|-------------|--------|
| Paint | ~59 | Building & Construction | 1 L2, too small |
| Smart Home | ~15 | Electrical, Lighting & Solar | 1 L2, too small |
| Holiday Decorations | ~30 | Furniture & Home | 2 L2, seasonal niche |
| Lumber & Composites | ~95 | Building & Construction | 2 L2 (decking, fencing) |
| Doors & Windows | ~16 | Building & Construction | Awnings dominate |
| Window Treatments | ~10 | Furniture & Home | 3 curtain rod SKUs |
| Hardware | ~150 | Building & Construction | Fasteners, chains |
| Flooring | ~89 | Building & Construction | Trade category |
| Bath | ~50 | Plumbing, Pumps & Water | Fixtures = plumbing |
| Other | 0 | Eliminated | Empty |

## Promoted to L1 (were L2 or scattered)

| New L1 | Was | Reason |
|--------|-----|--------|
| Welding & Metalworking | Tools > Welding L2 | 420+ products, kõrge väärtus, selge B2B |
| Laser, CNC & Digital Fabrication | Appliances > Crafts L2 | Turu-uuringu #2 prioriteet, maker segment |
| Material Handling & Lifting | Building Materials > L2 | Warehouse B2B vajab top-level access |
| Generators & Portable Power | HVAC > L2 | Selge ostja (ehitus, off-grid), oma kategooria |
| Boating & Marine | Sports & Outdoors > L2 | 180+ toodet, Läänemere turg |

## Implementation Notes

1. **Medusa category tree** needs rebuilding — create new L1s first, then re-parent existing L2/L3
2. **MeiliSearch** reindex after category changes
3. **Product mapping** — each existing product's `category_handles` must be remapped
4. **Frontend** — navigation, mega menu, category pages all reference category handles
5. **SEO redirects** — old category URLs must 301 to new ones
6. **Feed sync** — import script needs updated category mapping

## Design Decisions

- B2B-first but accessible to prosumers/DIY
- English category names (store is bilingual ET/EN)
- Aligned with market research: HoReCa, laser/CNC, printing/packaging as top priorities
- Grainger/RS Components style: function-first, no lifestyle language
- 24 L1 is clean: 8 columns x 3 rows on desktop homepage
