import type { Metadata } from 'next'

// The /cotiza page itself is a Client Component, so route metadata lives here.
const title = 'Cotiza tu proyecto audiovisual'
const description =
  'Cuéntanos tu idea y recibe una propuesta de producción de video o fotografía para tu campaña. Respuesta rápida del equipo de XICO Films.'

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: '/cotiza' },
  openGraph: {
    title: `${title} — XICO Films`,
    description,
    url: '/cotiza',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: `${title} — XICO Films`,
    description,
  },
}

export default function CotizaLayout({ children }: { children: React.ReactNode }) {
  return children
}
