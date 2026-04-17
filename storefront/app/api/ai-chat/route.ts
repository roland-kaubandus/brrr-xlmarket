import type Anthropic from "@anthropic-ai/sdk"
import { getAnthropicClient } from "@/lib/ai/anthropic-client"
import { getAgentConfig, type AgentType } from "@/lib/ai/agents"
import { toolSearchProducts, toolGetProductDetails } from "@/lib/ai/tools"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SseEvent =
  | { type: "agent"; agent: AgentType }
  | { type: "text"; content: string; agent: AgentType }
  | { type: "products"; items: Array<{ handle: string; title: string; price: number; thumbnail: string; categories: string[] }> }
  | { type: "escalation"; from: AgentType; to: AgentType; reason: string }
  | { type: "done" }
  | { type: "error"; message: string }

function encodeEvent(event: SseEvent): Uint8Array {
  const encoder = new TextEncoder()
  return encoder.encode(`data: ${JSON.stringify(event)}\n\n`)
}

async function executeTool(
  toolName: string,
  toolInput: Record<string, unknown>
): Promise<{ result: unknown; products?: Array<{ handle: string; title: string; price: number; thumbnail: string; categories: string[] }> }> {
  if (toolName === "search_products") {
    const args = toolInput as { query: string; category?: string; limit?: number; sort?: string }
    const products = await toolSearchProducts(args)
    return { result: products, products }
  }

  if (toolName === "get_product_details") {
    const args = toolInput as { handle: string }
    const details = await toolGetProductDetails(args)
    return { result: details }
  }

  return { result: null }
}

async function runAgentLoop(
  agent: AgentType,
  messages: Anthropic.MessageParam[],
  conversationContext: string | undefined,
  controller: ReadableStreamDefaultController
): Promise<string> {
  const anthropic = getAnthropicClient()
  const config = getAgentConfig(agent, conversationContext)

  let currentMessages = [...messages]
  let fullText = ""
  const MAX_ITERATIONS = 5

  for (let iteration = 0; iteration < MAX_ITERATIONS; iteration++) {
    const response = await anthropic.messages.create({
      model: config.model,
      max_tokens: 2048,
      system: config.systemPrompt,
      tools: config.tools,
      messages: currentMessages,
    })

    // Process content blocks
    for (const block of response.content) {
      if (block.type === "text") {
        fullText += block.text
        controller.enqueue(encodeEvent({ type: "text", content: block.text, agent }))
      }
    }

    // Stop if no tool use
    if (response.stop_reason !== "tool_use") {
      break
    }

    // Extract tool use blocks
    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    )

    if (toolUseBlocks.length === 0) {
      break
    }

    // Append assistant response to messages
    currentMessages = [
      ...currentMessages,
      { role: "assistant" as const, content: response.content },
    ]

    // Execute tools and collect results
    const toolResults: Anthropic.ToolResultBlockParam[] = []

    for (const tool of toolUseBlocks) {
      const { result, products } = await executeTool(
        tool.name,
        tool.input as Record<string, unknown>
      )

      // Send products event if search returned results
      if (products && products.length > 0) {
        controller.enqueue(encodeEvent({ type: "products", items: products }))
      }

      toolResults.push({
        type: "tool_result",
        tool_use_id: tool.id,
        content: JSON.stringify(result),
      })
    }

    // Append tool results as user message
    currentMessages = [
      ...currentMessages,
      { role: "user" as const, content: toolResults },
    ]
  }

  return fullText
}

function detectEscalation(text: string): { shouldEscalate: boolean; reason: string } {
  const match = text.match(/\{"escalate"\s*:\s*"specialist"[^}]*\}/)
  if (!match) {
    return { shouldEscalate: false, reason: "" }
  }

  try {
    const parsed = JSON.parse(match[0]) as { escalate: string; reason?: string }
    if (parsed.escalate === "specialist") {
      return { shouldEscalate: true, reason: parsed.reason ?? "specialist required" }
    }
  } catch {
    // Malformed JSON — check for pattern match alone
    if (match[0].includes('"escalate":"specialist"') || match[0].includes('"escalate": "specialist"')) {
      return { shouldEscalate: true, reason: "specialist required" }
    }
  }

  return { shouldEscalate: false, reason: "" }
}

const RATE_LIMIT = new Map<string, { count: number; resetAt: number }>()
const RATE_WINDOW_MS = 60_000
const RATE_MAX = 20

function checkRateLimit(ip: string): boolean {
  const now = Date.now()
  const entry = RATE_LIMIT.get(ip)
  if (!entry || entry.resetAt < now) {
    RATE_LIMIT.set(ip, { count: 1, resetAt: now + RATE_WINDOW_MS })
    return true
  }
  if (entry.count >= RATE_MAX) return false
  entry.count++
  return true
}

export async function POST(request: Request): Promise<Response> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || request.headers.get("x-real-ip")
    || "unknown"

  if (!checkRateLimit(ip)) {
    return new Response(
      JSON.stringify({ error: "Too many requests" }),
      { status: 429, headers: { "Content-Type": "application/json", "Retry-After": "60" } }
    )
  }

  let body: { messages: Array<{ role: string; content: string }>; locale?: string }

  try {
    body = await request.json() as typeof body
  } catch {
    return new Response(
      JSON.stringify({ error: "Invalid JSON body" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  const { messages } = body

  if (!Array.isArray(messages) || messages.length === 0) {
    return new Response(
      JSON.stringify({ error: "messages array is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    )
  }

  // Map client messages to Anthropic MessageParam format
  const anthropicMessages: Anthropic.MessageParam[] = messages.map((m) => ({
    role: m.role === "assistant" ? "assistant" : "user",
    content: m.content,
  }))

  const stream = new ReadableStream({
    async start(controller) {
      try {
        // Start with Claudia
        controller.enqueue(encodeEvent({ type: "agent", agent: "claudia" }))

        const claudiaText = await runAgentLoop("claudia", anthropicMessages, undefined, controller)

        const { shouldEscalate, reason } = detectEscalation(claudiaText)

        if (shouldEscalate) {
          // Build conversation context for specialist
          const conversationLines: string[] = []
          for (const msg of anthropicMessages) {
            const role = msg.role === "assistant" ? "Assistent" : "Klient"
            const content = typeof msg.content === "string" ? msg.content : JSON.stringify(msg.content)
            conversationLines.push(`${role}: ${content}`)
          }
          conversationLines.push(`Assistent (Claudia): ${claudiaText}`)
          const conversationContext = conversationLines.join("\n")

          controller.enqueue(
            encodeEvent({ type: "escalation", from: "claudia", to: "specialist", reason })
          )
          controller.enqueue(encodeEvent({ type: "agent", agent: "specialist" }))

          await runAgentLoop("specialist", anthropicMessages, conversationContext, controller)
        }

        controller.enqueue(encodeEvent({ type: "done" }))
      } catch (err: unknown) {
        const raw = err instanceof Error ? err.message : ""
        const message = raw === "AI_UNAVAILABLE"
          ? "AI assistant is temporarily unavailable."
          : "Something went wrong. Please try again."
        if (err instanceof Error && raw !== "AI_UNAVAILABLE") {
          console.error("[ai-chat]", err)
        }
        controller.enqueue(encodeEvent({ type: "error", message }))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  })
}
