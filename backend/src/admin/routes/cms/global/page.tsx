/**
 * /admin/cms/global — company info: name, reg nr, emails, phone, slogan.
 */
import { Container, Heading, Text, Input, Button, toast, Toaster } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { getPage, savePage } from "../../../lib/cms-api"
import type { GlobalContent } from "../../../lib/cms-types"

export default function GlobalEditor() {
  const [content, setContent] = useState<GlobalContent | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getPage<GlobalContent>("global")
      .then((r) => setContent(r.content))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!content) return
    setSaving(true)
    try {
      await savePage("global", content)
      toast.success("Global settings saved. Changes go live within 60 seconds.")
    } catch (e) {
      toast.error(`Save failed: ${(e as Error).message}`)
    } finally {
      setSaving(false)
    }
  }

  function update<K extends keyof GlobalContent>(field: K, value: GlobalContent[K]) {
    if (!content) return
    setContent({ ...content, [field]: value })
  }

  if (loading) return <Container className="p-6"><Text>Loading…</Text></Container>
  if (error) return <Container className="p-6"><Text className="text-ui-fg-error">Failed: {error}</Text></Container>
  if (!content) return null

  return (
    <Container className="divide-y p-0">
      <Toaster />

      <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-ui-bg-base z-10">
        <div>
          <Heading level="h1">Global Settings</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Company identity, contact details, domain, and slogan. Used in footer, JSON-LD, metadata.
          </Text>
        </div>
        <div className="flex gap-2">
          <a href="/app/cms"><Button variant="secondary">Back</Button></a>
          <Button variant="primary" isLoading={saving} onClick={handleSave}>Save</Button>
        </div>
      </div>

      <div className="px-6 py-6 space-y-6 max-w-3xl">
        <Section title="Company">
          <Field label="Company name" value={content.company_name} onChange={(v) => update("company_name", v)} />
          <div className="grid grid-cols-2 gap-3">
            <Field label="Registration number" value={content.reg_number} onChange={(v) => update("reg_number", v)} />
            <Field label="VAT number" value={content.vat_number} onChange={(v) => update("vat_number", v)} />
          </div>
          <Field label="Address" value={content.address} onChange={(v) => update("address", v)} />
        </Section>

        <Section title="Contact">
          <div className="grid grid-cols-2 gap-3">
            <Field label="General email" value={content.email_info} onChange={(v) => update("email_info", v)} />
            <Field label="B2B email" value={content.email_b2b} onChange={(v) => update("email_b2b", v)} />
          </div>
          <Field label="Phone" value={content.phone} onChange={(v) => update("phone", v)} />
        </Section>

        <Section title="Brand">
          <Field label="Domain (canonical)" value={content.domain} onChange={(v) => update("domain", v)} />
          <Field label="Slogan" value={content.slogan} onChange={(v) => update("slogan", v)} />
        </Section>
      </div>
    </Container>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <Heading level="h2">{title}</Heading>
      {children}
    </div>
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
