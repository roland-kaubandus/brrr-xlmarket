export type FeaturedCategory = {
  handle: string
  label: string
  labelEt: string
  image: string
  size: "feature" | "normal"
  productCount: string
}

export const FEATURED_CATEGORIES: FeaturedCategory[] = [
  {
    handle: "tools",
    label: "Tools & Machinery",
    labelEt: "Tööriistad",
    image: "/cat-thumbs/tools.webp",
    size: "feature",
    productCount: "2,400+",
  },
  {
    handle: "automotive",
    label: "Automotive",
    labelEt: "Auto",
    image: "/cat-thumbs/automotive.webp",
    size: "normal",
    productCount: "640+",
  },
  {
    handle: "kitchen",
    label: "Kitchen",
    labelEt: "Köök",
    image: "/cat-thumbs/kitchen.webp",
    size: "normal",
    productCount: "820+",
  },
  {
    handle: "building-materials",
    label: "Building Materials",
    labelEt: "Ehitusmaterjalid",
    image: "/cat-thumbs/building-materials.webp",
    size: "feature",
    productCount: "1,100+",
  },
  {
    handle: "outdoors",
    label: "Outdoors",
    labelEt: "Õues",
    image: "/cat-thumbs/outdoors.webp",
    size: "normal",
    productCount: "950+",
  },
  {
    handle: "sports-outdoors",
    label: "Sports & Fitness",
    labelEt: "Sport ja fitness",
    image: "/cat-thumbs/sports-outdoors.webp",
    size: "normal",
    productCount: "780+",
  },
  {
    handle: "plumbing",
    label: "Plumbing",
    labelEt: "Torustik",
    image: "/cat-thumbs/plumbing.webp",
    size: "normal",
    productCount: "380+",
  },
  {
    handle: "industrial-scientific",
    label: "Industrial",
    labelEt: "Tööstus",
    image: "/cat-thumbs/industrial-scientific.webp",
    size: "normal",
    productCount: "520+",
  },
]
