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
    image: "/images/categories/tools.png",
    size: "feature",
    productCount: "2,400+",
  },
  {
    handle: "automotive",
    label: "Automotive",
    labelEt: "Auto",
    image: "/images/categories/automotive.png",
    size: "normal",
    productCount: "640+",
  },
  {
    handle: "kitchen",
    label: "Kitchen",
    labelEt: "Köök",
    image: "/images/categories/kitchen.png",
    size: "normal",
    productCount: "820+",
  },
  {
    handle: "building-materials",
    label: "Building Materials",
    labelEt: "Ehitusmaterjalid",
    image: "/images/categories/building-materials.png",
    size: "feature",
    productCount: "1,100+",
  },
  {
    handle: "outdoors",
    label: "Outdoors",
    labelEt: "Õues",
    image: "/images/categories/outdoors.png",
    size: "normal",
    productCount: "950+",
  },
  {
    handle: "sports-outdoors",
    label: "Sports & Fitness",
    labelEt: "Sport ja fitness",
    image: "/images/categories/sports-outdoors.png",
    size: "normal",
    productCount: "780+",
  },
  {
    handle: "plumbing",
    label: "Plumbing",
    labelEt: "Torustik",
    image: "/images/categories/plumbing.png",
    size: "normal",
    productCount: "380+",
  },
  {
    handle: "industrial-scientific",
    label: "Industrial",
    labelEt: "Tööstus",
    image: "/images/categories/industrial-scientific.png",
    size: "normal",
    productCount: "520+",
  },
]
