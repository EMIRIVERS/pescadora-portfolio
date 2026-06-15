import type { MetadataRoute } from 'next'
import { SITE } from '@/lib/seo'

// Served at /manifest.webmanifest and linked automatically from <head>.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'XICO Films — Productora Audiovisual en México',
    short_name: SITE.name,
    description: SITE.shortDescription,
    start_url: '/',
    display: 'standalone',
    background_color: '#050505',
    theme_color: '#050505',
    lang: 'es-MX',
    categories: ['business', 'entertainment', 'photo', 'video'],
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  }
}
