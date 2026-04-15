# AI Sales Agents Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a 3-tier AI assistant system (Claudia + Tootespetsialist + future Kliendihaldur) to XLMarket's AiSearchPalette, powered by Claude Max subscription via Anthropic SDK with SSE streaming and MeiliSearch tool use.

**Architecture:** Single `/api/ai-chat` POST route handles all AI conversations via SSE streaming. Claudia (Haiku) handles first contact, escalates to Tootespetsialist (Sonnet) for technical questions. Both use MeiliSearch tool calls. UI is the existing AiSearchPalette modal (Ctrl+K), upgraded with real chat, streaming text, inline product cards, and agent transition markers.

**Tech Stack:** @anthropic-ai/sdk, Next.js API routes (SSE), MeiliSearch (existing), React state for chat history

**Spec:** `docs/superpowers/specs/2026-04-15-ai-sales-agents-design.md`

---

## File Structure

### New files
| File | Responsibility |
|------|---------------|
| `storefront/lib/ai/anthropic-client.ts` | Anthropic SDK singleton, Max auth config |
| `storefront/lib/ai/agents.ts` | Agent definitions: system prompts, tools, model config per agent |
| `storefront/lib/ai/tools.ts` | Tool implementations: search_products, get_product_details |
| `storefront/lib/ai/category-context.ts` | Compact category tree for Claudia's system prompt |
| `storefront/app/api/ai-chat/route.ts` | SSE streaming endpoint, orchestrates agents |

### Modified files
| File | Change |
|------|--------|
| `storefront/components/AiSearchPalette.tsx` | Full rewrite: real chat UI, streaming, product cards, agent markers |
| `storefront/package.json` | Add `@anthropic-ai/sdk` dependency |

---

## Task 1: Install Anthropic SDK and configure auth

**Files:**
- Modify: `storefront/package.json`
- Create: `storefront/lib/ai/anthropic-client.ts`

- [ ] **Step 1: Install the SDK**

```bash
cd /home/brrr/brrr-xlmarket/storefront && npm install @anthropic-ai/sdk
```

- [ ] **Step 2: Create the Anthropic client singleton**

```typescript
// storefront/lib/ai/anthropic-client.ts
import Anthropic from "@anthropic-ai/sdk"

let client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("ANTHROPIC_API_KEY environment variable is not set")
    }
    client = new Anthropic({ apiKey })
  }
  return client
}
```

- [ ] **Step 3: Add ANTHROPIC_API_KEY to PM2 ecosystem config**

Read `storefront/ecosystem.config.js`, add `ANTHROPIC_API_KEY` to the `env` block. The actual key value comes from `.env` or PM2 environment — do NOT hardcode it.

- [ ] **Step 4: Verify SDK loads**

```bash
cd /home/brrr/brrr-xlmarket/storefront && node -e "const A = require('@anthropic-ai/sdk'); console.log('SDK loaded:', typeof A)"
```

Expected: `SDK loaded: function`

- [ ] **Step 5: Commit**

```bash
cd /home/brrr/brrr-xlmarket/storefront
git add package.json package-lock.json lib/ai/anthropic-client.ts ecosystem.config.js
git commit -m "[XL] Add @anthropic-ai/sdk + client singleton for AI agents"
```

---

## Task 2: Build category context for Claudia's system prompt

**Files:**
- Create: `storefront/lib/ai/category-context.ts`

This generates a compact category tree (~50 lines) that Claudia gets in her system prompt so she knows what the store sells and where things are.

- [ ] **Step 1: Create category context generator**

```typescript
// storefront/lib/ai/category-context.ts
import { BRANCHES, type BranchDef } from "@/lib/branches"

export type CompactCategory = {
  handle: string
  name: string
  nameEt: string
  subcategories: string[]
}

// Build compact category list from BRANCHES for Claudia's system prompt
export function buildCategoryContext(): string {
  const categories = BRANCHES
    .filter(b => b.categoryHandle)
    .map(b => ({
      handle: b.slug,
      name: b.nameEn,
      nameEt: b.name,
    }))

  const lines = categories.map(c => `- ${c.name} (${c.nameEt}) → /${c.handle}`)
  return [
    "POOD: xlmarket.store — Professional tools & equipment, half the price",
    `KATEGOORIAD (${categories.length}):`,
    ...lines,
    "",
    "TARNE: 4.99€, tasuta alates 99€",
    "TAGASTUS: 30 päeva",
    "BRÄND: VEVOR — professionaalsed tööriistad ja seadmed",
  ].join("\n")
}
```

- [ ] **Step 2: Verify output is compact**

```bash
cd /home/brrr/brrr-xlmarket/storefront && node -e "
const { buildCategoryContext } = require('./lib/ai/category-context');
const ctx = buildCategoryContext();
console.log(ctx);
console.log('---');
console.log('Lines:', ctx.split('\n').length);
console.log('Chars:', ctx.length);
"
```

Expected: ~20-30 lines, under 2KB.

- [ ] **Step 3: Commit**

```bash
git add lib/ai/category-context.ts
git commit -m "[XL] Category context builder for Claudia system prompt"
```

---

## Task 3: Define tool implementations (search_products + get_product_details)

**Files:**
- Create: `storefront/lib/ai/tools.ts`

These are the functions that actually execute when Claude calls a tool. They query MeiliSearch and the product API.

- [ ] **Step 1: Create tools module**

```typescript
// storefront/lib/ai/tools.ts
import { searchProducts, type MeiliHit } from "@/lib/meilisearch"

export type ProductResult = {
  handle: string
  title: string
  price: number
  thumbnail: string
  categories: string[]
}

export async function toolSearchProducts(args: {
  query: string
  category?: string
  limit?: number
  sort?: string
}): Promise<ProductResult[]> {
  const limit = Math.min(args.limit || 6, 10)
  const sortMap: Record<string, string[]> = {
    price_asc: ["price:asc"],
    price_desc: ["price:desc"],
    newest: ["created_at:desc"],
  }
  const sort = args.sort ? sortMap[args.sort] : undefined
  const filter = args.category ? [`category_handles = "${args.category}"`] : undefined

  const result = await searchProducts({
    q: args.query,
    limit,
    sort,
    filter,
  })

  return result.hits.map((h: MeiliHit) => ({
    handle: h.handle,
    title: h.title,
    price: h.price,
    thumbnail: h.thumbnail,
    categories: h.categories || [],
  }))
}

export async function toolGetProductDetails(args: {
  handle: string
}): Promise<Record<string, unknown> | null> {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3030"
  try {
    const res = await fetch(`${baseUrl}/api/product/${args.handle}?locale=et`, {
      signal: AbortSignal.timeout(5000),
    })
    if (!res.ok) return null
    const data = await res.json()
    // Return only what the specialist needs — not the full payload
    return {
      title: data.localizedTitle,
      price: data.priceFormatted,
      priceAmount: data.priceAmount,
      specs: data.specs,
      sellingPoints: data.sellingPoints,
      categoryName: data.categoryName,
      mainDescription: data.mainDescriptionHtml
        ? data.mainDescriptionHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000)
        : null,
    }
  } catch {
    return null
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ai/tools.ts
git commit -m "[XL] MeiliSearch + product detail tool implementations for AI agents"
```

---

## Task 4: Define agent configurations (system prompts, tools, models)

**Files:**
- Create: `storefront/lib/ai/agents.ts`

Central configuration for both agents: system prompts, tool definitions (Claude schema format), and model selection.

- [ ] **Step 1: Create agents module**

```typescript
// storefront/lib/ai/agents.ts
import type Anthropic from "@anthropic-ai/sdk"
import { buildCategoryContext } from "./category-context"

// --- Tool definitions (Claude API schema format) ---

const TOOL_SEARCH_PRODUCTS: Anthropic.Tool = {
  name: "search_products",
  description: "Search XLMarket product catalog. Returns product names, prices, thumbnails and links. Use this to find products matching the customer's needs.",
  input_schema: {
    type: "object" as const,
    properties: {
      query: { type: "string", description: "Search keywords in English or Estonian" },
      category: { type: "string", description: "Filter by category handle (optional)" },
      limit: { type: "number", description: "Max results, default 6, max 10" },
      sort: { type: "string", enum: ["relevance", "price_asc", "price_desc", "newest"], description: "Sort order, default relevance" },
    },
    required: ["query"],
  },
}

const TOOL_GET_PRODUCT_DETAILS: Anthropic.Tool = {
  name: "get_product_details",
  description: "Get full product details including specifications, features, dimensions. Use when comparing products or answering technical questions about a specific product.",
  input_schema: {
    type: "object" as const,
    properties: {
      handle: { type: "string", description: "Product URL handle (slug)" },
    },
    required: ["handle"],
  },
}

// --- System prompts ---

function claudiaSystemPrompt(): string {
  const categoryCtx = buildCategoryContext()
  return `Sa oled Claudia, XLMarket.eu e-poe infopunkti töötaja.

KUIDAS SA KÄITUD:
- Sa oled sõbralik ja tagasihoidlik. Sa ei ole Ameerika müügimees ega Microsofti Copilot.
- Sa ei müü midagi. Sa aitad leida. Sa ei ütle "suurepärane valik!" ega "just teile!".
- Kui keegi teeb nalja, mine kaasa. Ise huumorit ei otsi.
- Kui ei tea — ütle ausalt. Ära genereeri fakte.
- Ära kasuta ülemäära emojisid ega hüüumärke.
- Küsi tagasi ainult kui küsimus on ebaselge.
- Vasta eesti keeles, kui klient kirjutab eesti keeles. Muidu inglise keeles.

MIDA SA TEAD:
- Poe kategooriad ja kus tooted asuvad (kasuta search_products tööriista)
- Saad otsida tooteid nime, kategooria, hinna järgi

MIDA SA EI TEA:
- Toodete spetsifikatsioone (watt, materjal, mõõdud jne)
- Kui keegi küsib tehnilist infot, võrdlust või spetsifikatsioone → ütle kasutajale, et kutsud tootespetsialisti, ja lisa oma vastusesse JSON marker: {"escalate":"specialist","reason":"lühike põhjus"}

PROJEKTIMÜÜK:
- Kui keegi mainib projekti, kööki, kontorit, hulkiostu, B2B → ütle: "Projektimüügiks saad tulevikus isikliku kliendihalduri — see on hetkel ettevalmistamisel, aga saan juba aidata toodete leidmisel."

${categoryCtx}

OLULINE: Kui kasutad search_products tööriista, lisa vastusesse iga leitud toote kohta JSON marker:
{"products":[{"handle":"toote-handle","title":"Toote nimi","price":123.45,"thumbnail":"url"}]}
See marker renderdatakse kasutajale tootekaartidena.`
}

function specialistSystemPrompt(conversationSoFar: string): string {
  return `Sa oled XLMarket.eu tootespetsialist — tehniline ekspert, kes teab toodete spetsifikatsioone.

KUIDAS SA KÄITUD:
- Tehniline, aus, konkreetne. "Selle keevitusaparaadi MIG-režiim töötab kuni 200A" — mitte "see on super aparaat!".
- Kui ei tea — ütle ausalt. Ära genereeri fakte.
- Võrdle konkreetseid numbreid, mitte ebamääraselt "see on parem".
- Vasta samas keeles kui klient.

MIDA SA TEAD:
- Saad otsida tooteid (search_products) ja vaadata spetsifikatsioone (get_product_details)
- Kasuta get_product_details iga toote kohta, mida võrdled

SENINE VESTLUS:
${conversationSoFar}

OLULINE: Lisa tooted JSON markeriga nagu Claudia:
{"products":[{"handle":"...","title":"...","price":0,"thumbnail":"..."}]}`
}

// --- Agent configs ---

export type AgentType = "claudia" | "specialist"

export type AgentConfig = {
  model: string
  systemPrompt: string
  tools: Anthropic.Tool[]
}

export function getAgentConfig(agent: AgentType, conversationContext?: string): AgentConfig {
  switch (agent) {
    case "claudia":
      return {
        model: "claude-haiku-4-5",
        systemPrompt: claudiaSystemPrompt(),
        tools: [TOOL_SEARCH_PRODUCTS],
      }
    case "specialist":
      return {
        model: "claude-sonnet-4-6",
        systemPrompt: specialistSystemPrompt(conversationContext || ""),
        tools: [TOOL_SEARCH_PRODUCTS, TOOL_GET_PRODUCT_DETAILS],
      }
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/ai/agents.ts
git commit -m "[XL] Agent configs: Claudia (Haiku) + Tootespetsialist (Sonnet) system prompts and tools"
```

---

## Task 5: Build the /api/ai-chat SSE streaming route

**Files:**
- Create: `storefront/app/api/ai-chat/route.ts`

This is the core backend. It receives messages, runs Claude with tool use in a loop, and streams SSE events back to the client.

- [ ] **Step 1: Create the route**

```typescript
// storefront/app/api/ai-chat/route.ts
import { getAnthropicClient } from "@/lib/ai/anthropic-client"
import { getAgentConfig, type AgentType } from "@/lib/ai/agents"
import { toolSearchProducts, toolGetProductDetails } from "@/lib/ai/tools"
import type Anthropic from "@anthropic-ai/sdk"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type ChatMessage = {
  role: "user" | "assistant"
  content: string
}

function buildAnthropicMessages(messages: ChatMessage[]): Anthropic.MessageParam[] {
  return messages.map(m => ({
    role: m.role,
    content: m.content,
  }))
}

async function executeTool(name: string, input: Record<string, unknown>): Promise<string> {
  switch (name) {
    case "search_products": {
      const results = await toolSearchProducts(input as any)
      return JSON.stringify(results)
    }
    case "get_product_details": {
      const details = await toolGetProductDetails(input as any)
      return details ? JSON.stringify(details) : "Product not found"
    }
    default:
      return `Unknown tool: ${name}`
  }
}

function detectEscalation(text: string): { escalate: boolean; reason?: string } {
  const match = text.match(/\{"escalate"\s*:\s*"specialist"/)
  if (match) {
    try {
      const jsonStart = text.indexOf('{"escalate"')
      const jsonEnd = text.indexOf("}", jsonStart) + 1
      const parsed = JSON.parse(text.substring(jsonStart, jsonEnd))
      return { escalate: true, reason: parsed.reason }
    } catch {
      return { escalate: true, reason: "technical question" }
    }
  }
  return { escalate: false }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const messages: ChatMessage[] = body.messages || []
    const locale: string = body.locale || "et"

    if (!messages.length) {
      return new Response(JSON.stringify({ error: "No messages" }), { status: 400 })
    }

    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        function sendEvent(type: string, data: unknown) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, ...data as object })}\n\n`))
        }

        try {
          const client = getAnthropicClient()
          let currentAgent: AgentType = "claudia"

          sendEvent("agent", { agent: currentAgent })

          // Build conversation context string for specialist (if needed later)
          const conversationContext = messages.map(m => `${m.role}: ${m.content}`).join("\n")

          async function runAgent(agent: AgentType): Promise<string> {
            const config = getAgentConfig(agent, conversationContext)
            let anthropicMessages = buildAnthropicMessages(messages)
            let fullText = ""

            // Agentic loop: keep going until Claude stops calling tools
            for (let iteration = 0; iteration < 5; iteration++) {
              const response = await client.messages.create({
                model: config.model,
                max_tokens: 2048,
                system: config.systemPrompt,
                tools: config.tools,
                messages: anthropicMessages,
              })

              // Process content blocks
              for (const block of response.content) {
                if (block.type === "text") {
                  fullText += block.text
                  sendEvent("text", { content: block.text, agent })
                }
              }

              // If no more tool calls, we're done
              if (response.stop_reason !== "tool_use") break

              // Execute tool calls
              const toolUseBlocks = response.content.filter(
                (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
              )

              anthropicMessages = [
                ...anthropicMessages,
                { role: "assistant" as const, content: response.content },
              ]

              const toolResults: Anthropic.ToolResultBlockParam[] = []
              for (const tool of toolUseBlocks) {
                const result = await executeTool(tool.name, tool.input as Record<string, unknown>)
                toolResults.push({
                  type: "tool_result",
                  tool_use_id: tool.id,
                  content: result,
                })

                // Send product results to client for rendering
                if (tool.name === "search_products") {
                  try {
                    const products = JSON.parse(result)
                    if (Array.isArray(products) && products.length > 0) {
                      sendEvent("products", { items: products })
                    }
                  } catch { /* ignore parse errors */ }
                }
              }

              anthropicMessages.push({ role: "user" as const, content: toolResults })
            }

            return fullText
          }

          // Run Claudia first
          const claudiaText = await runAgent("claudia")

          // Check for escalation
          const escalation = detectEscalation(claudiaText)
          if (escalation.escalate) {
            currentAgent = "specialist"
            sendEvent("escalation", {
              from: "claudia",
              to: "specialist",
              reason: escalation.reason,
            })
            sendEvent("agent", { agent: "specialist" })
            await runAgent("specialist")
          }

          sendEvent("done", {})
        } catch (error) {
          sendEvent("error", {
            message: error instanceof Error ? error.message : "Unknown error",
          })
        } finally {
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
      },
    })
  } catch {
    return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 })
  }
}
```

- [ ] **Step 2: Verify route compiles**

```bash
cd /home/brrr/brrr-xlmarket/storefront && npx tsc --noEmit app/api/ai-chat/route.ts 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add app/api/ai-chat/route.ts
git commit -m "[XL] /api/ai-chat SSE route: Claudia + specialist with tool use loop"
```

---

## Task 6: Rewrite AiSearchPalette with real chat UI

**Files:**
- Modify: `storefront/components/AiSearchPalette.tsx`

Full rewrite of the component: controlled input, message state, SSE streaming, product card rendering, agent transition markers, quick actions.

- [ ] **Step 1: Rewrite the component**

Replace entire content of `storefront/components/AiSearchPalette.tsx` with a working chat UI that:

1. **State:** `messages[]` (role + content + agent + products), `input`, `isStreaming`, `currentAgent`
2. **Input:** controlled, Enter submits, disabled while streaming
3. **Submit:** POST to `/api/ai-chat` with full message history, parse SSE stream
4. **SSE parsing:** read `data:` lines, switch on `type`: text (append to current message), products (attach to current message), escalation (show marker), agent (update current agent label), done (stop streaming), error (show error)
5. **Product cards:** inline horizontal row, thumbnail + title + price, click navigates to product page
6. **Agent marker:** small label "Tootespetsialist vastab" when agent changes
7. **Quick actions:** 3 buttons that navigate to search pages (not chat), visible only before first message
8. **Greeting:** Claudia's initial message shown on open (static, not from API)
9. **Scroll:** auto-scroll to bottom on new messages

Key UI elements:
- Top input row: same as now (search icon + input + AI badge)
- Chat area: scrollable, messages alternate left (agent) / right (user)
- Agent messages: light gray bubble, left-aligned, with small "Claudia" or "Spetsialist" label
- User messages: amber/navy bubble, right-aligned
- Product cards: horizontal scroll row inside agent message, compact (40x40 thumb + title + price)
- Bottom input: active input + Send button (amber)

- [ ] **Step 2: Build and test**

```bash
cd /home/brrr/brrr-xlmarket/storefront && npm run build
```

Fix any TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add components/AiSearchPalette.tsx
git commit -m "[XL] AiSearchPalette: real chat UI with SSE streaming, product cards, agent transitions"
```

---

## Task 7: Deploy and test end-to-end

**Files:**
- No new files — deploy existing code

- [ ] **Step 1: Build**

```bash
cd /home/brrr/brrr-xlmarket/storefront && npm run build
```

- [ ] **Step 2: Copy static assets to standalone**

```bash
cp -r .next/static .next/standalone/.next/static
```

- [ ] **Step 3: Set ANTHROPIC_API_KEY in environment**

Verify the key is set in PM2 ecosystem config or .env file. Do NOT hardcode.

- [ ] **Step 4: Reload PM2**

```bash
pm2 reload xlmarket-storefront
```

- [ ] **Step 5: Test Claudia responds**

```bash
curl -X POST https://xlmarket.store/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Tere, otsin keevitusaparaati"}],"locale":"et"}'
```

Expected: SSE stream with `agent:claudia`, `text:...`, `products:[...]`, `done`

- [ ] **Step 6: Test escalation**

```bash
curl -X POST https://xlmarket.store/api/ai-chat \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Võrdle nende kahe keevitusaparaadi spetsifikatsioone"}],"locale":"et"}'
```

Expected: SSE stream with escalation event and specialist response with product details.

- [ ] **Step 7: Test in browser**

Open https://xlmarket.store, press Ctrl+K, type "millist puuri betoonile vaja?" and verify:
- Claudia responds with product suggestions
- Product cards render with thumbnails and prices
- Clicking a product navigates to the product page

- [ ] **Step 8: Commit any fixes**

```bash
git add -A
git commit -m "[XL] AI chat deploy fixes and polish"
```

---

## Task 8: Wire up quick actions

**Files:**
- Modify: `storefront/components/AiSearchPalette.tsx`

- [ ] **Step 1: Add navigation to quick action buttons**

The 3 quick action buttons ("Tänased pakkumised", "Uued tooted", "Bestsellerid") should navigate to search pages using `window.location.href`:

- "Tänased pakkumised" → `/{locale}/otsing?filter=deals`
- "Uued tooted" → `/{locale}/otsing?sort=uusimad`
- "Bestsellerid" → `/{locale}/otsing?sort=bestsellerid`

Quick actions should be visible only when no messages have been sent yet. After the first user message, they hide and the chat area takes over.

- [ ] **Step 2: Test in browser**

Open Ctrl+K palette, click each quick action, verify navigation works.

- [ ] **Step 3: Commit**

```bash
git add components/AiSearchPalette.tsx
git commit -m "[XL] Quick actions navigate to search pages"
```

---

## Task 9: Remove old claude CLI subprocess from ai-search route

**Files:**
- Modify: `storefront/app/api/ai-search/route.ts`

The old `/api/ai-search` route spawns `claude` CLI as a subprocess with tmpfiles. Now that we have proper AI chat, simplify this route to only do MeiliSearch — remove all LLM intent decomposition.

- [ ] **Step 1: Simplify the route**

Remove `decomposeIntent()`, `isIntentQuery()`, and all `spawn`/`tmpfile` logic. Keep only the MeiliSearch search path. The SearchBar typeahead will use this simplified route for fast keyword search, while AI conversations go through `/api/ai-chat`.

- [ ] **Step 2: Verify SearchBar still works**

```bash
curl "https://xlmarket.store/api/ai-search?q=drill&limit=6"
```

Expected: JSON with MeiliSearch hits, no LLM involved.

- [ ] **Step 3: Commit**

```bash
git add app/api/ai-search/route.ts
git commit -m "[XL] Simplify ai-search route: remove CLI subprocess, pure MeiliSearch only"
```

---

## Summary

| Task | What | Agent | Files |
|------|------|-------|-------|
| 1 | SDK install + client | — | package.json, lib/ai/anthropic-client.ts |
| 2 | Category context | — | lib/ai/category-context.ts |
| 3 | Tool implementations | — | lib/ai/tools.ts |
| 4 | Agent configs | — | lib/ai/agents.ts |
| 5 | SSE API route | — | app/api/ai-chat/route.ts |
| 6 | Chat UI rewrite | — | components/AiSearchPalette.tsx |
| 7 | Deploy + E2E test | — | — |
| 8 | Quick actions | — | components/AiSearchPalette.tsx |
| 9 | Cleanup old route | — | app/api/ai-search/route.ts |

Tasks 1-5 are backend (can run in parallel after Task 1).
Task 6 is frontend (depends on Task 5 API shape).
Tasks 7-9 are polish/cleanup (sequential).
