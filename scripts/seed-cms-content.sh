#!/usr/bin/env bash
# Seed CMS tables with current hardcoded content.
# Safe to re-run — uses INSERT ... ON CONFLICT DO NOTHING (skip if exists).
# Pass --force to overwrite existing content.
set -euo pipefail

FORCE=0
for arg in "$@"; do [[ "$arg" == "--force" ]] && FORCE=1; done

set +u
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
# Try worktree root, then main repo root (worktrees live inside .claude/worktrees/)
for env_candidate in "${SCRIPT_DIR}/../.env" "${SCRIPT_DIR}/../../../.env" "/home/brrr/brrr-xlmarket/.env"; do
  [[ -f "$env_candidate" ]] && source "$env_candidate" && break
done
set -u

export PGPASSWORD="${PGPASSWORD:-}"
PG="psql -h ${PGHOST:-localhost} -p ${PGPORT:-5435} -U ${PGUSER:-xlmarket} -d ${PGDATABASE:-xlmarket} -v ON_ERROR_STOP=1"

CONFLICT="ON CONFLICT (page_key) DO NOTHING"
[[ $FORCE -eq 1 ]] && CONFLICT="ON CONFLICT (page_key) DO UPDATE SET content = EXCLUDED.content, updated_at = NOW(), updated_by = 'seed'"

echo "Seeding CMS pages... (force=$FORCE)"

# ─── HOMEPAGE ──────────────────────────────────────────────────────────────
$PG <<SQL
INSERT INTO cms_page (id, page_key, title, schema_ver, content, updated_at, updated_by)
VALUES ('homepage', 'homepage', 'Homepage', 1, \$\$
{
  "slides": [
    {
      "badge": "Starter Kits",
      "title": "Six businesses. Six turnkey kits.",
      "text": "Café, auto shop, barber, print, bakery, cleaning. One order, one invoice, one delivery. €2,799 – €12,900, VAT incl.",
      "cta": "See starter kits",
      "ctaHref": "LOCALE/alustajale",
      "bg": "/images/hero-1.png"
    },
    {
      "badge": "B2B Account",
      "title": "Net-30, volume pricing, real humans.",
      "text": "Dedicated account manager, custom equipment bundles, priority shipping, 2-year extended warranty.",
      "cta": "Request a quote",
      "ctaHref": "LOCALE/arikliendile",
      "bg": "/images/hero-2.png"
    },
    {
      "badge": "Service",
      "title": "Your machines should last a decade.",
      "text": "Basic, Pro, Enterprise plans. Quarterly maintenance, 48h priority repair, replacement units while we fix yours.",
      "cta": "Choose a service plan",
      "ctaHref": "LOCALE/hooldus",
      "bg": "/images/hero-3.png"
    }
  ],
  "promos": [
    {"tag":"Starter Kit","tagTone":"amber","title":"Café & Coffee Shop","sub":"From €8,499 — espresso, fridge, prep, shelving","image":"/images/cat-01-horeca-food-service.png","href":"LOCALE/alustajale#cafe"},
    {"tag":"Starter Kit","tagTone":"amber","title":"Barber Shop","sub":"From €3,499 — chairs, mirrors, tools, sterilizer","image":"/images/cat-18-salon-spa-wellness.png","href":"LOCALE/alustajale#barber"},
    {"tag":"Starter Kit","tagTone":"amber","title":"Bakery & Pastry","sub":"From €7,499 — oven, proofer, mixer, display","image":"/images/cat-01-kitchen.png","href":"LOCALE/alustajale#bakery"},
    {"tag":"Deal","tagTone":"red","title":"Deal of the week","sub":"Hand-picked discounts refreshed every Monday.","bg":"linear-gradient(135deg, #7F1D1D 0%, #DC2626 100%)","href":"LOCALE/kategooriad?deals=1"},
    {"tag":"New","tagTone":"green","title":"Pay in 3 with Montonio","sub":"Split your order into 3 interest-free payments at checkout.","bg":"linear-gradient(135deg, #064E3B 0%, #059669 100%)","href":"LOCALE/arikliendile#financing"},
    {"tag":"Beta","tagTone":"navy","title":"AI product finder","sub":"Describe what you need — we match the right tool and variant.","bg":"linear-gradient(135deg, #0F1B2D 0%, #334155 100%)","href":"LOCALE/otsing"}
  ],
  "nav_short_names": {
    "renewable-energy": "Energy",
    "horeca-food-service": "HoReCa",
    "automotive-workshop": "Automotive",
    "cleaning-janitorial": "Cleaning",
    "crafts-sewing-printing": "Crafts",
    "salon-spa-wellness": "Salon",
    "health-medical-supply": "Medical",
    "fitness-sports-recreation": "Sport",
    "boating-camping-outdoor": "Outdoor",
    "music-instruments": "Music",
    "pets-animal-supplies": "Pets",
    "backyard-landscaping-farm": "Garden",
    "construction-building": "Construction",
    "safety-security": "Safety",
    "hand-power-tools": "Tools",
    "warehousing-material-handling": "Warehousing",
    "welding-metalworking": "Welding",
    "laser-cnc-digital-fabrication": "CNC",
    "industrial-scientific": "Industrial",
    "hvac-climate-control": "HVAC",
    "electrical-energy": "Electrical",
    "building-materials": "Materials",
    "fuel-lubrication-fluid": "Fuel",
    "kids-playgrounds": "Kids",
    "kitchen": "Kitchen"
  }
}
\$\$::jsonb, NOW(), 'seed')
$CONFLICT;
SQL
echo "  ✓ homepage"

# ─── STARTER KITS ──────────────────────────────────────────────────────────
$PG <<SQL
INSERT INTO cms_page (id, page_key, title, schema_ver, content, updated_at, updated_by)
VALUES ('starter-kits', 'starter-kits', 'Starter Kits', 1, \$\$
{
  "kits": [
    {
      "slug": "cafe",
      "name": "Café & Coffee Shop",
      "priceFrom": 8499,
      "icon": "Coffee",
      "tagline": "Open your doors with a real espresso bar, not a compromise.",
      "includes": ["2-group espresso machine + grinder","Refrigerator & display cooler","Prep table with sink","Bar shelving & storage","Ice machine","Cups, carafes, tampers, knock-box"],
      "image": "cat-01-horeca-food-service.png"
    },
    {
      "slug": "auto",
      "name": "Auto Workshop",
      "priceFrom": 12900,
      "icon": "Wrench",
      "tagline": "2-post lift, diagnostics, and the tooling a real garage runs on.",
      "includes": ["2-post vehicle lift (4t)","50L air compressor","Tyre changer + wheel balancer","Mechanic tool chest","Impact wrench & air tools","OBD-II diagnostic scanner"],
      "image": "cat-12-automotive-workshop.png"
    },
    {
      "slug": "barber",
      "name": "Barber Shop",
      "priceFrom": 3499,
      "icon": "Scissors",
      "tagline": "Four chairs, one mirror wall, every tool you actually use.",
      "includes": ["4 hydraulic barber chairs","Mirror stations & styling counters","UV sterilizer cabinet","Backwash shampoo sink","Tool trolley & waiting bench","Clippers, scissors, capes"],
      "image": "cat-18-salon-spa-wellness.png"
    },
    {
      "slug": "print",
      "name": "Print & Sign Shop",
      "priceFrom": 5999,
      "icon": "Printer",
      "tagline": "Heat press, cutter, DTF — the stack that pays its invoice in month one.",
      "includes": ["Heat press 40×60 cm","Vinyl cutter 720mm","DTF printer + curing oven","Transfer tapes & inks","Design tablet & workstation","Heavy-duty workbench"],
      "image": "cat-07-printing-packaging-signage.png"
    },
    {
      "slug": "bakery",
      "name": "Bakery & Pastry",
      "priceFrom": 7499,
      "icon": "UtensilsCrossed",
      "tagline": "Deck oven, planetary mixer, proofer — production from day one.",
      "includes": ["Convection or deck oven","Planetary mixer (20L)","Dough sheeter & proofer","Refrigerated prep table","Display case + bakery racks","Stainless steel prep surface"],
      "image": "cat-01-kitchen.png"
    },
    {
      "slug": "cleaning",
      "name": "Cleaning Service",
      "priceFrom": 2799,
      "icon": "Sparkles",
      "tagline": "Floor scrubber, vacuum, pressure washer — contracts start paying fast.",
      "includes": ["Industrial wet/dry vacuum 80L","Single-disc floor scrubber","Carpet extractor","Pressure washer","Supply carts & mop systems","PPE kits × 4 + sanitizers"],
      "image": "cat-15-cleaning-janitorial.png"
    }
  ]
}
\$\$::jsonb, NOW(), 'seed')
$CONFLICT;
SQL
echo "  ✓ starter-kits"

# ─── GLOBAL SETTINGS ───────────────────────────────────────────────────────
$PG <<SQL
INSERT INTO cms_page (id, page_key, title, schema_ver, content, updated_at, updated_by)
VALUES ('global', 'global', 'Global Settings', 1, \$\$
{
  "company_name": "Roland Kaubandus OÜ",
  "reg_number": "",
  "vat_number": "",
  "email_info": "info@xlmarket.eu",
  "email_b2b": "b2b@xlmarket.eu",
  "phone": "",
  "address": "",
  "domain": "xlmarket.store",
  "slogan": "Professional Tools, Half the Price"
}
\$\$::jsonb, NOW(), 'seed')
$CONFLICT;
SQL
echo "  ✓ global"

# ─── LEGAL: TERMS ──────────────────────────────────────────────────────────
$PG <<SQL
INSERT INTO cms_page (id, page_key, title, schema_ver, content, updated_at, updated_by)
VALUES ('legal-terms', 'legal-terms', 'Terms & Conditions', 1, \$\$
{
  "title": "Terms & Conditions",
  "effective_date": "28 March 2026",
  "body_md": "## 1. General\n\nThe online store xlmarket.eu is owned and operated by Roland Kaubandus OÜ (hereinafter \"Seller\"). These terms apply to all purchases made through xlmarket.eu.\n\n## 2. Prices\n\nAll prices include VAT (24%). Prices are in euros (EUR). The Seller reserves the right to change prices at any time without prior notice. The price at the time of order placement is binding.\n\n## 3. Ordering\n\n- Add the desired products to your shopping cart\n- Enter your delivery address and contact details\n- Select a shipping method\n- Complete the payment\n- An order confirmation will be sent to your email\n\nThe sales contract is considered concluded upon receipt of payment.\n\n## 4. Payment\n\nPayments are processed through the Montonio payment service. Supported payment methods: Swedbank, SEB, LHV, Luminor, and Coop bank links, as well as card payments (Visa, Mastercard).\n\n## 5. Shipping\n\nDelivery time is 5-15 business days. We ship across Estonia. For more details, see our [Shipping Info](/en/tarne).\n\n## 6. Right of Withdrawal\n\nConsumers have the right to return goods within 14 days of receipt without providing a reason. For more details, see our [Returns Policy](/en/tagastamine).\n\n## 7. Warranty\n\nThe Seller is responsible for the conformity of sold goods to the contract terms. Consumers have the right to file complaints within 2 years from the date of delivery.\n\n## 8. Dispute Resolution\n\nPlease send complaints to info@xlmarket.eu. We will resolve complaints within 15 days. In case of a dispute, the consumer has the right to contact the Estonian Consumer Protection and Technical Regulatory Authority (TTJA): [ttja.ee](https://ttja.ee).\n\n## 9. Contact\n\nRoland Kaubandus OÜ\nEmail: info@xlmarket.eu"
}
\$\$::jsonb, NOW(), 'seed')
$CONFLICT;
SQL
echo "  ✓ legal-terms"

# ─── LEGAL: PRIVACY ────────────────────────────────────────────────────────
$PG <<SQL
INSERT INTO cms_page (id, page_key, title, schema_ver, content, updated_at, updated_by)
VALUES ('legal-privacy', 'legal-privacy', 'Privacy Policy', 1, \$\$
{
  "title": "Privacy Policy",
  "effective_date": "28 March 2026",
  "body_md": "## 1. Data Controller\n\nRoland Kaubandus OÜ (\"we\", \"us\") is the controller of your personal data collected through xlmarket.eu.\n\n## 2. Data We Collect\n\n- Name, email, phone, delivery address (when placing an order)\n- Payment data (processed by Montonio — we do not store card details)\n- Browsing data (cookies, analytics)\n\n## 3. Purpose of Processing\n\n- Order fulfilment and delivery\n- Customer support\n- Fraud prevention\n- Analytics and site improvement\n\n## 4. Data Retention\n\nOrder data is retained for 7 years per Estonian accounting law. Analytics data is retained for 13 months.\n\n## 5. Data Sharing\n\nWe share data with: Montonio (payment), delivery partners, Google Analytics. We do not sell your data.\n\n## 6. Cookies\n\nWe use essential and analytics cookies. See our [Cookie Policy](/en/kupsised).\n\n## 7. Your Rights\n\nYou have the right to access, correct, delete, or export your data. Contact info@xlmarket.eu.\n\n## 8. Contact\n\nRoland Kaubandus OÜ\nEmail: info@xlmarket.eu"
}
\$\$::jsonb, NOW(), 'seed')
$CONFLICT;
SQL
echo "  ✓ legal-privacy"

# ─── LEGAL: SHIPPING ───────────────────────────────────────────────────────
$PG <<SQL
INSERT INTO cms_page (id, page_key, title, schema_ver, content, updated_at, updated_by)
VALUES ('legal-shipping', 'legal-shipping', 'Shipping Info', 1, \$\$
{
  "title": "Shipping Info",
  "effective_date": "28 March 2026",
  "body_md": "## Delivery Times\n\nOrders are typically delivered within 5-15 business days from order confirmation. Most items ship from EU warehouses.\n\n## Shipping Cost\n\n- Standard delivery: €4.99\n- Free shipping on orders over €199\n\n## Carriers\n\nWe ship via DPD, Omniva, and SmartPost depending on package size.\n\n## Tracking\n\nA tracking link is emailed to you once your order ships.\n\n## Delivery Area\n\nWe currently ship across Estonia. International shipping available on request — contact info@xlmarket.eu.\n\n## Large Items\n\nHeavy machinery (lifts, compressors, large catering equipment) ships via freight courier with scheduled delivery. You will be contacted to arrange a suitable time."
}
\$\$::jsonb, NOW(), 'seed')
$CONFLICT;
SQL
echo "  ✓ legal-shipping"

# ─── LEGAL: RETURNS ────────────────────────────────────────────────────────
$PG <<SQL
INSERT INTO cms_page (id, page_key, title, schema_ver, content, updated_at, updated_by)
VALUES ('legal-returns', 'legal-returns', 'Returns Policy', 1, \$\$
{
  "title": "Returns Policy",
  "effective_date": "28 March 2026",
  "body_md": "## 14-Day Right of Withdrawal\n\nConsumers have the right to return goods within 14 days of receipt without providing a reason, in accordance with EU consumer law.\n\n## Conditions\n\n- Item must be in original condition and packaging\n- Include all accessories and documentation\n- Contact us before returning: info@xlmarket.eu\n\n## How to Return\n\n1. Email info@xlmarket.eu with your order number and reason\n2. We will send return instructions within 2 business days\n3. Ship the item back at your cost (unless the item is defective)\n4. Refund processed within 14 days of receiving the return\n\n## Defective Items\n\nIf an item arrives damaged or defective, contact us within 48 hours with photos. We will arrange return shipping at no cost to you and issue a full refund or replacement.\n\n## Exceptions\n\nItems that cannot be returned: custom-ordered equipment, hygiene items (used), consumables once opened."
}
\$\$::jsonb, NOW(), 'seed')
$CONFLICT;
SQL
echo "  ✓ legal-returns"

# ─── LEGAL: COOKIES ────────────────────────────────────────────────────────
$PG <<SQL
INSERT INTO cms_page (id, page_key, title, schema_ver, content, updated_at, updated_by)
VALUES ('legal-cookies', 'legal-cookies', 'Cookie Policy', 1, \$\$
{
  "title": "Cookie Policy",
  "effective_date": "28 March 2026",
  "body_md": "## What Are Cookies\n\nCookies are small text files stored on your device when you visit our site. They help us remember your preferences and understand how you use xlmarket.eu.\n\n## Cookies We Use\n\n| Cookie | Purpose | Duration |\n|--------|---------|----------|\n| session | Cart and login state | Session |\n| _ga | Google Analytics | 13 months |\n| cookie_consent | Your consent choice | 12 months |\n\n## Essential Cookies\n\nEssential cookies are required for the site to function (cart, checkout). They cannot be disabled.\n\n## Analytics Cookies\n\nWe use Google Analytics to understand site usage. You can opt out below or via [Google's opt-out tool](https://tools.google.com/dlpage/gaoptout).\n\n## Managing Cookies\n\nYou can clear cookies at any time in your browser settings. Disabling non-essential cookies will not affect your ability to shop.\n\n## Contact\n\nQuestions? Email info@xlmarket.eu."
}
\$\$::jsonb, NOW(), 'seed')
$CONFLICT;
SQL
echo "  ✓ legal-cookies"

# ─── ABOUT ─────────────────────────────────────────────────────────────────
$PG <<SQL
INSERT INTO cms_page (id, page_key, title, schema_ver, content, updated_at, updated_by)
VALUES ('about', 'about', 'About Us', 1, \$\$
{
  "title": "About Us",
  "body_md": "## Who We Are\n\nXL Market (Roland Kaubandus OÜ) is an Estonian e-commerce company specialising in professional tools, catering equipment, and machinery for small and medium-sized businesses.\n\nWe are the authorised representative of VEVOR in Estonia and Spain, bringing professional-grade equipment at half the price of traditional distributors.\n\n## Our Mission\n\n**Professional Tools, Half the Price.** We believe every entrepreneur deserves access to proper equipment without compromising their cash flow on day one.\n\n## What We Offer\n\n- 16,000+ SKUs across 18 product categories\n- Turnkey starter kits for 6 business types\n- B2B accounts with Net-30 terms and volume pricing\n- Service plans for maintenance and priority repair\n\n## Contact\n\nEmail: info@xlmarket.eu\nB2B inquiries: b2b@xlmarket.eu"
}
\$\$::jsonb, NOW(), 'seed')
$CONFLICT;
SQL
echo "  ✓ about"

# ─── CONTACT ───────────────────────────────────────────────────────────────
$PG <<SQL
INSERT INTO cms_page (id, page_key, title, schema_ver, content, updated_at, updated_by)
VALUES ('contact', 'contact', 'Contact', 1, \$\$
{
  "title": "Contact",
  "body_md": "## Get in Touch\n\n**General enquiries:** info@xlmarket.eu\n\n**B2B & bulk orders:** b2b@xlmarket.eu\n\n**Response time:** We aim to reply within 1 business day.\n\n## Company Details\n\nRoland Kaubandus OÜ\nEmail: info@xlmarket.eu\n\n## Returns & Warranty\n\nFor return requests and warranty claims, see our [Returns Policy](/en/tagastamine) or email info@xlmarket.eu with your order number."
}
\$\$::jsonb, NOW(), 'seed')
$CONFLICT;
SQL
echo "  ✓ contact"

echo ""
echo "✓ All CMS pages seeded successfully."
