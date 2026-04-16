import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import Providers from './providers'
import './globals.css'

export const metadata: Metadata = {
  title: 'XICO Films',
  description: 'Fotografia y video de campana. Mexico.',
  openGraph: {
    title: 'XICO Films',
    description: 'Fotografia y video de campana. Mexico.',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
