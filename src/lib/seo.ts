/**
 * Centralized SEO constants. Imported by metadata, sitemap, robots and JSON-LD
 * so the canonical origin is defined exactly once.
 *
 * Resolution order:
 *   1. NEXT_PUBLIC_SITE_URL    (override; set in Vercel → Env Vars if needed)
 *   2. https://www.xicofilms.com  (production brand canonical — what users see)
 *
 * The previous fallback to VERCEL_PROJECT_PRODUCTION_URL was REMOVED on
 * purpose: it caused canonical/og:url/sitemap to publish the
 * `carajofilms.vercel.app` URL in production instead of the brand domain
 * (and the env var was being returned with a stray newline, malforming the
 * sitemap XML). For preview deploys, set NEXT_PUBLIC_SITE_URL there or rely
 * on the brand canonical (which is what we want indexed anyway).
 */
function resolveSiteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  const raw = explicit && explicit.length > 0 ? explicit : 'https://www.xicofilms.com'
  // Belt-and-suspenders: strip whitespace + trailing slashes so any unclean
  // env value can't break interpolation into <loc>/href/url strings.
  return raw.trim().replace(/\/+$/, '')
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
