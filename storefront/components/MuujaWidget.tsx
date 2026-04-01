"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { useRouter, usePathname } from "next/navigation"
import Link from "next/link"

type Product = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  price: number
}

type ChatMessage = {
  role: "user" | "muuja"
  text?: string
  products?: Product[]
  totalHits?: number
  loading?: boolean
}

function MuujaBall({
  mouseX,
  mouseY,
  ballRect,
  isThinking,
  isHover,
}: {
  mouseX: number
  mouseY: number
  ballRect: DOMRect | null
  isThinking: boolean
  isHover: boolean
}) {
  const [blink, setBlink] = useState(false)

  useEffect(() => {
    const interval = setInterval(
      () => {
        setBlink(true)
        setTimeout(() => setBlink(false), 150)
      },
      3000 + Math.random() * 2000
    )
    return () => clearInterval(interval)
  }, [])

  let eyeOffsetX = 0
  let eyeOffsetY = 0
  if (ballRect) {
    const cx = ballRect.left + ballRect.width / 2
    const cy = ballRect.top + ballRect.height / 2
    const dx = mouseX - cx
    const dy = mouseY - cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist > 0) {
      const maxOff = 3
      eyeOffsetX = (dx / dist) * Math.min(maxOff, dist / 40)
      eyeOffsetY = (dy / dist) * Math.min(maxOff, dist / 40)
    }
  }

  const eyeScaleY = blink ? 0.15 : isHover ? 1.3 : 1
  const eyeR = isHover ? 2.8 : 2.5

  return (
    <svg viewBox="0 0 56 56" width="56" height="56" className="block">
      <defs>
        <radialGradient id="ballGrad" cx="40%" cy="35%" r="60%">
          <stop offset="0%" stopColor="#FDBA74" />
          <stop offset="100%" stopColor="#F97316" />
        </radialGradient>
        <filter id="ballShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#F97316" floodOpacity="0.35" />
        </filter>
      </defs>
      <circle cx="28" cy="28" r="26" fill="url(#ballGrad)" filter="url(#ballShadow)" />
      <text x="28" y="16" textAnchor="middle" fontSize="7" fontWeight="800" fill="white" opacity="0.85" fontFamily="var(--font-poppins), sans-serif">XL</text>
      <g transform={"translate(" + eyeOffsetX + "," + eyeOffsetY + ")"}>
        {isThinking ? (
          <>
            <line x1="19" y1="26" x2="24" y2="26" stroke="#451A03" strokeWidth="2" strokeLinecap="round" />
            <line x1="32" y1="26" x2="37" y2="26" stroke="#451A03" strokeWidth="2" strokeLinecap="round" />
          </>
        ) : (
          <>
            <ellipse cx="21" cy="26" rx={eyeR} ry={eyeR * eyeScaleY} fill="#451A03" />
            <ellipse cx="35" cy="26" rx={eyeR} ry={eyeR * eyeScaleY} fill="#451A03" />
          </>
        )}
      </g>
      {isThinking ? (
        <circle cx="28" cy="36" r="2" fill="#451A03" />
      ) : (
        <path d="M22 34 Q28 40 34 34" stroke="#451A03" strokeWidth="2" fill="none" strokeLinecap="round" />
      )}
    </svg>
  )
}

function ProductCard({ product, locale }: { product: Product; locale: string }) {
  const priceStr = product.price
    ? (product.price / 100).toFixed(2).replace(".", ",") + " \u20AC"
    : "Hind puudub"

  return (
    <Link
      href={"/" + locale + "/toode/" + product.handle}
      className="flex items-center gap-3 p-2 rounded-xl hover:bg-orange-50 transition-colors duration-200 group"
    >
      <div className="w-14 h-14 rounded-lg bg-gray-100 overflow-hidden shrink-0">
        {product.thumbnail ? (
          <img src={product.thumbnail} alt={product.title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
          </div>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate group-hover:text-orange-600 transition-colors">{product.title}</p>
        <p className="text-sm font-semibold text-orange-600">{priceStr}</p>
      </div>
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-300 group-hover:text-orange-500 shrink-0 transition-colors"><path d="m9 18 6-6-6-6"/></svg>
    </Link>
  )
}

export default function MuujaWidget() {
  const router = useRouter()
  const pathname = usePathname()
  const locale = pathname.startsWith("/en") ? "en" : "et"

  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: "muuja", text: "Tere! Olen sinu m\u00FC\u00FCja. Kirjelda, mida otsid, ja leian sulle sobivad tooted!" },
  ])
  const [input, setInput] = useState("")
  const [isThinking, setIsThinking] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  const [isHover, setIsHover] = useState(false)
  const [winSize, setWinSize] = useState({ w: 0, h: 0 })

  const [pos, setPos] = useState({ x: -1, y: -1 })
  const [isDragging, setIsDragging] = useState(false)
  const dragStart = useRef({ x: 0, y: 0, posX: 0, posY: 0 })
  const wasDragged = useRef(false)

  const ballRef = useRef<HTMLDivElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setWinSize({ w: window.innerWidth, h: window.innerHeight })
    const onResize = () => setWinSize({ w: window.innerWidth, h: window.innerHeight })
    window.addEventListener("resize", onResize)
    return () => window.removeEventListener("resize", onResize)
  }, [])

  useEffect(() => {
    if (pos.x === -1 && winSize.w > 0) {
      setPos({
        x: 24,
        y: Math.round(winSize.h * 0.55),
      })
    }
  }, [pos.x, winSize])

  useEffect(() => {
    const handler = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY })
    window.addEventListener("mousemove", handler)
    return () => window.removeEventListener("mousemove", handler)
  }, [])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  useEffect(() => {
    if (isOpen) setTimeout(() => inputRef.current?.focus(), 100)
  }, [isOpen])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (isOpen) return
      setIsDragging(true)
      wasDragged.current = false
      dragStart.current = { x: e.clientX, y: e.clientY, posX: pos.x, posY: pos.y }
      ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
    },
    [isOpen, pos]
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return
      const dx = e.clientX - dragStart.current.x
      const dy = e.clientY - dragStart.current.y
      if (Math.abs(dx) > 4 || Math.abs(dy) > 4) wasDragged.current = true
      const newX = Math.max(0, Math.min(winSize.w - 56, dragStart.current.posX + dx))
      const newY = Math.max(0, Math.min(winSize.h - 56, dragStart.current.posY + dy))
      setPos({ x: newX, y: newY })
    },
    [isDragging, winSize]
  )

  const onPointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const sendMessage = async (query: string) => {
    if (!query.trim() || isThinking) return
    const userMsg: ChatMessage = { role: "user", text: query }
    setMessages((prev) => [...prev, userMsg, { role: "muuja", loading: true }])
    setInput("")
    setIsThinking(true)

    try {
      const res = await fetch("/api/muuja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      })
      const data = await res.json()

      if (data.action === "navigate") {
        setMessages((prev) => {
          const updated = prev.filter((m) => !m.loading)
          return [...updated, { role: "muuja" as const, text: "Suunan sind sinna..." }]
        })
        setTimeout(() => {
          router.push(data.to.startsWith("/") && !data.to.startsWith("/" + locale) ? "/" + locale + data.to : data.to)
        }, 500)
        return
      }

      const hitCount = data.hits?.length || 0
      const total = data.totalHits || 0
      const countText = hitCount + (total > 6 ? " / " + total : "")

      const muujaMsg: ChatMessage = {
        role: "muuja",
        text: hitCount
          ? "Leidsin sulle " + countText + " toodet:"
          : "Kahjuks ei leidnud sellega midagi. Proovi teiste s\u00F5nadega!",
        products: data.hits || [],
        totalHits: total,
      }

      setMessages((prev) => {
        const updated = prev.filter((m) => !m.loading)
        return [...updated, muujaMsg]
      })
    } catch {
      setMessages((prev) => {
        const updated = prev.filter((m) => !m.loading)
        return [...updated, { role: "muuja" as const, text: "Vabandust, tekkis viga. Proovi uuesti!" }]
      })
    } finally {
      setIsThinking(false)
    }
  }

  const handleSortSearch = async (sort: string) => {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")
    if (!lastUserMsg?.text) return
    setMessages((prev) => [...prev, { role: "muuja" as const, loading: true }])
    setIsThinking(true)

    try {
      const res = await fetch("/api/muuja", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: lastUserMsg.text, filters: { sort } }),
      })
      const data = await res.json()
      const label = sort === "price_asc" ? "odavamad" : "kallimad"
      setMessages((prev) => {
        const updated = prev.filter((m) => !m.loading)
        return [
          ...updated,
          {
            role: "muuja" as const,
            text: "Siin on " + label + " esmalt:",
            products: data.hits || [],
            totalHits: data.totalHits,
          },
        ]
      })
    } catch {
      setMessages((prev) => {
        const updated = prev.filter((m) => !m.loading)
        return [...updated, { role: "muuja" as const, text: "Viga sorteerimisel." }]
      })
    } finally {
      setIsThinking(false)
    }
  }

  const quickAction = (action: string) => {
    if (action === "avaleht") {
      router.push("/" + locale)
      // Chat stays open
    } else if (action === "populaarsed") {
      sendMessage("populaarsed tooted")
    } else if (action === "soodukad") {
      sendMessage("soodsad tooted")
    }
  }

  const ballRect = ballRef.current?.getBoundingClientRect() ?? null

  if (pos.x === -1) return null

  const panelLeft = Math.max(16, pos.x)
  const panelBottom = Math.max(16, winSize.h - pos.y + 8)

  return (
    <>
      {isOpen && (
        <div
          className="fixed z-[9998] flex flex-col bg-white rounded-2xl overflow-hidden"
          style={{
            width: "min(400px, calc(100vw - 32px))",
            maxHeight: "500px",
            left: panelLeft + "px",
            bottom: panelBottom + "px",
            boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04)",
          }}
        >
          <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-400">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7">
                <MuujaBall mouseX={0} mouseY={0} ballRect={null} isThinking={false} isHover={false} />
              </div>
              <span className="font-semibold text-white text-[15px] font-[family-name:var(--font-outfit)]">M{"\u00FC\u00FC"}ja</span>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/20 transition-colors text-white"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3" style={{ maxHeight: "380px" }}>
            {messages.map((msg, i) => (
              <div key={i} className={"flex " + (msg.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={
                    msg.role === "user"
                      ? "max-w-[85%] px-3.5 py-2 rounded-2xl rounded-br-md bg-orange-500 text-white text-sm"
                      : "max-w-[90%] space-y-2"
                  }
                >
                  {msg.loading ? (
                    <div className="flex items-center gap-2 px-3.5 py-2 rounded-2xl rounded-bl-md bg-gray-100">
                      <div className="w-5 h-5">
                        <MuujaBall mouseX={0} mouseY={0} ballRect={null} isThinking={true} isHover={false} />
                      </div>
                      <span className="text-sm text-gray-500 italic">M{"\u00FC\u00FC"}ja m{"\u00F5"}tleb...</span>
                    </div>
                  ) : (
                    <>
                      {msg.text && msg.role === "muuja" && (
                        <p className="px-3.5 py-2 rounded-2xl rounded-bl-md bg-gray-100 text-sm text-gray-800">{msg.text}</p>
                      )}
                      {msg.text && msg.role === "user" && msg.text}
                      {msg.products && msg.products.length > 0 && (
                        <div className="space-y-1 mt-1">
                          {msg.products.map((p) => (
                            <ProductCard key={p.id} product={p} locale={locale} />
                          ))}
                          {(msg.totalHits ?? 0) > 6 && (
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => handleSortSearch("price_asc")}
                                className="text-xs px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors font-medium"
                              >
                                Odavamad
                              </button>
                              <button
                                onClick={() => handleSortSearch("price_desc")}
                                className="text-xs px-3 py-1.5 rounded-full bg-orange-50 text-orange-600 hover:bg-orange-100 transition-colors font-medium"
                              >
                                Kallimad
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>

          <div className="border-t border-gray-100 px-3 pt-2 pb-3">
            <div className="flex gap-1.5 mb-2">
              <button onClick={() => quickAction("avaleht")} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors font-medium">Avalehele</button>
              <button onClick={() => quickAction("populaarsed")} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors font-medium">Populaarsed</button>
              <button onClick={() => quickAction("soodukad")} className="text-xs px-3 py-1.5 rounded-full bg-gray-100 text-gray-600 hover:bg-orange-50 hover:text-orange-600 transition-colors font-medium">Soodukad</button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                sendMessage(input)
              }}
              className="flex gap-2"
            >
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Kirjelda, mida otsid..."
                className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-100 text-sm outline-none focus:ring-2 focus:ring-orange-300 transition-all placeholder:text-gray-400"
              />
              <button
                type="submit"
                disabled={!input.trim() || isThinking}
                className="px-4 py-2.5 rounded-xl bg-orange-500 text-white text-sm font-medium hover:bg-orange-600 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m22 2-7 20-4-9-9-4z"/><path d="M22 2 11 13"/></svg>
              </button>
            </form>
          </div>
        </div>
      )}

      <div
        ref={ballRef}
        className={"fixed z-[9999] select-none touch-none transition-transform duration-200 ease-out" + (isHover && !isDragging ? " scale-110" : "") + (isDragging ? " cursor-grabbing" : " cursor-pointer")}
        style={{
          left: pos.x + "px",
          top: pos.y + "px",
          width: 56,
          height: 56,
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onMouseEnter={() => setIsHover(true)}
        onMouseLeave={() => setIsHover(false)}
        onClick={() => {
          if (!wasDragged.current) setIsOpen((o) => !o)
        }}
      >
        {!isOpen && !isDragging && (
          <>
            <div className="absolute inset-0 rounded-full bg-orange-400/30 animate-ping" style={{ animationDuration: "3s" }} />
            <div className="absolute left-[64px] top-1/2 -translate-y-1/2 whitespace-nowrap bg-white px-3 py-1.5 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] text-sm font-medium text-gray-700 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              Vajuta siia!
            </div>
          </>
        )}
        {!isOpen && (
          <div className="absolute left-[64px] top-1/2 -translate-y-1/2 whitespace-nowrap bg-white/95 backdrop-blur-sm px-3 py-1.5 rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.08)] text-[13px] font-semibold text-orange-600 pointer-events-none animate-pulse" style={{ animationDuration: "4s" }}>
            K\u00fcsi m\u00fc\u00fcjalt
          </div>
        )}
        <MuujaBall
          mouseX={mousePos.x}
          mouseY={mousePos.y}
          ballRect={ballRect}
          isThinking={isThinking}
          isHover={isHover}
        />
      </div>
    </>
  )
}
