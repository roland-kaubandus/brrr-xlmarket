/**
 * /admin/cms/starter-kits — edit the six turnkey starter kit packages.
 */
import { Container, Heading, Text, Input, Textarea, Button, Select, toast, Toaster } from "@medusajs/ui"
import { Plus, Trash } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { getPage, savePage } from "../../../lib/cms-api"
import type { StarterKitsContent, Kit } from "../../../lib/cms-types"
import { KIT_ICONS } from "../../../lib/cms-types"

const EMPTY_KIT: Kit = {
  slug: "",
  name: "",
  priceFrom: 0,
  icon: "Coffee",
  tagline: "",
  includes: [""],
  image: "",
}

export default function StarterKitsEditor() {
  const [content, setContent] = useState<StarterKitsContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPage<StarterKitsContent>("starter-kits")
      .then((r) => setContent(r.content))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!content) return
    setSaving(true)
    try {
      await savePage("starter-kits", content)
      toast.success("Starter kits saved. Changes go live within 60 seconds.")
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  function updateKit(idx: number, patch: Partial<Kit>) {
    if (!content) return
    const kits = content.kits.map((k, i) => (i === idx ? { ...k, ...patch } : k))
    setContent({ ...content, kits })
  }

  function addKit() {
    if (!content) return
    if (content.kits.length >= 20) return
    setContent({ ...content, kits: [...content.kits, { ...EMPTY_KIT }] })
  }

  function removeKit(idx: number) {
    if (!content) return
    if (content.kits.length <= 1) return
    setContent({ ...content, kits: content.kits.filter((_, i) => i !== idx) })
  }

  function updateIncludes(kitIdx: number, itemIdx: number, value: string) {
    if (!content) return
    const kits = content.kits.map((k, i) => {
      if (i !== kitIdx) return k
      return { ...k, includes: k.includes.map((item, j) => (j === itemIdx ? value : item)) }
    })
    setContent({ ...content, kits })
  }

  function addIncludeItem(kitIdx: number) {
    if (!content) return
    const kits = content.kits.map((k, i) => {
      if (i !== kitIdx) return k
      if (k.includes.length >= 20) return k
      return { ...k, includes: [...k.includes, ""] }
    })
    setContent({ ...content, kits })
  }

  function removeIncludeItem(kitIdx: number, itemIdx: number) {
    if (!content) return
    const kits = content.kits.map((k, i) => {
      if (i !== kitIdx) return k
      if (k.includes.length <= 1) return k
      return { ...k, includes: k.includes.filter((_, j) => j !== itemIdx) }
    })
    setContent({ ...content, kits })
  }

  if (loading) return <Container className="p-6"><Text>Loading…</Text></Container>
  if (error) return <Container className="p-6"><Text className="text-ui-fg-error">Failed: {error}</Text></Container>
  if (!content) return null

  return (
    <Container className="divide-y p-0">
      <Toaster />

      <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-ui-bg-base z-10">
        <div>
          <Heading level="h1">Starter Kits</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {content.kits.length} turnkey business packages on /alustajale.
          </Text>
        </div>
        <div className="flex gap-2">
          <a href="/app/cms"><Button variant="secondary">Back</Button></a>
          <Button variant="primary" isLoading={saving} onClick={handleSave}>Save</Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <Text size="small" className="text-ui-fg-subtle">
            Each kit: slug (URL anchor), name, starting price in EUR (integer), Lucide icon name.
          </Text>
          <Button variant="secondary" onClick={addKit} disabled={content.kits.length >= 20}>
            <Plus /> Add kit
          </Button>
        </div>

        {content.kits.map((kit, idx) => (
          <div key={idx} className="border border-ui-border-base rounded-lg p-4 space-y-3 bg-ui-bg-subtle">
            <div className="flex items-center justify-between">
              <Text weight="plus">Kit {idx + 1}: {kit.name || "(untitled)"}</Text>
              <Button
                variant="transparent"
                size="small"
                onClick={() => removeKit(idx)}
                disabled={content.kits.length <= 1}
              >
                <Trash />
              </Button>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Slug (URL anchor)" value={kit.slug} onChange={(v) => updateKit(idx, { slug: v })} />
              <Field label="Name" value={kit.name} onChange={(v) => updateKit(idx, { name: v })} />
              <div>
                <label className="text-ui-fg-subtle text-xs mb-1 block">Icon</label>
                <Select value={kit.icon} onValueChange={(v) => updateKit(idx, { icon: v })}>
                  <Select.Trigger><Select.Value /></Select.Trigger>
                  <Select.Content>
                    {KIT_ICONS.map((name) => (
                      <Select.Item key={name} value={name}>{name}</Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-ui-fg-subtle text-xs mb-1 block">Price from (EUR)</label>
                <Input
                  type="number"
                  value={String(kit.priceFrom)}
                  onChange={(e) => updateKit(idx, { priceFrom: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                />
              </div>
              <Field label="Image filename" value={kit.image} onChange={(v) => updateKit(idx, { image: v })} />
            </div>

            <TextareaField label="Tagline" value={kit.tagline} rows={2} onChange={(v) => updateKit(idx, { tagline: v })} />

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-ui-fg-subtle text-xs">Includes ({kit.includes.length} items)</label>
                <Button variant="transparent" size="small" onClick={() => addIncludeItem(idx)} disabled={kit.includes.length >= 20}>
                  <Plus /> Add item
                </Button>
              </div>
              <div className="space-y-2">
                {kit.includes.map((item, itemIdx) => (
                  <div key={itemIdx} className="flex gap-2">
                    <Input
                      value={item}
                      onChange={(e) => updateIncludes(idx, itemIdx, e.target.value)}
                      placeholder="e.g. 2-group espresso machine + grinder"
                    />
                    <Button
                      variant="transparent"
                      size="small"
                      onClick={() => removeIncludeItem(idx, itemIdx)}
                      disabled={kit.includes.length <= 1}
                    >
                      <Trash />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </Container>
  )
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-ui-fg-subtle text-xs mb-1 block">{label}</label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}

function TextareaField({ label, value, rows, onChange }: { label: string; value: string; rows: number; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="text-ui-fg-subtle text-xs mb-1 block">{label}</label>
      <Textarea value={value} rows={rows} onChange={(e) => onChange(e.target.value)} />
    </div>
  )
}
