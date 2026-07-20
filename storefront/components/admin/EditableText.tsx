"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { useAdmin } from "./AdminProvider"

interface Props {
  productId: string
  productHandle: string
  field: "title" | "description"
  locale: string
  initialValue: string
  multiline?: boolean
  /** Markup that renders the *display* version (e.g. <h1> or rich HTML). */
  children: ReactNode
  /** Optional callback after successful save. */
  onSaved?: (newValue: string) => void
}

export default function EditableText({
  productId,
  productHandle,
  field,
  locale,
  initialValue,
  multiline = false,
  children,
  onSaved,
}: Props) {
  const { isAdmin } = useAdmin()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ref = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null)

  useEffect(() => {
    setValue(initialValue)
  }, [initialValue])

  useEffect(() => {
    if (editing && ref.current) {
      ref.current.focus()
      // place caret at end
      const v = ref.current.value
      ref.current.setSelectionRange(v.length, v.length)
    }
  }, [editing])

  if (!isAdmin) {
    return <>{children}</>
  }

  async function save() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/products/${productId}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          locale,
          handle: productHandle,
          [field]: value,
        }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setEditing(false)
      onSaved?.(value)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Salvestamine ebaõnnestus")
    } finally {
      setBusy(false)
    }
  }

  function cancel() {
    setValue(initialValue)
    setError(null)
    setEditing(false)
  }

  if (!editing) {
    return (
      <div className="group relative inline-block max-w-full">
        {children}
        <button
          type="button"
          onClick={() => setEditing(true)}
          aria-label={`Muuda ${field === "title" ? "pealkirja" : "kirjeldust"}`}
          className="ml-2 align-middle text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FCD34D] border border-[#0b7d79] text-[#1a1a2e] hover:bg-[#2dd4bf]"
        >
          ✎ Muuda
        </button>
      </div>
    )
  }

  const baseClass =
    "w-full max-w-[800px] border-2 border-[#0b7d79] rounded p-2 text-[#1a1a2e] font-medium focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30"

  return (
    <div className="my-2 p-3 rounded-lg bg-[#f0fdf9] border border-[#FCD34D]">
      {multiline ? (
        <textarea
          ref={ref as React.RefObject<HTMLTextAreaElement>}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={Math.min(20, Math.max(4, value.split("\n").length + 2))}
          className={baseClass}
        />
      ) : (
        <input
          ref={ref as React.RefObject<HTMLInputElement>}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={baseClass}
        />
      )}
      {error && (
        <p className="mt-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded px-2 py-1">
          {error}
        </p>
      )}
      <div className="mt-2 flex items-center gap-2 text-[12px]">
        <button
          type="button"
          onClick={save}
          disabled={busy || value === initialValue}
          className="px-3 py-1 rounded bg-[#1a1a2e] text-white font-semibold hover:bg-[#12121f] disabled:opacity-40"
        >
          {busy ? "Salvestan..." : "Salvesta"}
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={busy}
          className="px-3 py-1 rounded bg-white border border-[#CBD5E1] text-[#1a1a2e] hover:bg-[#F8FAFC]"
        >
          Tühista
        </button>
        <span className="ml-auto text-[#64748B]">
          {locale === "en" ? "EN baseline" : `Metadata: ${field}_${locale}`}
        </span>
      </div>
    </div>
  )
}
