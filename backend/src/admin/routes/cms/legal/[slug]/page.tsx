/**
 * /admin/cms/legal/:slug — markdown editor + live preview for legal pages.
 * Supports slugs: terms, privacy, shipping, returns, cookies.
 */
import { Container, Heading, Text, Input, Textarea, Button, toast, Toaster, Tabs } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { getPage, savePage } from "../../../../lib/cms-api"
import type { LegalPageContent } from "../../../../lib/cms-types"

const VALID_SLUGS = ["terms", "privacy", "shipping", "returns", "cookies"] as const
type LegalSlug = typeof VALID_SLUGS[number]

function getSlugFromPath(): LegalSlug | null {
  if (typeof window === "undefined") return null
  const match = window.location.pathname.match(/\/cms\/legal\/([^/?#]+)/)
  const slug = match?.[1]
  return VALID_SLUGS.includes(slug as LegalSlug) ? (slug as LegalSlug) : null
}

export default function LegalEditor() {
  const [slug, setSlug] = useState<LegalSlug | null>(null)
  const [content, setContent] = useState<LegalPageContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const s = getSlugFromPath()
    setSlug(s)
    if (!s) {
      setError(`Invalid legal page slug. Valid: ${VALID_SLUGS.join(", ")}`)
      setLoading(false)
      return
    }
    getPage<LegalPageContent>(`legal-${s}`)
      .then((r) => setContent(r.content))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!content || !slug) return
    setSaving(true)
    try {
      await savePage(`legal-${slug}`, content)
      toast.success("Saved. Changes go live within 60 seconds.")
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Container className="p-6"><Text>Loading…</Text></Container>
  if (error) return <Container className="p-6"><Text className="text-ui-fg-error">Failed: {error}</Text></Container>
  if (!content || !slug) return null

  return (
    <Container className="divide-y p-0">
      <Toaster />

      <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-ui-bg-base z-10">
        <div>
          <Heading level="h1">Legal: {content.title || slug}</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Markdown supports: ## heading, - list, **bold**, [link](url), | tables |.
          </Text>
        </div>
        <div className="flex gap-2">
          <a href="/app/cms"><Button variant="secondary">Back</Button></a>
          <Button variant="primary" isLoading={saving} onClick={handleSave}>Save</Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-ui-fg-subtle text-xs mb-1 block">Page title</label>
            <Input value={content.title} onChange={(e) => setContent({ ...content, title: e.target.value })} />
          </div>
          <div>
            <label className="text-ui-fg-subtle text-xs mb-1 block">Effective date</label>
            <Input
              value={content.effective_date}
              placeholder="e.g. 28 March 2026"
              onChange={(e) => setContent({ ...content, effective_date: e.target.value })}
            />
          </div>
        </div>

        <Tabs defaultValue="edit">
          <Tabs.List>
            <Tabs.Trigger value="edit">Edit</Tabs.Trigger>
            <Tabs.Trigger value="preview">Preview</Tabs.Trigger>
          </Tabs.List>

          <Tabs.Content value="edit" className="pt-3">
            <Textarea
              value={content.body_md}
              rows={30}
              onChange={(e) => setContent({ ...content, body_md: e.target.value })}
              className="font-mono text-sm"
            />
          </Tabs.Content>

          <Tabs.Content value="preview" className="pt-3">
            <div className="border border-ui-border-base rounded-lg p-6 bg-ui-bg-subtle">
              <MarkdownPreview body={content.body_md} />
            </div>
          </Tabs.Content>
        </Tabs>
      </div>
    </Container>
  )
}

/** Minimal markdown preview — same subset the storefront renders. */
function MarkdownPreview({ body }: { body: string }) {
  const blocks: { type: string; content: string }[] = []
  const lines = body.split(/\r?\n/)
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (!line.trim()) { i++; continue }
    if (line.startsWith("## ")) { blocks.push({ type: "h2", content: line.slice(3) }); i++; continue }
    if (line.startsWith("### ")) { blocks.push({ type: "h3", content: line.slice(4) }); i++; continue }
    if (line.startsWith("- ")) {
      const items: string[] = []
      while (i < lines.length && lines[i].startsWith("- ")) { items.push(lines[i].slice(2)); i++ }
      blocks.push({ type: "ul", content: items.join("\n") }); continue
    }
    const pLines: string[] = []
    while (i < lines.length && lines[i].trim() && !lines[i].startsWith("#") && !lines[i].startsWith("- ")) {
      pLines.push(lines[i]); i++
    }
    blocks.push({ type: "p", content: pLines.join(" ") })
  }

  function inline(text: string) {
    return text
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" class="text-ui-fg-interactive underline">$1</a>')
  }

  return (
    <div className="prose max-w-none">
      {blocks.map((b, idx) => {
        if (b.type === "h2") return <h2 key={idx} className="text-lg font-semibold mt-6 mb-2">{b.content}</h2>
        if (b.type === "h3") return <h3 key={idx} className="text-base font-semibold mt-4 mb-2">{b.content}</h3>
        if (b.type === "ul") {
          return (
            <ul key={idx} className="list-disc pl-5 space-y-1 text-sm">
              {b.content.split("\n").map((li, j) => (
                <li key={j} dangerouslySetInnerHTML={{ __html: inline(li) }} />
              ))}
            </ul>
          )
        }
        return <p key={idx} className="text-sm my-3" dangerouslySetInnerHTML={{ __html: inline(b.content) }} />
      })}
    </div>
  )
}
