import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Cormorant_Garamond } from 'next/font/google'
import Providers from './providers'
import './globals.css'

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
})

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
      <body className={`${GeistSans.variable} ${GeistMono.variable} ${cormorant.variable}`}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  )
}
