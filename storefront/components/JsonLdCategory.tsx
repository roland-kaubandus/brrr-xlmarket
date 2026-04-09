export default function JsonLdCategory({ name, description, url, productCount }: {
  name: string
  description?: string
  url: string
  productCount?: number
}) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name,
    description: description || `${name} products at XL Market. Quality tools and equipment at great prices.`,
    url,
    numberOfItems: productCount,
    provider: {
      "@type": "Organization",
      name: "XL Market",
      url: "https://xlmarket.store",
    },
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
