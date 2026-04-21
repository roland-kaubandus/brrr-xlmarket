/**
 * /admin/cms/homepage — edit hero carousel slides + promo cards + nav short names.
 */
import { Container, Heading, Text, Input, Textarea, Button, Select, toast, Toaster } from "@medusajs/ui"
import { Plus, Trash } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { getPage, savePage } from "../../../lib/cms-api"
import type { HomepageContent, Slide, Promo, TagTone } from "../../../lib/cms-types"
import { TAG_TONES } from "../../../lib/cms-types"

const EMPTY_SLIDE: Slide = { badge: "", title: "", text: "", cta: "", ctaHref: "", bg: "" }
const EMPTY_PROMO: Promo = { tag: "", tagTone: "amber", title: "", sub: "", image: "", bg: "", href: "" }

export default function HomepageEditor() {
  const [content, setContent] = useState<HomepageContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPage<HomepageContent>("homepage")
      .then((r) => setContent(r.content))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!content) return
    setSaving(true)
    try {
      await savePage("homepage", content)
      toast.success("Homepage saved. Changes go live within 60 seconds.")
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  function updateSlide(idx: number, patch: Partial<Slide>) {
    if (!content) return
    const slides = content.slides.map((s, i) => (i === idx ? { ...s, ...patch } : s))
    setContent({ ...content, slides })
  }

  function addSlide() {
    if (!content) return
    if (content.slides.length >= 6) return
    setContent({ ...content, slides: [...content.slides, { ...EMPTY_SLIDE }] })
  }

  function removeSlide(idx: number) {
    if (!content) return
    if (content.slides.length <= 1) return
    setContent({ ...content, slides: content.slides.filter((_, i) => i !== idx) })
  }

  function updatePromo(idx: number, patch: Partial<Promo>) {
    if (!content) return
    const promos = content.promos.map((p, i) => (i === idx ? { ...p, ...patch } : p))
    setContent({ ...content, promos })
  }

  function addPromo() {
    if (!content) return
    if (content.promos.length >= 12) return
    setContent({ ...content, promos: [...content.promos, { ...EMPTY_PROMO }] })
  }

  function removePromo(idx: number) {
    if (!content) return
    if (content.promos.length <= 1) return
    setContent({ ...content, promos: content.promos.filter((_, i) => i !== idx) })
  }

  function updateNavName(slug: string, value: string) {
    if (!content) return
    setContent({ ...content, nav_short_names: { ...content.nav_short_names, [slug]: value } })
  }

  if (loading) {
    return <Container className="p-6"><Text>Loading…</Text></Container>
  }
  if (error) {
    return <Container className="p-6"><Text className="text-ui-fg-error">Failed to load: {error}</Text></Container>
  }
  if (!content) return null

  return (
    <Container className="divide-y p-0">
      <Toaster />

      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-ui-bg-base z-10">
        <div>
          <Heading level="h1">Homepage</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Hero carousel, promo cards, and category navigation labels.
          </Text>
        </div>
        <div className="flex gap-2">
          <a href="/app/cms">
            <Button variant="secondary">Back</Button>
          </a>
          <Button variant="primary" isLoading={saving} onClick={handleSave}>
            Save
          </Button>
        </div>
      </div>

      {/* SLIDES */}
      <div className="px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h2">Hero carousel slides</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {content.slides.length} of 6 slides. Use <code>LOCALE/</code> as the locale placeholder in URLs.
            </Text>
          </div>
          <Button variant="secondary" onClick={addSlide} disabled={content.slides.length >= 6}>
            <Plus /> Add slide
          </Button>
        </div>

        {content.slides.map((slide, idx) => (
          <div key={idx} className="border border-ui-border-base rounded-lg p-4 space-y-3 bg-ui-bg-subtle">
            <div className="flex items-center justify-between">
              <Text weight="plus">Slide {idx + 1}</Text>
              <Button
                variant="transparent"
                size="small"
                onClick={() => removeSlide(idx)}
                disabled={content.slides.length <= 1}
              >
                <Trash />
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Badge" value={slide.badge} onChange={(v) => updateSlide(idx, { badge: v })} />
              <Field label="CTA label" value={slide.cta} onChange={(v) => updateSlide(idx, { cta: v })} />
            </div>
            <Field label="Title" value={slide.title} onChange={(v) => updateSlide(idx, { title: v })} />
            <TextareaField label="Text" value={slide.text} rows={2} onChange={(v) => updateSlide(idx, { text: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="CTA href (e.g. LOCALE/alustajale)" value={slide.ctaHref} onChange={(v) => updateSlide(idx, { ctaHref: v })} />
              <Field label="Background image (e.g. /images/hero-1.png)" value={slide.bg} onChange={(v) => updateSlide(idx, { bg: v })} />
            </div>
          </div>
        ))}
      </div>

      {/* PROMOS */}
      <div className="px-6 py-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <Heading level="h2">Promo cards</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              {content.promos.length} of 12 cards. Use either <em>image</em> or <em>bg</em> (gradient CSS), not both.
            </Text>
          </div>
          <Button variant="secondary" onClick={addPromo} disabled={content.promos.length >= 12}>
            <Plus /> Add promo
          </Button>
        </div>

        {content.promos.map((promo, idx) => (
          <div key={idx} className="border border-ui-border-base rounded-lg p-4 space-y-3 bg-ui-bg-subtle">
            <div className="flex items-center justify-between">
              <Text weight="plus">Promo {idx + 1}</Text>
              <Button
                variant="transparent"
                size="small"
                onClick={() => removePromo(idx)}
                disabled={content.promos.length <= 1}
              >
                <Trash />
              </Button>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <Field label="Tag" value={promo.tag} onChange={(v) => updatePromo(idx, { tag: v })} />
              <div>
                <label className="text-ui-fg-subtle text-xs mb-1 block">Tag tone</label>
                <Select value={promo.tagTone} onValueChange={(v) => updatePromo(idx, { tagTone: v as TagTone })}>
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    {TAG_TONES.map((t) => (
                      <Select.Item key={t} value={t}>{t}</Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </div>
              <Field label="Href" value={promo.href} onChange={(v) => updatePromo(idx, { href: v })} />
            </div>
            <Field label="Title" value={promo.title} onChange={(v) => updatePromo(idx, { title: v })} />
            <Field label="Subline" value={promo.sub} onChange={(v) => updatePromo(idx, { sub: v })} />
            <div className="grid grid-cols-2 gap-3">
              <Field label="Image path (optional)" value={promo.image ?? ""} onChange={(v) => updatePromo(idx, { image: v || undefined })} />
              <Field label="Background CSS (optional)" value={promo.bg ?? ""} onChange={(v) => updatePromo(idx, { bg: v || undefined })} />
            </div>
          </div>
        ))}
      </div>

      {/* NAV SHORT NAMES */}
      <div className="px-6 py-6 space-y-4">
        <div>
          <Heading level="h2">Category navigation short names</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            Short label shown in the sticky category nav. Leave empty to fall back to the full name.
          </Text>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(content.nav_short_names).map(([slug, label]) => (
            <div key={slug} className="grid grid-cols-[1fr_1fr] gap-2 items-center">
              <Text size="small" className="text-ui-fg-subtle font-mono">{slug}</Text>
              <Input value={label} onChange={(e) => updateNavName(slug, e.target.value)} />
            </div>
          ))}
        </div>
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
