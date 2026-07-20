"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"

interface ProductItem {
  handle: string
  title: string
  price: number
  thumbnail: string
  categories?: string[]
}

interface ChatMessage {
  id: string
  role: "user" | "assistant" | "system"
  content: string
  agent?: "claudia" | "specialist"
  products?: ProductItem[]
  isEscalation?: boolean
  isStreaming?: boolean
}

function generateId(): string {
  return Math.random().toString(36).slice(2, 9)
}

function formatPrice(price: number): string {
  return (price / 100).toLocaleString("en-IE", { style: "currency", currency: "EUR" })
}

const GREETING = "Hi! I can help you find the right product. Try asking \"What drill do I need for concrete?\" or \"Best welder under €200\""

const PLACEHOLDER = "Search products or ask AI..."

const SEND_LABEL = "Send"

const QUICK_ACTIONS: Array<{ label: string; url: (locale: string) => string }> = [
  { label: "Today's Deals", url: (locale: string) => `/${locale}/otsing?filter=deals` },
  { label: "New Arrivals", url: (locale: string) => `/${locale}/otsing?sort=uusimad` },
  { label: "Best Sellers", url: (locale: string) => `/${locale}/otsing?sort=bestsellerid` },
]

function AgentAvatar({ agent }: { agent?: "claudia" | "specialist" }) {
  const isSpecialist = agent === "specialist"
  return (
    <div
      className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0 ${
        isSpecialist ? "bg-[#0F766E]" : "bg-[#1a1a2e]"
      }`}
    >
      {isSpecialist ? "S" : "C"}
    </div>
  )
}

function ProductCard({ item, locale, onClick }: { item: ProductItem; locale: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="shrink-0 w-[120px] rounded-lg border border-[#F1F5F9] overflow-hidden text-left hover:border-[#0ea5a0] transition-colors"
    >
      <div className="w-full h-[80px] bg-[#F8FAFC] overflow-hidden relative">
        {item.thumbnail ? (
          <Image
            src={item.thumbnail}
            alt={item.title}
            fill
            className="object-cover"
            sizes="120px"
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" strokeWidth="1.5">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <path d="m21 15-5-5L5 21" />
            </svg>
          </div>
        )}
      </div>
      <div className="px-2 py-1.5">
        <p className="text-[11px] text-[#475569] leading-tight line-clamp-2 mb-1">{item.title}</p>
        <p className="text-[12px] font-semibold text-[#0ea5a0]">{formatPrice(item.price)}</p>
      </div>
    </button>
  )
}

function StreamingDots() {
  return (
    <span className="inline-flex gap-[3px] items-center ml-1">
      <span className="w-1 h-1 rounded-full bg-[#94A3B8] animate-bounce" style={{ animationDelay: "0ms" }} />
      <span className="w-1 h-1 rounded-full bg-[#94A3B8] animate-bounce" style={{ animationDelay: "150ms" }} />
      <span className="w-1 h-1 rounded-full bg-[#94A3B8] animate-bounce" style={{ animationDelay: "300ms" }} />
    </span>
  )
}

export default function AiSearchPalette({ locale = "en" }: { locale?: string }) {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isStreaming, setIsStreaming] = useState(false)
  const [currentAgent, setCurrentAgent] = useState<"claudia" | "specialist">("claudia")

  const inputRef = useRef<HTMLInputElement>(null)
  const chatRef = useRef<HTMLDivElement>(null)
  const router = useRouter()

  const hasUserMessages = messages.some(m => m.role === "user")

  // Auto-scroll chat to bottom
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight
    }
  }, [messages])

  // Ctrl+K / Cmd+K toggle, Escape close
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("keydown", handler)
    return () => document.removeEventListener("keydown", handler)
  }, [])

  // data-ai-trigger click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      if (target.closest("[data-ai-trigger]")) {
        e.preventDefault()
        setOpen(true)
      }
    }
    document.addEventListener("click", handler)
    return () => document.removeEventListener("click", handler)
  }, [])

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [open])

  const handleClose = useCallback(() => {
    setOpen(false)
  }, [])

  const sendMessage = useCallback(async () => {
    const text = input.trim()
    if (!text || isStreaming) return

    setInput("")
    setIsStreaming(true)

    const userMsg: ChatMessage = {
      id: generateId(),
      role: "user",
      content: text,
    }

    // Build history for API (include greeting as first assistant message if it was shown)
    const historyMessages = [
      ...messages.filter(m => m.role === "user" || m.role === "assistant").map(m => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: text },
    ]

    setMessages(prev => [...prev, userMsg])

    const assistantId = generateId()
    const assistantMsg: ChatMessage = {
      id: assistantId,
      role: "assistant",
      content: "",
      agent: currentAgent,
      isStreaming: true,
    }
    setMessages(prev => [...prev, assistantMsg])

    try {
      const response = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: historyMessages, locale }),
      })

      if (!response.ok || !response.body) {
        throw new Error(`HTTP ${response.status}`)
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() ?? ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const raw = line.slice(6).trim()
          if (!raw) continue

          let event: Record<string, unknown>
          try {
            event = JSON.parse(raw) as Record<string, unknown>
          } catch {
            continue
          }

          const type = event.type as string

          if (type === "agent") {
            const agent = event.agent as "claudia" | "specialist"
            setCurrentAgent(agent)
            setMessages(prev =>
              prev.map(m => m.id === assistantId ? { ...m, agent } : m)
            )
          } else if (type === "text") {
            const chunk = event.content as string
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: m.content + chunk, agent: (event.agent as "claudia" | "specialist") ?? m.agent }
                  : m
              )
            )
          } else if (type === "products") {
            const items = event.items as ProductItem[]
            setMessages(prev =>
              prev.map(m => m.id === assistantId ? { ...m, products: items } : m)
            )
          } else if (type === "escalation") {
            const escalationMsg: ChatMessage = {
              id: generateId(),
              role: "system",
              content: "Product specialist responding",
              isEscalation: true,
            }
            setMessages(prev => [...prev, escalationMsg])
            // Start a new assistant message for the specialist
            const specialistId = generateId()
            const specialistMsg: ChatMessage = {
              id: specialistId,
              role: "assistant",
              content: "",
              agent: "specialist",
              isStreaming: true,
            }
            setMessages(prev => [...prev, specialistMsg])
            // Update assistantId reference for subsequent text events — but since
            // we can't reassign const we update via the stream: next text events
            // will append to the last streaming message
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId ? { ...m, isStreaming: false } : m
              )
            )
          } else if (type === "done") {
            setMessages(prev =>
              prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m)
            )
            setIsStreaming(false)
          } else if (type === "error") {
            const errMsg = event.message as string
            setMessages(prev =>
              prev.map(m =>
                m.id === assistantId
                  ? { ...m, content: errMsg || "Error receiving response.", isStreaming: false }
                  : m
              )
            )
            setIsStreaming(false)
          }
        }
      }
    } catch (err) {
      const errText = err instanceof Error ? err.message : String(err)
      setMessages(prev =>
        prev.map(m =>
          m.isStreaming
            ? { ...m, content: `Error: ${errText}`, isStreaming: false }
            : m
        )
      )
    } finally {
      setIsStreaming(false)
      setMessages(prev => prev.map(m => m.isStreaming ? { ...m, isStreaming: false } : m))
    }
  }, [input, isStreaming, messages, currentAgent, locale])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage()
    }
  }, [sendMessage])

  if (!open) return null

  const greeting = GREETING
  const placeholder = PLACEHOLDER
  const sendLabel = SEND_LABEL
  const quickActions = QUICK_ACTIONS

  return (
    <div
      className="fixed inset-0 z-[200] flex items-start justify-center pt-[80px] bg-black/40 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) handleClose() }}
    >
      <div className="w-[90%] max-w-[640px] bg-white rounded-[20px] overflow-hidden flex flex-col max-h-[80vh]">

        {/* Input row */}
        <div className="flex items-center gap-2.5 px-5 py-4 border-b border-[#F1F5F9]">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" strokeWidth="2" className="shrink-0">
            <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={isStreaming}
            className="flex-1 border-none outline-none text-[15px] text-[#12121f] bg-transparent placeholder:text-[#94A3B8] disabled:opacity-60"
          />
          <div className="flex items-center gap-2 shrink-0">
            <span
              className="px-2 py-0.5 rounded-md text-white text-[0.6rem] font-bold uppercase tracking-wider"
              style={{ background: "linear-gradient(135deg, #0ea5a0, #E8910A)" }}
            >
              AI
            </span>
            <button
              onClick={sendMessage}
              disabled={isStreaming || !input.trim()}
              className="w-7 h-7 rounded-full bg-[#0ea5a0] text-white flex items-center justify-center disabled:opacity-40 transition-opacity"
              aria-label={sendLabel}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="22" y1="2" x2="11" y2="13" />
                <polygon points="22 2 15 22 11 13 2 9 22 2" />
              </svg>
            </button>
          </div>
        </div>

        {/* Quick actions — only when no user messages */}
        {!hasUserMessages && (
          <div className="px-5 pt-3 pb-1 flex gap-2 flex-wrap border-b border-[#F1F5F9]">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => {
                  handleClose()
                  router.push(action.url(locale))
                }}
                className="px-3 py-1.5 rounded-full border border-[#E2E8F0] text-[12px] text-[#475569] hover:border-[#0ea5a0] hover:text-[#0ea5a0] transition-colors"
              >
                {action.label}
              </button>
            ))}
          </div>
        )}

        {/* Chat area */}
        <div
          ref={chatRef}
          className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3 min-h-0"
        >
          {/* Static greeting — always shown */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-1.5">
              <AgentAvatar agent="claudia" />
              <span className="text-[11px] text-[#94A3B8] font-medium">Claudia</span>
            </div>
            <div className="ml-[30px] max-w-[85%] px-3.5 py-2.5 rounded-[4px_12px_12px_12px] bg-[#F8FAFC] text-[13px] text-[#475569] leading-relaxed">
              {greeting}
            </div>
          </div>

          {/* Dynamic messages */}
          {messages.map(msg => {
            if (msg.isEscalation) {
              return (
                <div key={msg.id} className="flex items-center gap-2 py-1">
                  <div className="flex-1 h-px bg-[#F1F5F9]" />
                  <span className="text-[11px] text-[#94A3B8] shrink-0">{msg.content}</span>
                  <div className="flex-1 h-px bg-[#F1F5F9]" />
                </div>
              )
            }

            if (msg.role === "user") {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[75%] px-3.5 py-2.5 rounded-[12px_4px_12px_12px] bg-[#1a1a2e] text-[13px] text-white leading-relaxed">
                    {msg.content}
                  </div>
                </div>
              )
            }

            if (msg.role === "assistant") {
              const agentLabel = msg.agent === "specialist"
                ? "Product Specialist"
                : "Claudia"

              return (
                <div key={msg.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-1.5">
                    <AgentAvatar agent={msg.agent} />
                    <span className="text-[11px] text-[#94A3B8] font-medium">{agentLabel}</span>
                  </div>
                  <div className="ml-[30px] max-w-[90%] px-3.5 py-2.5 rounded-[4px_12px_12px_12px] bg-[#F8FAFC] text-[13px] text-[#475569] leading-relaxed">
                    {msg.content || null}
                    {msg.isStreaming && (!msg.content ? <StreamingDots /> : <StreamingDots />)}
                    {msg.products && msg.products.length > 0 && (
                      <div className="mt-2.5 flex gap-2 overflow-x-auto pb-1">
                        {msg.products.map(item => (
                          <ProductCard
                            key={item.handle}
                            item={item}
                            locale={locale}
                            onClick={() => {
                              handleClose()
                              router.push(`/${locale}/toode/${item.handle}`)
                            }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )
            }

            return null
          })}
        </div>
      </div>
    </div>
  )
}
