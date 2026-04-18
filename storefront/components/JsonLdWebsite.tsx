/**
 * JsonLdWebsite — WebSite schema with SearchAction for sitelinks search box.
 * Spec F5.4. Render once on the site root (layout.tsx).
 */

export default function JsonLdWebsite() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "XLMARKET",
    url: "https://xlmarket.store",
    inLanguage: ["et", "en"],
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: "https://xlmarket.store/et/otsing?q={search_term_string}",
      },
      "query-input": "required name=search_term_string",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
