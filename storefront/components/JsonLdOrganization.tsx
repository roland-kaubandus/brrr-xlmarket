export default function JsonLdOrganization() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "XLMARKET",
    legalName: "Roland Kaubandus OÜ",
    url: "https://xlmarket.store",
    email: "info@xlmarket.store",
    sameAs: [],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
