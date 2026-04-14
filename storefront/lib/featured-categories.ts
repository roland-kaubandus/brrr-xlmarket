export type FeaturedCategory = {
  handle: string
  label: string
  labelEt: string
  image80: string
  image400: string
  size: "large" | "normal"
  productCount: string
}

export const FEATURED_CATEGORIES: FeaturedCategory[] = [
  {
    handle: "tools",
    label: "Tools & Machinery",
    labelEt: "Tööriistad",
    image80: "/cat-icons/80/tools.webp",
    image400: "/cat-icons/400/tools.webp",
    size: "large",
    productCount: "2,400+",
  },
  {
    handle: "automotive",
    label: "Automotive",
    labelEt: "Auto",
    image80: "/cat-icons/80/automotive.webp",
    image400: "/cat-icons/400/automotive.webp",
    size: "normal",
    productCount: "1,840",
  },
  {
    handle: "kitchen",
    label: "Kitchen & Catering",
    labelEt: "Köök",
    image80: "/cat-icons/80/kitchen.webp",
    image400: "/cat-icons/400/kitchen.webp",
    size: "large",
    productCount: "820+",
  },
  {
    handle: "building-materials",
    label: "Building Materials",
    labelEt: "Ehitusmaterjalid",
    image80: "/cat-icons/80/building-materials.webp",
    image400: "/cat-icons/400/building-materials.webp",
    size: "normal",
    productCount: "1,100",
  },
  {
    handle: "outdoors",
    label: "Outdoors",
    labelEt: "Õues",
    image80: "/cat-icons/80/outdoors.webp",
    image400: "/cat-icons/400/outdoors.webp",
    size: "normal",
    productCount: "950",
  },
  {
    handle: "sports-outdoors",
    label: "Sports & Fitness",
    labelEt: "Sport ja fitness",
    image80: "/cat-icons/80/sports-outdoors.webp",
    image400: "/cat-icons/400/sports-outdoors.webp",
    size: "normal",
    productCount: "780",
  },
  {
    handle: "plumbing",
    label: "Plumbing",
    labelEt: "Torustik",
    image80: "/cat-icons/80/plumbing.webp",
    image400: "/cat-icons/400/plumbing.webp",
    size: "large",
    productCount: "380+",
  },
  {
    handle: "industrial-scientific",
    label: "Industrial",
    labelEt: "Tööstus",
    image80: "/cat-icons/80/industrial-scientific.webp",
    image400: "/cat-icons/400/industrial-scientific.webp",
    size: "normal",
    productCount: "520",
  },
  {
    handle: "electrical",
    label: "Electrical",
    labelEt: "Elekter",
    image80: "/cat-icons/80/electrical.webp",
    image400: "/cat-icons/400/electrical.webp",
    size: "large",
    productCount: "460+",
  },
  {
    handle: "hardware",
    label: "Hardware",
    labelEt: "Riistvara",
    image80: "/cat-icons/80/hardware.webp",
    image400: "/cat-icons/400/hardware.webp",
    size: "normal",
    productCount: "340",
  },
  {
    handle: "furniture",
    label: "Furniture",
    labelEt: "Mööbel",
    image80: "/cat-icons/80/furniture.webp",
    image400: "/cat-icons/400/furniture.webp",
    size: "normal",
    productCount: "290",
  },
  {
    handle: "heating-venting-cooling",
    label: "Heating & Cooling",
    labelEt: "Küte ja jahutus",
    image80: "/cat-icons/80/heating-venting-cooling.webp",
    image400: "/cat-icons/400/heating-venting-cooling.webp",
    size: "normal",
    productCount: "410",
  },
]

export const SUBCATEGORY_PILLS = [
  { handle: "angle-grinder", label: "Angle Grinders", labelEt: "Nurklihvijad" },
  { handle: "chainsaws", label: "Chainsaws", labelEt: "Mootorsaed" },
  { handle: "car-jacks", label: "Car Jacks", labelEt: "Tungrauad" },
  { handle: "blenders", label: "Blenders", labelEt: "Blenderid" },
  { handle: "band-saws", label: "Band Saws", labelEt: "Lintsaed" },
  { handle: "bottle-jacks", label: "Bottle Jacks", labelEt: "Pudelitungrauad" },
  { handle: "adirondack-chairs", label: "Adirondack Chairs", labelEt: "Aiatoolid" },
  { handle: "above-ground-pools", label: "Above Ground Pools", labelEt: "Maapealsed basseinid" },
  { handle: "acoustic-foam-panels", label: "Acoustic Foam", labelEt: "Helipaneelid" },
  { handle: "air-compressor-parts-accessories", label: "Compressor Parts", labelEt: "Kompressori osad" },
]
