/**
 * Typed fetch helpers for the CMS admin routes.
 * All endpoints live under /admin/cms/* and require Medusa actor_id auth.
 */

export interface PageMeta {
  key: string
  title: string
  seeded: boolean
  updated_at: string | null
  updated_by: string | null
}

export interface PageDetail<T = Record<string, unknown>> {
  key: string
  title: string
  content: T
  updated_at: string | null
  updated_by: string | null
}

export interface Revision {
  id: number
  page_id: string
  content: Record<string, unknown>
  created_at: string
  created_by: string | null
  note: string | null
}

const BASE = "/admin/cms"

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(BASE + path, {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...init,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => "")
    throw new Error(`${res.status} ${res.statusText}: ${body.slice(0, 300)}`)
  }
  return res.json() as Promise<T>
}

export function listPages(): Promise<{ pages: PageMeta[] }> {
  return request("")
}

export function getPage<T = Record<string, unknown>>(key: string): Promise<PageDetail<T>> {
  return request(`/${encodeURIComponent(key)}`)
}

export function savePage<T>(key: string, content: T): Promise<PageDetail<T>> {
  return request(`/${encodeURIComponent(key)}`, {
    method: "PUT",
    body: JSON.stringify({ content }),
  })
}

export function listRevisions(key: string): Promise<{ revisions: Revision[] }> {
  return request(`/${encodeURIComponent(key)}/revisions`)
}

export function rollback(key: string, revisionId: number): Promise<PageDetail> {
  return request(`/${encodeURIComponent(key)}/revisions`, {
    method: "POST",
    body: JSON.stringify({ revision_id: revisionId }),
  })
}
