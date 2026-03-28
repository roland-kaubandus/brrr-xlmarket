export function isValidId(id: unknown): id is string {
  return typeof id === "string" && id.length > 0 && id.length <= 200 && /^[a-zA-Z0-9_-]+$/.test(id)
}

export function isValidQuantity(qty: unknown): qty is number {
  return typeof qty === "number" && Number.isInteger(qty) && qty >= 1 && qty <= 99
}

export function isValidEmail(email: unknown): email is string {
  return typeof email === "string" && email.length > 0 && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}
