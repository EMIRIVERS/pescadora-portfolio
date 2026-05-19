import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * Served at /sitemap.xml. Only public, indexable routes are listed.
 * `/cotiza/success` is intentionally excluded (post-submit thank-you page).
 * The portfolio lives in-page on `/` (anchored sections), so it does not
 * produce separate indexable URLs.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date()

  return [
    {
      url: SITE_URL,
      lastModified: now,
      changeFrequency: 'weekly',
      priority: 1,
    },
    {
      url: `${SITE_URL}/cotiza`,
      lastModified: now,
      changeFrequency: 'monthly',
      priority: 0.8,
    },
  ]
}
