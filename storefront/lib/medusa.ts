const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL || "http://127.0.0.1:9001"
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY || "pk_d8dce98ddbea51a05856fe088fd0af77fab4675ccc4f03773d064dd4f6d203b3"
const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID || "reg_01KMRXWSNXSYE4530A3K2BK86W"

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
  currency_code: string
}

export type ProductVariant = {
  id: string
  title: string
  calculated_price: MedusaPrice
  manage_inventory?: boolean
  allow_backorder?: boolean
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
  variants: ProductVariant[]
  categories: ProductCategory[]
  created_at: string
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
    `/store/products?handle=${handle}&region_id=${REGION_ID}`
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

// --- Helpers ---

export function formatPrice(amount: number, currency = "EUR"): string {
  return new Intl.NumberFormat("et-EE", {
    style: "currency",
    currency,
  }).format(amount / 100)
}

export { REGION_ID }
