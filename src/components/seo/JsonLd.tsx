import { SITE, SITE_URL } from '@/lib/seo'

/**
 * Site-wide structured data (Organization + WebSite) as a single @graph.
 * Server-rendered into <head>/<body> so it is present in the initial HTML
 * that crawlers parse. Add real social URLs to SITE.sameAs to enrich the
 * Knowledge Graph entity.
 */
export default function JsonLd() {
  const graph = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${SITE_URL}/#organization`,
        name: SITE.name,
        legalName: SITE.legalName,
        url: SITE_URL,
        description: SITE.description,
        logo: {
          '@type': 'ImageObject',
          url: `${SITE_URL}/apple-icon`,
          width: 180,
          height: 180,
        },
        image: `${SITE_URL}/opengraph-image`,
        areaServed: { '@type': 'Country', name: 'México' },
        knowsLanguage: ['es-MX'],
        ...(SITE.sameAs.length > 0 ? { sameAs: SITE.sameAs } : {}),
      },
      {
        '@type': 'WebSite',
        '@id': `${SITE_URL}/#website`,
        url: SITE_URL,
        name: SITE.name,
        description: SITE.description,
        inLanguage: 'es-MX',
        publisher: { '@id': `${SITE_URL}/#organization` },
      },
      {
        // No postal address, phone or geo coordinates are defined anywhere in
        // the repo, so those fields are intentionally omitted rather than
        // invented — adding fake NAP data would hurt local SEO trust signals.
        '@type': 'LocalBusiness',
        '@id': `${SITE_URL}/#localbusiness`,
        name: SITE.name,
        description: SITE.description,
        url: SITE_URL,
        image: `${SITE_URL}/opengraph-image`,
        areaServed: { '@type': 'Country', name: 'México' },
        knowsLanguage: ['es-MX'],
        parentOrganization: { '@id': `${SITE_URL}/#organization` },
      },
    ],
  }

  return (
    <script
      type="application/ld+json"
      // JSON.stringify output is escaped to keep it safe inside <script>.
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(graph).replace(/</g, '\\u003c'),
      }}
    />
  )
}
