# EN MASTER sisu — audit + 30 näidist + kuluhinnang

**Kuupäev:** 2026-11-18  ·  **Allikas:** staging DB (`product`, 19632 published)

## Lühikokkuvõte (TL;DR)

EN-master = natiivne ingliskeelne sisu (VEVOR-feed), mis on **SSoT kõigile tõlgetele** (arhitektuuri-otsus: EN-master, mitte ET-master). Enne tõlke-allikaks võtmist on vaja puhastust.

**Peamine leid — varasem eeldus "EN = native, tasuta" EI PIDA paika:**

- `title` on VEVOR keyword-stuffitud (**94% >120 tähe**, keskmine 180).

- `description` on toores VEVOR-dump: "VEVOR " + kogu title + `<br/>`-feature-list + spec-dump (**84% HTML-tagidega, 99.5% sisaldab "vevor"**).

- `sanitized_description` on **eksitav nimi** — EI ole puhas (18047/18063 ikka `<br>`, 18016 "vevor").

- **Ainus juba-puhas EN-väli on `selling_points`** (korralik proosa, 18795 tootel).

→ EN title + description tuleb LLM-iga puhastada/ümber-genereerida. selling_points on allikana kasutatav.

## 1. Audit — EN-natiivväljade seis

| Metrika | Arv | % (19632-st) |
|---|---:|---:|
| `title` tühi | 0 | 0.0% |
| `title` sisaldab 'VEVOR' | 40 | 0.2% |
| `title` pikkus >120 tähe | 18435 | 93.9% |
| `description` tühi | 0 | 0.0% |
| `description` HTML-tag (`<...>`) | 16569 | 84.4% |
| `description` sisaldab 'vevor' | 19527 | 99.5% |
| `description` CSS-junk (font/margin/nbsp) | 0 | 0.0% |
| `selling_points` olemas (proosa) | 18795 | 95.7% |
| `sanitized_description` olemas | 18063 | 92.0% |
| `sanitized_description` ikka HTML-ga | 18047 | 91.9% |
| `rich_description` olemas | 17224 | 87.7% |
| `original_title` olemas (= juba tõlgitud kunagi) | 1495 | 7.6% |

**Keskmised pikkused:** title 180 tähte (~45 tok) · description 571 (~143 tok) · selling_points 1336 (~334 tok).  
**Kogu EN-sisu maht:** 39,848,090 tähte ≈ 9.96M tokenit.

## 2. 30 näidist (juhuvalim, `ORDER BY md5(id)`)

`⏎` = algne `<br/>`. Lühendatud 200 tähele. Veerg **HTML**/**VEVOR** = kas toores `description` sisaldab.

### 1. `prod_01KY5F35W4DJT2RD4W178NXK48`  ·  _Tools > Hand Tools > Clamps > F-Clamps_  ·  title 194 tähte

- **TITLE (EN raw):** Bar Clamps for Woodworking, 8-Pack, 15.24 cm and 30.48 cm, with Spring Clamps, One-Handed Clamp/Spreader, 70 kg Load Limit, Quick Release, Self-Locking Design, for Wood Working and Metal Working
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Bar Clamps for Woodworking, 8-Pack, 15.24 cm and 30.48 cm, with Spring Clamps, One-Handed Clamp/Spreader, 70 kg Load Limit, Quick Release, Self-Locking Design, for Wood Working and Metal Working
- **SELLING_POINTS (EN):** ["Precise Sizing: These bar clamps for woodworking come in multiple sizes, with well-designed jaw openings and throat depths for easy handling of both small and large workpieces", "154 lbs Clamping Fo

### 2. `prod_01KNXXP4MR249K1YGS8VZK6X92`  ·  _Kitchen > Tableware & Bar > Serveware > Chafing Dish_  ·  title 192 tähte

- **TITLE (EN raw):** Chafing Dish Buffet Set, 8 Qt 6 Pack, Stainless Steel Chafer with 6 Full Size Pans, Rectangle Catering Warmer Server with Lid Water Pan Stand Fuel Holder, for Weddings Parties Banquets, Silver
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Chafing Dish Buffet Set, 8 Qt 6 Pack, Stainless Steel Chafer with 6 Full Size Pans, Rectangle Catering Warmer Server with Lid Water Pan Stand Fuel Holder, for Weddings Parties Banquets, Silver<b
- **SELLING_POINTS (EN):** ["Elegant Silver Finish: The modern silver color of this chafing dish warmer adds a sophisticated touch to any event. Whether it's a buffet, party, or wedding, this sleek design enhances your table se

### 3. `prod_01KNXXSS14X0ERD9A7NKT8G8YZ`  ·  _Workwear > Outerwear > Hoodies & Sweatshirts_  ·  title 192 tähte

- **TITLE (EN raw):** Men Pullover Hoodie, 3X-Large Size, Fleece Long Sleeve Comfy Casual Basic Pullover Hooded Sweatshirt, Warm & Skin-friendly, Practical & Trendy, Black Hoodie with Large Pocket for Fall & Winter
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Men Pullover Hoodie, 3X-Large Size, Fleece Long Sleeve Comfy Casual Basic Pullover Hooded Sweatshirt, Warm & Skin-friendly, Practical & Trendy, Black Hoodie with Large Pocket for Fall & Winter<b
- **SELLING_POINTS (EN):** ["Sizes for Everyone: This pullover hoodie comes in S to XXXL, giving you the freedom to pick your ideal fit. No matter your shape or style, it’s made to help you feel comfy and look effortlessly cool

### 4. `prod_01KNXXH15TVETEAFETKDADR79D`  ·  _Plumbing > Water Pumps > Pump Accessories > Cast Iron Circulator Pump_  ·  title 197 tähte

- **TITLE (EN raw):** LPS25-6S-180 Hot Water Recirculating Pump, 220V, 92W 60LPM Hot Water Circulation Pump, 38 mm(1.5") Threaded NPT 3-Speed Circulator Pump, Quiet Operation Circulator Pump for Home Water Heater System
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR LPS25-6S-180 Hot Water Recirculating Pump, 220V, 92W 60LPM Hot Water Circulation Pump, 38 mm(1.5") Threaded NPT 3-Speed Circulator Pump, Quiet Operation Circulator Pump for Home Water Heater Sys
- **SELLING_POINTS (EN):** ["High Compatibility Design: Specifications: 25-60/180. Engineered specifically for underfloor heating systems, this cast iron circulator pump offers a maximum flow rate of 60 L/min and a head of 6 m.

### 5. `prod_01KNXXPEJTDCQCEGPQP4EQMSHQ`  ·  _Tools > Woodworking Tools > Universal Surface Grinding Dust Shroud_  ·  title 189 tähte

- **TITLE (EN raw):** Cutting Dust Shroud for Angle Grinders, Universal 4-5 in Angle Grinder Dust Shroud with 6 Clamping Washers, Adjustable Cutting Depth, Connect to Vacuum Cleaner, for Wood Concrete Wall Stone
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Cutting Dust Shroud for Angle Grinders, Universal 4-5 in Angle Grinder Dust Shroud with 6 Clamping Washers, Adjustable Cutting Depth, Connect to Vacuum Cleaner, for Wood Concrete Wall Stone ⏎ 
- **SELLING_POINTS (EN):** ["Fit 4-5in Grinding Wheel: Our cutting dust shroud is universal for 100-125mm cutting machines, compatible with 90% of major brands. It can be installed on 4-5 inch cutting machines, making it suitab

### 6. `prod_01KPJXF9AD6Z11Z86BEYF7EJCJ`  ·  _Storage & Organization > Storage Containers > Storage Bins > Folding Plastic Crate_  ·  title 189 tähte

- **TITLE (EN raw):** Plastic Collapsible Storage Bins with Lids, 65L 3 Packs, Stackable Folding Storage Crates with Handles, Holds 38 kg Per Bin, Heavy Duty Containers, Space-Saving Baskets, for Home Organizing
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Plastic Collapsible Storage Bins with Lids, 65L 3 Packs, Stackable Folding Storage Crates with Handles, Holds 38 kg Per Bin, Heavy Duty Containers, Space-Saving Baskets, for Home Organizing ⏎ 
- **SELLING_POINTS (EN):** ["65L Extra-Large Capacity: Holds shopping, camping gear, and everyday household items with ease. These collapsible storage bins with lid provide roomy, all-in-one organization so a single crate handl

### 7. `prod_01KNXX7EWX9XA53Z5Y97MSA9F8`  ·  _Bath > Showers > Steam Showers > Steam Shower Generators_  ·  title 155 tähte

- **TITLE (EN raw):** Steam Generator 4KW Steam Room Generator Digital Display Steam Generator Sauna Steam Generator for Home Commercial Steam Generator kit Steam Bath Generator
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Steam Generator 4KW Steam Room Generator Digital Display Steam Generator Sauna Steam Generator for Home Commercial Steam Generator kit Steam Bath Generator ⏎ Stainless Steel ⏎ TC-135 Control
- **SELLING_POINTS (EN):** ["【MULTIPLE BENEFITS】 - Sauna originated in Finland, but people enjoy the steam bath has two thousand years of history. Make a steam spa not only promotes the body's blood circulation, relaxing muscle

### 8. `prod_01KPJX9T6M9V71GBN3QJG8JXA0`  ·  _Heating, Venting & Cooling > Mini Split Air Conditioners > Mini Split Parts > Air Conditioner Copper Pipe_  ·  title 193 tähte

- **TITLE (EN raw):** 30.5m Mini Split Line Set, 6.4 & 9.5mm OD AC Copper Tubing Pipe, 3/8 White PE Thickened Insulated Coil with Flared Nuts, Strapping Tapes, for Mini Split Air Conditioner HVAC or Heat Pump System
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR 30.5m Mini Split Line Set, 6.4 & 9.5mm OD AC Copper Tubing Pipe, 3/8 White PE Thickened Insulated Coil with Flared Nuts, Strapping Tapes, for Mini Split Air Conditioner HVAC or Heat Pump System<
- **SELLING_POINTS (EN):** ["Premium 100ft Copper Lines: Made with 99.9% Pure C12200 Copper and Thick-Wall for bend-resistant, leak-free installation of your mini split line set even when routing through walls", "Extreme Reliab

### 9. `prod_01KNXXBXM5JKFQBZZ9YZWV6MCP`  ·  _Lumber & Composites > Decking > Deck Railings > Cable Railings_  ·  title 193 tähte

- **TITLE (EN raw):** 30 Pack Invisible Cable Railing kit, T316 Stainless Steel 3.2mm Invisible Receiver and Swage Stud End for Cable Railing, Swage Tensioner 3.2mm for Wood/Metal Post, Cable Railing Hardware, Black
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR 30 Pack Invisible Cable Railing kit, T316 Stainless Steel 3.2mm Invisible Receiver and Swage Stud End for Cable Railing, Swage Tensioner 3.2mm for Wood/Metal Post, Cable Railing Hardware, Black<
- **SELLING_POINTS (EN):** ["Size Compatibility: This railing kit is designed for 1/8\" steel cable installation and can be used with washers to support angled installations. It is suitable for both 2x2-inch wooden and metal po

### 10. `prod_01M5K4MPP7N2FNZZAS6FEDPZKC`  ·  _Automotive > Shop Equipment > Engine Hoists > Manual Gear Chain Hoists_  ·  title 180 tähte

- **TITLE (EN raw):** Manual Chain Hoist, 1/2 Ton 1100 lbs Capacity 10 FT Come Along, G80 Galvanized Carbon Steel with Double-Pawl Brake, Auto Chain Leading & 360° Rotation Hook, for Garage Factory Dock
- **DESCRIPTION (EN raw)** [HTML=False, VEVOR=True]: VEVOR Manual Chain Hoist, 1/2 Ton 1100 lbs Capacity 10 FT Come Along, G80 Galvanized Carbon Steel with Double-Pawl Brake, Auto Chain Leading & 360° Rotation Hook, for Garage Factory Dock Alloy Steel F
- **SELLING_POINTS (EN):** ["Outstanding Load Capacity: This chain hoist is made of solid carbon steel and has excellent impact resistance and oxidation resistance, designed specifically for long-term use. With simple structure

### 11. `prod_01KNXXS3F1DGT8GAAR5P4TC2YD`  ·  _Heating, Venting & Cooling > Heaters > Heater Accessories > Diesel Heater Accessories_  ·  title 193 tähte

- **TITLE (EN raw):** 8V Glow Plug Repair Kit, Parking Diesel Heater Glow Ignition Plug Kit with Atomization Mesh, Compatible with 2KW 5KW 8KW Diesel Air Heater Models, Diesels Heaters Accessories for Car Truck Boat
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR 8V Glow Plug Repair Kit, Parking Diesel Heater Glow Ignition Plug Kit with Atomization Mesh, Compatible with 2KW 5KW 8KW Diesel Air Heater Models, Diesels Heaters Accessories for Car Truck Boat<
- **SELLING_POINTS (EN):** ["Complete Maintenance Kit: Our glow plug repair kit provides all essential parts you need: one glow plug, one removal socket, one gasket, and one atomizing mesh. It delivers reliable performance and 

### 12. `prod_01KY5F0DBB8BDJN7P5YPSBEZXB`  ·  _Outdoors > Pet Supplies & Wildlife > Livestock Scratch Brushes_  ·  title 194 tähte

- **TITLE (EN raw):** Livestock Scratching Brush, 4PCS Goat Scratcher Brush Post with 16 Screws, 430 x 100 mm Cow Scratcher for Back Itch Relief, Massage Grooming Scratch Tool for Horse Cattle Sheep Pig, Green & Blue
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Livestock Scratching Brush, 4PCS Goat Scratcher Brush Post with 16 Screws, 430 x 100 mm Cow Scratcher for Back Itch Relief, Massage Grooming Scratch Tool for Horse Cattle Sheep Pig, Green & Blue
- **SELLING_POINTS (EN):** ["Professional Scratching Brush: This livestock scratching brush is designed for cows, horses, goats, and other small livestock. It helps relieve itching while improving overall comfort and well-being

### 13. `prod_01KNXXC6QD7RXJVVJZHMJ0AD2D`  ·  _Outdoors > Outdoor Cooking > Outdoor Cookers > Fryer Accessories > Fryer Grease Bucket_  ·  title 190 tähte

- **TITLE (EN raw):** Fryer Grease Bucket, 10 Gal Oil Disposal Caddy with Caster Base, Carbon Steel Rust-Proof Coating, Oil Transport Container with Lid, Lock Clips, Filter Bag for Hot Cooking Oil Filtering, Gray
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Fryer Grease Bucket, 10 Gal Oil Disposal Caddy with Caster Base, Carbon Steel Rust-Proof Coating, Oil Transport Container with Lid, Lock Clips, Filter Bag for Hot Cooking Oil Filtering, Gray<br/
- **SELLING_POINTS (EN):** ["Massive 10-Gallon Capacity: With dimensions of 21.1\"/535 mm in diameter and 14.6\"/370 mm in height, this fryer grease bucket packs a punch! Say goodbye to frequent trash can emptying—it can hold u

### 14. `prod_01KNXX9JQPARH1NKQ61QYAD7NR`  ·  _Automotive > Shop Equipment > Engine Hoists > Portable Power Electric Hoist_  ·  title 70 tähte

- **TITLE (EN raw):** 2-in-1 Portable Electric Hoist Power Winch 499 kg Wired Remote Control
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR 2-in-1 Portable Electric Hoist Power Winch 499 kg Wired Remote Control ⏎ Plug and Play ⏎ Control at Your Fingertips ⏎ Powerful Performance ⏎ Sturdy Steel Wire Rope ⏎ Multifunctional Ho
- **SELLING_POINTS (EN):** ["2-in-1 Control Methods: Meet our versatile electric hoist with 2 control modes. Get hands-on with manual control for those quick, short-range pulls. The 19 ft wired remote is your trusty sidekick fo

### 15. `prod_01KNXX9NFHPTW69YZGFAD0WZS6`  ·  _Plumbing > Pipe & Fittings > Pipe > AL PEX Tube_  ·  title 189 tähte

- **TITLE (EN raw):** PEX-AL-PEX Tube, 100 m, 16 mm Diameter Aluminum-Plastic Composite Pipe Oxygen Barrier Radiant Floor PEX Pipe, 2 mm Thickness Radiant Heat Floor Plumbing Inner Aluminum Layer PEX Tubing Pipe
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR PEX-AL-PEX Tube, 100 m, 16 mm Diameter Aluminum-Plastic Composite Pipe Oxygen Barrier Radiant Floor PEX Pipe, 2 mm Thickness Radiant Heat Floor Plumbing Inner Aluminum Layer PEX Tubing Pipe ⏎ 
- **SELLING_POINTS (EN):** ["High-Quality Materials, Lasting Performance: When it comes to durability and reliability, our AL PEX tube is second to none! Crafted from top-notch PEX and aluminum materials, our pipe can withstand

### 16. `prod_01KPJVFSDR9VB6CTYETT6FZDTA`  ·  _Lumber & Composites > Fencing & Gates > Hardware Cloth Fencing > Plastic Mesh Fence_  ·  title 184 tähte

- **TITLE (EN raw):** Temporary Fence with Posts, 0.9 x 15m Plastic Mesh Fencing, Garden Safety Fences Netting with Double-Spike Stakes & Guy Ropes, Temporary Fence for Dogs, Chickens, Plants, Outdoor Yards
- **DESCRIPTION (EN raw)** [HTML=False, VEVOR=True]: VEVOR Temporary Fence with Posts, 0.9 x 15m Plastic Mesh Fencing, Garden Safety Fences Netting with Double-Spike Stakes & Guy Ropes, Temporary Fence for Dogs, Chickens, Plants, Outdoor Yards Reinforce
- **SELLING_POINTS (EN):** ["Premium Safety Fence: This VEVOR 3 x 49.2 ft (0.9 x 15 m) temporary fence with posts provides wide coverage for gardens, yards, and pet activity zones. Quickly set up a secure temporary fence for do

### 17. `prod_01KPJVC64P65YCZJ6VE5EA6ZEF`  ·  _Tools > Power Tools > Metalworking Tools > Metal Fabrication Accessories > Linear Guide Rail_  ·  title 187 tähte

- **TITLE (EN raw):** Linear Rail Kit, SFC25, 2Pcs 1000 mm (39.4 inch) Linear Motion Guide Rails and 4Pcs Bearing Slide Blocks, for DIY Engraving Machine Lathe Milling Machine Slides, DIY Training Rocker Plate
- **DESCRIPTION (EN raw)** [HTML=False, VEVOR=True]: VEVOR Linear Rail Kit, SFC25, 2Pcs 1000 mm (39.4 inch) Linear Motion Guide Rails and 4Pcs Bearing Slide Blocks, for DIY Engraving Machine Lathe Milling Machine Slides, DIY Training Rocker Plate Comple
- **SELLING_POINTS (EN):** ["SFC25 Linear Rail Kit: Includes two 39.37 in (1000 mm) linear rails and four slide blocks. It is compatible with DIY engraving machine/lathe/milling machine slides, DIY training rocker plate, CNC ma

### 18. `prod_01KNXXPQHV2X7C7HSRGRRF7VEP`  ·  _Industrial & Scientific > Lab & Scientific Products > Lab Instruments & Equipment > Lab Equipment > Tool Sanitizer_  ·  title 191 tähte

- **TITLE (EN raw):** Nail Tool Cleaning Machine, 12L Large Capacity, Multi-Functional Tool Cabinet Cleaner Box with Timer Setting, Tempered Glass Door, 185nm Wavelength, for Labs, Home, Nail Salons, Beauty Salons
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Nail Tool Cleaning Machine, 12L Large Capacity, Multi-Functional Tool Cabinet Cleaner Box with Timer Setting, Tempered Glass Door, 185nm Wavelength, for Labs, Home, Nail Salons, Beauty Salons<br
- **SELLING_POINTS (EN):** ["Efficient Cleaning: The nail tool cleaning machine uses a 185nm wavelength to deeply clean surfaces, ensuring thorough disinfection with no blind spots, effectively avoiding cross-contamination and 

### 19. `prod_01KPJVD76AECCMFQ6DSFENBQ9Z`  ·  _Tools > Hand Tools > Measuring Tools > Micrometer Set_  ·  title 185 tähte

- **TITLE (EN raw):** Depth Gauge, Depth Micrometer Digital Electronic Indicator 0-558.8 mm Measuring Range, 0.01 mm Resolution, Precision Unit Conversion with 4 Anvils, Measuring Tool for Groove, Step, Hole
- **DESCRIPTION (EN raw)** [HTML=False, VEVOR=True]: VEVOR Depth Gauge, Depth Micrometer Digital Electronic Indicator 0-558.8 mm Measuring Range, 0.01 mm Resolution, Precision Unit Conversion with 4 Anvils, Measuring Tool for Groove, Step, Hole High-Pre
- **SELLING_POINTS (EN):** ["High-Precision Micrometer Set: This depth micrometer delivers accurate, reliable linear readings with a 1–2 in/25.4–50.8 mm range, ±0.001 in/±0.02 mm accuracy, and 0.0005 in/0.01 mm resolution. Idea

### 20. `prod_01M3QXAMS0ZJJQGBNC9VR4ZC5X`  ·  _Tools > Power Tools > Metalworking Tools > Shop Presses_  ·  title 194 tähte

- **TITLE (EN raw):** 6 Ton Shop Press H-Frame Garage Benchtop Bottle Jack Hydraulic Press, 4-Level Adjustable Height, Movable Stamping Plate, Heavy-Duty Steel for Bending, Straightening, Pressing U-Joints & Bearings
- **DESCRIPTION (EN raw)** [HTML=False, VEVOR=True]: VEVOR 6 Ton Shop Press H-Frame Garage Benchtop Bottle Jack Hydraulic Press, 4-Level Adjustable Height, Movable Stamping Plate, Heavy-Duty Steel for Bending, Straightening, Pressing U-Joints & Bearings
- **SELLING_POINTS (EN):** ["Strong Hydraulic Force: Equipped with a 6-ton hydraulic bottle jack (max load), this shop press delivers strong foce for bending, straightening, pressing, and stamping tasks. Easily remove and insta

### 21. `prod_01KNXXJYD4773WGNFZ5ZABB56N`  ·  _Storage & Organization > Laundry Room Storage > Washer and Dryer Countertop_  ·  title 192 tähte

- **TITLE (EN raw):** Washer Dryer Countertop with 2-Tier Shelf, 54" x 27" Wooden Washer and Dryer Countertop with Anti-Slip Pads, Water-Resistant Laundry Topper Cover for Laundry Room Organization and Storage, Oak
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Washer Dryer Countertop with 2-Tier Shelf, 54" x 27" Wooden Washer and Dryer Countertop with Anti-Slip Pads, Water-Resistant Laundry Topper Cover for Laundry Room Organization and Storage, Oak<b
- **SELLING_POINTS (EN):** ["Multifunctional Hook: This washer dryer countertop features side hooks, perfect for hanging everyday items like cloths, lint rollers, and more. Convenient to access and keeps everything organized, e

### 22. `prod_01KNXXE4Y3XYHD6KCW096KN1PF`  ·  _Outdoors > Pet Supplies & Wildlife > Farm Animal Supplies > Horse Supplies > Livestock Stand_  ·  title 171 tähte

- **TITLE (EN raw):** Livestock Trimming Stand, Goat & Sheep Stand 9.37-12.8 inch Adjustable Height 0-5.4 inch Width, Metal Goat Milking and Shearing Stand Attachment Nose Loop Headpiece, Black
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Livestock Trimming Stand, Goat & Sheep Stand 9.37-12.8 inch Adjustable Height 0-5.4 inch Width, Metal Goat Milking and Shearing Stand Attachment Nose Loop Headpiece, Black ⏎ Farm Goat Stand<br
- **SELLING_POINTS (EN):** ["High-Quality Material & Safety Design: Crafted from high-quality iron pipes and coated with spray paint, our livestock stand enhances durability and rust resistance. Specially designed smooth edges 

### 23. `prod_01KPJVFD57MBR0V09M96V6EZRG`  ·  _Electrical > Batteries > Rechargeable Battery Chargers > Starting & Energy Storage Battery Charger_  ·  title 192 tähte

- **TITLE (EN raw):** Smart Battery Charger, 30A, 6V 12V 24V LiFePO4 Lead-Acid (Gel/AGM) Lithium Car Battery Charger, with LCD Display, Trickle Charging Maintainer Desulfator, for Car, Boat, Motorcycle, Lawn Mowers
- **DESCRIPTION (EN raw)** [HTML=False, VEVOR=True]: VEVOR Smart Battery Charger, 30A, 6V 12V 24V LiFePO4 Lead-Acid (Gel/AGM) Lithium Car Battery Charger, with LCD Display, Trickle Charging Maintainer Desulfator, for Car, Boat, Motorcycle, Lawn Mowers P
- **SELLING_POINTS (EN):** ["30A Battery Charger: This smart battery charger supports 6V/12V/24V lead-acid batteries (Wet/Gel/MF/CA/EFB/AGM/Calcium) and 12V/24V LiFePO4 batteries. Up to 30A output with adjustable voltage/curren

### 24. `prod_01KNXXHQPF4S47F6Q180KX8GP6`  ·  _Sports & Outdoors > Kids Toys > Kids Activity Toys > Balance Stepping Stones For Kids_  ·  title 191 tähte

- **TITLE (EN raw):** Balance Stepping Stones for Kids, 5 PCS, Up to 220 lbs, Non-Slip Toddlers Sensory Stepping Stones, Obstacle Course Coordination Game Toys Indoor or Outdoor Play for Children Aged 3 4 5 6 7 8+
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Balance Stepping Stones for Kids, 5 PCS, Up to 220 lbs, Non-Slip Toddlers Sensory Stepping Stones, Obstacle Course Coordination Game Toys Indoor or Outdoor Play for Children Aged 3 4 5 6 7 8+<br
- **SELLING_POINTS (EN):** ["5-Piece Sensory Toy Set: Balance stepping stones with playful geometric designs and vibrant colors captivate kids' attention and spark their curiosity. Beyond basic balance training, mix and match w

### 25. `prod_01KNXXPJ4W1TQ1EAQ56VHPK47J`  ·  _Storage & Organization > Laundry Room Storage > Clothes Drying Racks > Standing Clothes Drying Rack_  ·  title 188 tähte

- **TITLE (EN raw):** Clothes Drying Rack, 2-Tier Foldable Laundry Dryer Rack with Sock Clips & 31 Dry Rods, Metal Height Adjustable Drying Racks for Outdoor & Indoor, Free-Standing & Space-Saving Hanger, White
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Clothes Drying Rack, 2-Tier Foldable Laundry Dryer Rack with Sock Clips & 31 Dry Rods, Metal Height Adjustable Drying Racks for Outdoor & Indoor, Free-Standing & Space-Saving Hanger, White ⏎ F
- **SELLING_POINTS (EN):** ["Large Capacity: Spacious two-tier double-wing design with 31 hanging rods provides ample hanging and drying space for clothes, pants, scarves, towels, socks, and blankets", "Premium Material: Made f

### 26. `prod_01KNXXQ7S0069SFAFT4FPT8683`  ·  _Storage & Organization > Garage Storage > Garage Wall Organization > Pegboards & Accessories > Pegboard Display Stand_  ·  title 183 tähte

- **TITLE (EN raw):** Pegboard Display Stand, 43 x 33 cm Tabletop Pegboard Display Stand with 15 Hooks, Thickened Cold-Rolled Steel Peg Board Panel for Grocery, Retail Store and Jewelry Shop, Black (1 PCS)
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Pegboard Display Stand, 43 x 33 cm Tabletop Pegboard Display Stand with 15 Hooks, Thickened Cold-Rolled Steel Peg Board Panel for Grocery, Retail Store and Jewelry Shop, Black (1 PCS) ⏎ 1-Piec
- **SELLING_POINTS (EN):** ["Storage & Display: This pegboard display stand creates an organized space, keeping items neat and clearly displayed for efficient management, whether for tools, accessories, or products", "Sturdy an

### 27. `prod_01KNXXN6R8PZ5AV3JYYPN89MDR`  ·  _Lumber & Composites > Fencing & Gates > Chain Link Fencing > Chain Link Fence Gates_  ·  title 189 tähte

- **TITLE (EN raw):** Chain Link Fence Gate, 32 x 46 in, Adjustable Chain Link Fence Panel, Fit 2-6 ft (W) x 4 ft (H) Garden Fence Gate Opening, Rust-Resistant Galvanized Fencing Gate for Farm Posts Not Included
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Chain Link Fence Gate, 32 x 46 in, Adjustable Chain Link Fence Panel, Fit 2-6 ft (W) x 4 ft (H) Garden Fence Gate Opening, Rust-Resistant Galvanized Fencing Gate for Farm Posts Not Included ⏎ 
- **SELLING_POINTS (EN):** ["High-Quality Materials: The frame of the chain link fence gate is made from durable galvanized steel, ensuring exceptional durability and rust resistance in all weather conditions.", "Security & Pri

### 28. `prod_01KNXXEFQ347VWY75BZM47RXAM`  ·  _Storage & Organization > Office Supplies > Blueprint Storage Rack_  ·  title 191 tähte

- **TITLE (EN raw):** Blueprint Storage Rack, 12 Slots Blueprint Holder with Wheels, Mobile Metal Blueprint Storage Cart for Map Poster Architectural Construction Plan, Roll File Organizer for Home, Office, School
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR Blueprint Storage Rack, 12 Slots Blueprint Holder with Wheels, Mobile Metal Blueprint Storage Cart for Map Poster Architectural Construction Plan, Roll File Organizer for Home, Office, School<br
- **SELLING_POINTS (EN):** ["12 Storage Slots: This blueprint storage rack features 12 slots of 3.5\"x3.5\"(90x90 mm) each, providing ample and organized storage space for your blueprints, construction plans, and various docume

### 29. `prod_01KNXX7Y2BYZ0PNRZ340MCSXXC`  ·  _Tools > Power Tools > Saws > Table Saws > Woodworking Table Saws_  ·  title 80 tähte

- **TITLE (EN raw):** 25.4 cm Table Saw w/ Stand Electric Cutting Machine 4800RPM 63.5 cm Rip Capacity
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: VEVOR 25.4 cm Table Saw w/ Stand Electric Cutting Machine 4800RPM 63.5 cm Rip Capacity ⏎ Self-Aligning Rip Fence ⏎ Blade Guard Set ⏎ Adjustable Height & Angle ⏎ With a 4800 RPM cutting perform
- **SELLING_POINTS (EN):** ["Cut into Good Times: Are you tired of big pieces of wood getting the best of you? Well, get ready for clean seamless cuts every time. Equipped with a powerful 8 Amp motor, the woodworking table saw 

### 30. `prod_01KNXX8CJ8PJFPX5F0MM6N4BRH`  ·  _Kitchen > Tableware & Bar > Brewing Equipment > Split Type Water Alcohol Distiller_  ·  title 80 tähte

- **TITLE (EN raw):** Moonshine Still Distillery Kit 36.3 L Essential Oil Distilling Kit w/ Water Pump
- **DESCRIPTION (EN raw)** [HTML=True, VEVOR=True]: Vevor Moonshine Still Distillery Kit 36.3 L Essential Oil Distilling Kit w/ Water Pump ⏎ 8 Gal Large Capacity ⏎ Speedy Cooling ⏎ Convenient Usage ⏎ Durable Material & Strong Sealing ⏎ Energy
- **SELLING_POINTS (EN):** ["Sufficient Capacity: This alcohol still provides you with a fermentation capacity of 8 gallons. Boiler barrel: 13.8\" x 13. 8\" (35 x 35 cm), condenser: 7.9\" x 4.3\" (20 x 11 cm), which can ferment

## 3. Kuluhinnang (Batch API, −50%)

Puhastus = LLM loeb toore EN-sisu (title+desc+selling_points+specs) → väljastab puhta EN title + description. Kaks stsenaariumi:

- **A — minimaalne:** puhas `title` + puhas `description`; `selling_points` jäetakse (juba hea). ~160 out-tok/toode.

- **B — täis:** + 5 selling-pointi ümber-genereeritud. ~460 out-tok/toode.

Sisend ≈ 12.9M tok (kogu EN-sisu + ~150 tok/toode prompt). Väljund A ≈ 3.1M, B ≈ 9.0M.

| Mudel | Stsenaarium A | Stsenaarium B |
|---|---:|---:|
| Haiku 4.5 (batch) | ~$14 | ~$29 |
| Sonnet (batch) | ~$43 | ~$87 |

Lagi oli $350 → **mahub mugavalt** mõlemas stsenaariumis. (NB: elus-jääki ei saa lugeda ilma admin-võtmeta — see on token-mahu hinnang.)

## 4. Soovitus

1. **Stsenaarium A, Sonnet batch (~$43)** — parim kvaliteet/kulu: puhas title+description, `selling_points` säilib allikana. Haiku (~$14) kui eelarve pingul, aga title-puhastus VEVOR-stuffingust nõuab head juhendi-järgimist → Sonnet kindlam.

2. **Infra:** sama muster kui ET-sisu-generaatoril (`l3-gates.mjs` genAssets, `content-batch.mjs` Batch API, glossary-värav, DRY-valim enne täisjooksu, stack-lukk + undo). SSoT = DB (`metadata.title_en_clean` / `description_en_clean` VÕI otse `title`/`description` ülekirjutus + `original_*` backup).

3. **Enne täisjooksu:** DRY-valim 30–50 tootel → Tarmo kinnitab kvaliteedi + lõpliku välja-skeemi.
