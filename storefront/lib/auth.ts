const MEDUSA_URL = process.env.NEXT_PUBLIC_MEDUSA_URL!
const API_KEY = process.env.NEXT_PUBLIC_MEDUSA_KEY!

export type Customer = {
  id: string
  email: string
  first_name: string | null
  last_name: string | null
  phone: string | null
  has_account: boolean
  addresses: Array<{
    id: string
    first_name: string
    last_name: string
    address_1: string
    address_2: string | null
    city: string
    postal_code: string
    country_code: string
    phone: string | null
    is_default_shipping: boolean
  }>
}

// Client-side auth helpers (browser only)

export function getToken(): string | null {
  if (typeof window === "undefined") return null
  return localStorage.getItem("xlm_auth_token")
}

export function setToken(token: string) {
  localStorage.setItem("xlm_auth_token", token)
}

export function clearToken() {
  localStorage.removeItem("xlm_auth_token")
}

export async function register(email: string, password: string): Promise<{ token: string }> {
  const res = await fetch(`${MEDUSA_URL}/auth/customer/emailpass/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-publishable-api-key": API_KEY },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || "Registration failed")
  }
  return res.json()
}

export async function createCustomerProfile(token: string, data: { email: string; first_name: string; last_name: string }): Promise<Customer> {
  const res = await fetch(`${MEDUSA_URL}/store/customers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${token}`,
      "x-publishable-api-key": API_KEY,
    },
    body: JSON.stringify(data),
  })
  if (!res.ok) {
    const d = await res.json().catch(() => ({}))
    throw new Error(d.message || "Failed to create profile")
  }
  const result = await res.json()
  return result.customer
}

export async function login(email: string, password: string): Promise<{ token: string }> {
  const res = await fetch(`${MEDUSA_URL}/auth/customer/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-publishable-api-key": API_KEY },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error(data.message || "Invalid email or password")
  }
  return res.json()
}

export async function getCustomer(token: string): Promise<Customer | null> {
  const res = await fetch(`${MEDUSA_URL}/store/customers/me`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "x-publishable-api-key": API_KEY,
    },
  })
  if (!res.ok) return null
  const data = await res.json()
  return data.customer || null
}

export async function getOrders(token: string) {
  const res = await fetch(`${MEDUSA_URL}/store/orders`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "x-publishable-api-key": API_KEY,
    },
  })
  if (!res.ok) return []
  const data = await res.json()
  return data.orders || []
}
