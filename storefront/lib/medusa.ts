const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL!
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY!
const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID!

async function medusaFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${MEDUSA_URL}${path}`, {
    ...options,
    headers: {
      "x-publishable-api-key": API_KEY,
      "Content-Type": "application/json",
      ...options?.headers,
    },
  })
  if (!res.ok) {
    throw new Error(`Medusa API error: ${res.status} ${res.statusText}`)
  }
  return res.json()
}

// --- Types ---

export type MedusaPrice = {
  calculated_amount: number
  original_amount: number
  currency_code: string
}

export type ProductOptionValue = {
  id?: string
  value: string
}

export type ProductOption = {
  id: string
  title: string
  values: Array<ProductOptionValue | string>
}

export type ProductVariantOption = {
  id?: string
  value?: string
  option_id?: string
  option?: {
    id?: string
    title?: string
  } | null
  option_value?: {
    value?: string
  } | null
}

export type ProductVariant = {
  id: string
  title: string
  calculated_price: MedusaPrice
  sku?: string | null
  manage_inventory?: boolean
  allow_backorder?: boolean
  inventory_quantity?: number | null
  options?: ProductVariantOption[]
}

export type ProductImage = {
  id: string
  url: string
}

export type ProductCategory = {
  id: string
  name: string
  handle: string
  parent_category_id: string | null
}

export type Product = {
  id: string
  title: string
  handle: string
  description: string | null
  thumbnail: string | null
  images: ProductImage[]
  options?: ProductOption[]
  variants: ProductVariant[]
  categories: ProductCategory[]
  created_at: string
  metadata?: Record<string, unknown>
}

// --- Products ---

type ProductsResponse = {
  products: Product[]
  count: number
  offset: number
  limit: number
}

export async function getProducts(params: {
  limit?: number
  offset?: number
  category_id?: string[]
  q?: string
  order?: string
} = {}): Promise<ProductsResponse> {
  const search = new URLSearchParams()
  search.set("region_id", REGION_ID)
  search.set("fields", "*variants,*variants.calculated_price,+metadata")
  search.set("limit", String(params.limit || 20))
  search.set("offset", String(params.offset || 0))
  if (params.q) search.set("q", params.q)
  if (params.order) search.set("order", params.order)
  if (params.category_id) {
    params.category_id.forEach(id => search.append("category_id[]", id))
  }
  return medusaFetch<ProductsResponse>(`/store/products?${search}`)
}

export async function getProduct(handle: string): Promise<Product | null> {
  const res = await medusaFetch<ProductsResponse>(
    `/store/products?handle=${handle}&region_id=${REGION_ID}&fields=*variants,*variants.calculated_price,*variants.options,*options,+metadata,+images`
  )
  return res.products[0] || null
}

// --- Categories ---

type CategoriesResponse = {
  product_categories: ProductCategory[]
  count: number
}

export async function getCategories(): Promise<ProductCategory[]> {
  const res = await medusaFetch<CategoriesResponse>(
    "/store/product-categories?limit=50"
  )
  return res.product_categories
}

export async function getCategoryByHandle(handle: string): Promise<ProductCategory | null> {
  const res = await medusaFetch<CategoriesResponse>(
    `/store/product-categories?handle=${handle}`
  )
  return res.product_categories[0] || null
}

// --- Cart ---

type CartResponse = {
  cart: any
}

export async function createCart(): Promise<any> {
  return medusaFetch<CartResponse>("/store/carts", {
    method: "POST",
    body: JSON.stringify({ region_id: REGION_ID }),
  })
}

export async function getCart(cartId: string): Promise<any> {
  return medusaFetch<CartResponse>(`/store/carts/${cartId}`)
}

export async function addToCart(cartId: string, variantId: string, quantity: number): Promise<any> {
  return medusaFetch<CartResponse>(`/store/carts/${cartId}/line-items`, {
    method: "POST",
    body: JSON.stringify({ variant_id: variantId, quantity }),
  })
}

// --- CMS ---

export type CmsContent = {
  hero: {
    title: string
    subtitle: string
    buttonText: string
    buttonLink: string
    visible: boolean
  }
  announcement: {
    text: string
    link: string
    visible: boolean
  }
  banners: Array<{
    id: string
    title: string
    subtitle: string
    buttonText: string
    buttonLink: string
    bgColor: string
    textColor: string
    visible: boolean
    position: string
  }>
  campaigns: Array<{
    id: string
    title: string
    description: string
    link: string
    visible: boolean
  }>
}

export async function getCmsContent(): Promise<CmsContent> {
  try {
    const res = await medusaFetch<{ content: CmsContent }>("/store/cms")
    return res.content
  } catch {
    return {
      hero: { title: "Mitte see tavaline suur e-pood!", subtitle: "Tuhanded erilised tooted, eriliselt hea hinnaga.", buttonText: "Vaata tooteid", buttonLink: "/kategooriad", visible: true },
      announcement: { text: "", link: "", visible: false },
      banners: [],
      campaigns: [],
    }
  }
}

// --- Helpers ---

export function formatPrice(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("et-EE", {
    style: "currency",
    currency,
  }).format(amount / 100)
}

export { REGION_ID }
