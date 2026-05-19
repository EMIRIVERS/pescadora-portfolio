import type { MetadataRoute } from 'next'
import { SITE_URL } from '@/lib/seo'

/**
 * Served at /robots.txt. The public marketing site is fully crawlable; every
 * authenticated/operational surface is disallowed so it never enters the index
 * (defense in depth — proxy.ts already redirects unauthenticated users).
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/portal', '/login', '/api/', '/auth/'],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
