const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL!
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY!
const REGION_ID = process.env.NEXT_PUBLIC_REGION_ID!
const FETCH_TIMEOUT_MS = 3000
const MAX_CONCURRENT_FETCHES = 3

// Semaphore to limit concurrent Medusa API calls
let activeFetches = 0
const waitQueue: Array<() => void> = []

function acquireSlot(): Promise<void> {
  if (activeFetches < MAX_CONCURRENT_FETCHES) {
    activeFetches++
    return Promise.resolve()
  }
  return new Promise((resolve) => waitQueue.push(resolve))
}

function releaseSlot() {
  const next = waitQueue.shift()
  if (next) {
    next() // hand slot to next waiter
  } else {
    activeFetches--
  }
}

async function medusaFetch<T>(path: string, options?: RequestInit & { revalidate?: number }): Promise<T> {
  await acquireSlot()
  const { revalidate, ...fetchOptions } = options || {}
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(`${MEDUSA_URL}${path}`, {
      ...fetchOptions,
      signal: fetchOptions.signal ?? controller.signal,
      headers: {
        "x-publishable-api-key": API_KEY,
        "Content-Type": "application/json",
        ...fetchOptions?.headers,
      },
      next: revalidate !== undefined ? { revalidate } : undefined,
    })
    clearTimeout(timeout)
    if (!res.ok) {
      throw new Error(`Medusa API error: ${res.status} ${res.statusText}`)
    }
    return res.json()
  } finally {
    clearTimeout(timeout)
    releaseSlot()
  }
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
  parent_category?: ProductCategory | null
  category_children?: ProductCategory[]
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
  return medusaFetch<ProductsResponse>(`/store/products?${search}`, { revalidate: 3600 }) // cache 2 min
}

export async function getProduct(handle: string): Promise<Product | null> {
  const res = await medusaFetch<ProductsResponse>(
    `/store/products?handle=${handle}&region_id=${REGION_ID}&fields=*variants,*variants.calculated_price,*variants.options,*options,+metadata,+images`,
    { revalidate: 3600 } // cache 5 min
  )
  return res.products[0] || null
}

// --- Categories ---

type CategoriesResponse = {
  product_categories: ProductCategory[]
  count: number
}

const CATEGORY_PAGE_SIZE = 500

function buildCategoryQuery(offset: number) {
  return `/store/product-categories?limit=${CATEGORY_PAGE_SIZE}&offset=${offset}&fields=id,name,handle,parent_category_id`
}

export async function getCategories(): Promise<ProductCategory[]> {
  const all: ProductCategory[] = []
  let offset = 0
  let total = Number.POSITIVE_INFINITY
  const deadline = Date.now() + 10000

  while (offset < total) {
    if (Date.now() > deadline) break
    const res = await medusaFetch<CategoriesResponse>(buildCategoryQuery(offset), { revalidate: 3600 })
    const page = res.product_categories || []
    all.push(...page)
    total = res.count ?? all.length
    if (page.length === 0 || page.length < CATEGORY_PAGE_SIZE) break
    offset += page.length
  }

  return all
}

import { cache } from "react"

export const getCategoryByHandle = cache(async (handle: string): Promise<ProductCategory | null> => {
  const res = await medusaFetch<CategoriesResponse>(
    `/store/product-categories?handle=${handle}&include_ancestors_tree=true`
  )
  return res.product_categories[0] || null
})

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
      hero: { title: "Not your ordinary online store!", subtitle: "Thousands of special products at great prices.", buttonText: "Browse Products", buttonLink: "/kategooriad", visible: true },
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
