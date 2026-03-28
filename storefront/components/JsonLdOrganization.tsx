export default function JsonLdOrganization() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "XLMARKET",
    legalName: "Roland Kaubandus OÜ",
    url: "https://xlmarket.eu",
    email: "info@xlmarket.eu",
    sameAs: [],
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
