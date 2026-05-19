/**
 * Centralized SEO constants. Imported by metadata, sitemap, robots and JSON-LD
 * so the canonical origin is defined exactly once.
 *
 * Production origin resolution order:
 *   1. NEXT_PUBLIC_SITE_URL          (set this in Vercel → Project → Env Vars)
 *   2. https://<vercel-prod-domain>  (auto on Vercel before the real domain)
 *   3. https://xicofilms.com         (final hard fallback)
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL
  if (explicit) return explicit.replace(/\/+$/, '')

  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL
  if (vercel) return `https://${vercel}`

  return 'https://xicofilms.com'
}

export const SITE_URL = resolveSiteUrl()

export const SITE = {
  name: 'XICO Films',
  /** Legal/long brand used in JSON-LD and og:site_name */
  legalName: 'XICO Films',
  url: SITE_URL,
  locale: 'es_MX',
  /** ~150 chars, no typos, keyword-rich — used as the default description */
  description:
    'XICO Films es una productora audiovisual en México especializada en video y fotografía de campaña: comerciales, branded content y dirección de fotografía.',
  shortDescription: 'Productora de video y fotografía de campaña en México.',
  keywords: [
    'productora audiovisual',
    'producción de video México',
    'fotografía publicitaria',
    'video de campaña',
    'comerciales',
    'branded content',
    'dirección de fotografía',
    'XICO Films',
  ],
  /** Social profiles — fill these in to strengthen the Organization sameAs graph */
  sameAs: [] as string[],
} as const

/** Absolute URL helper for canonical/OG/sitemap entries. */
export function absoluteUrl(path = '/'): string {
  return new URL(path, SITE_URL).toString()
}
