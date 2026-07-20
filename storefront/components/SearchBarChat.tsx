"use client"

import { useEffect, useRef, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Send } from "lucide-react"

interface ChatMsg {
  role: "user" | "assistant"
  text: string
}

interface ProductSuggestion {
  handle: string
  title: string
  price: number
  thumbnail: string
  categories: string[]
}

interface Props {
  locale: string
  initialQuery: string
  onClose: () => void
}

const STRINGS = {
  et: {
    greeting: "Tere! Olen Claudia, XLMarketi tooteabiline.",
    analyzingPrefix: "Hetkeks, vaatan",
    askPlaceholder: "Kirjuta küsimus...",
    sendLabel: "Saada",
    closeLabel: "Sulge",
    productsHeader: "Soovitatud tooted",
    askMore: "Kirjuta täpsustus alla või küsi midagi muud.",
    error: "Tekkis tehniline tõrge — proovi uuesti hetke pärast.",
    welcome: "Tere! Olen Claudia. Kirjelda mida otsid — leian sobivad tooted.",
  },
  en: {
    greeting: "Hi, I'm Claudia, XLMarket's product helper.",
    analyzingPrefix: "One moment, looking at",
    askPlaceholder: "Type your question...",
    sendLabel: "Send",
    closeLabel: "Close",
    productsHeader: "Suggested products",
    askMore: "Type a follow-up below or ask anything else.",
    error: "Technical issue — try again in a moment.",
    welcome: "Hi, I'm Claudia. Tell me what you're looking for — I'll find the right products.",
  },
} as const

function buildOpener(initialQuery: string): string | null {
  const q = initialQuery.trim()
  if (!q) return null
  // Send the query as the user's first message so Claudia greets + analyses naturally.
  return q
}

function formatPrice(amount: number): string {
  return new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" }).format(amount)
}

export default function SearchBarChat({ locale, initialQuery, onClose }: Props) {
  const t = locale === "et" ? STRINGS.et : STRINGS.en
  const [messages, setMessages] = useState<ChatMsg[]>([])
  const [products, setProducts] = useState<ProductSuggestion[]>([])
  const [input, setInput] = useState("")
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const seededRef = useRef(false)

  // Scroll to bottom whenever messages or streaming text changes.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages, busy])

  // Seed: send initial query if any, otherwise show greeting only.
  useEffect(() => {
    if (seededRef.current) return
    seededRef.current = true
    const opener = buildOpener(initialQuery)
    if (opener) {
      void send(opener)
    } else {
      setMessages([{ role: "assistant", text: t.welcome }])
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function send(userText: string) {
    if (!userText.trim() || busy) return
    setError(null)
    setInput("")
    setProducts([]) // clear previous search hits — new turn starts fresh
    const userMsg: ChatMsg = { role: "user", text: userText.trim() }
    setMessages((prev) => [...prev, userMsg, { role: "assistant", text: "" }])
    setBusy(true)

    try {
      const history = messages
        .filter((m) => m.text.trim().length > 0)
        .map((m) => ({ role: m.role, content: m.text }))
      history.push({ role: "user", content: userMsg.text })

      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ messages: history, locale }),
      })
      if (!res.ok || !res.body) {
        throw new Error(`HTTP ${res.status}`)
      }

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""
      let assistantText = ""

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const json = line.slice(6).trim()
          if (!json) continue
          try {
            const event = JSON.parse(json) as
              | { type: "text"; content: string }
              | { type: "products"; items: ProductSuggestion[] }
              | { type: "agent"; agent: string }
              | { type: "escalation"; from: string; to: string; reason: string }
              | { type: "done" }
              | { type: "error"; message: string }
            if (event.type === "text") {
              assistantText += event.content
              setMessages((prev) => {
                const next = [...prev]
                const last = next[next.length - 1]
                if (last && last.role === "assistant") {
                  next[next.length - 1] = { ...last, text: assistantText }
                }
                return next
              })
            } else if (event.type === "products") {
              setProducts(event.items.slice(0, 6))
            } else if (event.type === "error") {
              throw new Error(event.message)
            }
          } catch {
            // ignore malformed event line
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : t.error)
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        if (last && last.role === "assistant" && last.text === "") {
          next.pop()
        }
        return next
      })
    } finally {
      setBusy(false)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    void send(input)
  }

  return (
    <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.18)] z-50 overflow-hidden border border-[#E2E8F0] flex flex-col max-h-[min(680px,80vh)]">
      {/* Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-[#1a1a2e] to-[#12121f] text-white flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[#0ea5a0] text-white text-[13px] font-bold">
            C
          </span>
          <div>
            <p className="text-[13px] font-semibold leading-tight">Claudia</p>
            <p className="text-[11px] text-white/60 leading-tight">XLMarket AI</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="text-white/70 hover:text-white text-[12px] uppercase tracking-wider px-2 py-1"
          aria-label={t.closeLabel}
        >
          {t.closeLabel}
        </button>
      </div>

      {/* Conversation */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 bg-[#F8FAFC]">
        {messages.map((m, i) => (
          <div
            key={i}
            className={"flex " + (m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={
                "max-w-[85%] rounded-2xl px-3.5 py-2 text-[14px] leading-snug " +
                (m.role === "user"
                  ? "bg-[#0ea5a0] text-white rounded-br-sm"
                  : "bg-white border border-[#E2E8F0] text-[#1a1a2e] rounded-bl-sm")
              }
            >
              {m.text || (
                <span className="inline-flex gap-1 items-center text-[#94A3B8]">
                  <span className="w-1.5 h-1.5 bg-[#94A3B8] rounded-full animate-pulse" />
                  <span className="w-1.5 h-1.5 bg-[#94A3B8] rounded-full animate-pulse [animation-delay:150ms]" />
                  <span className="w-1.5 h-1.5 bg-[#94A3B8] rounded-full animate-pulse [animation-delay:300ms]" />
                </span>
              )}
            </div>
          </div>
        ))}
        {error && (
          <div className="text-[12px] text-red-700 bg-red-50 border border-red-200 rounded px-3 py-2">
            {error}
          </div>
        )}
      </div>

      {/* Product suggestions */}
      {products.length > 0 && (
        <div className="border-t border-[#E2E8F0] bg-white max-h-[260px] overflow-y-auto">
          <p className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wider text-[#64748B]">
            {t.productsHeader}
          </p>
          <ul>
            {products.map((p) => (
              <li key={p.handle}>
                <Link
                  href={`/${locale}/toode/${p.handle}`}
                  onClick={onClose}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAFAFA] transition-colors"
                >
                  <div className="w-12 h-12 flex-shrink-0 bg-[#F7F7F7] rounded overflow-hidden">
                    {p.thumbnail ? (
                      <Image
                        src={p.thumbnail}
                        alt=""
                        width={48}
                        height={48}
                        className="w-full h-full object-contain"
                        unoptimized
                      />
                    ) : null}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] text-[#1a1a2e] truncate font-medium">{p.title}</p>
                    {p.categories?.[0] && (
                      <p className="text-[11px] text-[#64748B] mt-0.5 truncate">{p.categories[0]}</p>
                    )}
                  </div>
                  <span className="text-[13px] font-semibold text-[#1a1a2e] whitespace-nowrap">
                    {formatPrice(p.price)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Input */}
      <form onSubmit={onSubmit} className="border-t border-[#E2E8F0] p-3 bg-white flex items-center gap-2">
        <input
          ref={inputRef}
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.askPlaceholder}
          disabled={busy}
          className="flex-1 px-3.5 py-2 text-[14px] border border-[#E2E8F0] rounded-full focus:outline-none focus:ring-2 focus:ring-[#0ea5a0]/30 focus:border-[#0ea5a0] disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="w-9 h-9 flex-shrink-0 rounded-full bg-[#0ea5a0] hover:bg-[#0b7d79] text-white flex items-center justify-center disabled:opacity-40"
          aria-label={t.sendLabel}
        >
          <Send size={16} strokeWidth={2} />
        </button>
      </form>
    </div>
  )
}
