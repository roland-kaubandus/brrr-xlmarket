import Anthropic from "@anthropic-ai/sdk"

let client: Anthropic | null = null

export function getAnthropicClient(): Anthropic {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
      throw new Error("AI_UNAVAILABLE")
    }
    client = new Anthropic({ apiKey })
  }
  return client
}
