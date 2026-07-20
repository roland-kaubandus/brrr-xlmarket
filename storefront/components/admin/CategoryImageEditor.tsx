"use client"

import { useRef, useState } from "react"
import { useAdmin } from "./AdminProvider"

interface Props {
  handle: string
  /** Used only in the success message — optional. */
  displayName?: string
}

export default function CategoryImageEditor({ handle, displayName }: Props) {
  const { isAdmin } = useAdmin()
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement | null>(null)

  if (!isAdmin) return null

  function pick() {
    fileRef.current?.click()
  }

  async function onFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)
    setStatus("Üleslaadimine ja resize...")
    setBusy(true)
    try {
      const fd = new FormData()
      fd.append("image", file)
      const res = await fetch(`/api/admin/category-thumb/${encodeURIComponent(handle)}`, {
        method: "POST",
        body: fd,
      })
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean
        error?: string
        image_url?: string
        snapshot_regenerated?: boolean
        regen_error?: string | null
      }
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `HTTP ${res.status}`)
      }
      setPreviewUrl(data.image_url || null)
      const regenMsg = data.snapshot_regenerated
        ? "Snapshot uuendatud."
        : `Snapshot regen ebaõnnestus${data.regen_error ? `: ${data.regen_error}` : ""}.`
      setStatus(`Pilt salvestatud (${displayName || handle}). ${regenMsg}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Üleslaadimine ebaõnnestus")
      setStatus(null)
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  async function redeploy() {
    setError(null)
    setStatus("Storefront värskendub (~5s)...")
    setBusy(true)
    try {
      const res = await fetch("/api/admin/redeploy", { method: "POST" })
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string; note?: string }
      if (!res.ok || !data.ok) throw new Error(data.error || `HTTP ${res.status}`)
      setStatus(data.note ? data.note : "Live storefront värskendatud.")
      setTimeout(() => window.location.reload(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Värskendamine ebaõnnestus")
      setStatus(null)
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#FCD34D] border border-[#0b7d79] text-[#1a1a2e] hover:bg-[#2dd4bf]"
      >
        ✎ Pilt
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Vaheta kategooria pilt"
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !busy) setOpen(false)
          }}
        >
          <div className="w-full max-w-[480px] bg-white rounded-xl shadow-2xl p-6">
            <h2 className="text-[18px] font-bold text-[#1a1a2e] mb-1">Vaheta kategooria pilt</h2>
            <p className="text-[12px] text-[#64748B] mb-4">
              Handle:{" "}
              <code className="px-1.5 py-0.5 bg-[#F1F5F9] rounded text-[11px]">{handle}</code>
              {displayName && <> · {displayName}</>}
            </p>

            <div className="rounded-lg border-2 border-dashed border-[#CBD5E1] p-4 mb-4 bg-[#F8FAFC] flex items-center gap-4">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Uus pilt"
                  width={80}
                  height={80}
                  className="w-[80px] h-[80px] rounded object-cover border border-[#E2E8F0]"
                />
              ) : (
                <img
                  src={`/cat-thumbs/${handle}.webp`}
                  alt="Praegune pilt"
                  width={80}
                  height={80}
                  className="w-[80px] h-[80px] rounded object-cover border border-[#E2E8F0] bg-white"
                  onError={(e) => {
                    ;(e.currentTarget as HTMLImageElement).style.visibility = "hidden"
                  }}
                />
              )}
              <div className="flex-1">
                <button
                  type="button"
                  onClick={pick}
                  disabled={busy}
                  className="px-3 py-2 bg-[#1a1a2e] text-white text-sm font-semibold rounded hover:bg-[#12121f] disabled:opacity-40"
                >
                  Vali fail
                </button>
                <p className="text-[11px] text-[#64748B] mt-2">
                  JPG/PNG/WebP, max 5 MB. Pilt resize'itakse 400×400 webp.
                </p>
              </div>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif"
              onChange={onFileChange}
              className="hidden"
            />

            {status && (
              <p className="text-[13px] text-[#1a1a2e] bg-[#ccfbf1] border border-[#FCD34D] rounded px-3 py-2 mb-3">
                {status}
              </p>
            )}
            {error && (
              <p className="text-[13px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2 mb-3">
                {error}
              </p>
            )}

            {previewUrl && (
              <button
                type="button"
                onClick={redeploy}
                disabled={busy}
                className="w-full mb-2 px-4 py-2 bg-[#0ea5a0] hover:bg-[#0b7d79] disabled:opacity-50 text-white font-semibold rounded text-sm"
              >
                {busy ? "Värskendan..." : "Värskenda live storefront (~5s)"}
              </button>
            )}

            <div className="flex justify-end gap-2 mt-2">
              <button
                type="button"
                onClick={() => !busy && setOpen(false)}
                disabled={busy}
                className="px-4 py-2 text-sm bg-white border border-[#CBD5E1] rounded hover:bg-[#F1F5F9]"
              >
                Sulge
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
