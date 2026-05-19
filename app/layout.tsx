import type { Metadata, Viewport } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Cormorant_Garamond } from 'next/font/google'
import Providers from './providers'
import JsonLd from '@/components/seo/JsonLd'
import { SITE, SITE_URL } from '@/lib/seo'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

// og:image / twitter:image are provided automatically by the file conventions
// app/opengraph-image.tsx and app/twitter-image.tsx — do not duplicate here.
export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: 'XICO Films — Productora Audiovisual en México',
    template: '%s — XICO Films',
  },
  description: SITE.description,
  keywords: [...SITE.keywords],
  applicationName: SITE.name,
  authors: [{ name: SITE.name, url: SITE_URL }],
  creator: SITE.name,
  publisher: SITE.name,
  category: 'Film & Video Production',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
      'max-video-preview': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: SITE.locale,
    url: SITE_URL,
    siteName: SITE.name,
    title: 'XICO Films — Productora Audiovisual en México',
    description: SITE.description,
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XICO Films — Productora Audiovisual en México',
    description: SITE.shortDescription,
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: '#050505',
  colorScheme: 'dark',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es-MX">
      <body className={`${GeistSans.variable} ${GeistMono.variable} ${cormorant.variable}`}>
        <JsonLd />
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
