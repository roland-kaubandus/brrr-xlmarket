/**
 * /admin/cms — index page, lists all manageable CMS content keys.
 * Click any row to open the dedicated editor.
 */
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text, Table, StatusBadge } from "@medusajs/ui"
import { DocumentText } from "@medusajs/icons"
import { useEffect, useState } from "react"
import { listPages, type PageMeta } from "../../lib/cms-api"

export const config = defineRouteConfig({
  label: "Content (CMS)",
  icon: DocumentText,
})

function editorRouteFor(key: string): string {
  if (key === "homepage") return "/app/cms/homepage"
  if (key === "starter-kits") return "/app/cms/starter-kits"
  if (key === "global") return "/app/cms/global"
  if (key.startsWith("legal-")) return `/app/cms/legal/${key.replace("legal-", "")}`
  if (key === "about" || key === "contact") return `/app/cms/pages/${key}`
  return `/app/cms/${key}`
}

function formatWhen(iso: string | null): string {
  if (!iso) return "—"
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return "—"
  return d.toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })
}

export default function CmsIndexPage() {
  const [pages, setPages] = useState<PageMeta[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listPages()
      .then((r) => setPages(r.pages))
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h1">Content (CMS)</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Edit homepage, starter kits, legal pages, and company info. Changes go live within 60 seconds.
          </Text>
        </div>
      </div>

      {loading && <div className="px-6 py-4"><Text>Loading…</Text></div>}
      {error && (
        <div className="px-6 py-4">
          <Text className="text-ui-fg-error">Failed to load: {error}</Text>
        </div>
      )}

      {!loading && !error && (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Page</Table.HeaderCell>
              <Table.HeaderCell>Key</Table.HeaderCell>
              <Table.HeaderCell>Status</Table.HeaderCell>
              <Table.HeaderCell>Last edit</Table.HeaderCell>
              <Table.HeaderCell></Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {pages.map((p) => (
              <Table.Row key={p.key}>
                <Table.Cell>
                  <Text weight="plus">{p.title}</Text>
                </Table.Cell>
                <Table.Cell>
                  <Text size="small" className="text-ui-fg-subtle">{p.key}</Text>
                </Table.Cell>
                <Table.Cell>
                  {p.seeded ? (
                    <StatusBadge color="green">Live</StatusBadge>
                  ) : (
                    <StatusBadge color="orange">Not seeded</StatusBadge>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <Text size="small">{formatWhen(p.updated_at)}</Text>
                  {p.updated_by && (
                    <Text size="xsmall" className="text-ui-fg-subtle">by {p.updated_by}</Text>
                  )}
                </Table.Cell>
                <Table.Cell>
                  <a
                    href={editorRouteFor(p.key)}
                    className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover text-sm font-medium"
                  >
                    Edit →
                  </a>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
    </Container>
  )
}
