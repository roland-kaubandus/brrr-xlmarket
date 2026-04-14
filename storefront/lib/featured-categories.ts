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
    image: "https://image.vevor.com/us%2F0618-3BMNCC000001V2%2Foriginal_img-v9%2Fmetal-lathe-m100-1.2.jpg?timestamp=1652168143000",
    size: "feature",
    productCount: "2,400+",
  },
  {
    handle: "automotive",
    label: "Automotive",
    labelEt: "Auto",
    image: "https://image.vevor.com/us%2FQTSTCTTSDNQONMY7J001V0%2Foriginal_img-v2%2Ftrailer-coupler-lock-m100-1.2.jpg?timestamp=1700000000000",
    size: "normal",
    productCount: "640+",
  },
  {
    handle: "kitchen",
    label: "Kitchen",
    labelEt: "Köök",
    image: "https://image.vevor.com/us%2F1100WJRJ90800X001V2%2Foriginal_img-v10%2Fcommercial-meat-grinder-m100-1.2.jpg?timestamp=1730432819000",
    size: "normal",
    productCount: "820+",
  },
  {
    handle: "building-materials",
    label: "Building Materials",
    labelEt: "Ehitusmaterjalid",
    image: "https://image.vevor.com/us%2FDGNZDTLHJ3JPBIFH9V0%2Foriginal_img-v1%2Fmulti-purpose-folding-ladder-m100-1.2.jpg?timestamp=1700000000000",
    size: "feature",
    productCount: "1,100+",
  },
  {
    handle: "outdoors",
    label: "Outdoors",
    labelEt: "Õues",
    image: "https://image.vevor.com/us%2FPZSHLK37INCH5XEW0001V2%2Foriginal_img-v1%2Frotisserie-grill-m100-1.2.jpg?timestamp=1700000000000",
    size: "normal",
    productCount: "950+",
  },
  {
    handle: "sports-outdoors",
    label: "Sports & Fitness",
    labelEt: "Sport ja fitness",
    image: "https://image.vevor.com/us%2FZDJSCCZPDBKDQ5ELZV9%2Foriginal_img-v1%2Fexercise-bike-m100-1.2.jpg?timestamp=1700000000000",
    size: "normal",
    productCount: "780+",
  },
  {
    handle: "plumbing",
    label: "Plumbing",
    labelEt: "Torustik",
    image: "https://image.vevor.com/us%2F3CFM1-3HPZKBOC001V2%2Foriginal_img-v10%2Fvacuum-pump-m100-1.2.jpg?timestamp=1700096920000",
    size: "normal",
    productCount: "380+",
  },
  {
    handle: "industrial-scientific",
    label: "Industrial",
    labelEt: "Tööstus",
    image: "https://image.vevor.com/us%2FSMXWJ3.5X-90XTS01V0%2Foriginal_img-v4%2Fstereo-microscope-m100-1.2.jpg?timestamp=1628592013000",
    size: "normal",
    productCount: "520+",
  },
]
